import { ADMIN_EMAILS, createSession, databaseReady, hashPassword, json, normalizeEmail, readJson, verifyPassword } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!databaseReady(env)) return json({ error: "A autenticação ainda não foi configurada no Cloudflare." }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!ADMIN_EMAILS.has(email)) return json({ error: "Este e-mail não está autorizado a acessar o painel." }, 403);
  if (typeof password !== "string" || password.length > 256) return json({ error: "E-mail ou senha incorretos." }, 401);
  let user = await env.DB.prepare("SELECT name, password_hash, password_salt, must_change FROM admin_users WHERE email = ?").bind(email).first();
  if (!user && password === env.ADMIN_TEMP_PASSWORD) {
    const credentials = await hashPassword(password);
    await env.DB.prepare("INSERT OR IGNORE INTO admin_users (email, name, password_hash, password_salt, must_change, created_at) VALUES (?, '', ?, ?, 1, ?)")
      .bind(email, credentials.hash, credentials.salt, Math.floor(Date.now() / 1000)).run();
    user = await env.DB.prepare("SELECT name, password_hash, password_salt, must_change FROM admin_users WHERE email = ?").bind(email).first();
  }
  if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
    return json({ error: "E-mail ou senha incorretos. Se ainda não criou seu acesso, use ‘Criar acesso’." }, 401);
  }
  const cookie = await createSession(email, env);
  return json({ authenticated: true, email, name: user.name || "", mustChangePassword: Boolean(user.must_change) || !user.name }, 200, { "set-cookie": cookie });
}
