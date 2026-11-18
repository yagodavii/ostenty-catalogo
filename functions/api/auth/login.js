import { ADMIN_EMAILS, createSession, databaseReady, hashPassword, json, normalizeEmail, readJson, verifyPassword } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!databaseReady(env)) return json({ error: "A autenticação ainda não foi configurada no Cloudflare." }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail ou senha incorretos." }, 401);
  if (typeof password !== "string" || password.length > 256) return json({ error: "E-mail ou senha incorretos." }, 401);
  const user = await env.DB.prepare("SELECT name, password_hash, password_salt, is_admin FROM admin_users WHERE email = ?").bind(email).first();
  if (!user || !user.is_admin || !ADMIN_EMAILS.has(email) || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
    return json({ error: "E-mail ou senha incorretos. O acesso é restrito a administradores autorizados." }, 401);
  }
  const cookie = await createSession(email, env);
  const isAdmin = Boolean(user.is_admin) && ADMIN_EMAILS.has(email);
  return json({ authenticated: true, email, name: user.name || "", isAdmin, requiresAdminVerification: ADMIN_EMAILS.has(email) && !isAdmin }, 200, { "set-cookie": cookie });
}
