from sqlalchemy.orm import Session
from app.models.audit import ActivityLog
import uuid
from datetime import datetime, timezone


async def log_activity(
    db: Session,
    user_id: str = None,
    action: str = "",
    resource_type: str = None,
    resource_id: str = None,
    before_data: dict = None,
    after_data: dict = None,
    ip_address: str = None,
    user_agent: str = None,
    metadata: dict = None,
    success: str = "true",
    error_message: str = None
):
    """Log system activity for audit trail"""
    
    activity_log = ActivityLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        before_data=before_data,
        after_data=after_data,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
        success=success,
        error_message=error_message,
        timestamp=datetime.now(timezone.utc)
    )
    
    db.add(activity_log)
    db.commit()
    
    return activity_log