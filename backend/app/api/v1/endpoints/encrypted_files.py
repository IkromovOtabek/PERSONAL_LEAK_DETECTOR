"""
Encrypted file endpoints for sharing encrypted files via links with access codes.
Uses AES-256-CBC encryption (same as encryption.py).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timedelta
import base64
import logging
import os
from pathlib import Path

from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.models.encrypted_file import EncryptedFile
from app.models.user import User
from app.core.config import settings
from app.core.timezone import kst_now
from pydantic import BaseModel
from app.core.encryption import decrypt_file

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class EncryptedFileUploadRequest(BaseModel):
    filename: str
    size: int
    mime_type: Optional[str] = None
    expires_in_hours: Optional[int] = 24
    max_downloads: Optional[int] = 1
    is_one_time: Optional[bool] = True


class EncryptedFileUploadResponse(BaseModel):
    token: str
    access_code: str  # 6-digit code to share with recipient
    message: str


class EncryptedFileUploadComplete(BaseModel):
    token: str
    encrypted_data: str  # Base64 encoded encrypted file data


class EncryptedFileUploadCompleteResponse(BaseModel):
    success: bool
    download_url: str
    message: str


class EncryptedFileDownloadRequest(BaseModel):
    token: str
    access_code: str  # 6-digit access code


class EncryptedFileInfo(BaseModel):
    token: str
    filename: str
    size: int
    mime_type: Optional[str]
    expires_at: datetime
    download_count: int
    max_downloads: int
    is_one_time: bool
    is_used: bool
    created_at: datetime


class EncryptedFileListResponse(BaseModel):
    files: List[EncryptedFileInfo]
    total: int


@router.post("/upload", response_model=EncryptedFileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_encrypted_file(
    request_data: EncryptedFileUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a record for encrypted file upload.
    Client encrypts file locally, then sends encrypted data.
    Returns token and access code.
    """
    try:
        # Validate file size
        if request_data.size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Fayl juda katta. Maksimal hajm: {settings.MAX_UPLOAD_SIZE} bayt"
            )
        
        # Generate unique token and access code
        download_token = EncryptedFile.generate_token()
        access_code = EncryptedFile.generate_access_code()
        access_code_hash = EncryptedFile.hash_access_code(access_code)
        
        encrypted_filename = f"{download_token}.enc"
        
        # Calculate expiry time
        expires_at = kst_now() + timedelta(hours=request_data.expires_in_hours or 24)
        
        # Create encrypted file record (pending upload)
        encrypted_file = EncryptedFile(
            user_id=current_user.id,
            original_filename=request_data.filename,
            encrypted_filename=encrypted_filename,
            file_size=request_data.size,
            mime_type=request_data.mime_type,
            download_token=download_token,
            access_code_hash=access_code_hash,
            expires_at=expires_at,
            max_downloads=request_data.max_downloads or 1,
            is_one_time=request_data.is_one_time if request_data.is_one_time is not None else True,
            storage_type='local',  # Store encrypted data in database
            upload_completed=False
        )
        
        db.add(encrypted_file)
        db.commit()
        db.refresh(encrypted_file)
        
        logger.info(f"Created encrypted file record: {encrypted_file.id}, token: {download_token}")
        
        return EncryptedFileUploadResponse(
            token=download_token,
            access_code=access_code,  # Return plain access code to user
            message="Fayl yuklash uchun tayyor. Shifrlangan ma'lumotni yuboring."
        )
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating encrypted file record: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )


