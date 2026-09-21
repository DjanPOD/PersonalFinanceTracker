from flask.testing import FlaskClient
import pytest

def create_budget(
    client: FlaskClient,
    auth_headers: dict[str, str],
    category_id: int,
    *,
    amount: str = "500.00",
    month: str = "2026-09",
):
    return client.post(
        "/api/v1/budgets",
        headers=auth_headers,
        json={
            "category_id": category_id,
            "amount": amount,
            "month": month,
        },
    )


def create_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    category_id: int,
    *,
    amount: str,
    transaction_date: str,
):
    return client.post(
        "/api/v1/transactions",
        headers=auth_headers,
        json={
            "amount": amount,
            "type": "expense",
            "description": "Budget test expense",
            "transaction_date": transaction_date,
            "category_id": category_id,
        },
    )


def test_list_budgets_requires_token(client: FlaskClient) -> None:
    response = client.get("/api/v1/budgets")

    assert response.status_code == 401


def test_create_budget_returns_budget_with_zero_spending(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    response_data = response.get_json()
    budget = response_data["budget"]

    assert response.status_code == 201
    assert budget["id"] > 0
    assert budget["month"] == "2026-09"
    assert budget["amount"] == "500.00"
    assert budget["spent"] == "0.00"
    assert budget["remaining"] == "500.00"
    assert budget["progress_percentage"] == 0.0
    assert budget["category"]["id"] == expense_category["id"]
    assert budget["category"]["name"] == "Groceries"
    assert budget["category"]["type"] == "expense"
    assert budget["category"]["color"] == "#22C55E"
    assert isinstance(budget["created_at"], str)
    assert budget["created_at"]


def test_create_budget_rejects_invalid_values(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/budgets",
        headers=auth_headers,
        json={
            "category_id": True,
            "amount": "12.345",
            "month": "2026-13",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "month": "Month must use YYYY-MM format.",
            "amount": "Amount can have at most two decimal places.",
            "category_id": "Category ID must be a whole number.",
        }
    }


def test_create_budget_rejects_income_category(
    client: FlaskClient,
    auth_headers: dict[str, str],
    income_category: dict[str, int | str | None],
) -> None:
    response = create_budget(
        client,
        auth_headers,
        income_category["id"],
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "category_id": (
                "Budgets can only be created for expense categories."
            )
        }
    }


def test_create_budget_rejects_another_users_category(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_user_expense_category: dict[str, int | str | None],
) -> None:
    response = create_budget(
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


def test_create_budget_rejects_duplicate_category_and_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    first_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )
    second_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.get_json() == {
        "error": (
            "A budget for this category and month "
            "already exists."
        )
    }


def test_list_budgets_calculates_monthly_spending_and_remaining(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    budget_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        amount="200.00",
        month="2026-09",
    )
    september_first_expense = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="75.50",
        transaction_date="2026-09-01",
    )
    september_last_expense = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="24.50",
        transaction_date="2026-09-30",
    )
    august_expense = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="50.00",
        transaction_date="2026-08-31",
    )

    assert budget_response.status_code == 201
    assert september_first_expense.status_code == 201
    assert september_last_expense.status_code == 201
    assert august_expense.status_code == 201

    response = client.get(
        "/api/v1/budgets?month=2026-09",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert len(response_data["budgets"]) == 1

    budget = response_data["budgets"][0]

    assert budget["amount"] == "200.00"
    assert budget["spent"] == "100.00"
    assert budget["remaining"] == "100.00"
    assert budget["progress_percentage"] == 50.0


def test_list_budgets_reports_overspending(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    budget_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        amount="100.00",
    )
    expense_response = create_transaction(
        client,
        auth_headers,
        expense_category["id"],
        amount="125.25",
        transaction_date="2026-09-15",
    )

    assert budget_response.status_code == 201
    assert expense_response.status_code == 201

    response = client.get(
        "/api/v1/budgets?month=2026-09",
        headers=auth_headers,
    )

    budget = response.get_json()["budgets"][0]

    assert response.status_code == 200
    assert budget["spent"] == "125.25"
    assert budget["remaining"] == "-25.25"
    assert budget["progress_percentage"] == 125.25


def test_list_budgets_returns_only_requested_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    september_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        month="2026-09",
    )
    october_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        month="2026-10",
    )

    assert september_response.status_code == 201
    assert october_response.status_code == 201

    response = client.get(
        "/api/v1/budgets?month=2026-10",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert len(response_data["budgets"]) == 1
    assert response_data["budgets"][0]["month"] == "2026-10"


def test_list_budgets_excludes_other_users_budgets(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    first_user_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        amount="100.00",
    )

    second_user_category_response = client.post(
        "/api/v1/categories",
        headers=second_auth_headers,
        json={
            "name": "Private Budget Category",
            "type": "expense",
            "color": "#EF4444",
        },
    )

    assert first_user_response.status_code == 201
    assert second_user_category_response.status_code == 201

    second_user_category_id = second_user_category_response.get_json()[
        "category"
    ]["id"]

    second_user_budget_response = create_budget(
        client,
        second_auth_headers,
        second_user_category_id,
        amount="999.99",
    )

    assert second_user_budget_response.status_code == 201

    response = client.get(
        "/api/v1/budgets?month=2026-09",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert len(response_data["budgets"]) == 1
    assert response_data["budgets"][0]["amount"] == "100.00"
    assert (
        response_data["budgets"][0]["category"]["id"]
        == expense_category["id"]
    )


def test_update_budget_updates_amount_and_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        amount="200.00",
        month="2026-09",
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers,
        json={
            "amount": "350.00",
            "month": "2026-10",
        },
    )

    budget = response.get_json()["budget"]

    assert response.status_code == 200
    assert budget["id"] == budget_id
    assert budget["amount"] == "350.00"
    assert budget["month"] == "2026-10"
    assert budget["spent"] == "0.00"
    assert budget["remaining"] == "350.00"
    assert budget["progress_percentage"] == 0.0


def test_update_budget_rejects_duplicate_category_and_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    first_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        month="2026-09",
    )
    second_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        month="2026-10",
    )

    first_budget_id = first_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{first_budget_id}",
        headers=auth_headers,
        json={"month": "2026-10"},
    )

    assert second_response.status_code == 201
    assert response.status_code == 409
    assert response.get_json() == {
        "error": (
            "A budget for this category and month "
            "already exists."
        )
    }


