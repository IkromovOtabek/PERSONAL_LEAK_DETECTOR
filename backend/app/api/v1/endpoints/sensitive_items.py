from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.schemas.sensitive_item import SensitiveItemCreate, SensitiveItemResponse
from app.models.sensitive_item import SensitiveItem
from app.core.security import hash_sensitive_value
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=SensitiveItemResponse, status_code=status.HTTP_201_CREATED)
def create_sensitive_item(
    item_data: SensitiveItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new sensitive item."""
    from app.core.validators import sanitize_input
    from app.core.exceptions import ConflictError, ValidationError
    
    try:
        # Validate and sanitize input
        if not item_data.value or not item_data.value.strip():
            raise ValidationError("Value cannot be empty")
        
        sanitized_value = sanitize_input(item_data.value, max_length=500)
        sanitized_label = sanitize_input(item_data.label or "", max_length=200) if item_data.label else None
        
        # Hash the value
        value_hash = hash_sensitive_value(sanitized_value)
        
        # Check if item already exists
        existing = db.query(SensitiveItem).filter(
            SensitiveItem.user_id == current_user.id,
            SensitiveItem.type == item_data.type,
            SensitiveItem.value_hash == value_hash
        ).first()
        
        if existing:
            raise ConflictError("Sensitive item already exists")
        
        new_item = SensitiveItem(
            user_id=current_user.id,
            type=item_data.type,
            value_hash=value_hash,
            label=sanitized_label
        )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return new_item
    except Exception as e:
        db.rollback()
        raise

@router.get("/", response_model=List[SensitiveItemResponse])
def get_sensitive_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sensitive items for current user."""
    items = db.query(SensitiveItem).filter(
        SensitiveItem.user_id == current_user.id
    ).all()
    
    return items

@router.get("/{item_id}", response_model=SensitiveItemResponse)
def get_sensitive_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific sensitive item."""
    from app.core.exceptions import NotFoundError
    
    item = db.query(SensitiveItem).filter(
        SensitiveItem.id == item_id,
        SensitiveItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise NotFoundError("Sensitive item", str(item_id))
    
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sensitive_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a sensitive item."""
    from app.core.exceptions import NotFoundError
    
    try:
        item = db.query(SensitiveItem).filter(
            SensitiveItem.id == item_id,
            SensitiveItem.user_id == current_user.id
        ).first()
        
        if not item:
            raise NotFoundError("Sensitive item", str(item_id))
        
        db.delete(item)
        db.commit()
        
        return None
    except Exception as e:
        db.rollback()
        raise

