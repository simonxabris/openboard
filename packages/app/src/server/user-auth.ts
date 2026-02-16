const SECRET_KEY_PREFIX = "ob_sk_";
const SECRET_KEY_BYTES = 24;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function generateSecretKey() {
  const bytes = new Uint8Array(SECRET_KEY_BYTES);
  crypto.getRandomValues(bytes);
  return `${SECRET_KEY_PREFIX}${bytesToHex(bytes)}`;
}

export async function hashSecretKey(secretKey: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secretKey));
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
