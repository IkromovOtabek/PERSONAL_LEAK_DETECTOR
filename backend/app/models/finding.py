from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base
from app.core.timezone import kst_now

class SeverityType(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Finding(Base):
    __tablename__ = "findings"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sensitive_item_id = Column(Integer, ForeignKey("sensitive_items.id"), nullable=True)
    type = Column(String, nullable=False)  # PII type found
    severity = Column(Enum(SeverityType), default=SeverityType.MEDIUM)
    snippet = Column(Text, nullable=False)  # Context snippet
    source_url_or_message_id = Column(String, nullable=True)  # Email ID or file path
    source_type = Column(String, nullable=False)  # email, file, web
    resolved = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=kst_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    scan = relationship("Scan", back_populates="findings")
    user = relationship("User", back_populates="findings")
    sensitive_item = relationship("SensitiveItem", back_populates="findings")

