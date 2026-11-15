import { ADMIN_EMAILS, getSession, json, verifyCloudflareAccessToken } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "A autenticação ainda não foi configurada no Cloudflare." }, 503);
  const session = await getSession(request, env);
  if (!session) return json({ error: "Entre primeiro com sua conta OSTENTY." }, 401);
  if (!ADMIN_EMAILS.has(session.email)) return json({ error: "Este e-mail não tem permissão administrativa." }, 403);

  const accessToken = request.headers.get("cf-access-jwt-assertion") || "";
  if (!accessToken) return json({ error: "O código de verificação do Cloudflare Access não foi validado." }, 403);
  let verifiedEmail;
  try { verifiedEmail = await verifyCloudflareAccessToken(accessToken, env); }
  catch (error) { return json({ error: error.message || "Falha na verificação de e-mail." }, 403); }
  if (verifiedEmail !== session.email) return json({ error: "O e-mail confirmado no Cloudflare Access não corresponde à conta conectada." }, 403);

  await env.DB.prepare("UPDATE admin_users SET is_admin = 1 WHERE email = ?").bind(session.email).run();
  const next = new URL(request.url).searchParams.get("next") || "/#inicio";
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/#inicio";
  return Response.redirect(new URL(safePath, request.url).toString(), 302);
}
