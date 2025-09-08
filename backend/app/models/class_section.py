from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ClassSection(Base):
    __tablename__ = "class_sections"
    
    id = Column(String, primary_key=True, index=True)  # e.g., "BCA-2023-A", "MCA-2022-B"
    program_id = Column(String, ForeignKey("programs.id"), nullable=False)
    
    section_name = Column(String, nullable=False)  # A, B, C, etc.
    batch_year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    
    # Class details
    strength = Column(Integer, default=0)  # Number of students
    class_teacher = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Academic info
    academic_year = Column(String, nullable=False)  # "2023-24"
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    program = relationship("Program")
    enrollments = relationship("Enrollment", back_populates="class_section")


class Enrollment(Base):
    """Student enrollment in a class section"""
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    class_section_id = Column(String, ForeignKey("class_sections.id"), nullable=False)
    
    # Enrollment details
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    roll_number = Column(String, nullable=True)  # Class roll number
    
    # Status
    is_active = Column(Boolean, default=True)
    dropped_at = Column(DateTime(timezone=True), nullable=True)
    drop_reason = Column(String, nullable=True)
    
    # Academic performance (cached for quick access)
    current_sgpa = Column(String, nullable=True)  # Current semester GPA
    cumulative_cgpa = Column(String, nullable=True)  # Cumulative GPA
    
    # Relationships
    student = relationship("User", back_populates="enrollments")
    class_section = relationship("ClassSection", back_populates="enrollments")