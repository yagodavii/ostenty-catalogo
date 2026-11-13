const crypto = require("crypto");
const { sendError } = require("./config");

const COOKIE_NAME = "ostenty_session";
const SESSION_TTL = 60 * 60 * 24 * 7;

function base64Url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurada.");
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSession(email) {
  const payload = base64Url(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL }));
  return `${payload}.${sign(payload)}`;
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value).map(([key, ...value]) => [key, value.join("=")]));
}

function readSession(req) {
  const token = parseCookies(req.headers.cookie || "")[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  const expected = payload ? sign(payload) : "";
  if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload));
    return data.exp > Math.floor(Date.now() / 1000) ? data : null;
  } catch { return null; }
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function requireAuth(req, res) {
  try {
    const session = readSession(req);
    if (!session) { sendError(res, 401, "Não autenticado."); return null; }
    return session;
  } catch (error) {
    sendError(res, 500, error.message);
    return null;
  }
}

function verifyCredentials(email, password) {
  return Boolean(email && password && email.toLowerCase() === String(process.env.ADMIN_EMAIL || "").toLowerCase() && password === process.env.ADMIN_PASSWORD);
}

module.exports = { COOKIE_NAME, createSession, setSessionCookie, clearSessionCookie, readSession, requireAuth, verifyCredentials };
