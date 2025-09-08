from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class ExamStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    STARTED = "started"
    ENDED = "ended"
    RESULTS_PUBLISHED = "results_published"


class ExamType(str, Enum):
    IA1 = "ia1"  # Internal Assessment 1
    IA2 = "ia2"  # Internal Assessment 2
    ASSIGNMENT = "assignment"
    QUIZ = "quiz"
    PRACTICE = "practice"
    FINAL = "final"


class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(String, primary_key=True, index=True)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(JSON, nullable=True)  # List of instruction strings
    
    # Exam configuration
    exam_type = Column(SQLEnum(ExamType), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    total_marks = Column(Float, nullable=False)
    passing_marks = Column(Float, nullable=True)
    
    # Timing configuration
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
    join_window_seconds = Column(Integer, default=300)  # Time after start_at when students can join
    
    # Status and flags
    status = Column(SQLEnum(ExamStatus), default=ExamStatus.DRAFT)
    is_active = Column(Boolean, default=False)
    allow_late_submission = Column(Boolean, default=False)
    shuffle_questions = Column(Boolean, default=False)
    shuffle_options = Column(Boolean, default=False)
    
    # Proctoring settings
    enable_proctoring = Column(Boolean, default=True)
    camera_required = Column(Boolean, default=False)
    screen_share_required = Column(Boolean, default=False)
    
    # Auto-grading settings
    auto_grade_objective = Column(Boolean, default=True)
    ai_grade_descriptive = Column(Boolean, default=False)
    ai_grading_strictness = Column(String, default="standard")  # lenient, standard, strict
    
    # Lock-in policy
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String, nullable=True)
    lock_reason = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)
    results_published_at = Column(DateTime(timezone=True), nullable=True)
    
    # Statistics (computed fields)
    total_questions = Column(Integer, default=0)
    avg_score = Column(Float, nullable=True)
    highest_score = Column(Float, nullable=True)
    lowest_score = Column(Float, nullable=True)
    completion_rate = Column(Float, nullable=True)
    
    # Relationships
    course = relationship("Course", back_populates="exams")
    created_by_user = relationship("User", back_populates="created_exams")
    exam_questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="exam", cascade="all, delete-orphan")
    
    @property
    def is_joinable(self) -> bool:
        """Check if exam is currently joinable"""
        if self.status != ExamStatus.STARTED or not self.start_at:
            return False
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        join_deadline = self.start_at.replace(tzinfo=timezone.utc) + \
                       timedelta(seconds=self.join_window_seconds)
        
        return now <= join_deadline
    
    @property
    def is_active_now(self) -> bool:
        """Check if exam is currently active"""
        if self.status != ExamStatus.STARTED or not self.start_at or not self.end_at:
            return False
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        start = self.start_at.replace(tzinfo=timezone.utc)
        end = self.end_at.replace(tzinfo=timezone.utc)
        
        return start <= now <= end


class ExamQuestion(Base):
    """Junction table linking exams to questions with exam-specific settings"""
    __tablename__ = "exam_questions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    # Question positioning and configuration
    order_index = Column(Integer, nullable=False)  # Order within the exam
    marks = Column(Float, nullable=False)  # Marks for this question in this exam
    is_mandatory = Column(Boolean, default=True)
    
    # Question-specific instructions for this exam
    instructions = Column(Text, nullable=True)
    time_limit_seconds = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("Question", back_populates="exam_questions")
    responses = relationship("Response", back_populates="exam_question")


class Attempt(Base):
    """Student's attempt at an exam"""
    __tablename__ = "attempts"
    
    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"), nullable=False)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Attempt metadata
    started_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    
    # Scores
    total_score = Column(Float, default=0.0)
    max_possible_score = Column(Float, nullable=False)
    percentage = Column(Float, nullable=True)
    grade = Column(String, nullable=True)  # A, B, C, D, F
    
    # Status
    is_submitted = Column(Boolean, default=False)
    is_graded = Column(Boolean, default=False)
    auto_submitted = Column(Boolean, default=False)  # True if auto-submitted due to time limit
    
    # Proctoring data
    violations_count = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    flagged_for_review = Column(Boolean, default=False)
    
    # IP and browser info for security
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Grading information
    graded_at = Column(DateTime(timezone=True), nullable=True)
    graded_by = Column(String, nullable=True)
    grading_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    exam = relationship("Exam", back_populates="attempts")
    student = relationship("User", back_populates="attempts")
    responses = relationship("Response", back_populates="attempt", cascade="all, delete-orphan")
    proctor_logs = relationship("ProctorLog", back_populates="attempt")


class Response(Base):
    """Student's response to a specific question in an exam"""
    __tablename__ = "responses"
    
    id = Column(String, primary_key=True, index=True)
    attempt_id = Column(String, ForeignKey("attempts.id"), nullable=False)
    exam_question_id = Column(Integer, ForeignKey("exam_questions.id"), nullable=False)
    
    # Response data
    answer = Column(JSON, nullable=True)  # Stores different answer types (string, array, file paths)
    answer_text = Column(Text, nullable=True)  # For descriptive answers
    selected_options = Column(JSON, nullable=True)  # For MCQ/MSQ answers
    file_uploads = Column(JSON, nullable=True)  # For file upload questions
    
    # Auto-save functionality
    saved_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_final = Column(Boolean, default=False)  # True when student moves to next question
    
    # Grading information
    awarded_marks = Column(Float, default=0.0)
    is_correct = Column(Boolean, nullable=True)  # For objective questions
    is_graded = Column(Boolean, default=False)
    
    # AI grading (for descriptive questions)
    ai_score = Column(Float, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    teacher_override = Column(Boolean, default=False)
    teacher_feedback = Column(Text, nullable=True)
    
    # Timing information
    time_spent_seconds = Column(Integer, default=0)
    first_attempt_at = Column(DateTime(timezone=True), nullable=True)
    last_modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    attempt = relationship("Attempt", back_populates="responses")
    exam_question = relationship("ExamQuestion", back_populates="responses")
    
    @property
    def question(self):
        return self.exam_question.question if self.exam_question else None