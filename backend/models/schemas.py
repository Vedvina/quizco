from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProfileCreate(BaseModel):
    full_name: str
    role: str
    roll_number: Optional[str] = None
    department: Optional[str] = None


class QuestionCreate(BaseModel):
    subject: str
    topic: str
    question_text: str
    question_type: str = "MCQ"
    options: Optional[list] = None
    correct_answer: str
    difficulty: str = "Medium"
    marks: int = 1


class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    quiz_type: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = 60
    max_attempts: int = 1
    question_ids: list[str] = []


class AnswerSubmit(BaseModel):
    quiz_id: str
    question_id: str
    selected_answer: str


class QuizSubmit(BaseModel):
    quiz_id: str
    student_id: str
    time_taken_seconds: Optional[int] = None


class AIQuestionRequest(BaseModel):
    subject: str
    topic: str
    difficulty: str = "Medium"
    question_type: str = "MCQ"
    num_questions: int = 5
    marks_per_question: int = 1
