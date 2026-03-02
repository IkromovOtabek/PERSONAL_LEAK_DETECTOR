from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.finding import SeverityType

class FindingBase(BaseModel):
    type: str
    severity: SeverityType
    snippet: str
    source_type: str

class FindingResponse(FindingBase):
    id: int
    scan_id: int
    user_id: int
    sensitive_item_id: Optional[int]
    source_url_or_message_id: Optional[str]
    resolved: bool
    notes: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class FindingResolve(BaseModel):
    resolved: bool
    notes: Optional[str] = None

class Finding(FindingBase):
    id: int
    scan_id: int
    user_id: int
    sensitive_item_id: Optional[int]
    resolved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

