"""
API endpoints for encrypted data handling
Demonstrates how to receive and decrypt encrypted data from frontend
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.core.encryption import decrypt_payload, decrypt_file, decrypt_string, decrypt_json
import os
import tempfile
from pathlib import Path

router = APIRouter()

class EncryptedPayload(BaseModel):
    """Request model for encrypted data"""
    encrypted_data: str
    metadata: Dict[str, Any] = {}
    encryption: str = "AES-256-CBC"

class DecryptedResponse(BaseModel):
    """Response model for decrypted data"""
    success: bool
    message: str
    data_type: str
    metadata: Optional[Dict[str, Any]] = None

@router.post("/decrypt", response_model=DecryptedResponse)
def decrypt_data(
    payload: EncryptedPayload,
    current_user: User = Depends(get_current_user)
):
    """
    Decrypt encrypted data sent from frontend.
    
    This endpoint receives encrypted data and decrypts it on the server.
    Supports string, file, and JSON data types.
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Decrypt the payload
        # Pydantic v2 uses model_dump(), but we can also use dict() for compatibility
        try:
            payload_dict = payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()
        except Exception as e:
            logger.error(f"Error converting payload to dict: {str(e)}")
            # If payload is already a dict
            payload_dict = payload if isinstance(payload, dict) else payload.dict()
        
        logger.info(f"Received payload keys: {list(payload_dict.keys())}")
        logger.info(f"Encrypted data length: {len(payload_dict.get('encrypted_data', ''))}")
        logger.info(f"Metadata: {payload_dict.get('metadata', {})}")
        
        # Validate payload structure
        if 'encrypted_data' not in payload_dict:
            logger.error(f"Missing encrypted_data. Payload keys: {list(payload_dict.keys())}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing 'encrypted_data' in payload"
            )
        
        if not payload_dict['encrypted_data']:
            logger.error("encrypted_data is empty")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="encrypted_data cannot be empty"
            )
        
        decrypted_data = decrypt_payload(payload_dict)
        
        # Determine data type from metadata
        metadata = payload.metadata
        data_type = metadata.get('type', 'string')
        
        if data_type == 'file' or 'filename' in metadata:
            # File data - save to temporary file
            filename = metadata.get('filename', 'decrypted_file')
            mime_type = metadata.get('mimeType', 'application/octet-stream')
            
            # Create temporary file
            temp_dir = Path(tempfile.gettempdir())
            temp_file = temp_dir / f"decrypted_{current_user.id}_{filename}"
            
            # Write decrypted bytes to file
            with open(temp_file, 'wb') as f:
                f.write(decrypted_data)
            
            return DecryptedResponse(
                success=True,
                message=f"File decrypted and saved: {temp_file}",
                data_type="file",
                metadata={
                    "filename": filename,
                    "mime_type": mime_type,
                    "size": len(decrypted_data),
                    "temp_path": str(temp_file)
                }
            )
        
        elif data_type == 'json':
            # JSON data
            return DecryptedResponse(
                success=True,
                message="JSON data decrypted successfully",
                data_type="json",
                metadata={
                    "decrypted_data": decrypted_data
                }
            )
        
        else:
            # String data
            return DecryptedResponse(
                success=True,
                message="String data decrypted successfully",
                data_type="string",
                metadata={
                    "decrypted_data": decrypted_data
                }
            )
    
    except ValueError as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Decryption failed: {str(e)}")
        logger.error(f"Payload keys: {list(payload_dict.keys()) if isinstance(payload_dict, dict) else 'N/A'}")
        logger.error(f"Encrypted data type: {type(payload_dict.get('encrypted_data'))}")
        logger.error(f"Encrypted data length: {len(payload_dict.get('encrypted_data', ''))}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Decryption failed: {str(e)}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Server error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )

@router.post("/decrypt-and-scan")
def decrypt_and_scan_file(
    payload: EncryptedPayload,
    current_user: User = Depends(get_current_user)
):
    """
    Decrypt encrypted file and process it (example: scan for PII).
    
    This demonstrates a complete workflow:
    1. Receive encrypted file from frontend
    2. Decrypt on backend
    3. Process the decrypted file
    4. Return results
    """
    try:
        metadata = payload.metadata
        
        # Check if it's a file
        if 'filename' not in metadata:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint requires file data"
            )
        
        # Decrypt the file
        file_bytes = decrypt_file(payload.encrypted_data)
        filename = metadata.get('filename', 'decrypted_file')
        mime_type = metadata.get('mimeType', 'application/octet-stream')
        
        # Save to temporary file for processing
        temp_dir = Path(tempfile.gettempdir())
        temp_file = temp_dir / f"scan_{current_user.id}_{filename}"
        
        with open(temp_file, 'wb') as f:
            f.write(file_bytes)
        
        # Here you would process the file (e.g., scan for PII)
        # For demonstration, we'll just return file info
        file_size = len(file_bytes)
        
        # Clean up temporary file after processing
        # (In production, you might want to keep it for a while)
        # os.remove(temp_file)
        
        return {
            "success": True,
            "message": "File decrypted and processed successfully",
            "file_info": {
                "filename": filename,
                "mime_type": mime_type,
                "size": file_size,
                "temp_path": str(temp_file)
            },
            "scan_results": {
                "status": "completed",
                "findings": 0  # Placeholder - implement actual scanning
            }
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Decryption failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}"
        )

