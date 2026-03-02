from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.connected_account import ProviderType

class ConnectedAccountBase(BaseModel):
    provider: ProviderType
    email: str

class ConnectedAccountResponse(ConnectedAccountBase):
    id: int
    user_id: int
    last_sync: Optional[datetime]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConnectedAccount(ConnectedAccountBase):
    id: int
    user_id: int
    last_sync: Optional[datetime]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

