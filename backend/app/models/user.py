from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    HOD = "hod"
    COORDINATOR = "coordinator"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # Student ID, Employee ID, etc.
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    
    # Name fields
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    
    # Authentication
    hashed_password = Column(String, nullable=False)
    password_changed = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    
    # Role and permissions
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Profile information
    date_of_birth = Column(String, nullable=True)  # Used for default password
    department = Column(String, nullable=True)
    program_id = Column(String, nullable=True)
    batch_year = Column(Integer, nullable=True)
    
    # Academic information for students
    class_section = Column(String, nullable=True)
    semester = Column(Integer, nullable=True)
    
    # Professional information for teachers
    designation = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    
    # Account metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String, nullable=True)  # HOD who created the account
    
    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Account lockout
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    enrollments = relationship("Enrollment", back_populates="student")
    created_exams = relationship("Exam", back_populates="created_by_user")
    attempts = relationship("Attempt", back_populates="student")
    proctor_logs = relationship("ProctorLog", back_populates="student")
    activity_logs = relationship("ActivityLog", back_populates="user")
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    @property
    def default_password(self) -> str:
        """Generate default password from ID + DOB"""
        if self.date_of_birth:
            # Remove any separators from DOB and use DDMMYYYY format
            dob_clean = self.date_of_birth.replace("-", "").replace("/", "")
            return f"{self.id}{dob_clean}"
        return f"{self.id}123456"  # Fallback if no DOB
    
    def __repr__(self):
        return f"<User(id='{self.id}', username='{self.username}', role='{self.role}')>"