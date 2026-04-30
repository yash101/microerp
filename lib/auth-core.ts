import { timingSafeEqual } from "node:crypto";

export function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateCredentialPair({
  username,
  password,
  expectedUsername,
  expectedPassword
}: {
  username: string;
  password: string;
  expectedUsername: string;
  expectedPassword: string;
}) {
  return (
    constantTimeEquals(username, expectedUsername) &&
    constantTimeEquals(password, expectedPassword)
  );
}
