from flask.testing import FlaskClient


def test_list_categories_requires_token(client: FlaskClient) -> None:
    response = client.get("/api/v1/categories")

    assert response.status_code == 401


def test_create_category_returns_created_category(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": "Entertainment",
            "type": "expense",
            "color": "#A855F7",
        },
    )

    response_data = response.get_json()

    assert response.status_code == 201
    assert response_data["category"]["id"] > 0
    assert response_data["category"]["name"] == "Entertainment"
    assert response_data["category"]["type"] == "expense"
    assert response_data["category"]["color"] == "#A855F7"


def test_create_category_allows_no_color(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": "Other Income",
            "type": "income",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["category"]["color"] is None


def test_create_category_rejects_invalid_values(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": "",
            "type": "transfer",
            "color": "purple",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "errors": {
            "name": "Name is required.",
            "type": "Type must be 'income' or 'expense'.",
            "color": "Color must use the format '#RRGGBB'.",
        }
    }


def test_create_category_rejects_duplicate_name_and_type(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": expense_category["name"],
            "type": expense_category["type"],
            "color": "#F97316",
        },
    )

    assert response.status_code == 409
    assert response.get_json() == {
        "error": (
            "A category with this name and type "
            "already exists."
        )
    }


def test_same_category_name_is_allowed_for_different_types(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
) -> None:
    response = client.post(
        "/api/v1/categories",
        headers=auth_headers,
        json={
            "name": expense_category["name"],
            "type": "income",
            "color": "#3B82F6",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["category"]["type"] == "income"


def test_list_categories_returns_only_current_users_categories(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    second_user_expense_category: dict[str, int | str | None],
) -> None:
    response = client.get(
        "/api/v1/categories",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert len(response_data["categories"]) == 1

    category = response_data["categories"][0]

    assert category["id"] == expense_category["id"]
    assert category["name"] == "Groceries"
    assert category["type"] == "expense"
    assert category["color"] == "#22C55E"
    assert isinstance(category["created_at"], str)
    assert category["created_at"]


def test_list_categories_can_filter_by_type(
    client: FlaskClient,
    auth_headers: dict[str, str],
    expense_category: dict[str, int | str | None],
    income_category: dict[str, int | str | None],
) -> None:
    response = client.get(
        "/api/v1/categories?type=income",
        headers=auth_headers,
    )

    response_data = response.get_json()

    assert response.status_code == 200
    assert len(response_data["categories"]) == 1

    category = response_data["categories"][0]

    assert category["id"] == income_category["id"]
    assert category["name"] == "Salary"
    assert category["type"] == "income"
    assert category["color"] == "#3B82F6"
    assert isinstance(category["created_at"], str)
    assert category["created_at"]


def test_list_categories_rejects_invalid_type(
    client: FlaskClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(
        "/api/v1/categories?type=transfer",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Category type must be 'income' or 'expense'."
    }