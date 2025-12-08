from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import DEFAULT_RATE_LIMIT_PER_MINUTE, RATE_LIMIT_ENABLED
from app.models.api_token import ApiToken


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


class TokenRateLimiter:
    """Rate limiter that respects per-token limits."""
    
    def __init__(self):
        self._token_requests: dict[str, list[datetime]] = defaultdict(list)
        self._cleanup_interval = timedelta(minutes=5)
        self._last_cleanup = datetime.utcnow()
    
    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory leaks."""
        now = datetime.utcnow()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        
        cutoff = now - timedelta(minutes=2)
        for token in list(self._token_requests.keys()):
            self._token_requests[token] = [
                ts for ts in self._token_requests[token] if ts > cutoff
            ]
            if not self._token_requests[token]:
                del self._token_requests[token]
        
        self._last_cleanup = now
    
    def check_rate_limit(
        self,
        token: Optional[ApiToken],
        request: Request,
    ) -> None:
        """Check if request exceeds rate limit."""
        if not RATE_LIMIT_ENABLED:
            return
        
        self._cleanup_old_entries()
        
        # Use token-specific limit if available
        if token and token.requests_per_minute:
            limit = token.requests_per_minute
            key = f"token:{token.token}"
        else:
            # Use default limit based on IP
            limit = DEFAULT_RATE_LIMIT_PER_MINUTE
            key = f"ip:{get_remote_address(request)}"
        
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)
        
        # Get requests in the last minute
        requests = self._token_requests[key]
        requests = [ts for ts in requests if ts > cutoff]
        
        if len(requests) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {limit} requests per minute",
            )
        
        # Record this request
        requests.append(now)
        self._token_requests[key] = requests


token_rate_limiter = TokenRateLimiter()

