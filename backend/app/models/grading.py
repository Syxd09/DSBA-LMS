from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class GradeUploadBatch(Base):
    """Batch upload of grades by teachers"""
    __tablename__ = "grade_upload_batches"
    
    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # File information
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    
    # Processing status
    status = Column(String, default="pending")  # pending, processing, completed, failed
    total_records = Column(Integer, default=0)
    processed_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    
    # Validation results
    validation_errors = Column(JSON, nullable=True)  # List of validation errors
    processing_log = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    exam = relationship("Exam")
    uploaded_by_user = relationship("User")


class InternalAssessment(Base):
    """Internal assessment component scores"""
    __tablename__ = "internal_assessments"
    
    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    
    # Assessment components
    ia1_marks = Column(Float, nullable=True)  # First IA
    ia2_marks = Column(Float, nullable=True)  # Second IA
    assignment_marks = Column(Float, nullable=True)
    attendance_marks = Column(Float, nullable=True)
    quiz_marks = Column(Float, nullable=True)
    project_marks = Column(Float, nullable=True)
    
    # Calculated totals
    total_internal_marks = Column(Float, nullable=True)
    internal_grade = Column(String, nullable=True)  # A, B, C, D, F
    
    # Semester and academic year
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    
    # Lock status
    is_locked = Column(Boolean, default=False)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    student = relationship("User")
    course = relationship("Course")


class SGPACalculation(Base):
    """SGPA calculation for students"""
    __tablename__ = "sgpa_calculations"
    
    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    semester = Column(Integer, nullable=False)
    academic_year = Column(String, nullable=False)
    
    # Calculation data
    total_credits = Column(Integer, nullable=False)
    total_grade_points = Column(Float, nullable=False)
    sgpa = Column(Float, nullable=False)
    
    # Component breakdown
    course_grades = Column(JSON, nullable=False)  # List of course grades and credits
    
    # Status
    is_final = Column(Boolean, default=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("User")


class CGPACalculation(Base):
    """CGPA calculation for students"""
    __tablename__ = "cgpa_calculations"
    
    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Current status
    current_semester = Column(Integer, nullable=False)
    total_semesters_completed = Column(Integer, nullable=False)
    
    # Calculation data
    total_credits = Column(Integer, nullable=False)
    total_grade_points = Column(Float, nullable=False)
    cgpa = Column(Float, nullable=False)
    
    # Semester breakdown
    semester_sgpas = Column(JSON, nullable=False)  # List of SGPA for each semester
    
    # Status
    is_current = Column(Boolean, default=True)  # Latest CGPA calculation
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("User")