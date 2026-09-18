from flask.testing import FlaskClient

from app.extensions import db
from app.models.user import User


def test_register_creates_user(client: FlaskClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "New User",
            "email": "new.user@example.com",
            "password": "StrongPassword123!",
        },
    )

    response_data = response.get_json()

    assert response.status_code == 201
    assert response_data["user"]["name"] == "New User"
    assert response_data["user"]["email"] == "new.user@example.com"
    assert "password_hash" not in response_data["user"]

    created_user = db.session.scalar(
        db.select(User).where(User.email == "new.user@example.com")
    )

    assert created_user is not None
    assert created_user.password_hash != "StrongPassword123!"


def test_register_rejects_duplicate_email(
    client: FlaskClient,
    user: dict[str, int | str],
) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Another User",
            "email": user["email"],
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 409
    assert response.get_json() == {
        "error": "An account with that email already exists."
    }


def test_register_rejects_short_password(client: FlaskClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "New User",
            "email": "new.user@example.com",
            "password": "short",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["errors"]["password"] == (
        "Password must be at least 12 characters."
    )


def test_login_returns_access_token(
    client: FlaskClient,
    user: dict[str, int | str],
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["token_type"] == "Bearer"
    assert isinstance(response_data["access_token"], str)
    assert response_data["access_token"]
    assert response_data["user"]["id"] == user["id"]
    assert response_data["user"]["email"] == user["email"]


def test_login_rejects_invalid_password(
    client: FlaskClient,
    user: dict[str, int | str],
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user["email"],
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Invalid email or password."
    }


def test_get_current_user_requires_token(client: FlaskClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_get_current_user_returns_authenticated_user(
    client: FlaskClient,
    auth_headers: dict[str, str],
    user: dict[str, int | str],
) -> None:
    response = client.get(
        "/api/v1/auth/me",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["user"]["id"] == user["id"]
    assert response_data["user"]["email"] == user["email"]
    assert "password_hash" not in response_data["user"]