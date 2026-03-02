from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.schemas.connected_account import ConnectedAccountResponse
from app.models.connected_account import ConnectedAccount, ProviderType
from app.models.user import User
from app.core.config import settings
from app.core.security import encrypt_data, decrypt_data
import json
import os
import base64
import requests

# Optional OAuth imports
try:
    from google_auth_oauthlib.flow import Flow
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build as build_service
    OAUTH_AVAILABLE = True
    GOOGLE_API_AVAILABLE = True
except ImportError:
    OAUTH_AVAILABLE = False
    GOOGLE_API_AVAILABLE = False
    Flow = None
    Credentials = None
    Request = None
    build_service = None

router = APIRouter()

# Gmail OAuth scopes
GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',  # For delete and modify operations
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

@router.get("/gmail/connect")
def gmail_connect(current_user: User = Depends(get_current_user)):
    """Initiate Gmail OAuth flow."""
    if not OAUTH_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth libraries not installed. Install: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client"
        )
    
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gmail OAuth not configured"
        )
    
    # Include 'openid' scope upfront to avoid scope mismatch
    all_scopes = ['openid'] + GMAIL_SCOPES
    
    # Verify redirect URI is set correctly
    redirect_uri = settings.GMAIL_REDIRECT_URI
    if not redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Redirect URI not configured"
        )
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]  # Ensure redirect URI is in config
            }
        },
        scopes=all_scopes
    )
    flow.redirect_uri = redirect_uri
    
    # Encode user ID in state to retrieve it in callback
    user_state = base64.urlsafe_b64encode(str(current_user.id).encode()).decode()
    
    authorization_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=user_state  # Pass user ID in state
    )
    
    return {
        "authorization_url": authorization_url,
        "state": user_state,  # Return the user state we created
        "redirect_uri": redirect_uri  # Return redirect URI for verification
    }

