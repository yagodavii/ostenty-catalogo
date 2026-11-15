import { ADMIN_EMAILS, createSession, databaseReady, hashPassword, json, normalizeEmail, readJson } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!databaseReady(env)) return json({ error: "A autenticação ainda não foi configurada no Cloudflare." }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const password = body?.password;
  if (!ADMIN_EMAILS.has(email)) return json({ error: "Este e-mail não está autorizado a criar acesso administrativo." }, 403);
  if (name.length < 2 || name.length > 80) return json({ error: "Informe um nome entre 2 e 80 caracteres." }, 400);
  if (typeof password !== "string" || password !== env.ADMIN_TEMP_PASSWORD) {
    return json({ error: "Senha temporária incorreta. Solicite a senha de ativação ao responsável pelo sistema." }, 401);
  }
  const existing = await env.DB.prepare("SELECT email FROM admin_users WHERE email = ?").bind(email).first();
  if (existing) return json({ error: "Este e-mail já tem acesso. Entre com sua senha." }, 409);
  const credentials = await hashPassword(password);
  await env.DB.prepare("INSERT INTO admin_users (email, name, password_hash, password_salt, must_change, created_at) VALUES (?, ?, ?, ?, 1, ?)")
    .bind(email, name, credentials.hash, credentials.salt, Math.floor(Date.now() / 1000)).run();
  const cookie = await createSession(email, env);
  return json({ authenticated: true, email, name, mustChangePassword: true }, 201, { "set-cookie": cookie });
}
