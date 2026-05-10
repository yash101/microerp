import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "@/lib/auth-core";

const cookieName = "microerp_session";
const sessionDays = 14;

function requireSignupCode() {
  const code = process.env.SIGNUP_CODE;
  if (!code) {
    throw new Error("SIGNUP_CODE must be set before signup is enabled.");
  }
  return code;
}

function sessionExpiry() {
  return new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
}

export function validateSignupCode(code: string) {
  return code === requireSignupCode();
}

export async function createUser(username: string, password: string) {
  const passwordRecord = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      username: username.trim().toLowerCase(),
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      passwordIterations: passwordRecord.iterations
    })
    .returning();

  return user;
}

export async function validateCredentials(username: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.trim().toLowerCase()))
    .limit(1);

  if (!user) return null;

  const valid = await verifyPassword({
    password,
    expectedHash: user.passwordHash,
    salt: user.passwordSalt,
    iterations: user.passwordIterations
  });

  return valid ? user : null;
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = sessionExpiry();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDays * 24 * 60 * 60
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (token) {
    const tokenHash = await hashSessionToken(token);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  cookieStore.delete(cookieName);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  const tokenHash = await hashSessionToken(token);
  const [session] = await db
    .select({
      user: users,
      session: sessions
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return session?.user ?? null;
}

export async function hasSession() {
  return (await getCurrentUser()) !== null;
}

export async function requireSession() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}
