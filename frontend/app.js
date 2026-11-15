const CATEGORIES = ["Colares", "Brincos", "Argolas", "Anéis", "Conjuntos", "Pingentes", "Pulseiras"];
const STORAGE_KEY = "ostenty_catalog_products_v1";
const SEED_VERSION_KEY = "ostenty_catalog_seed_version";
const SEED_VERSION = "photos-2026-11-v2";

const state = {
  products: loadProducts(),
  selected: new Set(),
  catalogCategory: "all",
  adminCategory: "all",
  activeProductId: null,
  importRows: [],
  importedImages: {},
  photoProductId: null,
  photoDraft: [],
  photoPrimaryUrl: "",
  photoReplaceIndex: null,
  adminAuthenticated: true,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadProducts() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { saved = []; }
  const seed = window.OSTENTY_SEED_PRODUCTS || [];
  if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
    const seedById = new Map(seed.map((product) => [product.id, product]));
    const renames = window.OSTENTY_SEED_RENAMES || {};
    saved = saved.map((product) => {
      const newId = renames[product.id];
      const replacement = seedById.get(newId);
      return replacement ? { ...product, ...replacement, description: product.description, price: product.price, status: product.status } : product;
    });
    const knownIds = new Set(saved.map((product) => product.id));
    saved = [...saved, ...seed.filter((product) => !knownIds.has(product.id))];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch (error) { console.warn("Não foi possível salvar a migração do catálogo neste navegador.", error); }
  }
  return saved.length ? saved : seed;
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
}

