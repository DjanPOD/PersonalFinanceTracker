import pytest
from flask.testing import FlaskClient


@pytest.mark.parametrize(
    ("path", "expected_error"),
    [
        (
            "/api/v1/transactions?category_id=not-an-id",
            "Category ID must be a whole number.",
        ),
        (
            "/api/v1/transactions?start_date=2026-09-31",
            "Transaction date must use YYYY-MM-DD format.",
        ),
        (
            "/api/v1/transactions?page=0",
            "Page must be at least 1.",
        ),
        (
            "/api/v1/transactions?per_page=0",
            "Per-page value must be between 1 and 100.",
        ),
        (
            "/api/v1/transactions?per_page=101",
            "Per-page value must be between 1 and 100.",
        ),
    ],
)
def test_list_transactions_rejects_invalid_individual_query_values(
    client: FlaskClient,
    auth_headers: dict[str, str],
    path: str,
    expected_error: str,
) -> None:
    response = client.get(path, headers=auth_headers)

    assert response.status_code == 400
    assert response.get_json() == {"error": expected_error}


def test_create_category_requires_json_body(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


def test_create_category_rejects_non_string_color(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": "Utilities",
            "type": "expense",
            "color": 123,
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "color": "Color must be a hex color string."
        }
    }


def test_create_transaction_requires_json_body(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/transactions",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


@pytest.mark.parametrize(
    ("amount", "expected_message"),
    [
        (True, "Amount must be a positive number."),
        ("not-a-number", "Amount must be a positive number."),
        ("0", "Amount must be a positive number."),
        ("-1", "Amount must be a positive number."),
        ("10000000000.00", "Amount is too large."),
    ],
)
def test_create_transaction_rejects_invalid_amounts(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    amount: object,
    expected_message: str,
) -> None:
    response = client.post(
        "/api/v1/transactions",
        headers=auth_headers,
        json={
            "amount": amount,
            "type": "expense",
            "description": "Validation test",
            "transaction_date": "2026-09-15",
            "category_id": expense_category["id"],
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "amount": expected_message
        }
    }


def test_create_transaction_rejects_boolean_category_id(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/transactions",
        headers=auth_headers,
        json={
            "amount": "10.00",
            "type": "expense",
            "description": "Invalid category ID",
            "transaction_date": "2026-09-15",
            "category_id": True,
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "category_id": "Category ID must be a whole number."
        }
    }


def test_update_transaction_requires_json_body(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.patch(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


def test_update_transaction_rejects_invalid_amount_without_mutating_record(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.patch(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
        json={
            "amount": "12.345",
            "description": "This update must not persist",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "amount": "Amount can have at most two decimal places."
        }
    }

    get_response = client.get(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
    )

    transaction = get_response.get_json()["transaction"]

    assert get_response.status_code == 200
    assert transaction["amount"] == "45.67"
    assert transaction["description"] == "Weekly groceries"


def test_update_transaction_rejects_invalid_date_without_mutating_record(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.patch(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
        json={
            "transaction_date": "2026-02-30",
            "description": "This update must not persist",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "transaction_date": (
                "Transaction date must use YYYY-MM-DD format."
            )
        }
    }

    get_response = client.get(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
    )

    transaction = get_response.get_json()["transaction"]

    assert get_response.status_code == 200
    assert transaction["transaction_date"] == "2026-09-15"
    assert transaction["description"] == "Weekly groceries"