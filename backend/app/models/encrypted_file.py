"""
Encrypted file model for sharing encrypted files via links with access codes.
Uses AES-256-CBC encryption (same as encryption.py).
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, LargeBinary, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.core.timezone import kst_now, KST
from datetime import datetime, timedelta
import secrets
import hashlib


class EncryptedFile(Base):
    """
    Model for encrypted file sharing with access codes.
    Files are encrypted client-side using AES-256-CBC.
    """
    __tablename__ = "encrypted_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # File metadata
    original_filename = Column(String(255), nullable=False)
    encrypted_filename = Column(String(255), nullable=False)  # Object key in S3/MinIO or local path
    file_size = Column(BigInteger, nullable=False)  # Size of encrypted file
    mime_type = Column(String(100), nullable=True)  # MIME type
    
    # Encryption metadata (AES-256-CBC)
    encrypted_data = Column(LargeBinary, nullable=True)  # Encrypted file data (if stored locally)
    # Note: For large files, we'll use S3/MinIO, encrypted_data will be null
    
    # Security
    download_token = Column(String(255), unique=True, nullable=False, index=True)  # Unique token for download
    access_code_hash = Column(String(255), nullable=False)  # Hashed access code
    # Access code is required to download the file
    
    # Expiry and usage limits
    expires_at = Column(DateTime, nullable=False, index=True)  # When file expires
    max_downloads = Column(Integer, default=1)  # Maximum number of downloads
    download_count = Column(Integer, default=0)  # Current download count
    is_one_time = Column(Boolean, default=True)  # One-time token flag
    is_used = Column(Boolean, default=False, index=True)  # Token usage flag
    
    # Status
    is_deleted = Column(Boolean, default=False)  # Soft delete flag
    is_expired = Column(Boolean, default=False)  # Expired flag
    upload_completed = Column(Boolean, default=False)  # Whether upload is completed
    
    # Storage type
    storage_type = Column(String(20), default='local')  # 'local' or 's3'
    
    # Timestamps
    created_at = Column(DateTime, default=kst_now, nullable=False)
    updated_at = Column(DateTime, default=kst_now, onupdate=kst_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="encrypted_files")
    
    @staticmethod
    def hash_access_code(code: str) -> str:
        """Hash access code using SHA-256."""
        return hashlib.sha256(code.encode('utf-8')).hexdigest()
    
    def verify_access_code(self, code: str) -> bool:
        """Verify access code."""
        return self.access_code_hash == self.hash_access_code(code)
    
    @staticmethod
    def generate_token() -> str:
        """Generate unique download token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_access_code() -> str:
        """Generate 6-digit access code."""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    def is_expired_check(self):
        """Check if file is expired."""
        if self.is_expired:
            return True
        if self.expires_at:
            now = kst_now()
            expires = self.expires_at
            
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=KST)
            
            if now.tzinfo is None:
                now = now.replace(tzinfo=KST)
            
            if expires < now:
                self.is_expired = True
                return True
        return False
    
    def can_download(self):
        """Check if file can be downloaded."""
        if self.is_deleted:
            return False
        if self.is_expired_check():
            return False
        if not self.upload_completed:
            return False
        if self.is_one_time and self.is_used:
            return False
        if self.download_count >= self.max_downloads:
            return False
        return True

