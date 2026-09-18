from datetime import datetime, timedelta, timezone

import jwt
import pytest
from flask.testing import FlaskClient

from app.extensions import db
from app.models.user import User


@pytest.mark.parametrize(
    ("payload", "expected_errors"),
    [
        (
            {},
            {
                "name": "Name is required.",
                "email": "Email is required.",
                "password": "Password must be at least 12 characters.",
            },
        ),
        (
            {
                "name": "A" * 101,
                "email": "not-an-email",
                "password": "short",
            },
            {
                "name": "Name must be 100 characters or fewer.",
                "email": "Enter a valid email address.",
                "password": "Password must be at least 12 characters.",
            },
        ),
        (
            {
                "name": "Valid User",
                "email": "valid.user@example.com",
                "password": 123456789012,
            },
            {
                "password": "Password must be a string.",
            },
        ),
    ],
)
def test_register_rejects_invalid_input(
    client: FlaskClient,
    payload: dict[str, object],
    expected_errors: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json=payload,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": expected_errors
    }


def test_register_requires_json_body(client: FlaskClient) -> None:
    response = client.post("/api/v1/auth/register")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


def test_login_requires_json_body(client: FlaskClient) -> None:
    response = client.post("/api/v1/auth/login")

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"password": "TestPassword123!"},
        {
            "email": "test.user@example.com",
            "password": 123456789012,
        },
    ],
)
def test_login_rejects_missing_email_or_non_string_password(
    client: FlaskClient,
    payload: dict[str, object],
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json=payload,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Email and password are required."
    }


def test_login_rejects_missing_password_as_invalid_credentials(
    client: FlaskClient,
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test.user@example.com",
        },
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Invalid email or password."
    }


def test_login_rejects_unknown_email(
    client: FlaskClient,
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "not-an-email",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Invalid email or password."
    }


def test_protected_route_rejects_missing_authorization_header(
    client: FlaskClient,
) -> None:
    response = client.get("/api/v1/categories")

    assert response.status_code == 401
    assert response.get_json() == {
        "error": (
            "Authorization header must use "
            "the Bearer token scheme."
        )
    }


@pytest.mark.parametrize(
    "authorization_header",
    [
        "Bearer",
        "Basic credentials",
        "not-a-valid-jwt",
    ],
)
def test_protected_route_rejects_malformed_authorization_header(
    client: FlaskClient,
    authorization_header: str,
) -> None:
    response = client.get(
        "/api/v1/categories",
        headers={"Authorization": authorization_header},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": (
            "Authorization header must use "
            "the Bearer token scheme."
        )
    }


def test_protected_route_rejects_invalid_jwt(
    client: FlaskClient,
) -> None:
    response = client.get(
        "/api/v1/categories",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Invalid access token."
    }


def test_protected_route_rejects_expired_token(
    app,
    client: FlaskClient,
    user: dict[str, int | str],
) -> None:
    now = datetime.now(timezone.utc)

    expired_token = jwt.encode(
        {
            "sub": str(user["id"]),
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        app.config["SECRET_KEY"],
        algorithm=app.config["JWT_ALGORITHM"],
    )

    response = client.get(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Access token has expired."
    }


def test_protected_route_rejects_token_for_deleted_user(
    app,
    client: FlaskClient,
    user: dict[str, int | str],
) -> None:
    now = datetime.now(timezone.utc)

    token = jwt.encode(
        {
            "sub": str(user["id"]),
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        app.config["SECRET_KEY"],
        algorithm=app.config["JWT_ALGORITHM"],
    )

    with app.app_context():
        database_user = db.session.get(User, user["id"])

        assert database_user is not None

        db.session.delete(database_user)
        db.session.commit()

    response = client.get(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Invalid access token."
    }