function uid() { return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "Preço sob consulta";
  const number = Number(String(value).replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", "."));
  if (!Number.isFinite(number)) return "Preço sob consulta";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function normalizePrice(value) {
  const text = String(value ?? "").trim().replace(/R\$\s?/i, "");
  if (!text) return null;
  const parsed = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(parsed.replace(/[^0-9.-]/g, "")) || 0;
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message; toast.classList.add("show");
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}
function isAdmin() { return true; }

async function restoreAdminSession() { state.adminAuthenticated = true; renderAdmin(); }

function setView(view) {
  const views = { landing: "#landingView", catalog: "#catalogView", admin: "#adminView" };
  Object.entries(views).forEach(([key, selector]) => $(selector).classList.toggle("hidden", key !== view));
  $$('[data-view-link]').forEach((link) => link.classList.toggle("active", link.dataset.viewLink === view));
  if (view === "catalog") renderCatalog();
  if (view === "admin") renderAdmin();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function routeFromHash() {
  const hash = window.location.hash.replace("#", "");
  setView(hash === "catalogo" ? "catalog" : hash === "admin" ? "admin" : "landing");
}

function renderCategoryFilters() {
  $("#categoryFilter").innerHTML = ["all", ...CATEGORIES].map((category) => `<button class="filter-chip ${state.catalogCategory === category ? "active" : ""}" data-catalog-category="${escapeHtml(category)}">${category === "all" ? "Todas" : category}</button>`).join("");
  $("#adminCategoryFilter").innerHTML = `<option value="all">Todas as categorias</option>${CATEGORIES.map((category) => `<option value="${escapeHtml(category)}">${category}</option>`).join("")}`;
  $("#adminCategoryFilter").value = state.adminCategory;
  $("#pdfCategoryList").innerHTML = `<label><input type="checkbox" id="pdfAllCategories" checked /> Todas as categorias</label>${CATEGORIES.map((category) => `<label><input type="checkbox" class="pdf-category" value="${escapeHtml(category)}" checked /> ${category}</label>`).join("")}`;
  $("#pdfAllCategories").addEventListener("change", (event) => $$(".pdf-category").forEach((checkbox) => { checkbox.checked = event.target.checked; }));
}

function productImage(product, className = "") {
  return product.image ? `<img class="${className}" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />` : `<span class="product-placeholder ${className}">✦</span>`;
}

function getProductImages(product) {
  const source = Array.isArray(product?.images) && product.images.length
    ? product.images
    : [product?.image, ...(Array.isArray(product?.additionalImages) ? product.additionalImages : [])];
  const seen = new Set();
  return source.map((item) => {
    const url = typeof item === "string" ? item : item?.url;
    if (!url || seen.has(url)) return null;
    seen.add(url);
    return { id: typeof item === "object" && item?.id ? item.id : uid(), url };
  }).filter(Boolean);
}

function filteredProducts() {
  const query = $("#catalogSearch")?.value.trim().toLowerCase() || "";
  return state.products.filter((product) => product.status === "active" && (state.catalogCategory === "all" || product.category === state.catalogCategory) && (!query || `${product.name} ${product.code}`.toLowerCase().includes(query)));
}

function renderCatalog() {
  renderCategoryFilters();
  const products = filteredProducts();
  $("#catalogCount").textContent = `${products.length} ${products.length === 1 ? "peça" : "peças"}`;
  $("#catalogGrid").innerHTML = products.map((product) => `<article class="product-card"><div class="product-photo">${productImage(product)}<span class="category-stamp">${escapeHtml(product.category)}</span><button class="select-product ${state.selected.has(product.id) ? "selected" : ""}" data-select-product="${product.id}" title="Selecionar">${state.selected.has(product.id) ? "♥" : "♡"}</button></div><div class="product-meta"><small>${escapeHtml(product.code)}</small><h3 title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3><div class="product-meta-bottom"><strong class="product-price">${formatPrice(product.price)}</strong><button class="view-product" data-view-product="${product.id}">Ver detalhes →</button></div></div></article>`).join("");
  $("#catalogEmpty").classList.toggle("hidden", products.length > 0);
  $("#catalogGrid").classList.toggle("hidden", products.length === 0);
}

function renderAdmin() {
  $("#adminPanel").classList.toggle("hidden", !isAdmin());
  if (!isAdmin()) return;
  renderCategoryFilters();
  const query = $("#adminSearch")?.value.trim().toLowerCase() || "";
  const products = state.products.filter((product) => (state.adminCategory === "all" || product.category === state.adminCategory) && (!query || `${product.name} ${product.code}`.toLowerCase().includes(query)));
  $("#statActive").textContent = state.products.filter((product) => product.status === "active").length;
  $("#statTotal").textContent = state.products.length;
  $("#statSelected").textContent = state.selected.size;
  $("#adminTableBody").innerHTML = products.map((product) => `<tr><td><div class="table-product"><div class="table-thumb">${product.image ? `<img src="${escapeHtml(product.image)}" alt="" />` : "✦"}</div><span>${escapeHtml(product.name)}<small>${escapeHtml(product.description || "Sem descrição")}</small></span></div></td><td>${escapeHtml(product.code)}</td><td>${escapeHtml(product.category)}</td><td>${formatPrice(product.price)}</td><td><span class="status-badge ${product.status}">${product.status === "active" ? "Ativo" : "Inativo"}</span></td><td><div class="row-actions"><button title="Gerenciar fotos" data-manage-photos="${product.id}">Fotos</button>${product.status === "active" ? `<button title="Gerar PDF individual" data-print-product="${product.id}">PDF</button>` : ""}<button title="Editar" data-edit-product="${product.id}">Editar</button><button title="Ativar ou desativar" data-toggle-product="${product.id}">${product.status === "active" ? "Ocultar" : "Ativar"}</button><button title="Excluir" data-delete-product="${product.id}">Excluir</button></div></td></tr>`).join("");
  $("#adminEmpty").classList.toggle("hidden", products.length > 0);
}

function openProductModal(product = null) {
  state.activeProductId = product?.id || null;
  $("#productFormTitle").textContent = product ? "Editar produto" : "Novo produto";
  $("#productId").value = product?.id || "";
  $("#productCode").value = product?.code || "";
  $("#productName").value = product?.name || "";
  $("#productDescription").value = product?.description || "";
  $("#productPrice").value = product ? formatPrice(product.price) : "";
  $("#productCategory").innerHTML = CATEGORIES.map((category) => `<option value="${escapeHtml(category)}">${category}</option>`).join("");
  $("#productCategory").value = product?.category || CATEGORIES[0];
  $("#productStatus").value = product?.status || "active";
  $("#productAdditionalImages").value = product?.additionalImages?.join("\n") || "";
  $("#productImage").value = "";
  $("#productFormModal").classList.remove("hidden");
}

function renderPhotoManager() {
  const grid = $("#photoManagerGrid");
  const images = state.photoDraft;
  grid.innerHTML = images.map((item, index) => `<article class="photo-manager-item ${item.url === state.photoPrimaryUrl ? "is-primary" : ""}"><div class="photo-manager-preview"><img src="${escapeHtml(item.url)}" alt="Pré-visualização ${index + 1}" /><span>${item.url === state.photoPrimaryUrl ? "Foto principal" : `Foto ${index + 1}`}</span></div><div class="photo-manager-item-actions"><button type="button" data-photo-primary="${index}" ${item.url === state.photoPrimaryUrl ? "disabled" : ""}>${item.url === state.photoPrimaryUrl ? "Principal" : "Definir principal"}</button><button type="button" data-photo-replace="${index}">Substituir</button><button type="button" class="photo-delete-button" data-photo-delete="${index}">Excluir</button></div></article>`).join("");
  $("#photoManagerEmpty").classList.toggle("hidden", images.length > 0);
}

function openPhotoManager(product) {
  if (!isAdmin() || !product) return;
  state.photoProductId = product.id;
  state.photoDraft = getProductImages(product);
  state.photoPrimaryUrl = product.image || state.photoDraft[0]?.url || "";
  state.photoReplaceIndex = null;
  $("#photoManagerTitle").textContent = `Fotos — ${product.name}`;
  $("#photoManagerProductLabel").textContent = `${product.code} · ${product.category} · somente ADM`;
  $("#photoAddInput").value = "";
  $("#photoAddInput").multiple = true;
  renderPhotoManager();
  $("#photoManagerModal").classList.remove("hidden");
}

async function addPhotoFiles(files) {
  const selectedFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!selectedFiles.length) return;
  const available = Math.max(0, 20 - state.photoDraft.length);
  const newImages = await Promise.all(selectedFiles.slice(0, available).map(async (file) => ({ id: uid(), url: await readFileAsDataUrl(file) })));
  state.photoDraft = [...state.photoDraft, ...newImages];
  if (!state.photoPrimaryUrl && state.photoDraft[0]) state.photoPrimaryUrl = state.photoDraft[0].url;
  renderPhotoManager();
  if (selectedFiles.length > available) showToast("O limite é de 20 fotos por produto.");
}

async function replacePhotoFile(file) {
  if (!file || state.photoReplaceIndex === null) return;
  const index = state.photoReplaceIndex;
  const oldUrl = state.photoDraft[index]?.url;
  const url = await readFileAsDataUrl(file);
  state.photoDraft[index] = { ...state.photoDraft[index], url };
  if (state.photoPrimaryUrl === oldUrl) state.photoPrimaryUrl = url;
  state.photoReplaceIndex = null;
  renderPhotoManager();
}

async function saveManagedPhotos() {
  if (!isAdmin() || !state.photoProductId) return;
  const product = state.products.find((item) => item.id === state.photoProductId);
  if (!product) return;
  const images = state.photoDraft;
  const primary = images.find((item) => item.url === state.photoPrimaryUrl)?.url || images[0]?.url || "";
  product.images = images;
  product.image = primary;
  product.additionalImages = images.filter((item) => item.url !== primary).map((item) => item.url);
  saveProducts();
  closeModals();
  renderAdmin();
  renderCatalog();
  showToast("Fotos atualizadas neste navegador.");
}

function closeModals() { $$(".modal-backdrop").forEach((modal) => modal.classList.add("hidden")); }

function openProductDetail(product) {
  if (!product) return;
  $("#modalCategory").innerHTML = `<span></span>${escapeHtml(product.category)}`;
  $("#modalProductName").textContent = product.name;
  $("#modalCode").textContent = product.code;
  $("#modalDescription").textContent = product.description || "Uma peça escolhida para trazer presença e delicadeza à sua composição.";
  $("#modalPrice").textContent = formatPrice(product.price);
  const images = getProductImages(product);
  $("#modalImage").innerHTML = images.length ? `<div class="public-photo-gallery">${images.map((item, index) => `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(product.name)} — foto ${index + 1}" />`).join("")}</div>` : "✦";
  const button = $("#modalSelectButton");
  button.innerHTML = state.selected.has(product.id) ? "Remover da seleção <span>×</span>" : "Selecionar peça <span>♡</span>";
  button.dataset.productId = product.id;
  $("#productModal").classList.remove("hidden");
}

function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }

