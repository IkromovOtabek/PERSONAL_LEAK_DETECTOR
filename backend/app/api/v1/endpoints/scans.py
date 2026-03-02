from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.schemas.scan import ScanCreate, ScanResponse
from app.models.scan import Scan, ScanStatus, ScanType
from app.models.user import User
from app.core.config import settings
from datetime import datetime
from app.core.timezone import kst_now
import os
import uuid
from pathlib import Path

# Try to import Celery, fallback to background tasks if not available
try:
    from app.celery_app import celery_app, CELERY_AVAILABLE
except ImportError:
    celery_app = None
    CELERY_AVAILABLE = False

router = APIRouter()

@router.post("/start", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def start_scan(
    scan_data: ScanCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new scan."""
    new_scan = Scan(
        user_id=current_user.id,
        type=scan_data.type,
        status=ScanStatus.PENDING,
        summary={}
    )
    
    try:
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)
        
        # Start scan task in background (Celery agar Redis mavjud bo'lsa, aks holda FastAPI background_tasks)
        from app.services.scan_service import start_scan_task
        try:
            if CELERY_AVAILABLE and celery_app:
                celery_app.send_task(
                    "app.services.scan_service.start_scan_task",
                    args=[new_scan.id, scan_data.type.value, scan_data.source_id]
                )
            else:
                background_tasks.add_task(start_scan_task, new_scan.id, scan_data.type.value, scan_data.source_id)
        except (OSError, ConnectionRefusedError, Exception) as e:
            # Redis ulanish rad etilgan — background_tasks ishlatamiz
            background_tasks.add_task(start_scan_task, new_scan.id, scan_data.type.value, scan_data.source_id)

        return new_scan
    except Exception as e:
        db.rollback()
        raise

@router.get("/", response_model=List[ScanResponse])
def get_scans(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all scans for current user."""
    from app.models.finding import Finding
    from app.models.connected_account import ConnectedAccount, ProviderType
    import re
    
    scans = db.query(Scan).filter(
        Scan.user_id == current_user.id
    ).order_by(Scan.created_at.desc()).offset(skip).limit(limit).all()
    
    # For email scans without email in summary, try to get email from findings or connected accounts
    for scan in scans:
        if scan.type == ScanType.EMAIL and (not scan.summary or not scan.summary.get('email')):
            # Try to get email from findings (from snippet)
            finding = db.query(Finding).filter(
                Finding.scan_id == scan.id,
                Finding.source_type == 'email'
            ).first()
            
            if finding and finding.snippet:
                # Extract email from snippet (From: email@example.com)
                from_match = re.search(r'From:\s*([^\n\r]+)', finding.snippet, re.IGNORECASE)
                if from_match:
                    from_value = from_match.group(1).strip()
                    # Extract email from "Name <email@example.com>" format
                    email_match = re.search(r'<([^>]+)>', from_value)
                    if email_match:
                        email = email_match.group(1)
                    else:
                        email = from_value
                    
                    # Update scan summary with email
                    if scan.summary is None:
                        scan.summary = {}
                    scan.summary['email'] = email
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()
    
    return scans

@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific scan."""
    from app.core.exceptions import NotFoundError
    
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise NotFoundError("Scan", str(scan_id))
    
    return scan

@router.post("/upload", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def upload_file_scan(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file for scanning."""
    # Validate file size
    file_content = file.file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE} bytes"
        )
    
    # Create upload directory if it doesn't exist
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create scan record
    new_scan = Scan(
        user_id=current_user.id,
        type=ScanType.FILE,
        status=ScanStatus.PENDING,
        summary={}
    )
    
    try:
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)
        
        # Start scan task in background
        if CELERY_AVAILABLE and celery_app:
            # Use Celery if available
            celery_app.send_task(
                "app.services.scan_service.start_scan_task",
                args=[new_scan.id, ScanType.FILE.value, str(file_path)]
            )
        else:
            # Use FastAPI background tasks as fallback
            from app.services.scan_service import start_scan_task
            background_tasks.add_task(start_scan_task, new_scan.id, ScanType.FILE.value, str(file_path))
        
        return new_scan
    except Exception as e:
        db.rollback()
        raise

@router.post("/{scan_id}/cancel", response_model=ScanResponse)
def cancel_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a running scan."""
    from app.core.exceptions import NotFoundError
    
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise NotFoundError("Scan", str(scan_id))
    
    # Only cancel if scan is running or pending
    if scan.status not in [ScanStatus.RUNNING, ScanStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel scan with status: {scan.status.value}"
        )
    
    try:
        # Update scan status to cancelled
        scan.status = ScanStatus.CANCELLED
        scan.finished_at = kst_now()
        if scan.summary is None:
            scan.summary = {}
        scan.summary.update({
            "cancelled_at": kst_now().isoformat(),
            "cancelled_by": current_user.id
        })
        
        db.commit()
        db.refresh(scan)
        
        # Try to revoke Celery task if available
        try:
            from app.celery_app import celery_app, CELERY_AVAILABLE
            if CELERY_AVAILABLE and celery_app:
                # Note: Celery task revocation is complex and may not work for already running tasks
                # This is a best-effort attempt
                pass
        except ImportError:
            pass
        
        return scan
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel scan: {str(e)}"
        )

@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a scan."""
    from app.core.exceptions import NotFoundError
    
    scan = db.query(Scan).filter(
        Scan.id == scan_id,
        Scan.user_id == current_user.id
    ).first()
    
    if not scan:
        raise NotFoundError("Scan", str(scan_id))
    
    try:
        # Delete associated findings
        from app.models.finding import Finding
        db.query(Finding).filter(Finding.scan_id == scan_id).delete()
        
        # Delete scan
        db.delete(scan)
        db.commit()
        
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete scan: {str(e)}"
        )

