class TestAnswerEndpoints:
    def test_submit_answer_requires_auth(self, client, no_auth_headers):
        response = client.post("/answers", json={
            "quiz_id": "q1", "question_id": "q2", "selected_answer": "B"
        }, headers=no_auth_headers)
        assert response.status_code == 401

    def test_submit_answer_with_auth(self, client, auth_headers, mock_supabase):
        response = client.post("/answers", json={
            "quiz_id": "q1", "question_id": "q2", "selected_answer": "B"
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_submit_answer_missing_fields(self, client, auth_headers):
        response = client.post("/answers", json={
            "quiz_id": "q1"
        }, headers=auth_headers)
        assert response.status_code == 422

    def test_submit_quiz_requires_auth(self, client, no_auth_headers):
        response = client.post("/quizzes/q1/submit", json={
            "quiz_id": "q1", "student_id": "s1"
        }, headers=no_auth_headers)
        assert response.status_code == 401

    def test_submit_quiz_with_auth(self, client, auth_headers, mock_supabase):
        response = client.post("/quizzes/q1/submit", json={
            "quiz_id": "q1", "student_id": "s1", "time_taken_seconds": 120
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_submit_quiz_without_time(self, client, auth_headers, mock_supabase):
        response = client.post("/quizzes/q1/submit", json={
            "quiz_id": "q1", "student_id": "s1"
        }, headers=auth_headers)
        assert response.status_code == 200