function parseCsv(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index]; const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; continue; }
    cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function mapImportRow(raw, index) {
  const find = (...keys) => keys.map((key) => raw[key]).find((value) => value !== undefined && value !== "") || "";
  const code = find("codigo", "código", "sku"); const name = find("nome", "produto", "name"); const category = find("categoria", "category");
  const duplicate = state.products.some((product) => product.code.toLowerCase() === code.toLowerCase()) || state.importRows.some((row, rowIndex) => rowIndex < index && row.code.toLowerCase() === code.toLowerCase());
  const validCategory = CATEGORIES.includes(category);
  return { id: uid(), code, name, description: find("descricao", "descrição", "description"), price: normalizePrice(find("preco", "preço", "price")), category: validCategory ? category : CATEGORIES[0], status: ["inativo", "inactive", "nao", "não"].includes(find("status").toLowerCase()) ? "inactive" : "active", image: find("imagem", "foto", "image"), duplicate, valid: Boolean(code && name && validCategory && !duplicate), issue: duplicate ? "Código duplicado" : !code || !name ? "Código e nome são obrigatórios" : !validCategory ? "Categoria inválida" : "" };
}

function renderImportPreview() {
  const preview = $("#importPreview");
  if (!state.importRows.length) { preview.classList.add("hidden"); $("#confirmImportButton").disabled = true; return; }
  const valid = state.importRows.filter((row) => row.valid).length;
  preview.classList.remove("hidden");
  preview.innerHTML = `<div class="import-summary"><strong>${valid}</strong> de ${state.importRows.length} linhas prontas para importar. ${state.importRows.length - valid ? `<span>${state.importRows.length - valid} precisam de correção e serão ignoradas.</span>` : ""}</div><table><thead><tr><th>Linha</th><th>Código</th><th>Nome</th><th>Categoria</th><th>Validação</th></tr></thead><tbody>${state.importRows.map((row, index) => `<tr><td>${index + 2}</td><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.category)}</td><td>${row.valid ? "✓ Pronta" : `⚠ ${escapeHtml(row.issue)}`}</td></tr>`).join("")}</tbody></table>`;
  $("#confirmImportButton").disabled = valid === 0;
}

