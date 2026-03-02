from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base
from app.core.timezone import kst_now

class PIIType(str, enum.Enum):
    PHONE = "phone"
    EMAIL = "email"
    PASSPORT = "passport"
    ID_CARD = "id_card"
    CREDIT_CARD = "credit_card"
    SECRET_KEY = "secret_key"
    TOKEN = "token"
    DOCUMENT = "document"
    OTHER = "other"

class SensitiveItem(Base):
    __tablename__ = "sensitive_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(PIIType), nullable=False)
    value_hash = Column(String, nullable=False)  # Hashed value for comparison
    label = Column(String, nullable=True)  # User-friendly label
    created_at = Column(DateTime(timezone=True), default=kst_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=kst_now, onupdate=kst_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sensitive_items")
    findings = relationship("Finding", back_populates="sensitive_item")

