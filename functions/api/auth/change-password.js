import { getSession, hashPassword, json, readJson, verifyPassword } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "A autenticação ainda não foi configurada no Cloudflare." }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
  const body = await readJson(request);
  const password = body?.password;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 80) return json({ error: "Informe um nome entre 2 e 80 caracteres." }, 400);
  if (typeof password !== "string" || password.length < 10 || password.length > 256) {
    return json({ error: "A nova senha precisa ter entre 10 e 256 caracteres." }, 400);
  }
  const user = await env.DB.prepare("SELECT password_hash, password_salt FROM admin_users WHERE email = ?").bind(session.email).first();
  if (await verifyPassword(password, user.password_salt, user.password_hash)) {
    return json({ error: "Escolha uma senha diferente da senha temporária ou atual." }, 400);
  }
  const credentials = await hashPassword(password);
  await env.DB.prepare("UPDATE admin_users SET name = ?, password_hash = ?, password_salt = ?, must_change = 0 WHERE email = ?")
    .bind(name, credentials.hash, credentials.salt, session.email).run();
  return json({ authenticated: true, email: session.email, name, mustChangePassword: false });
}
