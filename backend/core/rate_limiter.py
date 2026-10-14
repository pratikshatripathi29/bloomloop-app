import time
import threading
from typing import Dict, List, Optional
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter for FastAPI endpoints."""

    def __init__(self, max_requests: int = 15, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def _get_client_key(self, request: Request) -> str:
        """Derive client identifier from authenticated user claim or client IP."""
        # Check if auth middleware/dependency already populated user claim in state
        user = getattr(request.state, "user", None)
        if isinstance(user, dict) and "sub" in user:
            return f"user:{user['sub']}"

        # Otherwise fallback to client host IP
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        return f"ip:{client_ip}"

    def check(self, request: Request) -> None:
        """Evaluate client request against rate limit.
        
        Raises HTTP 429 Too Many Requests if quota is exhausted.
        """
        now = time.time()
        client_key = self._get_client_key(request)
        cutoff = now - self.window_seconds

        with self._lock:
            # Clean up old records for this client
            timestamps = self._history.get(client_key, [])
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]

            if len(valid_timestamps) >= self.max_requests:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(earliest + self.window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": (
                            f"AI rate limit exceeded ({self.max_requests} requests per {self.window_seconds}s). "
                            f"Please retry after {retry_after} seconds."
                        ),
                        "retry_after": retry_after,
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.max_requests),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(earliest + self.window_seconds)),
                    },
                )

            # Record current request
            valid_timestamps.append(now)
            self._history[client_key] = valid_timestamps

            # Periodically sweep stale clients (every 200 clients)
            if len(self._history) > 200:
                self._sweep_stale(cutoff)

    def _sweep_stale(self, cutoff: float) -> None:
        """Purge entries older than cutoff to prevent unbounded memory growth."""
        keys_to_remove = [
            k for k, timestamps in self._history.items()
            if not timestamps or timestamps[-1] < cutoff
        ]
        for k in keys_to_remove:
            self._history.pop(k, None)


# Default AI Rate Limiter: 15 requests per minute
ai_rate_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60)


def limit_ai_requests(request: Request) -> None:
    """FastAPI dependency to apply rate limiting to sensitive AI operations."""
    ai_rate_limiter.check(request)
