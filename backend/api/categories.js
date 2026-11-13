const { CATEGORIES, sendJson, sendError } = require("../lib/config");

module.exports = async function categoriesHandler(req, res) {
  if (req.method !== "GET") return sendError(res, 405, "Método não permitido.");
  return sendJson(res, 200, { categories: CATEGORIES });
};
