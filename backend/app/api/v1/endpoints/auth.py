from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.models.user import User
from datetime import timedelta
from app.core.config import settings
import base64

router = APIRouter()

# Continue with Google: login + Gmail access in one flow (no credentials.json from user)
GOOGLE_LOGIN_STATE = "login"

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    from app.core.validators import validate_email, validate_password
    from app.core.exceptions import ConflictError, ValidationError
    from sqlalchemy.exc import IntegrityError
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Validate input
        validate_email(user_data.email)
        validate_password(user_data.password)
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise ConflictError("Email already registered")
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            is_verified=False,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user registered: {user_data.email}")
        return new_user
        
    except (ValidationError, ConflictError) as e:
        # These are expected errors, let them propagate
        db.rollback()
        raise
    except IntegrityError as e:
        # Database integrity error (e.g., duplicate email)
        db.rollback()
        logger.error(f"Database integrity error during registration: {str(e)}")
        raise ConflictError("Email already registered")
    except Exception as e:
        # Unexpected errors
        db.rollback()
        logger.error(f"Unexpected error during registration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token."""
    from app.core.validators import validate_email
    from app.core.exceptions import UnauthorizedError, ForbiddenError
    from app.models.audit_log import AuditLog
    
    try:
        # Validate email format (allow "admin" as special case)
        validate_email(user_data.email)
        
        user = db.query(User).filter(User.email == user_data.email).first()
        
        # Log login attempt
        login_success = False
        if user and verify_password(user_data.password, user.password_hash):
            if not user.is_active:
                # Log failed login (inactive account)
                audit_log = AuditLog(
                    user_id=user.id,
                    action="login_failed",
                    meta={"reason": "account_inactive", "email": user_data.email}
                )
                db.add(audit_log)
                db.commit()
                raise ForbiddenError("User account is inactive")
            
            login_success = True
        else:
            # Log failed login (wrong credentials)
            audit_log = AuditLog(
                user_id=None,
                action="login_failed",
                meta={"reason": "invalid_credentials", "email": user_data.email}
            )
            db.add(audit_log)
            db.commit()
            raise UnauthorizedError("Incorrect email or password")
        
        # Log successful login
        if login_success:
            audit_log = AuditLog(
                user_id=user.id,
                action="login_success",
                meta={"email": user.email, "is_admin": user.is_admin}
            )
            db.add(audit_log)
            db.commit()
        
        # Create access token
        # JWT requires 'sub' to be a string, so convert user.id to string
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except (UnauthorizedError, ForbiddenError):
        raise
    except Exception as e:
        raise


@router.get("/google")
def google_login():
    """
    Continue with Google: return authorization_url for OAuth.
    User clicks this → redirects to Google (login + Gmail scopes) → callback creates/finds user, saves Gmail token, redirects to frontend with JWT.
    credentials.json is NOT requested from user; server uses GMAIL_CLIENT_ID/SECRET from env or credentials file.
    """
    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth libraries not installed"
        )
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gmail OAuth not configured (set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET or add credentials.json)"
        )
    redirect_uri = settings.GMAIL_REDIRECT_URI
    if not redirect_uri:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="GMAIL_REDIRECT_URI not set")
    scopes = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
    ]
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=scopes,
    )
    flow.redirect_uri = redirect_uri
    state = base64.urlsafe_b64encode(GOOGLE_LOGIN_STATE.encode()).decode()
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return {"authorization_url": authorization_url}

