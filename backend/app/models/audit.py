from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ActivityLog(Base):
    """Comprehensive audit log for all system activities"""
    __tablename__ = "activity_logs"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Activity details
    action = Column(String, nullable=False)  # login, logout, create_exam, submit_exam, etc.
    resource_type = Column(String, nullable=True)  # exam, question, user, etc.
    resource_id = Column(String, nullable=True)  # ID of the affected resource
    
    # Change tracking
    before_data = Column(JSON, nullable=True)  # Data before the change
    after_data = Column(JSON, nullable=True)   # Data after the change
    
    # Context
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String, nullable=True)
    
    # Additional metadata
    metadata = Column(JSON, nullable=True)  # Additional contextual data
    tags = Column(JSON, nullable=True)      # Tags for filtering/searching
    
    # Result
    success = Column(String, default="true")  # true, false, partial
    error_message = Column(Text, nullable=True)
    
    # Timing
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    duration_ms = Column(String, nullable=True)  # How long the action took
    
    # Relationships
    user = relationship("User", back_populates="activity_logs")
    
    def __repr__(self):
        return f"<ActivityLog(action='{self.action}', user_id='{self.user_id}', timestamp='{self.timestamp}')>"


class ExamAuditLog(Base):
    """Specialized audit log for exam-related activities"""
    __tablename__ = "exam_audit_logs"
    
    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Event details
    event_type = Column(String, nullable=False)  # published, started, ended, graded, locked
    description = Column(Text, nullable=False)
    
    # Change tracking for critical fields
    field_changed = Column(String, nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    
    # Context
    reason = Column(Text, nullable=True)  # Reason for the change (especially for overrides)
    authorized_by = Column(String, nullable=True)  # HOD authorization for sensitive changes
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    exam = relationship("Exam")
    user = relationship("User")


class GradingAuditLog(Base):
    """Audit trail for all grading changes"""
    __tablename__ = "grading_audit_logs"
    
    id = Column(String, primary_key=True, index=True)
    response_id = Column(String, ForeignKey("responses.id"), nullable=False)
    changed_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Change details
    action = Column(String, nullable=False)  # ai_graded, teacher_override, bulk_update
    old_marks = Column(String, nullable=True)
    new_marks = Column(String, nullable=False)
    
    # Justification
    reason = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    
    # AI grading metadata (if applicable)
    ai_model = Column(String, nullable=True)
    ai_confidence = Column(String, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    response = relationship("Response")
    changed_by_user = relationship("User")