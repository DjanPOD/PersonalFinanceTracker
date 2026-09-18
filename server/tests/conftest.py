from collections.abc import Generator

import pytest
from flask import Flask
from flask.testing import FlaskClient
from werkzeug.security import generate_password_hash

from datetime import date

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret-key-that-is-at-least-32-bytes-long"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_MINUTES = 60


@pytest.fixture
def app() -> Generator[Flask, None, None]:
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


@pytest.fixture
def user(app: Flask) -> dict[str, int | str]:
    name = "Test User"
    email = "test.user@example.com"
    password = "TestPassword123!"

    with app.app_context():
        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
        )

        db.session.add(user)
        db.session.commit()

        user_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "password": password,
        }

    return user_data


@pytest.fixture
def auth_headers(
    client: FlaskClient,
    user: dict[str, int | str],
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    assert response.status_code == 200

    token = response.get_json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def second_user(app: Flask) -> dict[str, int | str]:
    name = "Second User"
    email = "second.user@example.com"
    password = "SecondPassword123!"

    with app.app_context():
        second_user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
        )

        db.session.add(second_user)
        db.session.commit()

        second_user_data = {
            "id": second_user.id,
            "name": second_user.name,
            "email": second_user.email,
            "password": password,
        }

    return second_user_data


@pytest.fixture
def second_auth_headers(
    client: FlaskClient,
    second_user: dict[str, int | str],
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": second_user["email"],
            "password": second_user["password"],
        },
    )

    assert response.status_code == 200

    token = response.get_json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def expense_category(
    app: Flask,
    user: dict[str, int | str],
) -> dict[str, int | str | None]:
    with app.app_context():
        category = Category(
            name="Groceries",
            type="expense",
            color="#22C55E",
            user_id=user["id"],
        )

        db.session.add(category)
        db.session.commit()

        category_data = {
            "id": category.id,
            "name": category.name,
            "type": category.type,
            "color": category.color,
            "user_id": category.user_id,
        }

    return category_data


@pytest.fixture
def income_category(
    app: Flask,
    user: dict[str, int | str],
) -> dict[str, int | str | None]:
    with app.app_context():
        category = Category(
            name="Salary",
            type="income",
            color="#3B82F6",
            user_id=user["id"],
        )

        db.session.add(category)
        db.session.commit()

        category_data = {
            "id": category.id,
            "name": category.name,
            "type": category.type,
            "color": category.color,
            "user_id": category.user_id,
        }

    return category_data


@pytest.fixture
def second_user_expense_category(
    app: Flask,
    second_user: dict[str, int | str],
) -> dict[str, int | str | None]:
    with app.app_context():
        category = Category(
            name="Private Category",
            type="expense",
            color="#EF4444",
            user_id=second_user["id"],
        )

        db.session.add(category)
        db.session.commit()

        category_data = {
            "id": category.id,
            "name": category.name,
            "type": category.type,
            "color": category.color,
            "user_id": category.user_id,
        }

    return category_data


@pytest.fixture
def expense_transaction(
    app: Flask,
    user: dict[str, int | str],
    expense_category: dict[str, int | str | None],
) -> dict[str, int | str | None]:
    with app.app_context():
        transaction = Transaction(
            amount="45.67",
            type="expense",
            description="Weekly groceries",
            transaction_date=date(2026, 9, 15),
            user_id=user["id"],
            category_id=expense_category["id"],
        )

        db.session.add(transaction)
        db.session.commit()

        transaction_data = {
            "id": transaction.id,
            "amount": str(transaction.amount),
            "type": transaction.type,
            "description": transaction.description,
            "transaction_date": transaction.transaction_date.isoformat(),
            "user_id": transaction.user_id,
            "category_id": transaction.category_id,
        }

    return transaction_data