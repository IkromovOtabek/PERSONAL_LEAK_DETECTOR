from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.api.v1.deps import get_current_user
from app.schemas.finding import FindingResponse, FindingResolve
from app.models.finding import Finding, SeverityType
from app.models.user import User

router = APIRouter()

class FindingsResponse(BaseModel):
    items: List[FindingResponse]
    total: int
    skip: int
    limit: int

@router.get("/", response_model=FindingsResponse)
def get_findings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),  # Maksimal 1000 ta xabar
    severity: Optional[SeverityType] = None,
    resolved: Optional[bool] = None,
    email: Optional[str] = None,
    phishing: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all findings for current user with total count."""
    from app.models.scan import Scan
    
    query = db.query(Finding).filter(Finding.user_id == current_user.id)
    
    # Filter by phishing if requested
    if phishing is not None and phishing:
        query = query.filter(Finding.type == 'phishing')
    elif severity:
        query = query.filter(Finding.severity == severity)
    
    if resolved is not None:
        query = query.filter(Finding.resolved == resolved)
    
    # Filter by email if provided
    if email:
        # Normalize email for comparison (lowercase and strip whitespace)
        email_normalized = email.lower().strip()
        
        # Find all email scans for this user
        from app.models.connected_account import ConnectedAccount
        import re
        
        # Get all email scans
        email_scans = db.query(Scan).filter(
            Scan.user_id == current_user.id,
            Scan.type == 'email'
        ).all()
        
        # Get all Gmail accounts for this user
        gmail_accounts = db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == current_user.id,
            ConnectedAccount.provider == 'gmail',
            ConnectedAccount.is_active == True
        ).all()
        
        # Create a map of account_id to email for quick lookup
        account_email_map = {acc.id: acc.email.lower().strip() for acc in gmail_accounts}
        
        # First, try to find matching account by email (for faster filtering)
        matching_account = None
        for account in gmail_accounts:
            account_email_normalized = account.email.lower().strip() if account.email else ""
            if account_email_normalized == email_normalized:
                matching_account = account
                break
        
        # Filter scans by email
        matching_scan_ids = []
        
        # Method 0: Fast path - filter by account_id if we found matching account
        if matching_account:
            for scan in email_scans:
                if scan.summary and scan.summary.get('account_id'):
                    try:
                        account_id_value = scan.summary.get('account_id')
                        # Handle both string and int account_id
                        if isinstance(account_id_value, str):
                            account_id = int(account_id_value)
                        else:
                            account_id = int(account_id_value)
                        if account_id == matching_account.id:
                            matching_scan_ids.append(scan.id)
                            # Fast path match found via account_id
                    except (ValueError, TypeError):
                        pass
        
        # Method 1-7: Fallback methods for scans without account_id or if fast path didn't find matches
        for scan in email_scans:
            if scan.id in matching_scan_ids:
                continue  # Already matched via account_id
            scan_email = None
            
            # Method 1: Get email from scan summary (most reliable)
            if scan.summary and scan.summary.get('email'):
                scan_email = scan.summary.get('email')
                # Email found in summary
            # Method 2: Get email from account_id in summary
            elif scan.summary and scan.summary.get('account_id'):
                account_id_str = scan.summary.get('account_id')
                try:
                    account_id = int(account_id_str)
                    account = db.query(ConnectedAccount).filter(
                        ConnectedAccount.id == account_id,
                        ConnectedAccount.user_id == current_user.id
                    ).first()
                    if account:
                        scan_email = account.email
                        # Update scan summary with email for future use
                        if scan.summary is None:
                            scan.summary = {}
                        scan.summary['email'] = scan_email
                        try:
                            db.commit()
                        except Exception:
                            db.rollback()
                        # Email found from account_id
                except (ValueError, TypeError):
                    pass
            
            # Method 3: Try to get email from findings (extract from snippet)
            if not scan_email:
                findings = db.query(Finding).filter(
                    Finding.scan_id == scan.id,
                    Finding.source_type == 'email'
                ).limit(10).all()
                
                # Extract unique emails from findings
                found_emails = set()
                for finding in findings:
                    if finding and finding.snippet:
                        # Extract email from snippet (From: email@example.com)
                        from_match = re.search(r'From:\s*([^\n\r]+)', finding.snippet, re.IGNORECASE)
                        if from_match:
                            from_value = from_match.group(1).strip()
                            # Extract email from "Name <email@example.com>" format
                            email_match = re.search(r'<([^>]+)>', from_value)
                            if email_match:
                                found_email = email_match.group(1).lower().strip()
                            else:
                                found_email = from_value.lower().strip()
                            
                            if found_email and '@' in found_email:
                                found_emails.add(found_email)
                
                # Method 4: Try to match found emails with connected accounts
                for found_email in found_emails:
                    for account_id, account_email in account_email_map.items():
                        if found_email == account_email:
                            scan_email = gmail_accounts[list(account_email_map.keys()).index(account_id)].email
                            # Update scan summary with email for future use
                            if scan.summary is None:
                                scan.summary = {}
                            scan.summary['email'] = scan_email
                            try:
                                db.commit()
                            except Exception:
                                db.rollback()
                            break
                    if scan_email:
                        break
                
                # Method 5: If still no email found, use first found email from findings
                if not scan_email and found_emails:
                    scan_email = list(found_emails)[0]
                    # Update scan summary with email for future use
                    if scan.summary is None:
                        scan.summary = {}
                    scan.summary['email'] = scan_email
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()
            
            # Compare emails (case-insensitive, normalized)
            if scan_email:
                scan_email_normalized = scan_email.lower().strip()
                # Also try matching with account_id if email doesn't match directly
                if scan_email_normalized == email_normalized:
                    matching_scan_ids.append(scan.id)
                    # Email match found
                else:
                    # Email mismatch - try account_id fallback
                    # Try to match via account_id as fallback
                    if scan.summary and scan.summary.get('account_id'):
                        try:
                            account_id = int(scan.summary.get('account_id'))
                            account = db.query(ConnectedAccount).filter(
                                ConnectedAccount.id == account_id,
                                ConnectedAccount.user_id == current_user.id
                            ).first()
                            if account:
                                account_email_normalized = account.email.lower().strip() if account.email else ""
                                if account_email_normalized == email_normalized:
                                    matching_scan_ids.append(scan.id)
                                    # Email match found via account_id
                        except (ValueError, TypeError):
                            pass
            else:
                # Method 6: If still no email found, check findings directly for this scan
                # This is a fallback to ensure we don't miss any findings
                scan_findings = db.query(Finding).filter(
                    Finding.scan_id == scan.id,
                    Finding.source_type == 'email'
                ).limit(5).all()
                
                # Check if any finding's scan matches the email (via account lookup)
                # Try to match via account_id if available in scan summary
                if scan.summary and scan.summary.get('account_id'):
                    try:
                        account_id = int(scan.summary.get('account_id'))
                        account = db.query(ConnectedAccount).filter(
                            ConnectedAccount.id == account_id,
                            ConnectedAccount.user_id == current_user.id
                        ).first()
                        if account and account.email.lower().strip() == email_normalized:
                            matching_scan_ids.append(scan.id)
                            # Update scan summary with email
                            if scan.summary is None:
                                scan.summary = {}
                            scan.summary['email'] = account.email
                            try:
                                db.commit()
                            except Exception:
                                db.rollback()
                            # Email match found via account_id in summary
                    except (ValueError, TypeError):
                        pass
                
                if scan.id not in matching_scan_ids:
                    # No email found for this scan - skip it
                    pass
        
        if matching_scan_ids:
            query = query.filter(Finding.scan_id.in_(matching_scan_ids))
            # Found matching scans for email filter
        else:
            # No matching scans found - try direct account lookup as last resort
            # Find account by email (case-insensitive comparison)
            # Get all Gmail accounts and filter in Python (more reliable for SQLite)
            all_gmail_accounts = db.query(ConnectedAccount).filter(
                ConnectedAccount.user_id == current_user.id,
                ConnectedAccount.provider == 'gmail',
                ConnectedAccount.is_active == True
            ).all()
            
            # Find matching account by normalized email
            matching_account = None
            for account in all_gmail_accounts:
                account_email_normalized = account.email.lower().strip() if account.email else ""
                if account_email_normalized == email_normalized:
                    matching_account = account
                    break
            
            if matching_account:
                # Try to find scans by account_id in summary JSON
                # We need to query scans and filter by account_id in summary JSON field
                all_user_email_scans = db.query(Scan).filter(
                    Scan.user_id == current_user.id,
                    Scan.type == 'email'
                ).all()
                
                # Filter scans where summary contains matching account_id
                # Handle both string and int account_id
                account_scans_by_source = []
                for scan in all_user_email_scans:
                    if scan.summary and scan.summary.get('account_id'):
                        account_id_value = scan.summary.get('account_id')
                        try:
                            # Convert to int for comparison
                            if isinstance(account_id_value, str):
                                account_id = int(account_id_value)
                            else:
                                account_id = int(account_id_value)
                            if account_id == matching_account.id:
                                account_scans_by_source.append(scan)
                        except (ValueError, TypeError):
                            pass
                
                if account_scans_by_source:
                    account_scan_ids = [s.id for s in account_scans_by_source]
                    query = query.filter(Finding.scan_id.in_(account_scan_ids))
                    # Found scans via account_id
                else:
                    # Still no scans found, return empty result
                    query = query.filter(Finding.id == -1)  # Impossible condition
            else:
                # Account not found, return empty result
                query = query.filter(Finding.id == -1)  # Impossible condition
    
    # Get total count before pagination
    total = query.count()
    
    # Get paginated results
    findings = query.order_by(Finding.created_at.desc()).offset(skip).limit(limit).all()
    
    return FindingsResponse(
        items=findings,
        total=total,
        skip=skip,
        limit=limit
    )

@router.get("/{finding_id}", response_model=FindingResponse)
def get_finding(
    finding_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific finding."""
    from app.core.exceptions import NotFoundError
    
    finding = db.query(Finding).filter(
        Finding.id == finding_id,
        Finding.user_id == current_user.id
    ).first()
    
    if not finding:
        raise NotFoundError("Finding", str(finding_id))
    
    return finding

@router.post("/{finding_id}/resolve", response_model=FindingResponse)
def resolve_finding(
    finding_id: int,
    resolve_data: FindingResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a finding."""
    from app.core.exceptions import NotFoundError, ValidationError
    from app.core.validators import sanitize_input
    from app.core.timezone import kst_now
    
    try:
        finding = db.query(Finding).filter(
            Finding.id == finding_id,
            Finding.user_id == current_user.id
        ).first()
        
        if not finding:
            raise NotFoundError("Finding", str(finding_id))
        
        finding.resolved = resolve_data.resolved
        if resolve_data.notes:
            finding.notes = sanitize_input(resolve_data.notes, max_length=1000)
        if resolve_data.resolved:
            finding.resolved_at = kst_now()
        
        db.commit()
        db.refresh(finding)
        
        return finding
    except Exception as e:
        db.rollback()
        raise