def test_update_budget_hides_another_users_budget(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=second_auth_headers,
        json={"amount": "100.00"},
    )

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "Budget not found."
    }


def test_delete_budget_removes_current_users_budget(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.delete(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers,
    )

    assert response.status_code == 204
    assert response.data == b""

    list_response = client.get(
        "/api/v1/budgets?month=2026-09",
        headers=auth_headers,
    )

    assert list_response.status_code == 200
    assert list_response.get_json() == {"budgets": []}


def test_delete_budget_hides_another_users_budget(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.delete(
        f"/api/v1/budgets/{budget_id}",
        headers=second_auth_headers,
    )

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "Budget not found."
    }

    owner_response = client.get(
        "/api/v1/budgets?month=2026-09",
        headers=auth_headers,
    )

    assert owner_response.status_code == 200
    assert len(owner_response.get_json()["budgets"]) == 1


def test_list_budgets_rejects_invalid_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/budgets?month=2026-13",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Month must use YYYY-MM format."
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
def test_create_budget_rejects_invalid_amounts(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    amount: object,
    expected_message: str,
) -> None:
    response = client.post(
        "/api/v1/budgets",
        headers=auth_headers,
        json={
            "category_id": expense_category["id"],
            "amount": amount,
            "month": "2026-09",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "amount": expected_message
        }
    }


def test_create_budget_requires_json_body(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/budgets",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


def test_list_budgets_uses_current_month_by_default(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/budgets",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "budgets": []
    }


def test_update_budget_requires_json_body(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A JSON request body is required."
    }


def test_update_budget_rejects_invalid_values_without_mutating_record(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
        amount="200.00",
        month="2026-09",
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers,
        json={
            "amount": "12.345",
            "month": "2026-13",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "month": "Month must use YYYY-MM format.",
            "amount": "Amount can have at most two decimal places.",
        }
    }

    get_response = client.get(
        "/api/v1/budgets?month=2026-09",
        headers=auth_headers,
    )

    budget = get_response.get_json()["budgets"][0]

    assert get_response.status_code == 200
    assert budget["amount"] == "200.00"
    assert budget["month"] == "2026-09"


def test_update_budget_rejects_income_category(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    income_category: dict[str, int | str | None],
) -> None:
    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers,
        json={
            "category_id": income_category["id"],
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "category_id": (
                "Budgets can only be created for expense categories."
            )
        }
    }


def test_update_budget_can_change_to_another_expense_category(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    second_expense_category_response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": "Transport",
            "type": "expense",
            "color": "#0EA5E9",
        },
    )

    assert second_expense_category_response.status_code == 201

    second_expense_category_id = second_expense_category_response.get_json()[
        "category"
    ]["id"]

    create_response = create_budget(
        client,
        auth_headers,
        expense_category["id"],
    )

    budget_id = create_response.get_json()["budget"]["id"]

    response = client.patch(
        f"/api/v1/budgets/{budget_id}",
        headers=auth_headers,
        json={
            "category_id": second_expense_category_id,
        },
    )

    budget = response.get_json()["budget"]

    assert response.status_code == 200
    assert budget["category"]["id"] == second_expense_category_id
    assert budget["category"]["name"] == "Transport"