@router.get("/gmail/callback")
def gmail_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle Gmail OAuth callback."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Log all parameters for debugging
    logger.info(f"Gmail callback received - code: {code is not None}, state: {state is not None}, error: {error}")
    
    if not OAUTH_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth libraries not installed. Install: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client"
        )
    
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gmail OAuth not configured"
        )
    
    # Check if Google returned an error
    if error:
        error_msg = error_description or error
        logger.error(f"Google OAuth error: {error} - {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth xatosi: {error}. {error_msg if error_description else ''}"
        )
    
    # Check if code is missing
    if not code:
        logger.error("Authorization code missing in callback")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code topilmadi. Iltimos, qayta urinib ko'ring."
        )
    
    # Check if state is missing
    if not state:
        logger.error("State parameter missing in callback")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State parametri topilmadi. Iltimos, qayta urinib ko'ring."
        )
    
    # Decode user ID from state
    try:
        user_id_str = base64.urlsafe_b64decode(state.encode()).decode()
        user_id = int(user_id_str)
        logger.info(f"Decoded user_id from state: {user_id}")
    except (ValueError, TypeError, Exception) as e:
        logger.error(f"Failed to decode state parameter: {state}, error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"State parametri noto'g'ri: {str(e)}. Iltimos, qayta urinib ko'ring."
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Prepare client config
    client_config = {
        "web": {
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GMAIL_REDIRECT_URI]
        }
    }
    
    # Create flow - include 'openid' scope upfront to avoid scope mismatch
    # Google automatically adds 'openid' scope, so we include it from the start
    all_scopes = ['openid'] + GMAIL_SCOPES
    
    try:
        flow = Flow.from_client_config(
            client_config,
            scopes=all_scopes
        )
        flow.redirect_uri = settings.GMAIL_REDIRECT_URI
        
        # Verify redirect URI matches
        if flow.redirect_uri != settings.GMAIL_REDIRECT_URI:
            logger.error(f"Redirect URI mismatch. Expected: {settings.GMAIL_REDIRECT_URI}, Got: {flow.redirect_uri}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Redirect URI mos kelmadi. Kutilgan: {settings.GMAIL_REDIRECT_URI}, Olingan: {flow.redirect_uri}"
            )
        
        logger.info(f"Flow created successfully. Redirect URI: {flow.redirect_uri}, Scopes: {all_scopes}")
        
        # Fetch token - Google may reorder scopes, but we include 'openid' upfront
        credentials = None
        try:
            logger.info("Attempting to fetch token from Google...")
            flow.fetch_token(code=code)
            credentials = flow.credentials
            logger.info("Token fetched successfully")
        except Exception as token_error:
            # Check error type
            error_str = str(token_error).lower()
            error_msg = str(token_error)
            
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Token fetch error: {token_error}")
            
            # Check for specific error types
            if 'invalid_grant' in error_str or 'bad request' in error_str:
                # Common causes:
                # 1. Authorization code already used
                # 2. Redirect URI mismatch
                # 3. Client ID/Secret mismatch
                # 4. System clock skew
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Token olishda xatolik. Quyidagilarni tekshiring:\n"
                        "1. Redirect URI Google Cloud Console'da to'g'ri sozlanganmi? "
                        f"({settings.GMAIL_REDIRECT_URI})\n"
                        "2. Client ID va Client Secret to'g'rimi?\n"
                        "3. System clock to'g'ri soatlanganmi?\n"
                        "4. Authorization code allaqachon ishlatilgan bo'lishi mumkin. "
                        "Iltimos, qayta autentifikatsiya qiling."
                    )
                )
            elif 'scope' in error_str and ('changed' in error_str or 'mismatch' in error_str):
                # Scope mismatch - try to extract granted scopes
                logger.warning(f"Scope change detected: {token_error}")
                
                # Extract granted scopes from error message
                try:
                    if "to" in error_msg.lower():
                        parts = error_msg.split("to", 1)
                        if len(parts) > 1:
                            granted_scopes_str = parts[1].strip().strip("'\"")
                            granted_scopes = granted_scopes_str.split()
                            
                            # Create a new flow with the granted scopes
                            flow = Flow.from_client_config(
                                client_config,
                                scopes=granted_scopes
                            )
                            flow.redirect_uri = settings.GMAIL_REDIRECT_URI
                            
                            # Try fetching token again
                            # Note: Code might be already used
                            try:
                                flow.fetch_token(code=code)
                                credentials = flow.credentials
                            except Exception as retry_error:
                                logger.error(f"Retry failed: {retry_error}")
                                raise HTTPException(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=(
                                        "Authorization code allaqachon ishlatilgan. "
                                        "Iltimos, qayta autentifikatsiya qiling."
                                    )
                                )
                    else:
                        raise
                except Exception as parse_error:
                    logger.error(f"Could not parse scope error: {parse_error}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Scope validation xatosi: {str(token_error)}. "
                            "Iltimos, qayta autentifikatsiya qiling."
                        )
                    )
            else:
                # Re-raise if it's a different error
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Token olishda xatolik: {str(token_error)}"
                )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google'dan credentials olinmadi"
            )
        
        # Verify that we have the required scopes
        granted_scopes = set(credentials.scopes) if credentials.scopes else set()
        required_scopes = set(GMAIL_SCOPES)
        
        # Check if we have at least the userinfo scopes (gmail.readonly may not be granted if user denies)
        has_userinfo = 'https://www.googleapis.com/auth/userinfo.email' in granted_scopes
        has_profile = 'https://www.googleapis.com/auth/userinfo.profile' in granted_scopes
        
        if not (has_userinfo and has_profile):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Required scopes not granted. Please grant access to email and profile information."
            )
        
        # Get user email from Google
        if not GOOGLE_API_AVAILABLE or not build_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google API libraries not installed"
            )
        
        service = build_service('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        email = user_info.get('email')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email from Google account"
            )
        
        # Use the scopes that were actually granted by Google
        # Google may add 'openid' scope automatically, which is fine
        granted_scopes = credentials.scopes if credentials.scopes else GMAIL_SCOPES
        
        # Log granted scopes for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Granted scopes after OAuth callback: {granted_scopes}")
        
        # Check if gmail.modify scope is present
        required_scope = 'https://www.googleapis.com/auth/gmail.modify'
        has_modify_scope = required_scope in granted_scopes
        
        if not has_modify_scope:
            logger.warning(f"gmail.modify scope not found in granted scopes: {granted_scopes}")
            logger.warning("User needs to re-authenticate and grant gmail.modify scope")
        
        # Encrypt and store tokens
        token_dict = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': granted_scopes  # Use granted scopes, not requested ones
        }
        encrypted_tokens = encrypt_data(json.dumps(token_dict))
        
        # Check if account already connected
        existing = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == user.id,
            ConnectedAccount.provider == ProviderType.GMAIL,
            ConnectedAccount.email == email
        ).first()
        
        if existing:
            existing.oauth_tokens = encrypted_tokens
            existing.is_active = True
            try:
                db.commit()
                db.refresh(existing)
            except Exception as e:
                db.rollback()
                raise
        else:
            existing = ConnectedAccount(
                user_id=user.id,
                provider=ProviderType.GMAIL,
                oauth_tokens=encrypted_tokens,
                email=email,
                is_active=True
            )
            db.add(existing)
        
        try:
            db.commit()
            db.refresh(existing)
        except Exception as e:
            db.rollback()
            raise
        
        # Redirect to frontend with success message
        from fastapi.responses import RedirectResponse
        frontend_url = settings.FRONTEND_URL
        return RedirectResponse(
            url=f"{frontend_url}/settings?gmail_connected=true&email={email}",
            status_code=status.HTTP_302_FOUND
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Gmail callback: {str(e)}", exc_info=True)
        error_detail = str(e)
        
        # Provide more specific error messages
        if "invalid_grant" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Authorization code allaqachon ishlatilgan yoki muddati o'tgan. "
                    "Iltimos, qayta autentifikatsiya qiling:\n"
                    "1. Settings sahifasiga o'ting\n"
                    "2. 'Gmail Hisobini Ulash (OAuth)' tugmasini bosing\n"
                    "3. Google'da yangi ruxsat bering"
                )
            )
        elif "redirect_uri_mismatch" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Redirect URI mos kelmadi. Google Cloud Console'da quyidagi URI qo'shilganligini tekshiring:\n"
                    f"{settings.GMAIL_REDIRECT_URI}\n"
                    "Iltimos, Google Cloud Console'da 'Authorized redirect URIs' bo'limiga bu URI'ni qo'shing."
                )
            )
        elif "access_denied" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Ruxsat rad etildi. Iltimos:\n"
                    "1. Google Cloud Console'da OAuth consent screen'ni 'Production' holatiga o'tkazing\n"
                    "2. Yoki 'Test users' ro'yxatiga email manzilingizni qo'shing\n"
                    "3. Qayta urinib ko'ring"
                )
            )
        elif "malformed" in error_detail.lower() or "bad request" in error_detail.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "So'rov noto'g'ri formatda. Quyidagilarni tekshiring:\n"
                    "1. Google Cloud Console'da OAuth Client ID to'g'ri sozlanganmi?\n"
                    "2. Redirect URI Google Cloud Console'da qo'shilganmi?\n"
                    "3. Client ID va Client Secret to'g'rimi?\n"
                    f"4. Redirect URI: {settings.GMAIL_REDIRECT_URI}\n"
                    "Iltimos, qayta urinib ko'ring."
                )
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gmail hisobini ulashda xatolik: {error_detail}"
            )

