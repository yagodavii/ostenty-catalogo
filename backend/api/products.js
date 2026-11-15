const crypto = require("crypto");
const { getProductsCollection } = require("../lib/mongodb");
const { CATEGORIES, normalizeImages, normalizePrice, readJson, sendJson, sendError, serializeProduct } = require("../lib/config");
const { requireAuth } = require("../lib/auth");

function productPayload(body, existing = {}) {
  const category = body.category || existing.category;
  if (!CATEGORIES.includes(category)) throw new Error("Categoria inválida.");
  const code = String(body.code ?? existing.code ?? "").trim();
  const name = String(body.name ?? existing.name ?? "").trim();
  if (!code || !name) throw new Error("Código e nome são obrigatórios.");
  const requestedImages = Array.isArray(body.images) ? body.images : null;
  const images = (requestedImages ? normalizeImages({ images: requestedImages }) : normalizeImages({ image: body.image ?? existing.image, additionalImages: body.additionalImages ?? existing.additionalImages })).slice(0, 20);
  const requestedPrimary = body.image !== undefined ? String(body.image || "") : String(existing.image || "");
  const primary = images.find((item) => item.url === requestedPrimary)?.url || images[0]?.url || "";
  return { id: existing.id || crypto.randomUUID(), code, name, description: String(body.description ?? existing.description ?? "").trim(), price: normalizePrice(body.price ?? existing.price), category, status: body.status === "inactive" ? "inactive" : "active", image: primary, images, additionalImages: images.filter((item) => item.url !== primary).map((item) => item.url), updatedAt: new Date(), createdAt: existing.createdAt || new Date() };
}

module.exports = async function productsHandler(req, res) {
  try {
    const collection = await getProductsCollection();
    if (req.method === "GET") {
      const includeInactive = req.query?.includeInactive === "1";
      if (includeInactive && !requireAuth(req, res)) return;
      const filter = includeInactive ? {} : { status: "active" };
      const products = await collection.find(filter).sort({ category: 1, name: 1 }).limit(10000).toArray();
      return sendJson(res, 200, { products: products.map(serializeProduct) });
    }
    if (!requireAuth(req, res)) return;
    if (req.method === "POST") {
      const product = productPayload(await readJson(req));
      await collection.insertOne(product);
      return sendJson(res, 201, { product: serializeProduct(product) });
    }
    const id = String(req.query?.id || "");
    if (!id) return sendError(res, 400, "ID do produto é obrigatório.");
    const existing = await collection.findOne({ id });
    if (!existing) return sendError(res, 404, "Produto não encontrado.");
    if (req.method === "PUT") {
      const product = productPayload(await readJson(req), existing);
      await collection.replaceOne({ id }, product);
      return sendJson(res, 200, { product: serializeProduct(product) });
    }
    if (req.method === "DELETE") {
      await collection.deleteOne({ id });
      return sendJson(res, 200, { ok: true, id });
    }
    return sendError(res, 405, "Método não permitido.");
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, "Já existe um produto com este código.");
    return sendError(res, 500, error.message);
  }
};
