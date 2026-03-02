from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.sensitive_item import PIIType

class SensitiveItemBase(BaseModel):
    type: PIIType
    label: Optional[str] = None

class SensitiveItemCreate(SensitiveItemBase):
    value: str  # Plain value, will be hashed

class SensitiveItemResponse(SensitiveItemBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class SensitiveItem(SensitiveItemBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

