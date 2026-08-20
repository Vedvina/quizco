from pydantic import ValidationError
import pytest
from models.schemas import (
    ProfileCreate, QuestionCreate, QuizCreate,
    AnswerSubmit, QuizSubmit, AIQuestionRequest
)


class TestProfileCreate:
    def test_valid_profile(self):
        p = ProfileCreate(full_name="John Doe", role="STUDENT")
        assert p.full_name == "John Doe"
        assert p.role == "STUDENT"
        assert p.roll_number is None
        assert p.department is None

    def test_profile_with_optional_fields(self):
        p = ProfileCreate(full_name="Jane", role="FACULTY", roll_number="F001", department="CS")
        assert p.roll_number == "F001"
        assert p.department == "CS"

    def test_missing_name_fails(self):
        with pytest.raises(ValidationError):
            ProfileCreate(role="STUDENT")

    def test_missing_role_fails(self):
        with pytest.raises(ValidationError):
            ProfileCreate(full_name="John")


class TestQuestionCreate:
    def test_mcq_question(self):
        q = QuestionCreate(
            subject="AI", topic="ML",
            question_text="What is supervised learning?",
            question_type="MCQ",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            difficulty="Medium", marks=2
        )
        assert q.question_type == "MCQ"
        assert len(q.options) == 4

    def test_short_answer_question(self):
        q = QuestionCreate(
            subject="AI", topic="DL",
            question_text="What does CNN stand for?",
            question_type="SHORT_ANSWER",
            correct_answer="Convolutional Neural Network",
        )
        assert q.question_type == "SHORT_ANSWER"
        assert q.options is None

    def test_true_false_question(self):
        q = QuestionCreate(
            subject="Math", topic="Algebra",
            question_text="2+2=4",
            question_type="TRUE_FALSE",
            correct_answer="True",
        )
        assert q.question_type == "TRUE_FALSE"

    def test_defaults(self):
        q = QuestionCreate(
            subject="S", topic="T",
            question_text="Q?", correct_answer="A"
        )
        assert q.question_type == "MCQ"
        assert q.difficulty == "Medium"
        assert q.marks == 1

    def test_missing_subject_fails(self):
        with pytest.raises(ValidationError):
            QuestionCreate(topic="T", question_text="Q?", correct_answer="A")

    def test_missing_correct_answer_fails(self):
        with pytest.raises(ValidationError):
            QuestionCreate(subject="S", topic="T", question_text="Q?")


class TestQuizCreate:
    def test_scheduled_quiz(self):
        q = QuizCreate(title="Midterm", quiz_type="SCHEDULED", duration_minutes=60)
        assert q.quiz_type == "SCHEDULED"
        assert q.duration_minutes == 60
        assert q.max_attempts == 1
        assert q.question_ids == []

    def test_live_quiz(self):
        q = QuizCreate(title="Live Test", quiz_type="LIVE", duration_minutes=10)
        assert q.quiz_type == "LIVE"

    def test_missing_title_fails(self):
        with pytest.raises(ValidationError):
            QuizCreate(quiz_type="SCHEDULED")

    def test_missing_quiz_type_fails(self):
        with pytest.raises(ValidationError):
            QuizCreate(title="Test")


class TestAnswerSubmit:
    def test_valid_answer(self):
        a = AnswerSubmit(quiz_id="q1", question_id="q2", selected_answer="B")
        assert a.selected_answer == "B"

    def test_missing_fields_fails(self):
        with pytest.raises(ValidationError):
            AnswerSubmit(quiz_id="q1", question_id="q2")


class TestQuizSubmit:
    def test_with_time(self):
        s = QuizSubmit(quiz_id="q1", student_id="s1", time_taken_seconds=300)
        assert s.time_taken_seconds == 300

    def test_without_time(self):
        s = QuizSubmit(quiz_id="q1", student_id="s1")
        assert s.time_taken_seconds is None


class TestAIQuestionRequest:
    def test_defaults(self):
        r = AIQuestionRequest(subject="AI", topic="ML")
        assert r.difficulty == "Medium"
        assert r.question_type == "MCQ"
        assert r.num_questions == 5
        assert r.marks_per_question == 1

    def test_custom_params(self):
        r = AIQuestionRequest(
            subject="CS", topic="DBMS",
            difficulty="Hard", question_type="SHORT_ANSWER",
            num_questions=10, marks_per_question=3
        )
        assert r.num_questions == 10
        assert r.marks_per_question == 3
