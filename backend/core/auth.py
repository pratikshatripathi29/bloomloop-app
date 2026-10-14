import logging
from typing import Dict, Any
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

from core.config import settings

# HTTP Bearer security scheme for Authorization header (Bearer <token>)
security = HTTPBearer(auto_error=True)

# PyJWKClient caches the JWKS keys retrieved from Clerk
jwks_client = None
if settings.CLERK_JWKS_URL:
    jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Verify the Clerk JWT Bearer token against Clerk's public JWKS.
    
    Returns the decoded token claims if valid.
    Raises HTTP 401 Unauthorized if the token is missing, expired, or invalid.
    """
    token = credentials.credentials

    if not settings.CLERK_JWKS_URL or not jwks_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_JWKS_URL is not configured in backend/.env",
        )

    try:
        # 1. Fetch matching RSA signing key from Clerk JWKS by 'kid' header
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # 2. Decode and cryptographically verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        logger.error("Authentication exception: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication verification failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
