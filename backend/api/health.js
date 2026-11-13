const { sendJson } = require("../lib/config");

module.exports = async function healthHandler(req, res) {
  return sendJson(res, 200, { ok: true, service: "ostenty-api", mongoConfigured: Boolean(process.env.MONGODB_URI) });
};