@router.get("/accounts", response_model=List[ConnectedAccountResponse])
def get_connected_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all connected accounts for current user."""
    accounts = db.query(ConnectedAccount).filter(
        ConnectedAccount.user_id == current_user.id,
        ConnectedAccount.is_active == True
    ).all()
    
    return accounts

@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect a connected account."""
    from app.core.exceptions import NotFoundError
    
    account = db.query(ConnectedAccount).filter(
        ConnectedAccount.id == account_id,
        ConnectedAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise NotFoundError("Account", str(account_id))
    
    try:
        account.is_active = False
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise

@router.post("/gmail/scan/{account_id}", status_code=status.HTTP_201_CREATED)
def scan_gmail_account(
    account_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start scanning Gmail account for sensitive information."""
    from app.core.exceptions import NotFoundError
    from app.models.scan import Scan, ScanStatus, ScanType
    from app.services.scan_service import start_scan_task
    
    # Check if account exists and belongs to user
    account = db.query(ConnectedAccount).filter(
        ConnectedAccount.id == account_id,
        ConnectedAccount.user_id == current_user.id,
        ConnectedAccount.provider == ProviderType.GMAIL,
        ConnectedAccount.is_active == True
    ).first()
    
    if not account:
        raise NotFoundError("Account", str(account_id))
    
    # Create scan record
    new_scan = Scan(
        user_id=current_user.id,
        type=ScanType.EMAIL,
        status=ScanStatus.PENDING,
        summary={}
    )
    
    try:
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)
        
        # Start scan task in background (Celery agar Redis mavjud bo'lsa, aks holda FastAPI background_tasks)
        try:
            from app.celery_app import celery_app, CELERY_AVAILABLE
            if CELERY_AVAILABLE and celery_app:
                celery_app.send_task(
                    "app.services.scan_service.start_scan_task",
                    args=[new_scan.id, ScanType.EMAIL.value, str(account_id)]
                )
            else:
                background_tasks.add_task(start_scan_task, new_scan.id, ScanType.EMAIL.value, str(account_id))
        except (ImportError, OSError, ConnectionRefusedError, Exception):
            # Redis/Celery mavjud emas yoki ulanish rad etilgan — background_tasks ishlatamiz
            background_tasks.add_task(start_scan_task, new_scan.id, ScanType.EMAIL.value, str(account_id))
        
        return {
            "message": "Gmail tahlil qilish boshlandi",
            "scan_id": new_scan.id,
            "status": new_scan.status.value
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gmail tahlil qilishda xatolik: {str(e)}"
        )

@router.post("/gmail/upload-credentials")
async def upload_gmail_credentials(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload Gmail credentials.json file."""
    if not file.filename.endswith('.json'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fayl .json formatida bo'lishi kerak"
        )
    
    try:
        # Read file content
        content = await file.read()
        credentials_data = json.loads(content.decode('utf-8'))
        
        # Validate credentials structure
        if 'web' not in credentials_data and 'installed' not in credentials_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Noto'g'ri credentials.json formati. 'web' yoki 'installed' bo'limi bo'lishi kerak"
            )
        
        # Extract client_id and client_secret
        config = credentials_data.get('web') or credentials_data.get('installed')
        if not config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credentials.json'da 'web' yoki 'installed' bo'limi topilmadi"
            )
        
        client_id = config.get('client_id')
        client_secret = config.get('client_secret')
        
        if not client_id or not client_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credentials.json'da client_id yoki client_secret topilmadi"
            )
        
        # Ensure redirect_uri is in the credentials
        if 'redirect_uris' not in config:
            config['redirect_uris'] = []
        
        # Add correct redirect URI if not present
        correct_redirect_uri = settings.GMAIL_REDIRECT_URI
        if correct_redirect_uri not in config['redirect_uris']:
            config['redirect_uris'].append(correct_redirect_uri)
            # Update credentials_data with the new redirect_uri
            if 'web' in credentials_data:
                credentials_data['web']['redirect_uris'] = config['redirect_uris']
            elif 'installed' in credentials_data:
                credentials_data['installed']['redirect_uris'] = config['redirect_uris']
        
        # Save credentials to backend/credentials directory
        credentials_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'credentials')
        os.makedirs(credentials_dir, exist_ok=True)
        
        credentials_path = os.path.join(credentials_dir, 'credentials.json')
        with open(credentials_path, 'w', encoding='utf-8') as f:
            json.dump(credentials_data, f, indent=2)
        
        # Update environment variables (for current session)
        os.environ['GMAIL_CLIENT_ID'] = client_id
        os.environ['GMAIL_CLIENT_SECRET'] = client_secret
        
        # Update settings (for current session)
        settings.GMAIL_CLIENT_ID = client_id
        settings.GMAIL_CLIENT_SECRET = client_secret
        
        return {
            "message": "Credentials.json muvaffaqiyatli yuklandi",
            "client_id": client_id[:20] + "..." if len(client_id) > 20 else client_id
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Noto'g'ri JSON formati"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )

@router.post("/gmail/upload-token")
async def upload_gmail_token(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload Gmail token.json file and connect account."""
    if not OAUTH_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth libraries not installed"
        )
    
    if not file.filename.endswith('.json'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fayl .json formatida bo'lishi kerak"
        )
    
    try:
        # Read file content
        content = await file.read()
        token_data = json.loads(content.decode('utf-8'))
        
        # Validate token structure
        required_fields = ['token', 'refresh_token', 'client_id', 'client_secret']
        for field in required_fields:
            if field not in token_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Token.json'da '{field}' maydoni topilmadi"
                )
        
        # Create credentials from token
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
            client_id=token_data.get('client_id'),
            client_secret=token_data.get('client_secret'),
            scopes=token_data.get('scopes', GMAIL_SCOPES)
        )
        
        # Get user email
        if not GOOGLE_API_AVAILABLE or not build_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google API libraries not installed"
            )
        
        service = build_service('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        email = user_info.get('email')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email olishda xatolik"
            )
        
        # Encrypt and store tokens
        encrypted_tokens = encrypt_data(json.dumps(token_data))
        
        # Check if account already connected
        existing = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == current_user.id,
            ConnectedAccount.provider == ProviderType.GMAIL,
            ConnectedAccount.email == email
        ).first()
        
        if existing:
            existing.oauth_tokens = encrypted_tokens
            existing.is_active = True
        else:
            existing = ConnectedAccount(
                user_id=current_user.id,
                provider=ProviderType.GMAIL,
                oauth_tokens=encrypted_tokens,
                email=email,
                is_active=True
            )
            db.add(existing)
        
        try:
            db.commit()
            db.refresh(existing)
        except Exception as e:
            db.rollback()
            raise
        
        return {
            "message": "Gmail hisob muvaffaqiyatli ulandi",
            "account_id": existing.id,
            "email": email
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Noto'g'ri JSON formati"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )

@router.post("/gmail/message/{message_id}/delete", status_code=status.HTTP_200_OK)
def delete_gmail_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Gmail message."""
    if not GOOGLE_API_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google API kutubxonalari o'rnatilmagan"
        )
    
    # Find connected Gmail account for this user
    account = db.query(ConnectedAccount).filter(
        ConnectedAccount.user_id == current_user.id,
        ConnectedAccount.provider == ProviderType.GMAIL,
        ConnectedAccount.is_active == True
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail hisob topilmadi"
        )
    
    try:
        # Decrypt tokens
        decrypted_tokens = decrypt_data(account.oauth_tokens)
        token_data = json.loads(decrypted_tokens)
        
        # Build credentials
        stored_scopes = token_data.get('scopes', [])
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
            client_id=token_data.get('client_id'),
            client_secret=token_data.get('client_secret'),
            scopes=stored_scopes if stored_scopes else GMAIL_SCOPES
        )
        
        # Log stored scopes for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Stored scopes in token: {stored_scopes}")
        
        # Check if gmail.modify scope is present
        required_scope = 'https://www.googleapis.com/auth/gmail.modify'
        has_modify_scope = required_scope in (stored_scopes if stored_scopes else [])
        
        if not has_modify_scope:
            logger.error(f"gmail.modify scope not found. Stored scopes: {stored_scopes}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Xabarni o'chirish uchun 'gmail.modify' scope'i kerak. "
                    f"Hozirgi scope'lar: {', '.join(stored_scopes) if stored_scopes else 'yo\'q'}. "
                    f"Iltimos, Gmail hisobini qayta ulang va Google'da ruxsat berishda 'gmail.modify' scope'ini tanlang."
                )
            )
        
        logger.info(f"gmail.modify scope found. Proceeding with message deletion. Message ID: {message_id}")
        
        # Refresh token if expired
        if credentials.expired and credentials.refresh_token:
            try:
                logger.info("Token expired, refreshing...")
                credentials.refresh(Request())
                # Update stored tokens
                token_data['token'] = credentials.token
                if credentials.refresh_token:
                    token_data['refresh_token'] = credentials.refresh_token
                account.oauth_tokens = encrypt_data(json.dumps(token_data))
                db.commit()
                logger.info("Token refreshed successfully")
            except Exception as refresh_error:
                logger.error(f"Token refresh error: {refresh_error}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Token yangilashda xatolik: {str(refresh_error)}. Iltimos, qayta autentifikatsiya qiling."
                )
        
        # Build Gmail service
        try:
            service = build_service('gmail', 'v1', credentials=credentials)
            logger.info("Gmail service built successfully")
        except Exception as service_error:
            logger.error(f"Error building Gmail service: {service_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gmail service yaratishda xatolik: {str(service_error)}"
            )
        
        # Delete message - requires gmail.modify scope
        try:
            logger.info(f"Attempting to delete message: {message_id}")
            service.users().messages().delete(userId='me', id=message_id).execute()
            logger.info(f"Message {message_id} deleted successfully")
        except Exception as api_error:
            error_str = str(api_error)
            logger.error(f"Error deleting message: {api_error}")
            if 'insufficient' in error_str.lower() or 'permission' in error_str.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Xabarni o'chirish uchun yetarli ruxsat yo'q. "
                        f"Hozirgi scope'lar: {', '.join(stored_scopes) if stored_scopes else 'yo\'q'}. "
                        f"Xato: {error_str}. "
                        f"Iltimos, Gmail hisobini qayta ulang va Google'da ruxsat berishda 'gmail.modify' scope'ini tanlang."
                    )
                )
            elif 'not found' in error_str.lower() or '404' in error_str.lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Xabar topilmadi. Message ID: {message_id}. Xato: {error_str}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Xabarni o'chirishda xatolik: {error_str}"
                )
        
        return {
            "message": "Xabar muvaffaqiyatli o'chirildi",
            "message_id": message_id
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting Gmail message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xabarni o'chirishda xatolik: {str(e)}"
        )

