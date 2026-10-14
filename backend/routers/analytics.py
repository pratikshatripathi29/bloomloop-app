import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from clients.ai_client import ai_client
from core.rate_limiter import limit_ai_requests
from services.analytics_builder import execute_analytics_spec

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics & Insights"],
    dependencies=[Depends(limit_ai_requests)],
)


class AnalyticsAskRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Business analytics question in plain English (e.g. 'What is total revenue by city?')",
    )


class AnalyticsAskResponse(BaseModel):
    question: str
    title: str
    summary: str
    metric: str
    group_by: Optional[str] = None
    format: str
    result_type: str
    value: Optional[float] = None
    data: List[Dict[str, Any]]


@router.post("/ask", response_model=AnalyticsAskResponse, status_code=status.HTTP_200_OK)
def ask_analytics(request: AnalyticsAskRequest):
    """Translate natural language questions into safe structured specs, and execute backend-built SQL.
    
    SECURITY PROTOCOLS:
    - Zero customer PII is sent to the AI.
    - AI only generates a JSON specification conforming to fixed allow-lists.
    - SQL is strictly built and executed by the backend with parameterization.
    - SQL written by AI is NEVER run.
    - Protected by AI rate limiter.
    """
    try:
        # 1. Ask Groq AI to produce ONLY a structured query specification
        spec = ai_client.generate_analytics_spec(request.question)

        # 2. Backend validates spec, builds SQL, and executes securely
        result = execute_analytics_spec(spec, original_question=request.question)

        return AnalyticsAskResponse(
            question=result["question"],
            title=result["title"],
            summary=result["summary"],
            metric=result["metric"],
            group_by=result["group_by"],
            format=result["format"],
            result_type=result["result_type"],
            value=result.get("value"),
            data=result["data"],
        )
    except ValueError as val_err:
        logger.warning("Analytics query validation rejected: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Analytics ask execution exception: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process analytics question. Please check server logs.",
        )
