"""
Rate limiting middleware for FastAPI.
Prevents brute-force attacks and abuse.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
import time
import logging
from collections import defaultdict
from typing import Dict, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.
    Tracks requests by IP address, token, and user.
    """
    
    def __init__(self, app, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        # Store request timestamps: {identifier: [timestamps]}
        self.request_history: Dict[str, list] = defaultdict(list)
        # Cleanup old entries periodically
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
    
    def _get_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting."""
        # Try to get user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"
        
        # Try to get token from query params or headers
        token = request.query_params.get("token") or request.headers.get("X-Token")
        if token:
            return f"token:{token[:20]}"  # Use first 20 chars for privacy
        
        # Fall back to IP address
        ip_address = request.client.host if request.client else "unknown"
        return f"ip:{ip_address}"
    
    def _cleanup_old_entries(self):
        """Remove old entries from request history."""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_minute = current_time - 60
        cutoff_hour = current_time - 3600
        
        identifiers_to_remove = []
        for identifier, timestamps in self.request_history.items():
            # Keep only timestamps from last hour
            filtered = [ts for ts in timestamps if ts > cutoff_hour]
            if filtered:
                self.request_history[identifier] = filtered
            else:
                identifiers_to_remove.append(identifier)
        
        for identifier in identifiers_to_remove:
            del self.request_history[identifier]
        
        self.last_cleanup = current_time
    
    def _check_rate_limit(self, identifier: str) -> Tuple[bool, str]:
        """
        Check if request should be rate limited.
        Returns: (allowed, message)
        """
        current_time = time.time()
        timestamps = self.request_history[identifier]
        
        # Remove timestamps older than 1 hour
        cutoff_hour = current_time - 3600
        timestamps = [ts for ts in timestamps if ts > cutoff_hour]
        self.request_history[identifier] = timestamps
        
        # Check per-minute limit
        cutoff_minute = current_time - 60
        recent_requests = [ts for ts in timestamps if ts > cutoff_minute]
        
        if len(recent_requests) >= self.requests_per_minute:
            return False, f"Rate limit exceeded: {self.requests_per_minute} requests per minute"
        
        # Check per-hour limit
        if len(timestamps) >= self.requests_per_hour:
            return False, f"Rate limit exceeded: {self.requests_per_hour} requests per hour"
        
        # Add current request timestamp
        timestamps.append(current_time)
        self.request_history[identifier] = timestamps
        
        return True, ""
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)
        
        # Skip rate limiting for check_only requests (status checks)
        # These are lightweight and shouldn't be rate limited
        if request.query_params.get("check_only", "").lower() == "true":
            return await call_next(request)
        
        # Cleanup old entries periodically
        self._cleanup_old_entries()
        
        # Get identifier
        identifier = self._get_identifier(request)
        
        # Check rate limit
        allowed, message = self._check_rate_limit(identifier)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for {identifier}: {message}")
            # Return JSONResponse directly instead of raising HTTPException
            # This prevents middleware chain issues
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": message},
                headers={"Retry-After": "60"}
            )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Add rate limit headers (only if response is available and connection is still open)
            try:
                timestamps = self.request_history[identifier]
                recent_count = len([ts for ts in timestamps if ts > time.time() - 60])
                if hasattr(response, 'headers'):
                    response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
                    response.headers["X-RateLimit-Remaining"] = str(max(0, self.requests_per_minute - recent_count))
            except (AttributeError, RuntimeError, OSError) as header_error:
                # Connection closed or response already sent - this is normal
                logger.debug(f"Could not add rate limit headers (connection may be closed): {type(header_error).__name__}")
            
            return response
        except Exception as e:
            # Handle client disconnection errors gracefully
            error_name = e.__class__.__name__
            if error_name in ('EndOfStream', 'ConnectionResetError', 'ConnectionAbortedError', 'BrokenPipeError'):
                logger.debug(f"Client disconnected during rate limit check: {error_name}")
                # Re-raise to let exception handler deal with it
                raise
            # Re-raise other exceptions
            raise

