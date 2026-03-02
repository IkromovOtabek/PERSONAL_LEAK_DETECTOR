from pydantic_settings import BaseSettings
from typing import List, Optional
import os
import json

def load_credentials_from_file() -> tuple[Optional[str], Optional[str]]:
    """
    Load Gmail credentials from credentials.json file if it exists.
    
    Returns:
        Tuple of (client_id, client_secret) or (None, None) if not found
    """
    try:
        # Try to find credentials.json in backend/credentials directory
        credentials_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'credentials', 
            'credentials.json'
        )
        if os.path.exists(credentials_path):
            with open(credentials_path, 'r', encoding='utf-8') as f:
                credentials_data = json.load(f)
                # Extract client_id and client_secret
                config = credentials_data.get('web') or credentials_data.get('installed')
                if config:
                    client_id = config.get('client_id', '')
                    client_secret = config.get('client_secret', '')
                    if client_id and client_secret:
                        return client_id, client_secret
    except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
        # Credentials file not found or invalid - will use environment variables
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"Could not load credentials from file: {e}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Unexpected error loading credentials: {e}")
    return None, None

class Settings(BaseSettings):
    # Database
    # Use SQLite by default (change to PostgreSQL for production)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pld.db")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # OAuth - Gmail
    GMAIL_CLIENT_ID: str = os.getenv("GMAIL_CLIENT_ID", "")
    GMAIL_CLIENT_SECRET: str = os.getenv("GMAIL_CLIENT_SECRET", "")
    GMAIL_REDIRECT_URI: str = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:8000/api/v1/oauth/gmail/callback")
    
    # Encryption
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "change-me-32-byte-key-here!")
    
    # CORS — development uchun "*" barcha originlarni qabul qiladi (OPTIONS 400 xatosini oldini oladi)
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    # Allowed hosts
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Email
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@pld.local")
    
    # File upload
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Load credentials from file if not set in environment
if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
    file_client_id, file_client_secret = load_credentials_from_file()
    if file_client_id and file_client_secret:
        settings.GMAIL_CLIENT_ID = file_client_id
        settings.GMAIL_CLIENT_SECRET = file_client_secret

