"""Unit tests for the AI SlidingWindowRateLimiter."""

import sys
from pathlib import Path
from unittest.mock import MagicMock
from fastapi import HTTPException

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.rate_limiter import SlidingWindowRateLimiter


def test_rate_limiter_allows_under_limit():
    """Verify that requests within quota succeed."""
    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=10)
    mock_request = MagicMock()
    mock_request.state.user = {"sub": "user_123"}
    mock_request.headers = {}
    mock_request.client.host = "127.0.0.1"

    # 3 requests should succeed
    for _ in range(3):
        limiter.check(mock_request)
    print("  [PASS] test_rate_limiter_allows_under_limit")


def test_rate_limiter_blocks_over_limit():
    """Verify that exceeding quota raises HTTP 429 with Retry-After header."""
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10)
    mock_request = MagicMock()
    mock_request.state.user = {"sub": "user_456"}
    mock_request.headers = {}
    mock_request.client.host = "127.0.0.1"

    limiter.check(mock_request)
    limiter.check(mock_request)

    # 3rd request must trigger 429
    try:
        limiter.check(mock_request)
        assert False, "Expected HTTP 429 Too Many Requests"
    except HTTPException as exc:
        assert exc.status_code == 429
        assert "Retry-After" in exc.headers
        assert "X-RateLimit-Limit" in exc.headers
    print("  [PASS] test_rate_limiter_blocks_over_limit")


def run_all():
    print("--- Running Rate Limiter Test Suite ---")
    test_rate_limiter_allows_under_limit()
    test_rate_limiter_blocks_over_limit()
    print("All rate limiter tests passed!\n")


if __name__ == "__main__":
    run_all()
