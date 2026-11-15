import { ADMIN_EMAILS, databaseReady, getSession, json } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!databaseReady(env)) return json({ error: "A autenticação ainda não foi configurada no Cloudflare." }, 503);
  const session = await getSession(request, env);
  return json(session ? { authenticated: true, email: session.email, name: session.name, isAdmin: session.isAdmin, requiresAdminVerification: ADMIN_EMAILS.has(session.email) && !session.isAdmin } : { authenticated: false });
}
