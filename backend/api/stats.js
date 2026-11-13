const { getProductsCollection } = require("../lib/mongodb");
const { sendJson, sendError } = require("../lib/config");
const { requireAuth } = require("../lib/auth");

module.exports = async function statsHandler(req, res) {
  if (req.method !== "GET") return sendError(res, 405, "Método não permitido.");
  if (!requireAuth(req, res)) return;
  try {
    const collection = await getProductsCollection();
    const [total, active, inactive] = await Promise.all([collection.countDocuments(), collection.countDocuments({ status: "active" }), collection.countDocuments({ status: "inactive" })]);
    return sendJson(res, 200, { total, active, inactive });
  } catch (error) { return sendError(res, 500, error.message); }
};