@router.post("/upload-complete", response_model=EncryptedFileUploadCompleteResponse)
async def complete_upload(
    request_data: EncryptedFileUploadComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete encrypted file upload by storing encrypted data.
    """
    try:
        # Find encrypted file record
        encrypted_file = db.execute(
            select(EncryptedFile)
            .where(
                EncryptedFile.download_token == request_data.token,
                EncryptedFile.user_id == current_user.id,
                EncryptedFile.is_deleted == False
            )
        ).scalar_one_or_none()
        
        if not encrypted_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fayl topilmadi"
            )
        
        if encrypted_file.upload_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fayl allaqachon yuklangan"
            )
        
        # Decode base64 encrypted data
        try:
            encrypted_bytes = base64.b64decode(request_data.encrypted_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Noto'g'ri base64 format: {str(e)}"
            )
        
        # Store encrypted data (for small files, store in DB; for large files, use S3)
        if len(encrypted_bytes) > 10 * 1024 * 1024:  # 10MB
            # For large files, we'd use S3, but for now we'll store in DB
            # In production, S3/local storage can be added if needed
            logger.warning(f"Large file ({len(encrypted_bytes)} bytes) - consider using S3")
        
        encrypted_file.encrypted_data = encrypted_bytes
        encrypted_file.upload_completed = True
        encrypted_file.file_size = len(encrypted_bytes)  # Update actual size
        
        db.commit()
        db.refresh(encrypted_file)
        
        # Construct download URL
        frontend_url = settings.FRONTEND_URL
        download_url = f"{frontend_url}/encrypted-download/{encrypted_file.download_token}"
        
        logger.info(f"Encrypted file upload completed: {encrypted_file.id}")
        
        return EncryptedFileUploadCompleteResponse(
            success=True,
            download_url=download_url,
            message="Fayl muvaffaqiyatli yuklandi"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error completing upload: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )


@router.get("/info/{token}", response_model=EncryptedFileInfo)
async def get_file_info(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get encrypted file information (public endpoint, no auth required).
    """
    try:
        result = db.execute(
            select(EncryptedFile)
            .where(
                EncryptedFile.download_token == token,
                EncryptedFile.is_deleted == False
            )
        )
        encrypted_file = result.scalars().first()
        
        if not encrypted_file:
            logger.warning(f"File not found for token: {token}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fayl topilmadi"
            )
        
        logger.info(f"File info requested for token: {token}, upload_completed: {encrypted_file.upload_completed}")
        
        return EncryptedFileInfo(
            token=encrypted_file.download_token,
            filename=encrypted_file.original_filename,
            size=encrypted_file.file_size,
            mime_type=encrypted_file.mime_type,
            expires_at=encrypted_file.expires_at,
            download_count=encrypted_file.download_count,
            max_downloads=encrypted_file.max_downloads,
            is_one_time=encrypted_file.is_one_time,
            is_used=encrypted_file.is_used,
            created_at=encrypted_file.created_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )


@router.post("/download")
async def download_encrypted_file(
    request_data: EncryptedFileDownloadRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Download encrypted file (requires access code).
    Returns encrypted file data (client will decrypt).
    """
    try:
        # Find and lock file record
        encrypted_file = db.execute(
            select(EncryptedFile)
            .where(
                EncryptedFile.download_token == request_data.token,
                EncryptedFile.is_deleted == False
            )
            .with_for_update(nowait=False)
        ).scalar_one_or_none()
        
        if not encrypted_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fayl topilmadi"
            )
        
        # Check if upload is completed
        if not encrypted_file.upload_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fayl hali yuklanmagan"
            )
        
        # Check if expired
        if encrypted_file.is_expired_check():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Fayl muddati tugagan"
            )
        
        # Check if one-time token already used
        if encrypted_file.is_one_time and encrypted_file.is_used:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Fayl allaqachon yuklab olingan (bir martalik link)"
            )
        
        # Check download count
        if encrypted_file.download_count >= encrypted_file.max_downloads:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Maksimal yuklab olish soniga yetildi"
            )
        
        # Verify access code
        if not encrypted_file.verify_access_code(request_data.access_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Noto'g'ri kirish kodi"
            )
        
        # Get encrypted data
        if not encrypted_file.encrypted_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Shifrlangan ma'lumot topilmadi"
            )
        
        # Update download count and usage flag
        encrypted_file.download_count += 1
        if encrypted_file.is_one_time:
            encrypted_file.is_used = True
        
        db.commit()
        
        # Return encrypted file data (base64 encoded)
        encrypted_base64 = base64.b64encode(encrypted_file.encrypted_data).decode('utf-8')
        
        logger.info(f"Encrypted file downloaded: {encrypted_file.id}, token: {request_data.token}")
        
        return JSONResponse({
            "success": True,
            "encrypted_data": encrypted_base64,
            "filename": encrypted_file.original_filename,
            "mime_type": encrypted_file.mime_type,
            "size": encrypted_file.file_size
        })
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error downloading file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )


@router.get("/list", response_model=EncryptedFileListResponse)
async def list_encrypted_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all encrypted files uploaded by current user.
    """
    try:
        encrypted_files = db.execute(
            select(EncryptedFile)
            .where(
                EncryptedFile.user_id == current_user.id,
                EncryptedFile.is_deleted == False
            )
            .order_by(EncryptedFile.created_at.desc())
        ).scalars().all()
        
        files_list = [
            EncryptedFileInfo(
                token=f.download_token,
                filename=f.original_filename,
                size=f.file_size,
                mime_type=f.mime_type,
                expires_at=f.expires_at,
                download_count=f.download_count,
                max_downloads=f.max_downloads,
                is_one_time=f.is_one_time,
                is_used=f.is_used,
                created_at=f.created_at
            )
            for f in encrypted_files
        ]
        
        return EncryptedFileListResponse(
            files=files_list,
            total=len(files_list)
        )
    
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )


@router.delete("/{token}")
async def delete_encrypted_file(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete encrypted file (soft delete).
    """
    try:
        encrypted_file = db.execute(
            select(EncryptedFile)
            .where(
                EncryptedFile.download_token == token,
                EncryptedFile.user_id == current_user.id,
                EncryptedFile.is_deleted == False
            )
        ).scalar_one_or_none()
        
        if not encrypted_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fayl topilmadi"
            )
        
        encrypted_file.is_deleted = True
        db.commit()
        
        logger.info(f"Encrypted file deleted: {encrypted_file.id}")
        
        return JSONResponse({
            "success": True,
            "message": "Fayl o'chirildi"
        })
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Xatolik: {str(e)}"
        )

