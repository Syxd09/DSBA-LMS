from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


# Association table for CO-PO mapping
co_po_association = Table(
    'co_po_mappings',
    Base.metadata,
    Column('co_id', String, ForeignKey('course_outcomes.id'), primary_key=True),
    Column('po_id', String, ForeignKey('program_outcomes.id'), primary_key=True),
    Column('attainment_level', Integer, default=1)  # 1, 2, or 3 for Low, Medium, High
)


class Program(Base):
    __tablename__ = "programs"
    
    id = Column(String, primary_key=True, index=True)  # e.g., "BCA", "MCA", "MBA"
    name = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    duration_years = Column(Integer, nullable=False)
    total_semesters = Column(Integer, nullable=False)
    department = Column(String, nullable=False)
    
    description = Column(Text, nullable=True)
    accreditation_body = Column(String, nullable=True)  # NBA, NAAC, etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    program_outcomes = relationship("PO", back_populates="program")
    courses = relationship("Course", back_populates="program")


class PO(Base):
    """Program Outcomes"""
    __tablename__ = "program_outcomes"
    
    id = Column(String, primary_key=True, index=True)  # e.g., "PO1", "PO2"
    program_id = Column(String, ForeignKey("programs.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    bloom_level = Column(String, nullable=True)  # Knowledge, Comprehension, Application, etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    program = relationship("Program", back_populates="program_outcomes")
    cos = relationship("CO", secondary=co_po_association, back_populates="pos")


class Course(Base):
    __tablename__ = "courses"
    
    id = Column(String, primary_key=True, index=True)  # e.g., "CS101", "MAT201"
    program_id = Column(String, ForeignKey("programs.id"), nullable=False)
    
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    credits = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    
    description = Column(Text, nullable=True)
    syllabus = Column(Text, nullable=True)
    prerequisites = Column(Text, nullable=True)
    
    # Academic structure
    theory_hours = Column(Integer, default=0)
    practical_hours = Column(Integer, default=0)
    tutorial_hours = Column(Integer, default=0)
    
    # Assessment structure
    internal_marks = Column(Integer, default=40)
    external_marks = Column(Integer, default=60)
    total_marks = Column(Integer, default=100)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    program = relationship("Program", back_populates="courses")
    course_outcomes = relationship("CO", back_populates="course")
    exams = relationship("Exam", back_populates="course")


class CO(Base):
    """Course Outcomes"""
    __tablename__ = "course_outcomes"
    
    id = Column(String, primary_key=True, index=True)  # e.g., "CO1", "CO2"
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    bloom_level = Column(String, nullable=True)  # Knowledge, Comprehension, Application, etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="course_outcomes")
    pos = relationship("PO", secondary=co_po_association, back_populates="cos")
    questions = relationship("Question", back_populates="co")


class COPOMap(Base):
    """Explicit CO-PO mapping with attainment levels"""
    __tablename__ = "co_po_mappings_detailed"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    co_id = Column(String, ForeignKey("course_outcomes.id"), nullable=False)
    po_id = Column(String, ForeignKey("program_outcomes.id"), nullable=False)
    
    attainment_level = Column(Integer, nullable=False)  # 1=Low, 2=Medium, 3=High
    weightage = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String, nullable=False)  # User who created the mapping
    
    def __repr__(self):
        return f"<COPOMap(co={self.co_id}, po={self.po_id}, level={self.attainment_level})>"