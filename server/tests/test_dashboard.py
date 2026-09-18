from flask.testing import FlaskClient


def create_transaction(
    client: FlaskClient,
    auth_headers: dict[str, str],
    category_id: int,
    *,
    amount: str,
    transaction_type: str,
    description: str,
    transaction_date: str,
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


def create_category(
    client: FlaskClient,
    auth_headers: dict[str, str],
    *,
    name: str,
    category_type: str,
    color: str,
) -> dict:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": name,
            "type": category_type,
            "color": color,
        },
    )

    assert response.status_code == 201

    return response.get_json()["category"]


def test_dashboard_summary_requires_token(client: FlaskClient) -> None:
    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 401


def test_dashboard_summary_returns_zero_values_for_empty_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary?month=2026-09",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data == {
        "period": {
            "month": "2026-09",
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
        },
        "summary": {
            "total_income": "0.00",
            "total_expenses": "0.00",
            "balance": "0.00",
        },
        "expenses_by_category": [],
        "recent_transactions": [],
    }


def test_dashboard_summary_calculates_monthly_totals_and_groups_expenses(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    income_category: dict[str, int | str | None],
) -> None:
    dining_category = create_category(
        client,
        auth_headers,
        name="Dining",
        category_type="expense",
        color="#F97316",
    )

    responses = [
        create_transaction(
            client,
            auth_headers,
            income_category["id"],
            amount="5000.00",
            transaction_type="income",
            description="Salary",
            transaction_date="2026-09-01",
        ),
        create_transaction(
            client,
            auth_headers,
            income_category["id"],
            amount="250.00",
            transaction_type="income",
            description="Freelance work",
            transaction_date="2026-09-17",
        ),
        create_transaction(
            client,
            auth_headers,
            expense_category["id"],
            amount="100.00",
            transaction_type="expense",
            description="Weekly groceries",
            transaction_date="2026-09-10",
        ),
        create_transaction(
            client,
            auth_headers,
            expense_category["id"],
            amount="50.00",
            transaction_type="expense",
            description="More groceries",
            transaction_date="2026-09-14",
        ),
        create_transaction(
            client,
            auth_headers,
            dining_category["id"],
            amount="75.50",
            transaction_type="expense",
            description="Dinner",
            transaction_date="2026-09-16",
        ),
        create_transaction(
            client,
            auth_headers,
            dining_category["id"],
            amount="24.50",
            transaction_type="expense",
            description="Coffee",
            transaction_date="2026-08-31",
        ),
    ]

    for response in responses:
        assert response.status_code == 201

    response = client.get(
        "/api/v1/dashboard/summary?month=2026-09",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["period"] == {
        "month": "2026-09",
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
    }
    assert response_data["summary"] == {
        "total_income": "5250.00",
        "total_expenses": "225.50",
        "balance": "5024.50",
    }
    assert response_data["expenses_by_category"] == [
        {
            "category_id": expense_category["id"],
            "category_name": "Groceries",
            "category_color": "#22C55E",
            "amount": "150.00",
        },
        {
            "category_id": dining_category["id"],
            "category_name": "Dining",
            "category_color": "#F97316",
            "amount": "75.50",
        },
    ]

    recent_transactions = response_data["recent_transactions"]

    assert len(recent_transactions) == 5
    assert [
        transaction["description"]
        for transaction in recent_transactions
    ] == [
        "Freelance work",
        "Dinner",
        "More groceries",
        "Weekly groceries",
        "Salary",
    ]


def test_dashboard_summary_excludes_other_users_transactions(
    client: FlaskClient,
    auth_headers: dict[str, str],
    second_auth_headers: dict[str, str],
    income_category: dict[str, int | str | None],
) -> None:
    owner_response = create_transaction(
        client,
        auth_headers,
        income_category["id"],
        amount="1000.00",
        transaction_type="income",
        description="Owner income",
        transaction_date="2026-09-10",
    )

    second_user_income_category = create_category(
        client,
        second_auth_headers,
        name="Second User Salary",
        category_type="income",
        color="#2563EB",
    )

    second_user_response = create_transaction(
        client,
        second_auth_headers,
        second_user_income_category["id"],
        amount="9999.99",
        transaction_type="income",
        description="Second user income",
        transaction_date="2026-09-15",
    )

    assert owner_response.status_code == 201
    assert second_user_response.status_code == 201

    response = client.get(
        "/api/v1/dashboard/summary?month=2026-09",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert response_data["summary"] == {
        "total_income": "1000.00",
        "total_expenses": "0.00",
        "balance": "1000.00",
    }
    assert len(response_data["recent_transactions"]) == 1
    assert (
        response_data["recent_transactions"][0]["description"]
        == "Owner income"
    )


def test_dashboard_summary_rejects_invalid_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary?month=September",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Month must use YYYY-MM format."
    }


def test_dashboard_summary_rejects_invalid_calendar_month(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary?month=2026-13",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Month must use YYYY-MM format."
    }