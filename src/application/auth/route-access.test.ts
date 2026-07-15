import { describe, expect, it } from "vitest";

import { requiresOwnerSession } from "./route-access";

describe("requiresOwnerSession", () => {
  it.each([
    "/bills",
    "/bills/new",
    "/bills/bill-123",
    "/bills/bill-123/settings",
  ])(
    "protects owner route: %s",
    (pathname) => {
      expect(
        requiresOwnerSession(pathname),
      ).toBe(true);
    },
  );

  it.each([
    "/",
    "/login",
    "/auth/callback",
    "/share/example-token",
    "/view/example-token",
  ])(
    "keeps public route accessible: %s",
    (pathname) => {
      expect(
        requiresOwnerSession(pathname),
      ).toBe(false);
    },
  );

  it("does not protect similarly prefixed routes", () => {
    expect(
      requiresOwnerSession("/billboard"),
    ).toBe(false);

    expect(
      requiresOwnerSession("/bill-summary"),
    ).toBe(false);
  });
});