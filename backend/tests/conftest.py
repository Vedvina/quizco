import sys
import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

MOCK_TABLE_DATA = {
    "questions": [{"id": "q1", "correct_answer": "B", "marks": 2, "subject": "AI", "topic": "ML", "question_text": "Test?"}],
    "answers": [{"id": "a1", "marks_obtained": 2, "is_correct": True, "quiz_id": "q1", "student_id": "s1"}],
    "quizzes": [{"id": "q1", "total_marks": 10, "title": "Test Quiz"}],
    "results": [{"id": "r1", "quiz_id": "q1", "student_id": "s1", "obtained_marks": 8, "percentage": 80}],
    "quiz_questions": [{"id": "qq1", "quiz_id": "q1", "question_id": "q1", "order_index": 0}],
    "profiles": [{"id": "user-123", "full_name": "Test User", "role": "STUDENT"}],
    "activity_logs": [],
    "quiz_participants": [],
}

DEFAULT_DATA = [{"id": "mock-id-123", "title": "Mock"}]


class MockQueryBuilder:
    def __init__(self, data=None, single_result=False):
        self._data = data if data is not None else []
        self._single = single_result

    def select(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def delete(self, *args, **kwargs):
        return self

    def upsert(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        if self._single:
            return MagicMock(data=self._data[0] if self._data else None)
        return MagicMock(data=self._data)


class MockSupabaseAuth:
    def get_user(self, token):
        if token == "valid-token":
            return MagicMock(user=MagicMock(id="user-123", email="test@test.com"))
        return MagicMock(user=None)


class MockSupabaseClient:
    def __init__(self):
        self.auth = MockSupabaseAuth()

    def table(self, name):
        data = MOCK_TABLE_DATA.get(name, DEFAULT_DATA)
        return MockQueryBuilder(data=list(data))


@pytest.fixture
def mock_supabase():
    client = MockSupabaseClient()
    with patch("services.supabase_client.get_supabase", return_value=client), \
         patch("deps.get_supabase", return_value=client):
        yield client


@pytest.fixture
def app(mock_supabase):
    from main import app as fastapi_app
    return fastapi_app


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer valid-token"}


@pytest.fixture
def no_auth_headers():
    return {}
