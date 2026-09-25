import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatDate,
  formatMonth,
  getCurrentMonth,
} from "./formatters";

describe("formatCurrency", () => {
  it("formats a decimal string as US currency", () => {
    expect(formatCurrency("1234.5")).toBe("$1,234.50");
  });

  it("formats a negative value", () => {
    expect(formatCurrency("-25.25")).toBe("-$25.25");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in a readable form", () => {
    expect(formatDate("2026-09-23")).toBe("Sep 23, 2026");
  });
});

describe("formatMonth", () => {
  it("formats a YYYY-MM value as a month and year", () => {
    expect(formatMonth("2026-09")).toBe("September 2026");
  });
});

describe("getCurrentMonth", () => {
  it("returns the current year and month in YYYY-MM format", () => {
    expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});