from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.core.database import Base


class QuestionType(str, Enum):
    MCQ = "mcq"  # Multiple Choice (single correct)
    MSQ = "msq"  # Multiple Select (multiple correct)
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"
    NUMERIC = "numeric"
    DESCRIPTIVE_SHORT = "descriptive_short"  # < 500 words
    DESCRIPTIVE_LONG = "descriptive_long"   # > 500 words
    CODING = "coding"
    FILE_UPLOAD = "file_upload"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class BloomLevel(str, Enum):
    KNOWLEDGE = "knowledge"
    COMPREHENSION = "comprehension"
    APPLICATION = "application"
    ANALYSIS = "analysis"
    SYNTHESIS = "synthesis"
    EVALUATION = "evaluation"


class Question(Base):
    __tablename__ = "questions"
    
    id = Column(String, primary_key=True, index=True)
    co_id = Column(String, ForeignKey("course_outcomes.id"), nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Question content
    question_text = Column(Text, nullable=False)
    question_type = Column(SQLEnum(QuestionType), nullable=False)
    
    # Metadata
    difficulty_level = Column(SQLEnum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    bloom_level = Column(SQLEnum(BloomLevel), nullable=True)
    estimated_time_minutes = Column(Integer, default=2)
    
    # Tags and categorization
    tags = Column(JSON, nullable=True)  # List of tags
    topics = Column(JSON, nullable=True)  # List of topics covered
    keywords = Column(JSON, nullable=True)  # Keywords for search
    
    # Media attachments
    images = Column(JSON, nullable=True)  # List of image file paths
    audio_files = Column(JSON, nullable=True)  # List of audio file paths
    video_files = Column(JSON, nullable=True)  # List of video file paths
    documents = Column(JSON, nullable=True)  # List of document file paths
    
    # LaTeX support
    has_latex = Column(Boolean, default=False)
    latex_content = Column(Text, nullable=True)
    
    # Versioning
    version = Column(Integer, default=1)
    parent_question_id = Column(String, nullable=True)  # For question versions
    is_active = Column(Boolean, default=True)
    
    # AI-generated flags
    ai_generated = Column(Boolean, default=False)
    ai_prompt = Column(Text, nullable=True)  # Prompt used to generate the question
    ai_model = Column(String, nullable=True)  # AI model used
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    avg_score = Column(Float, nullable=True)
    discrimination_index = Column(Float, nullable=True)  # Item analysis
    
    # Approval workflow
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    co = relationship("CO", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    versions = relationship("QuestionVersion", back_populates="question")
    exam_questions = relationship("ExamQuestion", back_populates="question")
    
    # Answer configuration (stored as JSON for flexibility)
    answer_config = Column(JSON, nullable=True)  # Contains correct answers, scoring rules, etc.
    
    def get_correct_answer(self):
        """Get the correct answer based on question type"""
        if not self.answer_config:
            return None
        return self.answer_config.get("correct_answer")
    
    def get_scoring_config(self):
        """Get scoring configuration for the question"""
        if not self.answer_config:
            return {}
        return self.answer_config.get("scoring", {})


class QuestionOption(Base):
    """Options for MCQ and MSQ questions"""
    __tablename__ = "question_options"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    order_index = Column(Integer, nullable=False)
    
    # Media support for options
    image_path = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)  # Explanation for why this option is correct/incorrect
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    question = relationship("Question", back_populates="options")


class QuestionVersion(Base):
    """Version history for questions"""
    __tablename__ = "question_versions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    version_number = Column(Integer, nullable=False)
    changes_summary = Column(Text, nullable=True)
    
    # Snapshot of question data at this version
    question_data = Column(JSON, nullable=False)  # Complete question snapshot
    
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    question = relationship("Question", back_populates="versions")