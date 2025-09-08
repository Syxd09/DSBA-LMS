from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class ViolationType(str, Enum):
    TAB_SWITCH = "tab_switch"
    COPY_PASTE = "copy_paste"
    RIGHT_CLICK = "right_click"
    FULLSCREEN_EXIT = "fullscreen_exit"
    MULTIPLE_FACES = "multiple_faces"
    NO_FACE_DETECTED = "no_face_detected"
    SUSPICIOUS_MOVEMENT = "suspicious_movement"
    EXTERNAL_DEVICE = "external_device"
    NETWORK_CHANGE = "network_change"
    BROWSER_RESIZE = "browser_resize"
    MOBILE_DEVICE_DETECTED = "mobile_device_detected"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProctorLog(Base):
    """Anti-cheat and proctoring event logs"""
    __tablename__ = "proctor_logs"
    
    id = Column(String, primary_key=True, index=True)
    attempt_id = Column(String, ForeignKey("attempts.id"), nullable=False)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Event details
    violation_type = Column(SQLEnum(ViolationType), nullable=False)
    severity = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW)
    
    # Event data
    event_data = Column(JSON, nullable=True)  # Additional event-specific data
    screenshot_path = Column(String, nullable=True)  # Screenshot captured during violation
    video_snippet_path = Column(String, nullable=True)  # Short video clip if available
    
    # Context
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    question_id = Column(String, nullable=True)  # Question being answered when violation occurred
    time_into_exam_seconds = Column(Integer, nullable=True)
    
    # Detection metadata
    detection_method = Column(String, nullable=True)  # javascript, ai_vision, etc.
    confidence_score = Column(Float, nullable=True)  # Confidence of AI detection (0-1)
    
    # Browser/system info
    browser_info = Column(JSON, nullable=True)
    screen_resolution = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    
    # Review status
    reviewed = Column(Boolean, default=False)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_decision = Column(String, nullable=True)  # ignore, warning, penalty, disqualify
    review_notes = Column(Text, nullable=True)
    
    # Auto-action taken
    auto_action = Column(String, nullable=True)  # warning_shown, exam_paused, etc.
    
    # Relationships
    attempt = relationship("Attempt", back_populates="proctor_logs")
    student = relationship("User", back_populates="proctor_logs")


class ProctoringSession(Base):
    """Overall proctoring session for an exam attempt"""
    __tablename__ = "proctoring_sessions"
    
    id = Column(String, primary_key=True, index=True)
    attempt_id = Column(String, ForeignKey("attempts.id"), nullable=False, unique=True)
    
    # Session status
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Overall risk assessment
    total_violations = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)  # Computed risk score (0-100)
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW)
    
    # Violation breakdown
    tab_switches = Column(Integer, default=0)
    copy_paste_attempts = Column(Integer, default=0)
    right_clicks = Column(Integer, default=0)
    fullscreen_exits = Column(Integer, default=0)
    face_violations = Column(Integer, default=0)
    
    # Recording paths (if enabled)
    screen_recording_path = Column(String, nullable=True)
    webcam_recording_path = Column(String, nullable=True)
    
    # Final review
    manual_review_required = Column(Boolean, default=False)
    reviewed = Column(Boolean, default=False)
    final_decision = Column(String, nullable=True)  # pass, investigate, disqualify
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ProctoringAlert(Base):
    """Real-time alerts for teachers/proctors"""
    __tablename__ = "proctoring_alerts"
    
    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    alert_type = Column(String, nullable=False)  # high_risk_behavior, technical_issue, etc.
    message = Column(Text, nullable=False)
    severity = Column(SQLEnum(RiskLevel), default=RiskLevel.MEDIUM)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    data = Column(JSON, nullable=True)  # Additional alert data