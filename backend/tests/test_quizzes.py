class TestQuizzesEndpoints:
    def test_get_quiz_requires_auth(self, client, no_auth_headers):
        response = client.get("/quizzes/some-id", headers=no_auth_headers)
        assert response.status_code == 401

    def test_get_quiz_with_auth(self, client, auth_headers, mock_supabase):
        response = client.get("/quizzes/some-id", headers=auth_headers)
        assert response.status_code == 200

    def test_create_quiz_requires_auth(self, client, no_auth_headers):
        response = client.post("/quizzes/", json={
            "title": "Test Quiz", "quiz_type": "SCHEDULED"
        }, headers=no_auth_headers)
        assert response.status_code == 401

    def test_create_scheduled_quiz(self, client, auth_headers, mock_supabase):
        response = client.post("/quizzes/", json={
            "title": "Midterm Exam",
            "quiz_type": "SCHEDULED",
            "duration_minutes": 60,
            "question_ids": []
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_create_live_quiz(self, client, auth_headers, mock_supabase):
        response = client.post("/quizzes/", json={
            "title": "Live Quiz",
            "quiz_type": "LIVE",
            "duration_minutes": 10,
            "question_ids": []
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_create_quiz_missing_fields(self, client, auth_headers):
        response = client.post("/quizzes/", json={}, headers=auth_headers)
        assert response.status_code == 422

    def test_delete_quiz_requires_auth(self, client, no_auth_headers):
        response = client.delete("/quizzes/some-id", headers=no_auth_headers)
        assert response.status_code == 401

    def test_delete_quiz_with_auth(self, client, auth_headers, mock_supabase):
        response = client.delete("/quizzes/some-id", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"deleted": True}
