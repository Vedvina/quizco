class TestResultsEndpoints:
    def test_get_quiz_results_requires_auth(self, client, no_auth_headers):
        response = client.get("/results/some-quiz-id", headers=no_auth_headers)
        assert response.status_code == 401

    def test_get_quiz_results_with_auth(self, client, auth_headers, mock_supabase):
        response = client.get("/results/some-quiz-id", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_student_results_requires_auth(self, client, no_auth_headers):
        response = client.get("/results/student/some-student-id", headers=no_auth_headers)
        assert response.status_code == 401

    def test_get_student_results_with_auth(self, client, auth_headers, mock_supabase):
        response = client.get("/results/student/some-student-id", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestActivityEndpoints:
    def test_log_activity_requires_auth(self, client, no_auth_headers):
        response = client.post("/activity-log", json={
            "quiz_id": "q1", "student_id": "s1", "event_type": "TAB_SWITCH"
        }, headers=no_auth_headers)
        assert response.status_code == 401

    def test_log_activity_with_auth(self, client, auth_headers, mock_supabase):
        response = client.post("/activity-log", json={
            "quiz_id": "q1", "student_id": "s1",
            "event_type": "TAB_SWITCH", "event_details": "Switched tab",
            "violation_count": 1, "flagged": False
        }, headers=auth_headers)
        assert response.status_code == 200

    def test_get_activity_logs_requires_auth(self, client, no_auth_headers):
        response = client.get("/activity-log/some-quiz-id", headers=no_auth_headers)
        assert response.status_code == 401

    def test_get_activity_logs_with_auth(self, client, auth_headers, mock_supabase):
        response = client.get("/activity-log/some-quiz-id", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
