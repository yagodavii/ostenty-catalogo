const { readJson, sendJson, sendError } = require("../lib/config");
const { createSession, setSessionCookie, clearSessionCookie, readSession, verifyCredentials } = require("../lib/auth");

module.exports = async function authHandler(req, res) {
  try {
    if (req.method === "GET") return sendJson(res, 200, { authenticated: Boolean(readSession(req)) });
    if (req.method === "POST" && req.query?.action === "logout") { clearSessionCookie(res); return sendJson(res, 200, { ok: true }); }
    if (req.method !== "POST") return sendError(res, 405, "Método não permitido.");
    const body = await readJson(req);
    if (!verifyCredentials(body.email, body.password)) return sendError(res, 401, "E-mail ou senha inválidos.");
    setSessionCookie(res, createSession(body.email));
    return sendJson(res, 200, { authenticated: true, email: body.email });
  } catch (error) { return sendError(res, 500, error.message); }
};