function printProductCard(product) {
  return `<article class="print-product">${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />` : `<div class="print-placeholder-print">✦</div>`}<h4>${escapeHtml(product.name)}</h4><p>${escapeHtml(product.code)} · ${escapeHtml(product.description || "")}</p><strong>${formatPrice(product.price)}</strong></article>`;
}

function buildPrintMarkup(products, options = {}) {
  const individual = options.individual || products.length === 1;
  if (individual) {
    const product = products[0];
    return `<div class="print-individual-sheet"><div class="print-individual-brand"><div class="print-brand">✦ OSTENTY<small>SEMIJOIAS</small></div><div class="print-subtitle">Seu brilho, sua essência.</div></div><div class="print-individual-visual">${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />` : `<div class="print-placeholder-print">✦</div>`}</div><div class="print-individual-info"><span class="print-category-label">${escapeHtml(product.category)}</span><h1>${escapeHtml(product.name)}</h1><p class="print-code-label">Código ${escapeHtml(product.code)}</p><p class="print-individual-description">${escapeHtml(product.description || "Peça escolhida para trazer presença e delicadeza à sua composição.")}</p><strong>${formatPrice(product.price)}</strong></div></div>`;
  }
  const categories = [...new Set(products.map((product) => product.category))];
  return `<div class="print-cover"><div class="print-brand">✦ OSTENTY<small>SEMIJOIAS</small></div><div class="print-title">Catálogo digital</div><div class="print-subtitle">Seu brilho, sua essência. · ${new Date().toLocaleDateString("pt-BR")}</div></div>${categories.map((category) => `<section><h2 class="print-category">${escapeHtml(category)}</h2><div class="print-grid">${products.filter((product) => product.category === category).map(printProductCard).join("")}</div></section>`).join("")}`;
}

function openPrintWindow(products, title, options = {}) {
  if (!products.length) { showToast("Não há produtos ativos para gerar o catálogo."); return; }
  const popup = window.open("", "_blank");
  if (!popup) { showToast("Permita pop-ups para gerar o PDF."); return; }
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${window.location.origin}/frontend/styles.css"></head><body><section id="printCatalog" class="print-catalog">${buildPrintMarkup(products, options)}</section><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350));<\/script></body></html>`);
  popup.document.close();
}