@router.post("/gmail/message/{message_id}/spam", status_code=status.HTTP_200_OK)
def mark_gmail_message_as_spam(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a Gmail message as spam."""
    if not GOOGLE_API_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google API kutubxonalari o'rnatilmagan"
        )
    
    # Find connected Gmail account for this user
    account = db.query(ConnectedAccount).filter(
        ConnectedAccount.user_id == current_user.id,
        ConnectedAccount.provider == ProviderType.GMAIL,
        ConnectedAccount.is_active == True
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail hisob topilmadi"
        )
    
    try:
        # Decrypt tokens
        decrypted_tokens = decrypt_data(account.oauth_tokens)
        token_data = json.loads(decrypted_tokens)
        
        # Build credentials
        stored_scopes = token_data.get('scopes', [])
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
            client_id=token_data.get('client_id'),
            client_secret=token_data.get('client_secret'),
            scopes=stored_scopes if stored_scopes else GMAIL_SCOPES
        )
        
        # Log stored scopes for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Stored scopes in token (spam): {stored_scopes}")
        
        # Check if gmail.modify scope is present
        required_scope = 'https://www.googleapis.com/auth/gmail.modify'
        has_modify_scope = required_scope in (stored_scopes if stored_scopes else [])
        
        if not has_modify_scope:
            logger.error(f"gmail.modify scope not found. Stored scopes: {stored_scopes}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Xabarni spam sifatida belgilash uchun 'gmail.modify' scope'i kerak. "
                    f"Hozirgi scope'lar: {', '.join(stored_scopes) if stored_scopes else 'yo\'q'}. "
                    f"Iltimos, Gmail hisobini qayta ulang va Google'da ruxsat berishda 'gmail.modify' scope'ini tanlang."
                )
            )
        
        logger.info(f"gmail.modify scope found. Proceeding with spam marking. Message ID: {message_id}")
        
        # Refresh token if expired
        if credentials.expired and credentials.refresh_token:
            try:
                logger.info("Token expired, refreshing...")
                credentials.refresh(Request())
                # Update stored tokens
                token_data['token'] = credentials.token
                if credentials.refresh_token:
                    token_data['refresh_token'] = credentials.refresh_token
                account.oauth_tokens = encrypt_data(json.dumps(token_data))
                db.commit()
                logger.info("Token refreshed successfully")
            except Exception as refresh_error:
                logger.error(f"Token refresh error: {refresh_error}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Token yangilashda xatolik: {str(refresh_error)}. Iltimos, qayta autentifikatsiya qiling."
                )
        
        # Build Gmail service
        try:
            service = build_service('gmail', 'v1', credentials=credentials)
            logger.info("Gmail service built successfully")
        except Exception as service_error:
            logger.error(f"Error building Gmail service: {service_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gmail service yaratishda xatolik: {str(service_error)}"
            )
        
        # Mark as spam (add SPAM label) - requires gmail.modify scope
        try:
            logger.info(f"Attempting to mark message as spam: {message_id}")
            service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'addLabelIds': ['SPAM']}
            ).execute()
            logger.info(f"Message {message_id} marked as spam successfully")
        except Exception as api_error:
            error_str = str(api_error)
            logger.error(f"Error marking message as spam: {api_error}")
            if 'insufficient' in error_str.lower() or 'permission' in error_str.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Xabarni spam sifatida belgilash uchun yetarli ruxsat yo'q. "
                        f"Hozirgi scope'lar: {', '.join(stored_scopes) if stored_scopes else 'yo\'q'}. "
                        f"Xato: {error_str}. "
                        f"Iltimos, Gmail hisobini qayta ulang va Google'da ruxsat berishda 'gmail.modify' scope'ini tanlang."
                    )
                )
            elif 'not found' in error_str.lower() or '404' in error_str.lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Xabar topilmadi. Message ID: {message_id}. Xato: {error_str}"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Xabarni spam sifatida belgilashda xatolik: {error_str}"
                )
        
        return {
            "message": "Xabar spam sifatida belgilandi",
            "message_id": message_id
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error marking Gmail message as spam: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xabarni spam sifatida belgilashda xatolik: {str(e)}"
        )

