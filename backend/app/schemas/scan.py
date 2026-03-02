from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.scan import ScanType, ScanStatus

class ScanBase(BaseModel):
    type: ScanType

class ScanCreate(ScanBase):
    source_id: Optional[str] = None  # Email account ID or file path

class ScanResponse(ScanBase):
    id: int
    user_id: int
    status: ScanStatus
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    summary: Dict[str, Any]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class Scan(ScanBase):
    id: int
    user_id: int
    status: ScanStatus
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    summary: Dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True

