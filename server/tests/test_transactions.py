from flask.testing import FlaskClient


def create_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    category_id: int,
    *,
    amount: str = "45.67",
    transaction_type: str = "expense",
    description: str | None = "Weekly groceries",
    transaction_date: str = "2026-09-15",
):
    return client.post(
        "/api/v1/transactions",
        headers=auth_headers,
        json={
            "amount": amount,
            "type": transaction_type,
            "description": description,
            "transaction_date": transaction_date,
            "category_id": category_id,
        },
    )


def test_list_transactions_requires_token(client: FlaskClient) -> None:
    response = client.get("/api/v1/transactions")

    assert response.status_code == 401


def test_create_transaction_returns_created_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
    )

    response_data = response.get_json()
    transaction = response_data["transaction"]

    assert response.status_code == 201
    assert transaction["id"] > 0
    assert transaction["amount"] == "45.67"
    assert transaction["type"] == "expense"
    assert transaction["description"] == "Weekly groceries"
    assert transaction["transaction_date"] == "2026-09-15"
    assert transaction["category"]["id"] == expense_category["id"]
    assert transaction["category"]["name"] == "Groceries"
    assert transaction["category"]["type"] == "expense"
    assert transaction["category"]["color"] == "#22C55E"
    assert isinstance(transaction["category"]["created_at"], str)
    assert transaction["category"]["created_at"]
    assert isinstance(transaction["created_at"], str)
    assert transaction["created_at"]


def test_create_transaction_allows_blank_description(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        description="   ",
    )

    assert response.status_code == 201
    assert response.get_json()["transaction"]["description"] is None


def test_create_transaction_rejects_invalid_values(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="-10.123",
        transaction_type="transfer",
        transaction_date="09-15-2026",
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "type": "Type must be 'income' or 'expense'.",
            "amount": "Amount must be a positive number.",
            "transaction_date": (
                "Transaction date must use YYYY-MM-DD format."
            ),
        }
    }


def test_create_transaction_rejects_more_than_two_decimal_places(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="12.345",
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "amount": "Amount can have at most two decimal places."
        }
    }


def test_create_transaction_rejects_category_from_another_user(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_user_expense_category: dict[str, int | str | None],
) -> None:
    response = create_transaction(
        client,
        auth_headers,
        second_user_expense_category["id"],
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "category_id": "Category not found."
        }
    }


def test_create_transaction_rejects_category_type_mismatch(
    client: FlaskClient,
    auth_headers: dict[str, str],
    income_category: dict[str, int | str | None],
) -> None:
    response = create_transaction(
        client,
        auth_headers,
        income_category["id"],
        transaction_type="expense",
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "category_id": (
                "Transaction type must match the category type."
            )
        }
    }


