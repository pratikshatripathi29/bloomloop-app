import logging
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import settings
from core.database import lifespan, get_db_connection
from core.auth import get_current_user
from routers.customers import router as customers_router
from routers.segments import router as segments_router
from routers.campaigns import router as campaigns_router
from routers.dashboard import router as dashboard_router
from routers.ai import router as ai_router
from routers.analytics import router as analytics_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="BloomLoop CRM API",
    description="FastAPI Backend for BloomLoop CRM with AI-powered Intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
allowed_origins = list(dict.fromkeys([
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Consistent Global Error Response Handlers
# ============================================================================

def format_error_code(status_code: int) -> str:
    """Map HTTP status codes to standardized error code strings."""
    mapping = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    return mapping.get(status_code, "ERROR")


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Normalize all HTTP exceptions into a consistent schema."""
    if isinstance(exc.detail, dict):
        message = exc.detail.get("message", str(exc.detail))
        code = exc.detail.get("code", format_error_code(exc.status_code))
        extra_data = {k: v for k, v in exc.detail.items() if k not in ("message", "code")}
    else:
        message = str(exc.detail)
        code = format_error_code(exc.status_code)
        extra_data = None

    content: Dict[str, Any] = {
        "detail": message,  # Preserved for client backward-compatibility
        "error": {
            "code": code,
            "message": message,
            "status": exc.status_code,
        },
    }
    if extra_data:
        content["error"]["details"] = extra_data

    headers = getattr(exc, "headers", None)
    return JSONResponse(status_code=exc.status_code, content=content, headers=headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format Pydantic schema validation errors into human-readable details."""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        errors.append({
            "field": field or "body",
            "message": err.get("msg", "Invalid input value"),
            "type": err.get("type", "value_error"),
        })

    summary_msg = f"Input validation failed for: {', '.join(e['field'] for e in errors[:3])}"

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": summary_msg,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": summary_msg,
                "status": 422,
                "details": errors,
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Safely catch all unhandled server exceptions without leaking internal stack traces."""
    logger.exception("Unhandled server exception processing request to %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected internal server error occurred. Please try again later.",
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "status": 500,
            },
        },
    )


# ============================================================================
# Register API Routers (protected by Clerk JWT authentication)
# ============================================================================

app.include_router(
    customers_router,
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    segments_router,
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    campaigns_router,
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    dashboard_router,
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    ai_router,
    dependencies=[Depends(get_current_user)],
)
app.include_router(
    analytics_router,
    dependencies=[Depends(get_current_user)],
)


# ============================================================================
# Public Health & Discovery Endpoints
# ============================================================================

@app.get("/health", tags=["Health"])
def health_check():
    """Basic health check endpoint returning service status."""
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def health_db():
    """Database health check endpoint that runs SELECT 1."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                result = cur.fetchone()
                return {
                    "status": "ok",
                    "database": "connected",
                    "result": result[0] if result else 1,
                }
    except Exception as exc:
        logger.error("Database health check error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connectivity unavailable.",
        )


@app.get("/", tags=["Root"])
def root():
    """Root endpoint providing navigation links."""
    return {
        "message": "Welcome to BloomLoop CRM API",
        "docs": "/docs",
        "health": "/health",
        "database_health": "/health/db",
    }
