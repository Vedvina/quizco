class TestAuthProfile:
    def test_get_profile_requires_auth(self, client, no_auth_headers):
        response = client.post("/auth/profile", headers=no_auth_headers)
        assert response.status_code == 401

    def test_get_profile_with_valid_token(self, client, auth_headers, mock_supabase):
        response = client.post("/auth/profile", headers=auth_headers)
        assert response.status_code == 200

    def test_get_profile_with_invalid_token(self, client):
        response = client.post(
            "/auth/profile",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401
