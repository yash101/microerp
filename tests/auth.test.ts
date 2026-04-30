import { describe, expect, it } from "vitest";
import { validateCredentialPair } from "@/lib/auth-core";

describe("validateCredentialPair", () => {
  it("accepts the configured username and password", () => {
    expect(
      validateCredentialPair({
        username: "planner",
        password: "secret",
        expectedUsername: "planner",
        expectedPassword: "secret"
      })
    ).toBe(true);
  });

  it("rejects either mismatched field", () => {
    expect(
      validateCredentialPair({
        username: "planner",
        password: "wrong",
        expectedUsername: "planner",
        expectedPassword: "secret"
      })
    ).toBe(false);
  });
});
