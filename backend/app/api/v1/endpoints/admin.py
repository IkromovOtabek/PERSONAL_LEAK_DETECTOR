from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.timezone import kst_now
from app.db.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.sensitive_item import SensitiveItem
from app.models.connected_account import ConnectedAccount
from app.schemas.user import UserResponse
from app.core.security import get_password_hash
from pydantic import BaseModel

router = APIRouter()

# Schemas
class UserListResponse(BaseModel):
    id: int
    email: str
    is_verified: bool
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: Optional[datetime]
    password_hash: str  # For admin to see password hash
    
    class Config:
        from_attributes = True

class LoginHistoryResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    action: str
    meta: dict
    timestamp: datetime
    
    class Config:
        from_attributes = True

class UserStatsResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    verified_users: int
    total_scans: int
    total_findings: int
    total_sensitive_items: int
    total_connected_accounts: int

class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_verified: Optional[bool] = None

class UserPasswordUpdateRequest(BaseModel):
    new_password: str

@router.get("/users", response_model=List[UserListResponse])
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)."""
    query = db.query(User)
    
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=UserListResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/users/{user_id}", response_model=UserListResponse)
def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user_data.email:
        # Check if email already exists
        existing = db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        user.email = user_data.email
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.is_admin is not None:
        user.is_admin = user_data.is_admin
    
    if user_data.is_verified is not None:
        user.is_verified = user_data.is_verified
    
    user.updated_at = kst_now()
    
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.put("/users/{user_id}/password", response_model=UserListResponse)
def update_user_password(
    user_id: int,
    password_data: UserPasswordUpdateRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user password (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not password_data.new_password or len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Hash the new password
    user.password_hash = get_password_hash(password_data.new_password)
    user.updated_at = kst_now()
    
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}"
        )

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        db.delete(user)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.get("/login-history", response_model=List[LoginHistoryResponse])
def get_login_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get login history (admin only)."""
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    # Filter for login actions
    query = query.filter(AuditLog.action.in_(["login", "login_success", "login_failed"]))
    
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Add user email to response
    result = []
    for log in logs:
        user_email = "Unknown"
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                user_email = user.email
        
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": user_email,
            "action": log.action,
            "meta": log.meta or {},
            "timestamp": log.timestamp
        })
    
    return result

@router.get("/stats", response_model=UserStatsResponse)
def get_stats(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get system statistics (admin only)."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.is_admin == True).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    total_scans = db.query(Scan).count()
    total_findings = db.query(Finding).count()
    total_sensitive_items = db.query(SensitiveItem).count()
    total_connected_accounts = db.query(ConnectedAccount).count()
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        verified_users=verified_users,
        total_scans=total_scans,
        total_findings=total_findings,
        total_sensitive_items=total_sensitive_items,
        total_connected_accounts=total_connected_accounts
    )

@router.get("/users/{user_id}/activity")
def get_user_activity(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get user activity (scans, findings, etc.) (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's scans
    scans = db.query(Scan).filter(Scan.user_id == user_id).order_by(Scan.created_at.desc()).limit(10).all()
    
    # Get user's findings
    findings = db.query(Finding).filter(Finding.user_id == user_id).order_by(Finding.created_at.desc()).limit(10).all()
    
    # Get user's sensitive items
    sensitive_items = db.query(SensitiveItem).filter(SensitiveItem.user_id == user_id).order_by(SensitiveItem.created_at.desc()).limit(10).all()
    
    # Get user's connected accounts
    connected_accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user_id).all()
    
    # Get user's login history
    login_history = db.query(AuditLog).filter(
        AuditLog.user_id == user_id,
        AuditLog.action.in_(["login", "login_success", "login_failed"])
    ).order_by(AuditLog.timestamp.desc()).limit(20).all()
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified,
            "created_at": user.created_at
        },
        "scans": [{"id": s.id, "type": s.type.value, "status": s.status.value, "created_at": s.created_at} for s in scans],
        "findings": [{"id": f.id, "type": f.type, "severity": f.severity.value, "created_at": f.created_at} for f in findings],
        "sensitive_items": [{"id": si.id, "type": si.type.value, "created_at": si.created_at} for si in sensitive_items],
        "connected_accounts": [{"id": ca.id, "provider": ca.provider.value, "email": ca.email, "is_active": ca.is_active} for ca in connected_accounts],
        "login_history": [{"id": l.id, "action": l.action, "timestamp": l.timestamp, "meta": l.meta or {}} for l in login_history]
    }