def test_list_transactions_returns_current_users_transactions(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.get(
        "/api/v1/transactions",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["pagination"] == {
        "page": 1,
        "per_page": 20,
        "total": 1,
        "pages": 1,
        "has_next": False,
        "has_previous": False,
    }
    assert len(response_data["transactions"]) == 1

    transaction = response_data["transactions"][0]

    assert transaction["id"] == expense_transaction["id"]
    assert transaction["amount"] == "45.67"
    assert transaction["type"] == "expense"
    assert transaction["description"] == "Weekly groceries"
    assert transaction["transaction_date"] == "2026-09-15"
    assert (
    transaction["category"]["id"]
    == expense_transaction["category_id"]
    )
    assert transaction["category"]["name"] == "Groceries"
    assert transaction["category"]["type"] == "expense"
    assert transaction["category"]["color"] == "#22C55E"
    assert isinstance(transaction["category"]["created_at"], str)
    assert transaction["category"]["created_at"]
    assert isinstance(transaction["created_at"], str)
    assert transaction["created_at"]


def test_list_transactions_filters_by_type_category_and_date(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    income_category: dict[str, int | str | None],
) -> None:
    expense_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="30.00",
        transaction_date="2026-09-10",
    )
    income_response = create_transaction(
        client,
        auth_headers,
        income_category["id"],
        amount="5000.00",
        transaction_type="income",
        description="September salary",
        transaction_date="2026-09-01",
    )

    assert expense_response.status_code == 201
    assert income_response.status_code == 201

    response = client.get(
        (
            "/api/v1/transactions"
            f"?type=expense"
            f"&category_id={expense_category['id']}"
            "&start_date=2026-09-01"
            "&end_date=2026-09-30"
        ),
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["pagination"]["total"] == 1
    assert len(response_data["transactions"]) == 1
    assert response_data["transactions"][0]["type"] == "expense"
    assert (
    response_data["transactions"][0]["category"]["id"]
    == expense_category["id"]
    )
    assert (
        response_data["transactions"][0]["category"]["name"]
        == "Groceries"
    )
    assert response_data["transactions"][0]["amount"] == "30.00"


def test_list_transactions_rejects_invalid_query_values(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        (
            "/api/v1/transactions"
            "?type=transfer"
            "&category_id=not-an-id"
            "&start_date=2026-09-30"
            "&end_date=2026-09-01"
            "&page=0"
            "&per_page=101"
        ),
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Type must be 'income' or 'expense'."
    }


def test_list_transactions_rejects_invalid_date_range(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        (
            "/api/v1/transactions"
            "?start_date=2026-09-30"
            "&end_date=2026-09-01"
        ),
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Start date cannot be after end date."
    }


def test_list_transactions_paginates_results(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    first_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="10.00",
        description="First",
        transaction_date="2026-09-10",
    )
    second_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="20.00",
        description="Second",
        transaction_date="2026-09-11",
    )
    third_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="30.00",
        description="Third",
        transaction_date="2026-09-12",
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert third_response.status_code == 201

    response = client.get(
        "/api/v1/transactions?page=2&per_page=2",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["pagination"] == {
        "page": 2,
        "per_page": 2,
        "total": 3,
        "pages": 2,
        "has_next": False,
        "has_previous": True,
    }
    assert len(response_data["transactions"]) == 1
    assert response_data["transactions"][0]["description"] == "First"


def test_get_transaction_returns_current_users_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.get(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["transaction"]["id"] == expense_transaction["id"]
    assert response_data["transaction"]["amount"] == "45.67"
    assert response_data["transaction"]["description"] == "Weekly groceries"


def test_get_transaction_hides_another_users_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    created_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
    )

    transaction_id = created_response.get_json()["transaction"]["id"]

    response = client.get(
        f"/api/v1/transactions/{transaction_id}",
        headers=second_auth_headers,
    )

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "Transaction not found."
    }


def test_update_transaction_updates_supported_fields(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.patch(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
        json={
            "amount": "60.00",
            "description": "Updated groceries",
            "transaction_date": "2026-09-16",
        },
    )

    response_data = response.get_json()
    transaction = response_data["transaction"]

    assert response.status_code == 200
    assert transaction["id"] == expense_transaction["id"]
    assert transaction["amount"] == "60.00"
    assert transaction["description"] == "Updated groceries"
    assert transaction["transaction_date"] == "2026-09-16"
    assert transaction["type"] == "expense"


def test_update_transaction_rejects_invalid_category_type(
    client: FlaskClient,
    auth_headers: dict[str, str],
    income_category: dict[str, int | str | None],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.patch(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
        json={
            "category_id": income_category["id"],
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "category_id": (
                "Transaction type must match the category type."
            )
        }
    }


def test_update_transaction_hides_another_users_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    created_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
    )

    transaction_id = created_response.get_json()["transaction"]["id"]

    response = client.patch(
        f"/api/v1/transactions/{transaction_id}",
        headers=second_auth_headers,
        json={"description": "Attempted change"},
    )

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "Transaction not found."
    }


def test_delete_transaction_removes_current_users_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_transaction: dict[str, int | str | None],
) -> None:
    response = client.delete(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 204
    assert response.data == b""

    get_response = client.get(
        f"/api/v1/transactions/{expense_transaction['id']}",
        headers=auth_headers,
    )

    assert get_response.status_code == 404
    assert get_response.get_json() == {
        "error": "Transaction not found."
    }


def test_delete_transaction_hides_another_users_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    created_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
    )

    transaction_id = created_response.get_json()["transaction"]["id"]

    response = client.delete(
        f"/api/v1/transactions/{transaction_id}",
        headers=second_auth_headers,
    )

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "Transaction not found."
    }

    owner_response = client.get(
        f"/api/v1/transactions/{transaction_id}",
        headers=auth_headers,
    )

    assert owner_response.status_code == 200