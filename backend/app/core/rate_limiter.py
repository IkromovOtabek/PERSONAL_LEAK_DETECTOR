"""
Rate limiting utilities.
"""
from functools import wraps
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Dict, Tuple
import time

# Simple in-memory rate limiter (for production, use Redis)
_rate_limit_store: Dict[str, list] = {}

def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """
    Rate limiting decorator.
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get client identifier (IP or user ID)
            request = kwargs.get('request') or args[0] if args else None
            if request:
                client_id = request.client.host if hasattr(request, 'client') else 'default'
            else:
                client_id = 'default'
            
            key = f"{func.__name__}:{client_id}"
            now = time.time()
            
            # Clean old entries
            if key in _rate_limit_store:
                _rate_limit_store[key] = [
                    timestamp for timestamp in _rate_limit_store[key]
                    if now - timestamp < window_seconds
                ]
            else:
                _rate_limit_store[key] = []
            
            # Check rate limit
            if len(_rate_limit_store[key]) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds."
                )
            
            # Add current request
            _rate_limit_store[key].append(now)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