function buildPrintCatalog() {
  const products = state.products.filter((product) => product.status === "active");
  openPrintWindow(products, "OSTENTY — Catálogo completo");
}

function buildCategoryPrintCatalogs() {
  const chosen = $$(".pdf-category:checked").map((checkbox) => checkbox.value);
  const all = $("#pdfAllCategories").checked;
  const categories = all || chosen.length === CATEGORIES.length ? CATEGORIES : chosen;
  if (!categories.length) { showToast("Selecione pelo menos uma categoria."); return; }
  const active = state.products.filter((product) => product.status === "active");
  const available = categories.map((category) => ({ category, products: active.filter((product) => product.category === category) })).filter((item) => item.products.length);
  if (!available.length) { showToast("Não há produtos ativos nas categorias selecionadas."); return; }
  available.forEach((item, index) => window.setTimeout(() => openPrintWindow(item.products, `OSTENTY — ${item.category}`), index * 450));
  showToast(`${available.length} catálogo(s) por categoria preparado(s).`);
}

function buildIndividualPdf(product) {
  if (!product || product.status !== "active") { showToast("Apenas produtos ativos podem gerar PDF."); return; }
  openPrintWindow([product], `OSTENTY — ${product.name}`, { individual: true });
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-view-product], [data-select-product], [data-catalog-category], [data-edit-product], [data-delete-product], [data-toggle-product], [data-print-product], [data-manage-photos], [data-photo-primary], [data-photo-replace], [data-photo-delete], [data-close-modal]");
  if (!target) return;
  if (target.matches("[data-catalog-category]")) { state.catalogCategory = target.dataset.catalogCategory; renderCatalog(); return; }
  if (target.matches("[data-select-product]")) { const id = target.dataset.selectProduct; state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); renderCatalog(); return; }
  if (target.matches("[data-view-product]")) { openProductDetail(state.products.find((product) => product.id === target.dataset.viewProduct)); return; }
  if (target.matches("[data-manage-photos]")) { openPhotoManager(state.products.find((product) => product.id === target.dataset.managePhotos)); return; }
  if (target.matches("[data-photo-primary]")) { state.photoPrimaryUrl = state.photoDraft[Number(target.dataset.photoPrimary)]?.url || state.photoPrimaryUrl; renderPhotoManager(); return; }
  if (target.matches("[data-photo-replace]")) { state.photoReplaceIndex = Number(target.dataset.photoReplace); const input = $("#photoAddInput"); input.multiple = false; input.value = ""; input.click(); return; }
  if (target.matches("[data-photo-delete]")) { const index = Number(target.dataset.photoDelete); const removed = state.photoDraft.splice(index, 1)[0]; if (removed?.url === state.photoPrimaryUrl) state.photoPrimaryUrl = state.photoDraft[0]?.url || ""; renderPhotoManager(); return; }
  if (target.matches("[data-edit-product]")) { openProductModal(state.products.find((product) => product.id === target.dataset.editProduct)); return; }
  if (target.matches("[data-print-product]")) { buildIndividualPdf(state.products.find((product) => product.id === target.dataset.printProduct)); return; }
  if (target.matches("[data-toggle-product]")) { const product = state.products.find((item) => item.id === target.dataset.toggleProduct); if (product) { const nextStatus = product.status === "active" ? "inactive" : "active"; product.status = nextStatus; saveProducts(); renderAdmin(); renderCatalog(); showToast(product.status === "active" ? "Produto ativado." : "Produto ocultado do catálogo."); } return; }
  if (target.matches("[data-delete-product]")) { const product = state.products.find((item) => item.id === target.dataset.deleteProduct); if (product && window.confirm(`Excluir “${product.name}”?`)) { state.products = state.products.filter((item) => item.id !== product.id); state.selected.delete(product.id); saveProducts(); renderAdmin(); renderCatalog(); showToast("Produto excluído."); } return; }
  if (target.matches("[data-close-modal]")) closeModals();
});

