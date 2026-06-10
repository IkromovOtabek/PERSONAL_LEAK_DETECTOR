"""
Local Agent endpointlari.

Oqim:
  1. Foydalanuvchi saytda login qiladi -> GET /agent/token (uzoq muddatli JWT oladi)
  2. Lokal agent (pld_agent.py) shu token bilan disklarni skanlaydi
  3. Agent natijani POST /agent/report (X-Agent-Token header) orqali yuboradi
  4. Foydalanuvchi GET /agent/reports orqali natijalarni saytda ko'radi
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional, List, Any
from pydantic import BaseModel

from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.core.security import create_access_token, decode_access_token
from app.models.user import User
from app.models.agent_report import AgentReport

router = APIRouter()

AGENT_TOKEN_DAYS = 365


class AgentReportIn(BaseModel):
    hostname: Optional[str] = None
    platform: Optional[str] = None
    disks: List[Any] = []
    findings: List[Any] = []


@router.get("/token")
def get_agent_token(current_user: User = Depends(get_current_user)):
    """Agent uchun uzoq muddatli (1 yil) token. Lokal agent shu token bilan natija yuboradi."""
    token = create_access_token(
        data={"sub": str(current_user.id), "email": current_user.email, "agent": True},
        expires_delta=timedelta(days=AGENT_TOKEN_DAYS),
    )
    return {"agent_token": token, "expires_days": AGENT_TOKEN_DAYS}


def _user_from_agent_token(x_agent_token: Optional[str], db: Session) -> User:
    if not x_agent_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agent token kerak (X-Agent-Token header)",
        )
    payload = decode_access_token(x_agent_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token yaroqsiz yoki muddati o'tgan",
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first() if user_id else None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi topilmadi",
        )
    return user


@router.post("/report", status_code=status.HTTP_201_CREATED)
def submit_report(
    report: AgentReportIn,
    x_agent_token: Optional[str] = Header(None, alias="X-Agent-Token"),
    db: Session = Depends(get_db),
):
    """Lokal agent disk-skan natijasini yuboradi (token orqali user'ga bog'lanadi)."""
    user = _user_from_agent_token(x_agent_token, db)
    rec = AgentReport(
        user_id=user.id,
        hostname=report.hostname,
        platform=report.platform,
        disks=report.disks or [],
        findings=report.findings or [],
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "received_findings": len(report.findings or []),
        "status": "ok",
    }


@router.get("/reports")
def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Foydalanuvchining agent hisobotlari (eng yangisi birinchi)."""
    rows = (
        db.query(AgentReport)
        .filter(AgentReport.user_id == current_user.id)
        .order_by(AgentReport.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "hostname": r.hostname,
            "platform": r.platform,
            "disks": r.disks or [],
            "findings_count": len(r.findings or []),
            "findings": r.findings or [],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
