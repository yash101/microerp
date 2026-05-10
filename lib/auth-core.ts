const passwordIterations = 310000;
const passwordKeyLengthBits = 256;

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomBase64Url(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function constantTimeEquals(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

async function pbkdf2(password: string, salt: string, iterations: number) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64UrlToBytes(salt),
      iterations
    },
    passwordKey,
    passwordKeyLengthBits
  );

  return bytesToBase64Url(new Uint8Array(bits));
}

export async function hashPassword(password: string) {
  const salt = randomBase64Url(16);
  const hash = await pbkdf2(password, salt, passwordIterations);

  return {
    hash,
    salt,
    iterations: passwordIterations
  };
}

export async function verifyPassword({
  password,
  expectedHash,
  salt,
  iterations
}: {
  password: string;
  expectedHash: string;
  salt: string;
  iterations: number;
}) {
  const hash = await pbkdf2(password, salt, iterations);
  return constantTimeEquals(hash, expectedHash);
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function createSessionToken() {
  return randomBase64Url(32);
}
