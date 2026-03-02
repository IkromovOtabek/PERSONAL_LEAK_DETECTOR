"""
Timezone utilities for Korea Standard Time (KST, UTC+9).
"""
from datetime import datetime, timezone, timedelta

# Korea Standard Time (KST) is UTC+9
KST = timezone(timedelta(hours=9))

def kst_now() -> datetime:
    """Get current time in Korea Standard Time (KST)."""
    return datetime.now(KST)

def utc_to_kst(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to KST."""
    if utc_dt.tzinfo is None:
        # Assume UTC if no timezone info
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(KST)

def kst_to_utc(kst_dt: datetime) -> datetime:
    """Convert KST datetime to UTC."""
    if kst_dt.tzinfo is None:
        # Assume KST if no timezone info
        kst_dt = kst_dt.replace(tzinfo=KST)
    return kst_dt.astimezone(timezone.utc)

