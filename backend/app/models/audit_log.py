from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.core.timezone import kst_now

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., "scan_started", "finding_viewed", "item_deleted"
    meta = Column(JSON, default={})  # Additional context
    timestamp = Column(DateTime(timezone=True), default=kst_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