window.addEventListener("hashchange", routeFromHash);
$("#mobileMenuButton").addEventListener("click", () => $(".main-nav").classList.toggle("open"));
$("#catalogSearch").addEventListener("input", renderCatalog);
$("#adminSearch").addEventListener("input", renderAdmin);
$("#adminCategoryFilter").addEventListener("change", (event) => { state.adminCategory = event.target.value; renderAdmin(); });
$("#openProductButton").addEventListener("click", () => openProductModal());
$("#openImportButton").addEventListener("click", () => { state.importRows = []; state.importedImages = {}; $("#csvInput").value = ""; $("#imageFolderInput").value = ""; renderImportPreview(); $("#importModal").classList.remove("hidden"); });
$("#photoAddInput").addEventListener("change", async (event) => { const files = [...event.target.files]; if (state.photoReplaceIndex !== null) await replacePhotoFile(files[0]); else await addPhotoFiles(files); event.target.value = ""; event.target.multiple = true; });
$("#savePhotosButton").addEventListener("click", saveManagedPhotos);

$("#productForm").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("#productId").value || uid(); const existing = state.products.find((product) => product.id === id); const code = $("#productCode").value.trim(); if (state.products.some((product) => product.code.toLowerCase() === code.toLowerCase() && product.id !== id)) { showToast("Esse código já está cadastrado."); return; } let image = existing?.image || ""; const file = $("#productImage").files[0]; if (file) image = await readFileAsDataUrl(file); const product = { id, code, name: $("#productName").value.trim(), description: $("#productDescription").value.trim(), price: normalizePrice($("#productPrice").value), category: $("#productCategory").value, status: $("#productStatus").value, image, additionalImages: $("#productAdditionalImages").value.split("\n").map((item) => item.trim()).filter(Boolean) }; if (existing) state.products = state.products.map((item) => item.id === id ? product : item); else state.products.push(product); saveProducts(); closeModals(); renderAdmin(); renderCatalog(); showToast(existing ? "Produto atualizado." : "Produto cadastrado."); });
$("#csvInput").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; const rows = parseCsv(await file.text()); const seenCodes = new Set(); state.importRows = rows.map((raw, index) => { const row = mapImportRow(raw, index); const normalizedCode = row.code.toLowerCase(); if (normalizedCode && seenCodes.has(normalizedCode)) { row.duplicate = true; row.valid = false; row.issue = "Código duplicado na planilha"; } if (normalizedCode) seenCodes.add(normalizedCode); return row; }); renderImportPreview(); });
$("#imageFolderInput").addEventListener("change", async (event) => { const files = [...event.target.files]; state.importedImages = {}; await Promise.all(files.map(async (file) => { const name = file.name.replace(/\.[^.]+$/, "").toLowerCase(); state.importedImages[name] = await readFileAsDataUrl(file); })); showToast(`${files.length} foto(s) relacionada(s) à importação.`); });
$("#confirmImportButton").addEventListener("click", async () => { const validRows = state.importRows.filter((row) => row.valid).map((row) => ({ id: uid(), code: row.code, name: row.name, description: row.description, price: row.price, category: row.category, status: row.status, image: row.image || state.importedImages[row.code.toLowerCase()] || "", additionalImages: [] })); const imported = validRows; imported.forEach((product) => state.products.push(product)); saveProducts(); closeModals(); renderAdmin(); renderCatalog(); showToast(`${imported.length} produto(s) importado(s).`); });
$("#shareSelectionButton").addEventListener("click", () => { const products = state.products.filter((product) => state.selected.has(product.id)); if (!products.length) { showToast("Selecione pelo menos uma peça para compartilhar."); return; } const message = `Olá! Gostaria de saber mais sobre estas peças OSTENTY:%0A%0A${products.map((product) => `• ${product.name} — código ${product.code}`).join("%0A")}`; window.open(`https://wa.me/?text=${message}`, "_blank", "noopener"); });
$("#modalSelectButton").addEventListener("click", () => { const id = $("#modalSelectButton").dataset.productId; state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); openProductDetail(state.products.find((product) => product.id === id)); renderCatalog(); });
$("#generatePdfButton").addEventListener("click", buildPrintCatalog);
$("#generateCategoryPdfButton").addEventListener("click", buildCategoryPrintCatalogs);

renderCategoryFilters(); routeFromHash(); renderAdmin();
