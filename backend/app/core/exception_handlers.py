"""
Exception handlers for the FastAPI application.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.core.exceptions import PLDException
import logging
import traceback

logger = logging.getLogger(__name__)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error.get("loc", []))
        errors.append({
            "field": field,
            "message": error.get("msg"),
            "type": error.get("type")
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors
        }
    )

async def pld_exception_handler(request: Request, exc: PLDException):
    """Handle custom PLD exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_type": exc.__class__.__name__
        }
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle SQLAlchemy errors."""
    logger.error(f"Database error: {str(exc)}", exc_info=True)
    
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "Database integrity error. Resource may already exist.",
                "error_type": "IntegrityError"
            }
        )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Database error occurred",
            "error_type": "DatabaseError"
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    # Ignore client disconnection errors (EndOfStream, ConnectionResetError, etc.)
    # These are normal when clients close connections early
    error_name = exc.__class__.__name__
    if error_name in ('EndOfStream', 'ConnectionResetError', 'ConnectionAbortedError', 'BrokenPipeError'):
        logger.info(f"Client disconnected: {error_name} - {str(exc)}")
        # Return a simple response or let it pass
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "detail": "Connection closed by client",
                "error_type": error_name
            }
        )
    
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "error_type": error_name
        }
    )

