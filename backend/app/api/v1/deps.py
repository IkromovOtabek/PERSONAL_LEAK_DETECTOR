from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    import logging
    logger = logging.getLogger(__name__)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Log token for debugging
        logger.info(f"Received token: {token[:20]}... (length: {len(token)})")
        
        # Decode token
        payload = decode_access_token(token)
        if payload is None:
            logger.warning("Token decode failed: payload is None")
            raise credentials_exception
        
        logger.info(f"Token decoded successfully. Payload: {payload}")
        
        # Get user ID from token
        user_id = payload.get("sub")
        if user_id is None:
            logger.warning(f"Token payload missing 'sub' field. Payload keys: {list(payload.keys())}")
            raise credentials_exception
        
        # Convert user_id to int if it's a string
        try:
            if isinstance(user_id, str):
                user_id = int(user_id)
            elif not isinstance(user_id, int):
                logger.warning(f"Invalid user_id type: {type(user_id)}, value: {user_id}")
                raise credentials_exception
        except (ValueError, TypeError) as e:
            logger.warning(f"Could not convert user_id to int: {user_id}, error: {str(e)}")
            raise credentials_exception
        
        logger.info(f"User ID from token: {user_id} (type: {type(user_id)})")
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            logger.warning(f"User not found with ID: {user_id}")
            raise credentials_exception
        
        # Check if user is active
        if not user.is_active:
            logger.warning(f"User {user_id} is inactive")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_current_user: {str(e)}", exc_info=True)
        raise credentials_exception

def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify admin status."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

