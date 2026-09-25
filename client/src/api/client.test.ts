import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "./client";

describe("apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a JSON request with a bearer token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-token",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      ),
    );

    const response = await apiClient<{ access_token: string }>(
      "/auth/login",
      {
        body: {
          email: "test.user@example.com",
          password: "TestPassword123!",
        },
        method: "POST",
        token: "jwt-token",
      },
    );

    expect(response).toEqual({
      access_token: "access-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/auth\/login$/),
      expect.objectContaining({
        body: JSON.stringify({
          email: "test.user@example.com",
          password: "TestPassword123!",
        }),
        method: "POST",
      }),
    );

    const requestOptions = fetchMock.mock.calls[0][1];

    expect(requestOptions?.headers).toEqual(
      expect.objectContaining({
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
        "Content-Type": "application/json",
      }),
    );
  });

  it("does not set a JSON content type for a request without a body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await apiClient<void>("/transactions/1", {
      method: "DELETE",
      token: "jwt-token",
    });

    const requestOptions = fetchMock.mock.calls[0][1];
    const headers = requestOptions?.headers as Record<string, string>;

    expect(headers).toEqual(
      expect.objectContaining({
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      }),
    );
    expect(headers).not.toHaveProperty("Content-Type");
  });

  it("throws an ApiError containing backend field errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: {
            email: "Enter a valid email address.",
            password: "Password must be at least 12 characters.",
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 400,
        },
      ),
    );

    const error = await apiClient("/auth/register", {
      body: {
        email: "not-an-email",
        password: "short",
      },
      method: "POST",
    }).catch((caughtError: unknown) => caughtError);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      errors: {
        email: "Enter a valid email address.",
        password: "Password must be at least 12 characters.",
      },
      message: "Something went wrong. Please try again.",
      status: 400,
    });
  });

  it("uses a fallback error message when the response has no JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    await expect(
      apiClient("/dashboard/summary", {
        method: "GET",
      }),
    ).rejects.toMatchObject({
      message: "Something went wrong. Please try again.",
      status: 500,
    });
  });
});