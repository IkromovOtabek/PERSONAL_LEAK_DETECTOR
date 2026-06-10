"""
AgentReport — foydalanuvchining lokal PC'sida ishlagan agent yuborgan
disk-skan hisoboti (disklar holati + topilgan maxfiy fayllar).
"""
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.core.timezone import kst_now


class AgentReport(Base):
    __tablename__ = "agent_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    hostname = Column(String, nullable=True)
    platform = Column(String, nullable=True)
    disks = Column(JSON, default=list)      # [{name, path, total_size, used_size, free_size}]
    findings = Column(JSON, default=list)   # [{path, type, preview}]
    created_at = Column(DateTime(timezone=True), default=kst_now, nullable=False)

    # Bir tomonlama bog'lanish — User modelini o'zgartirish shart emas
    user = relationship("User")
