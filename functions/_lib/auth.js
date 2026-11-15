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
  return Boolean(env.DB);
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
    "SELECT s.email, s.expires_at, u.name, u.is_admin FROM admin_sessions s JOIN admin_users u ON u.email = s.email WHERE s.token_hash = ?",
  ).bind(hash).first();
  if (!session || session.expires_at <= Math.floor(Date.now() / 1000)) {
    if (session) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(hash).run();
    return null;
  }
  return { email: session.email, name: session.name || "", isAdmin: Boolean(session.is_admin) && ADMIN_EMAILS.has(session.email), tokenHash: hash };
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function verifyCloudflareAccessToken(token, env) {
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const audience = String(env.ACCESS_AUD || "");
  if (!teamDomain || !audience) throw new Error("Cloudflare Access ainda não está configurado.");
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error("Token do Cloudflare Access inválido.");
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader)));
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("Assinatura do Cloudflare Access inválida.");
  const keyResponse = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } });
  if (!keyResponse.ok) throw new Error("Não foi possível validar o código do Cloudflare Access.");
  const keySet = await keyResponse.json();
  const jwk = keySet.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Chave do Cloudflare Access não encontrada.");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signedContent = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signatureValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodeBase64Url(encodedSignature), signedContent);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!signatureValid || claims.iss !== `https://${teamDomain}` || !audiences.includes(audience) || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("A verificação de identidade do Cloudflare Access falhou.");
  }
  return normalizeEmail(claims.email);
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
