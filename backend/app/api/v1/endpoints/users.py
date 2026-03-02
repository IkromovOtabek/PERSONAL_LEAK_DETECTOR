from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_current_user
from app.db.database import get_db
from app.schemas.user import UserResponse, PasswordChangeRequest, EmailChangeRequest
from app.models.user import User
from app.core.security import verify_password, get_password_hash
from app.core.validators import validate_email, validate_password
from app.core.exceptions import ValidationError
from app.core.timezone import kst_now

router = APIRouter()

@router.get("/", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

@router.put("/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password."""
    try:
        # Validate new password
        validate_password(password_data.new_password)
        
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Joriy parol noto'g'ri"
            )
        
        # Check if new password is different from current password
        if verify_password(password_data.new_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yangi parol joriy paroldan farq qilishi kerak"
            )
        
        # Update password
        current_user.password_hash = get_password_hash(password_data.new_password)
        current_user.updated_at = kst_now()
        
        db.commit()
        db.refresh(current_user)
        
        return {"message": "Parol muvaffaqiyatli o'zgartirildi"}
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parolni o'zgartirishda xatolik: {str(e)}"
        )

@router.put("/change-email")
def change_email(
    email_data: EmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user email."""
    try:
        # Validate new email
        validate_email(email_data.new_email)
        
        # Verify password
        if not verify_password(email_data.password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parol noto'g'ri"
            )
        
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == email_data.new_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu email allaqachon ishlatilmoqda"
            )
        
        # Check if new email is different from current email
        if current_user.email == email_data.new_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yangi email joriy emaildan farq qilishi kerak"
            )
        
        # Update email
        current_user.email = email_data.new_email
        current_user.updated_at = kst_now()
        
        db.commit()
        db.refresh(current_user)
        
        return {"message": "Email muvaffaqiyatli o'zgartirildi", "new_email": email_data.new_email}
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Emailni o'zgartirishda xatolik: {str(e)}"
        )

