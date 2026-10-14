import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from psycopg import sql

from clients.ai_client import ai_client
from core.database import get_db_connection
from core.rate_limiter import limit_ai_requests
from services.segment_filters import build_segment_filter_clause

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["AI Intelligence"],
    dependencies=[Depends(limit_ai_requests)],
)


class CampaignMessageRequest(BaseModel):
    goal: str = Field(..., min_length=2, max_length=500, description="Campaign objective or promotional offer")
    tone: str = Field(..., min_length=2, max_length=100, description="Desired communication tone, e.g. friendly, urgent, professional")
    channel: Optional[str] = Field("email", description="Channel: email, sms, or whatsapp")


class CampaignMessageResponse(BaseModel):
    drafts: List[str]
    goal: str
    tone: str


class SegmentSuggestionRequest(BaseModel):
    description: str = Field(..., min_length=3, max_length=500, description="Plain English description of target audience")


class SegmentSuggestionResponse(BaseModel):
    filters: Dict[str, Any]
    explanation: str
    matching_count: int


@router.post("/campaign-message", response_model=CampaignMessageResponse, status_code=status.HTTP_200_OK)
def generate_campaign_messages(request: CampaignMessageRequest):
    """Generate 3 high-converting campaign message drafts from a goal and tone.
    
    Protected by AI sliding-window rate limiter.
    """
    try:
        drafts = ai_client.generate_campaign_drafts(
            goal=request.goal,
            tone=request.tone,
            channel=request.channel or "email",
        )
        return CampaignMessageResponse(
            drafts=drafts,
            goal=request.goal,
            tone=request.tone,
        )
    except Exception as exc:
        logger.error("AI campaign message generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate campaign drafts. Please try again.",
        )


@router.post("/segment-suggestion", response_model=SegmentSuggestionResponse, status_code=status.HTTP_200_OK)
def suggest_segment_filters(request: SegmentSuggestionRequest):
    """Convert natural language description into valid segment filters JSON validated by segment_filters.py.
    
    Protected by AI sliding-window rate limiter.
    """
    try:
        ai_result = ai_client.suggest_segment_filters(request.description)
        raw_filters = ai_result.get("filters", {})
        explanation = ai_result.get("explanation", f"Suggested filter for: {request.description}")

        # Validate strictly using existing services/segment_filters.py
        where_clause, params = build_segment_filter_clause(raw_filters)

        # Calculate matching customer count for immediate feedback
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                count_query = sql.SQL("SELECT COUNT(*) FROM customers ") + where_clause + sql.SQL(";")
                cur.execute(count_query, tuple(params))
                matching_count = cur.fetchone()[0] or 0

        return SegmentSuggestionResponse(
            filters=raw_filters,
            explanation=explanation,
            matching_count=matching_count,
        )
    except ValueError as val_err:
        logger.warning("Segment filter validation error: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("AI segment suggestion failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI segment suggestion service is temporarily unavailable.",
        )
