from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base
from app.core.timezone import kst_now

class ProviderType(str, enum.Enum):
    GMAIL = "gmail"
    OUTLOOK = "outlook"

class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(Enum(ProviderType), nullable=False)
    oauth_tokens = Column(String, nullable=False)  # Encrypted tokens
    email = Column(String, nullable=False)  # Account email
    last_sync = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=kst_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=kst_now, onupdate=kst_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="connected_accounts")

