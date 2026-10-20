import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter for security endpoints."""

    def __init__(self):
        # Maps key -> list of timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        
        # Clean timestamps older than window
        timestamps = [ts for ts in self.requests[key] if ts > cutoff]
        
        if len(timestamps) >= max_requests:
            self.requests[key] = timestamps
            return True
            
        timestamps.append(now)
        self.requests[key] = timestamps
        return False

    def clear(self):
        self.requests.clear()


limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    client = request.client
    return client.host if client else "unknown"


def rate_limit(max_requests: int, window_seconds: int = 60, key_prefix: str = ""):
    async def dependency(request: Request):
        client_ip = get_client_ip(request)
        rate_key = f"{key_prefix}:{client_ip}"
        if limiter.is_rate_limited(rate_key, max_requests, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests from this IP. Please wait before trying again.",
            )
        return True
    return dependency
