class TestQuestionsEndpoints:
    def test_get_questions_requires_auth(self, client, no_auth_headers):
        response = client.get("/questions/", headers=no_auth_headers)
        assert response.status_code == 401

    def test_get_questions_with_auth(self, client, auth_headers, mock_supabase):
        response = client.get("/questions/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_question_requires_auth(self, client, no_auth_headers):
        response = client.post("/questions/", json={
            "subject": "AI", "topic": "ML",
            "question_text": "What is KNN?",
            "correct_answer": "K-Nearest Neighbors"
        }, headers=no_auth_headers)
        assert response.status_code == 401

    def test_create_question_with_auth(self, client, auth_headers, mock_supabase):
        response = client.post("/questions/", json={
            "subject": "AI", "topic": "ML",
            "question_text": "What is KNN?",
            "correct_answer": "K-Nearest Neighbors",
            "question_type": "MCQ",
            "options": ["A", "B", "C", "D"],
            "difficulty": "Easy",
            "marks": 1
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_create_short_answer_question(self, client, auth_headers, mock_supabase):
        response = client.post("/questions/", json={
            "subject": "CS", "topic": "Networks",
            "question_text": "What does HTTP stand for?",
            "correct_answer": "HyperText Transfer Protocol",
            "question_type": "SHORT_ANSWER",
            "difficulty": "Easy",
            "marks": 2
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_create_question_missing_required_fields(self, client, auth_headers):
        response = client.post("/questions/", json={
            "subject": "AI"
        }, headers=auth_headers)
        assert response.status_code == 422

    def test_delete_question_requires_auth(self, client, no_auth_headers):
        response = client.delete("/questions/some-id", headers=no_auth_headers)
        assert response.status_code == 401

    def test_delete_question_with_auth(self, client, auth_headers, mock_supabase):
        response = client.delete("/questions/some-id", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"deleted": True}

    def test_generate_questions_requires_auth(self, client, no_auth_headers):
        response = client.post("/questions/generate", json={
            "subject": "AI", "topic": "ML"
        }, headers=no_auth_headers)
        assert response.status_code == 401

    def test_generate_questions_fails_without_api_key(self, client, auth_headers):
        import os
        old_key = os.environ.pop("GEMINI_API_KEY", None)
        try:
            response = client.post("/questions/generate", json={
                "subject": "AI", "topic": "ML",
                "num_questions": 3
            }, headers=auth_headers)
            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
        finally:
            if old_key:
                os.environ["GEMINI_API_KEY"] = old_key
