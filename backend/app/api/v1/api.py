from fastapi import APIRouter
from app.api.v1.endpoints import auth, sensitive_items, scans, findings, oauth, users, admin, monitoring, encryption, encrypted_files
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/user", tags=["users"])
api_router.include_router(sensitive_items.router, prefix="/sensitive-items", tags=["sensitive-items"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(findings.router, prefix="/findings", tags=["findings"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["oauth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(encryption.router, prefix="/encryption", tags=["encryption"])
api_router.include_router(encrypted_files.router, prefix="/encrypted-files", tags=["encrypted-files"])
