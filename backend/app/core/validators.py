"""
Validation utilities for the application.
"""
import re
from typing import Optional
from app.core.exceptions import ValidationError

def validate_email(email: str) -> str:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError("Invalid email format")
    return email

def validate_password(password: str) -> str:
    """Validate password strength."""
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long")
    # No maximum length limit - bcrypt will handle truncation automatically
    return password

def validate_phone(phone: str) -> Optional[str]:
    """Validate phone number format."""
    # Remove common separators
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    # Check if it's a valid phone number (international format)
    if not re.match(r'^\+?\d{7,15}$', cleaned):
        raise ValidationError("Invalid phone number format")
    return cleaned

def validate_credit_card(card: str) -> Optional[str]:
    """Validate credit card number using Luhn algorithm."""
    # Remove non-digits
    digits = re.sub(r'\D', '', card)
    if len(digits) < 13 or len(digits) > 19:
        raise ValidationError("Invalid credit card number length")
    
    # Luhn algorithm
    total = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        n = int(digit)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    
    if total % 10 != 0:
        raise ValidationError("Invalid credit card number (Luhn check failed)")
    
    return digits

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize user input."""
    if len(text) > max_length:
        raise ValidationError(f"Input too long. Maximum length: {max_length}")
    # Remove potentially dangerous characters
    text = text.strip()
    return text

