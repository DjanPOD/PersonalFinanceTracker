import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  CategoriesResponse,
  Category,
  CreateCategoryPayload,
  CreateCategoryResponse,
} from "../types/transactions";

type CategoryType = "income" | "expense";

type CategoryFormState = {
  color: string;
  name: string;
  type: CategoryType;
};

const initialFormState: CategoryFormState = {
  color: "#2563EB",
  name: "",
  type: "expense",
};

function getTokenOrLogout(logout: () => void): string | null {
  const token = localStorage.getItem("ledgerly_access_token");

  if (!token) {
    logout();
    return null;
  }

  return token;
}

type CategoryListProps = {
  categories: Category[];
  emptyMessage: string;
  title: string;
};

function CategoryList({
  categories,
  emptyMessage,
  title,
}: CategoryListProps) {
  return (
    <section className="content-card category-list-card">
      <h2>{title}</h2>

      {categories.length === 0 ? (
        <p className="muted-text category-empty-message">{emptyMessage}</p>
      ) : (
        <ul className="category-list">
          {categories.map((category) => (
            <li className="category-list-item" key={category.id}>
              <span
                aria-hidden="true"
                className="category-color-dot category-color-dot-large"
                style={{
                  backgroundColor: category.color ?? "#94A3B8",
                }}
              />
              <span className="category-list-name">{category.name}</span>
              <span className="category-list-type">{category.type}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CategoriesPage() {
  const { logout } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [formState, setFormState] =
    useState<CategoryFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const incomeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.type === "income")
        .sort((first, second) => first.name.localeCompare(second.name)),
    [categories],
  );

  const expenseCategories = useMemo(
    () =>
      categories
        .filter((category) => category.type === "expense")
        .sort((first, second) => first.name.localeCompare(second.name)),
    [categories],
  );

  const loadCategories = useCallback(async () => {
    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient<CategoriesResponse>("/categories", {
        method: "GET",
        token,
      });

      setCategories(response.categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setErrorMessage("Unable to load categories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function updateForm(
    field: keyof CategoryFormState,
    value: string,
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    setFormError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const payload: CreateCategoryPayload = {
      name: formState.name.trim(),
      type: formState.type,
      color: formState.color,
    };

    try {
      const response = await apiClient<CreateCategoryResponse>(
        "/categories",
        {
          method: "POST",
          token,
          body: payload,
        },
      );

      setCategories((current) => [...current, response.category]);
      setFormState(initialFormState);
      setSuccessMessage(
        `${response.category.name} was added successfully.`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      if (error instanceof ApiError) {
        const fieldErrors = error.errors
          ? Object.values(error.errors).join(" ")
          : "";

        setFormError(fieldErrors || error.message);
      } else {
        setFormError("Unable to create the category. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Organize your finances</p>
          <h1>Categories</h1>
          <p className="page-description">
            Create income and expense categories to organize every
            transaction.
          </p>
        </div>
      </div>

      <section className="content-card category-form-card">
        <h2>Create a category</h2>
        <p className="muted-text">
          Categories help you understand where money comes from and where it
          goes.
        </p>

        <form className="category-form" onSubmit={handleSubmit}>
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <div className="category-form-grid">
            <div className="form-field">
              <label htmlFor="category-name">Category name</label>
              <input
                id="category-name"
                maxLength={100}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="For example, Groceries"
                required
                type="text"
                value={formState.name}
              />
            </div>

            <div className="form-field">
              <label htmlFor="category-type">Type</label>
              <select
                id="category-type"
                onChange={(event) => updateForm("type", event.target.value)}
                value={formState.type}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="category-color">Color</label>
              <input
                id="category-color"
                onChange={(event) => updateForm("color", event.target.value)}
                type="color"
                value={formState.color}
              />
            </div>
          </div>

          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Adding category…" : "Add category"}
          </button>
        </form>
      </section>

      {errorMessage ? (
        <section className="content-card category-load-error">
          <h2>Categories unavailable</h2>
          <p className="muted-text">{errorMessage}</p>
          <button className="button" onClick={loadCategories} type="button">
            Try again
          </button>
        </section>
      ) : null}

      {isLoading ? (
        <section className="content-card category-load-error">
          <p className="muted-text">Loading your categories…</p>
        </section>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="category-grid">
          <CategoryList
            categories={expenseCategories}
            emptyMessage="No expense categories yet. Add one above to organize your spending."
            title="Expense categories"
          />
          <CategoryList
            categories={incomeCategories}
            emptyMessage="No income categories yet. Add one above to organize your income."
            title="Income categories"
          />
        </div>
      ) : null}
    </section>
  );
}