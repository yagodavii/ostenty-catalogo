const crypto = require("crypto");
const { getProductsCollection } = require("../lib/mongodb");
const { CATEGORIES, normalizePrice, readJson, sendJson, sendError, serializeProduct } = require("../lib/config");
const { requireAuth } = require("../lib/auth");

module.exports = async function importHandler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Método não permitido.");
  if (!requireAuth(req, res)) return;
  try {
    const rows = await readJson(req);
    if (!Array.isArray(rows)) return sendError(res, 400, "Envie uma lista de produtos.");
    const collection = await getProductsCollection();
    const seen = new Set(); const valid = []; const errors = [];
    rows.forEach((row, index) => {
      const code = String(row.code || "").trim(); const name = String(row.name || "").trim(); const category = String(row.category || "").trim();
      if (!code || !name || !CATEGORIES.includes(category) || seen.has(code.toLowerCase())) { errors.push({ line: index + 1, code, message: !code || !name ? "Código e nome são obrigatórios" : !CATEGORIES.includes(category) ? "Categoria inválida" : "Código duplicado" }); return; }
      seen.add(code.toLowerCase());
      valid.push({ id: crypto.randomUUID(), code, name, description: String(row.description || "").trim(), price: normalizePrice(row.price), category, status: row.status === "inactive" ? "inactive" : "active", image: String(row.image || ""), additionalImages: [], createdAt: new Date(), updatedAt: new Date() });
    });
    const existingCodes = new Set((await collection.find({ code: { $in: valid.map((row) => row.code) } }, { projection: { code: 1 } }).toArray()).map((row) => row.code.toLowerCase()));
    const fresh = valid.filter((row) => !existingCodes.has(row.code.toLowerCase()));
    existingCodes.forEach((code) => errors.push({ code, message: "Código já cadastrado" }));
    if (fresh.length) await collection.insertMany(fresh, { ordered: false });
    return sendJson(res, 200, { imported: fresh.length, skipped: rows.length - fresh.length, errors, products: fresh.map(serializeProduct) });
  } catch (error) { return sendError(res, 500, error.message); }
};
