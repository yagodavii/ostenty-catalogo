const CATEGORIES = ["Colares", "Brincos", "Argolas", "Anéis", "Conjuntos", "Pingentes", "Pulseiras"];

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function sendJson(res, status, payload) {
  setJsonHeaders(res);
  res.status(status).json(payload);
}

function sendError(res, status, message, details) {
  sendJson(res, status, { error: message, ...(details ? { details } : {}) });
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function normalizePrice(value) {
  const text = String(value ?? "").trim().replace(/R\$\s?/i, "");
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized.replace(/[^0-9.-]/g, "")) || 0;
}

function serializeProduct(product) {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description || "",
    price: Number(product.price || 0),
    category: product.category,
    status: product.status === "inactive" ? "inactive" : "active",
    image: product.image || "",
    additionalImages: Array.isArray(product.additionalImages) ? product.additionalImages : [],
    createdAt: product.createdAt || null,
    updatedAt: product.updatedAt || null,
  };
}

module.exports = { CATEGORIES, sendJson, sendError, readJson, normalizePrice, serializeProduct };
