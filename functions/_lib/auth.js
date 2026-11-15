export const ADMIN_EMAILS = new Set([
  "yagodavi012@hotmail.com",
  "juliamendesperes@gmail.com",
  "ostentysemijoiasbr@gmail.com",
]);

const COOKIE_NAME = "ostenty_admin_session";
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 100000;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
  return new Uint8Array(value.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return { salt: toHex(salt), hash: toHex(new Uint8Array(bits)) };
}

export async function verifyPassword(password, salt, expectedHash) {
  const result = await hashPassword(password, fromHex(salt));
  const actual = fromHex(result.hash);
  const expected = fromHex(expectedHash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
}

export function databaseReady(env) {
  return Boolean(env.DB && env.ADMIN_TEMP_PASSWORD);
}

export async function createSession(email, env) {
  const token = randomToken();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  await env.DB.prepare("INSERT INTO admin_sessions (token_hash, email, expires_at) VALUES (?, ?, ?)")
    .bind(await tokenHash(token), email, expiresAt).run();
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
  return cookie;
}

export async function getSession(request, env) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;
  const hash = await tokenHash(token);
  const session = await env.DB.prepare(
    "SELECT s.email, s.expires_at, u.name, u.must_change FROM admin_sessions s JOIN admin_users u ON u.email = s.email WHERE s.token_hash = ?",
  ).bind(hash).first();
  if (!session || session.expires_at <= Math.floor(Date.now() / 1000)) {
    if (session) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(hash).run();
    return null;
  }
  return { email: session.email, name: session.name || "", mustChangePassword: Boolean(session.must_change) || !session.name, tokenHash: hash };
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
