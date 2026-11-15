import { clearSessionCookie, getSession, json } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (env.DB) {
    const session = await getSession(request, env);
    if (session) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(session.tokenHash).run();
  }
  return json({ authenticated: false }, 200, { "set-cookie": clearSessionCookie() });
}
