"""
AES-256 Decryption utilities for server-side decryption
Uses cryptography library for AES-256-CBC decryption
"""
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import base64
import os
from typing import Union
from app.core.config import settings

def _get_encryption_key() -> bytes:
    """
    Get encryption key from settings and ensure it's 32 bytes (256 bits) for AES-256.
    If key is shorter, pad it. If longer, truncate it.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    key_string = settings.ENCRYPTION_KEY
    key = key_string.encode('utf-8')
    
    # AES-256 requires exactly 32 bytes (256 bits)
    if len(key) < 32:
        # Pad with zeros if key is too short
        key = key + b'\0' * (32 - len(key))
        logger.debug(f"Key padded from {len(key_string.encode('utf-8'))} to 32 bytes")
    elif len(key) > 32:
        # Truncate if key is too long
        key = key[:32]
        logger.debug(f"Key truncated from {len(key_string.encode('utf-8'))} to 32 bytes")
    
    # Debug: Log key info (first 4 bytes only for security)
    logger.debug(f"Using encryption key: length={len(key)} bytes, first_bytes={key[:4].hex()}")
    
    return key

def decrypt_string(encrypted_data: str) -> str:
    """
    Decrypt a string that was encrypted using AES-256-CBC.
    
    Args:
        encrypted_data: Base64 encoded encrypted data (format: iv:encryptedData)
    
    Returns:
        Decrypted plaintext string
    
    Raises:
        ValueError: If decryption fails
    """
    if not encrypted_data:
        raise ValueError('Encrypted data cannot be empty')
    
    if not isinstance(encrypted_data, str):
        raise ValueError(f'Encrypted data must be a string, got {type(encrypted_data).__name__}')
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Decode from base64
        try:
            encrypted_bytes = base64.b64decode(encrypted_data, validate=True)
        except Exception as e:
            raise ValueError(f'Invalid base64 format: {str(e)}')
        
        logger.debug(f"Decrypting: encrypted_data length={len(encrypted_data)}, decoded bytes={len(encrypted_bytes)}")
        
        # Check minimum length (at least 16 bytes for IV + some ciphertext)
        if len(encrypted_bytes) < 17:
            raise ValueError(f'Encrypted data too short: {len(encrypted_bytes)} bytes (minimum 17 bytes required)')
        
        # Extract IV (first 16 bytes) and ciphertext (rest)
        iv = encrypted_bytes[:16]
        ciphertext = encrypted_bytes[16:]
        
        logger.debug(f"Extracted IV: {len(iv)} bytes, Ciphertext: {len(ciphertext)} bytes")
        
        if len(ciphertext) == 0:
            raise ValueError('Ciphertext is empty after extracting IV')
        
        # Get encryption key
        key = _get_encryption_key()
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # Decrypt
        padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        
        # Remove PKCS7 padding
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
        
        # Decode to string
        return plaintext.decode('utf-8')
    
    except ValueError:
        # Re-raise ValueError as-is
        raise
    except Exception as e:
        raise ValueError(f'Decryption failed: {str(e)}')

def decrypt_file(encrypted_data: str) -> bytes:
    """
    Decrypt a file that was encrypted (base64 encoded file data).
    
    Args:
        encrypted_data: Base64 encoded encrypted file data
    
    Returns:
        Decrypted file bytes
    
    Raises:
        ValueError: If decryption fails
    """
    if not encrypted_data:
        raise ValueError('Encrypted data cannot be empty')
    
    try:
        # Decrypt the encrypted base64 string
        decrypted_base64 = decrypt_string(encrypted_data)
        
        # Decode from base64 to get original file bytes
        file_bytes = base64.b64decode(decrypted_base64)
        
        return file_bytes
    
    except Exception as e:
        raise ValueError(f'File decryption failed: {str(e)}')

def decrypt_json(encrypted_data: str) -> dict:
    """
    Decrypt a JSON object that was encrypted.
    
    Args:
        encrypted_data: Base64 encoded encrypted JSON string
    
    Returns:
        Decrypted JSON object (dict)
    
    Raises:
        ValueError: If decryption or JSON parsing fails
    """
    if not encrypted_data:
        raise ValueError('Encrypted data cannot be empty')
    
    try:
        # Decrypt the encrypted JSON string
        decrypted_json_string = decrypt_string(encrypted_data)
        
        # Parse JSON
        import json
        return json.loads(decrypted_json_string)
    
    except json.JSONDecodeError as e:
        raise ValueError(f'JSON parsing failed: {str(e)}')
    except Exception as e:
        raise ValueError(f'JSON decryption failed: {str(e)}')

def decrypt_payload(payload: dict) -> Union[str, bytes, dict]:
    """
    Decrypt a payload received from frontend.
    
    Args:
        payload: Dictionary with 'encrypted_data' and 'metadata' keys
    
    Returns:
        Decrypted data (string, bytes, or dict depending on metadata type)
    
    Raises:
        ValueError: If decryption fails
    """
    if not payload or 'encrypted_data' not in payload:
        raise ValueError('Invalid payload: missing encrypted_data')
    
    encrypted_data = payload['encrypted_data']
    metadata = payload.get('metadata', {})
    data_type = metadata.get('type', 'string')
    
    if data_type == 'file' or 'filename' in metadata:
        # File decryption
        return decrypt_file(encrypted_data)
    elif data_type == 'json':
        # JSON decryption
        return decrypt_json(encrypted_data)
    else:
        # String decryption
        return decrypt_string(encrypted_data)

