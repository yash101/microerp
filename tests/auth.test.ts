import { describe, expect, it } from "vitest";
import { constantTimeEquals, hashPassword, verifyPassword, createSessionToken, hashSessionToken } from "@/lib/auth-core";

describe("auth-core", () => {
  it("verifies a hashed password", async () => {
    const passwordRecord = await hashPassword("a secure test password");

    await expect(
      verifyPassword({
        password: "a secure test password",
        expectedHash: passwordRecord.hash,
        salt: passwordRecord.salt,
        iterations: passwordRecord.iterations
      })
    ).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordRecord = await hashPassword("a secure test password");

    await expect(
      verifyPassword({
        password: "wrong password",
        expectedHash: passwordRecord.hash,
        salt: passwordRecord.salt,
        iterations: passwordRecord.iterations
      })
    ).resolves.toBe(false);
  });

  it("hashes session tokens without keeping the raw token", async () => {
    const token = createSessionToken();
    const tokenHash = await hashSessionToken(token);

    expect(token).not.toEqual(tokenHash);
    expect(tokenHash).toHaveLength(43);
  });

  it("compares strings without early length success", () => {
    expect(constantTimeEquals("same", "same")).toBe(true);
    expect(constantTimeEquals("same", "different")).toBe(false);
  });
});
