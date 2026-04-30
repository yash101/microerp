import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { constantTimeEquals, validateCredentialPair } from "@/lib/auth-core";

const cookieName = "microerp_session";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set before using authentication.");
  }
  return secret;
}

export function getConfiguredCredentials() {
  if (!process.env.APP_USERNAME || !process.env.APP_PASSWORD) {
    throw new Error("APP_USERNAME and APP_PASSWORD must be set before using authentication.");
  }

  return {
    username: process.env.APP_USERNAME,
    password: process.env.APP_PASSWORD
  };
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export function validateCredentials(username: string, password: string) {
  const expected = getConfiguredCredentials();
  return validateCredentialPair({
    username,
    password,
    expectedUsername: expected.username,
    expectedPassword: expected.password
  });
}

export async function createSession() {
  const issuedAt = Date.now().toString();
  const value = `${issuedAt}.${sign(issuedAt)}`;
  const cookieStore = await cookies();

  cookieStore.set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function hasSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;
  if (!value) return false;

  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;

  return constantTimeEquals(signature, sign(issuedAt));
}

export async function requireSession() {
  if (!(await hasSession())) {
    redirect("/login");
  }
}
