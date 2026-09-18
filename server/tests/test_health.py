from flask.testing import FlaskClient


def test_health_check_returns_ok(client: FlaskClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.get_json() == {
        "service": "personal-finance-api",
        "status": "ok",
    }