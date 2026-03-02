"""
Security headers middleware for FastAPI.
Adds security headers to all responses.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    Implements OWASP security best practices.
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # X-Content-Type-Options: Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-Frame-Options: Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-XSS-Protection: Enable XSS filter (legacy, but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer-Policy: Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content-Security-Policy: Prevent XSS and injection attacks
        # Adjust based on your needs
        # Allow Swagger UI resources from CDN for /docs endpoint
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "  # Allow Swagger UI scripts
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "  # Allow Swagger UI styles
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://cdn.jsdelivr.net; "  # Allow Swagger UI fonts
            "connect-src 'self' https://cdn.jsdelivr.net; "  # Allow Swagger UI source maps and API calls
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # Permissions-Policy: Control browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=()"
        )
        
        # Strict-Transport-Security (HSTS) - Only add if using HTTPS
        # Uncomment if you're using HTTPS in production
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        return response

