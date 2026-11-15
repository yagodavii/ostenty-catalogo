const crypto = require("crypto");

const CATEGORIES = ["Colares", "Brincos", "Argolas", "Anéis", "Conjuntos", "Pingentes", "Pulseiras"];

function normalizeImages(product = {}) {
  const source = Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image, ...(Array.isArray(product.additionalImages) ? product.additionalImages : [])];
  const seen = new Set();
  return source.map((item) => {
    const url = typeof item === "string" ? item : item?.url;
    if (!url || seen.has(url)) return null;
    seen.add(url);
    return { id: typeof item === "object" && item?.id ? String(item.id) : crypto.randomUUID(), url: String(url) };
  }).filter(Boolean);
}

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
  const images = normalizeImages(product);
  const primary = images.find((item) => item.url === product.image)?.url || images[0]?.url || "";
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description || "",
    price: Number(product.price || 0),
    category: product.category,
    status: product.status === "inactive" ? "inactive" : "active",
    image: primary,
    images,
    additionalImages: images.filter((item) => item.url !== primary).map((item) => item.url),
    createdAt: product.createdAt || null,
    updatedAt: product.updatedAt || null,
  };
}

module.exports = { CATEGORIES, sendJson, sendError, readJson, normalizePrice, normalizeImages, serializeProduct };
