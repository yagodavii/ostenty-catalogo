const CATEGORIES = ["Colares", "Brincos", "Argolas", "Anéis", "Conjuntos", "Pingentes", "Pulseiras"];
const STORAGE_KEY = "ostenty_catalog_products_v1";
const SEED_VERSION_KEY = "ostenty_catalog_seed_version";
const SEED_VERSION = "photos-2026-11-v3";

const state = {
  products: loadProducts(),
  catalogSearchQuery: "",
  adminSearchQuery: "",
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
  const text = String(value).trim().replace(/R\$\s?/i, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized.replace(/[^0-9.-]/g, ""));
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

function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function searchVariants(value) {
  const term = normalizeSearchText(value);
  if (!term) return [];
  const variants = new Set([term]);
  if (term.endsWith("es") && term.length > 3) variants.add(term.slice(0, -2));
  if (term.endsWith("s") && term.length > 2) variants.add(term.slice(0, -1));
  if (term.endsWith("is") && term.length > 3) variants.add(term.slice(0, -2) + "l");
  if (term.endsWith("l")) variants.add(term.slice(0, -1) + "is");
  else if (/[rz]$/.test(term)) variants.add(term + "es");
  else if (/[aeiou]$/.test(term)) variants.add(term + "s");
  return [...variants].filter(Boolean);
}

function matchesSearch(product, query) {
  const searchable = normalizeSearchText(`${product.name} ${product.code} ${product.category}`);
  return searchVariants(query).some((variant) => searchable.includes(variant));
}

function filteredProducts() {
  return state.products.filter((product) => product.status === "active" && (state.catalogCategory === "all" || product.category === state.catalogCategory) && (!state.catalogSearchQuery || matchesSearch(product, state.catalogSearchQuery)));
}

function renderCatalog() {
  renderCategoryFilters();
  const products = filteredProducts();
  $("#catalogCount").textContent = `${products.length} ${products.length === 1 ? "peça" : "peças"}`;
  $("#catalogGrid").innerHTML = products.map((product) => `<article class="product-card"><div class="product-photo">${productImage(product)}<span class="category-stamp">${escapeHtml(product.category)}</span></div><div class="product-meta"><small>${escapeHtml(product.code)}</small><h3 title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3><div class="product-meta-bottom"><strong class="product-price">${formatPrice(product.price)}</strong><button class="view-product" data-view-product="${product.id}">Ver detalhes →</button></div></div></article>`).join("");
  $("#catalogEmpty").classList.toggle("hidden", products.length > 0);
  $("#catalogGrid").classList.toggle("hidden", products.length === 0);
}

function renderAdmin() {
  $("#adminPanel").classList.toggle("hidden", !isAdmin());
  if (!isAdmin()) return;
  renderCategoryFilters();
  const products = state.products.filter((product) => (state.adminCategory === "all" || product.category === state.adminCategory) && (!state.adminSearchQuery || matchesSearch(product, state.adminSearchQuery)));
  $("#statActive").textContent = state.products.filter((product) => product.status === "active").length;
  $("#statTotal").textContent = state.products.length;
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


const PDF_COLORS = { ink: [18, 13, 16], rose: [185, 114, 147], muted: [126, 110, 118], line: [232, 213, 197] };
const pdfImageCache = new Map();

function safeFileName(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "catalogo";
}

function loadPdfImage(url) {
  if (!url) return Promise.resolve(null);
  if (pdfImageCache.has(url)) return pdfImageCache.get(url);
  const task = new Promise((resolve) => {
    const image = new Image();
    if (!url.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL("image/jpeg", 0.68), width: canvas.width, height: canvas.height });
      } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
  pdfImageCache.set(url, task);
  return task;
}

function addPdfBrand(doc, category, pageLabel = "") {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("OSTENTY", 14, 16);
  doc.setTextColor(...PDF_COLORS.rose);
  doc.setFontSize(7);
  doc.text("SEMIJOIAS", 14, 21);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.muted);
  doc.setFontSize(9);
  doc.text(category.toLocaleUpperCase("pt-BR"), pageWidth - 14, 17, { align: "right" });
  if (pageLabel) doc.text(pageLabel, pageWidth - 14, 22, { align: "right" });
  doc.setDrawColor(...PDF_COLORS.line);
  doc.line(14, 27, pageWidth - 14, 27);
}

async function addPdfProductCard(doc, product, x, y, width, height) {
  doc.setDrawColor(...PDF_COLORS.line);
  doc.roundedRect(x, y, width, height, 2, 2);
  const image = await loadPdfImage(product.image);
  if (image) {
    const box = { x: x + 3, y: y + 3, w: width - 6, h: 43 };
    const ratio = Math.min(box.w / image.width, box.h / image.height);
    const w = image.width * ratio, h = image.height * ratio;
    doc.addImage(image.data, "JPEG", box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
  }
  const nameLines = doc.splitTextToSize(product.name || "", width - 8).slice(0, 2);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(nameLines, x + 4, y + 51);
  let cursor = y + 51 + Math.max(1, nameLines.length) * 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.muted);
  doc.setFontSize(7.5);
  doc.text("CÓDIGO " + (product.code || ""), x + 4, cursor);
  cursor += 4;
  if (product.description) {
    const description = doc.splitTextToSize(product.description, width - 8).slice(0, 2);
    doc.text(description, x + 4, cursor);
    cursor += description.length * 3.5;
  }
  doc.setTextColor(...PDF_COLORS.rose);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(formatPrice(product.price), x + 4, Math.min(y + height - 4, Math.max(cursor + 2, y + height - 5)));
}

async function addPdfIndividual(doc, product) {
  const pageWidth = doc.internal.pageSize.getWidth();
  addPdfBrand(doc, product.category, "CATÁLOGO INDIVIDUAL");
  const image = await loadPdfImage(product.image);
  if (image) {
    const box = { x: 18, y: 38, w: pageWidth - 36, h: 153 };
    const ratio = Math.min(box.w / image.width, box.h / image.height);
    const w = image.width * ratio, h = image.height * ratio;
    doc.addImage(image.data, "JPEG", box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
  }
  doc.setTextColor(...PDF_COLORS.rose);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(product.category.toLocaleUpperCase("pt-BR"), 18, 207);
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(doc.splitTextToSize(product.name || "", pageWidth - 36).slice(0, 2), 18, 219);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Código " + (product.code || ""), 18, 239);
  const description = product.description ? doc.splitTextToSize(product.description, pageWidth - 36).slice(0, 5) : [];
  if (description.length) doc.text(description, 18, 250);
  doc.setTextColor(...PDF_COLORS.rose);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(formatPrice(product.price), 18, description.length ? 276 : 261);
}

async function createCatalogPdf(products, title, options = {}) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error("O gerador de PDF não carregou. Atualize a página e tente novamente.");
  if (!products.length) throw new Error("Não há produtos para gerar este PDF.");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const onProgress = options.onProgress || (() => {});
  onProgress(0, products.length);
  if (options.individual || products.length === 1) {
    await addPdfIndividual(doc, products[0]);
    onProgress(1, 1);
    return doc;
  }
  const grouped = [...new Set(products.map((product) => product.category))]
    .map((category) => ({ category, products: products.filter((product) => product.category === category) }));
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setTextColor(...PDF_COLORS.rose);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("OSTENTY  ·  SEMIJOIAS", pageWidth / 2, 79, { align: "center" });
  doc.setTextColor(...PDF_COLORS.ink);
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.text("Catálogo", pageWidth / 2, 111, { align: "center" });
  doc.text("digital", pageWidth / 2, 124, { align: "center" });
  doc.setDrawColor(...PDF_COLORS.rose);
  doc.line(pageWidth / 2 - 20, 137, pageWidth / 2 + 20, 137);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Seu brilho, sua essência.  ·  " + new Date().toLocaleDateString("pt-BR"), pageWidth / 2, 146, { align: "center" });

  for (const group of grouped) {
    doc.addPage();
    addPdfBrand(doc, group.category, title);
    for (let index = 0; index < group.products.length; index++) {
      if (index > 0 && index % 6 === 0) {
        doc.addPage();
        addPdfBrand(doc, group.category, title);
      }
      const position = index % 6;
      const column = position % 2;
      const row = Math.floor(position / 2);
      const x = 14 + column * 93;
      const y = 33 + row * 84;
      await addPdfProductCard(doc, group.products[index], x, y, 88, 79);
      const completed = grouped.slice(0, grouped.indexOf(group)).reduce((count, item) => count + item.products.length, 0) + index + 1;
      onProgress(completed, products.length);
      if ((index + 1) % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  for (let page = 2; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(String(page - 1), pageWidth - 14, pageHeight - 7, { align: "right" });
  }
  return doc;
}

async function withPdfButton(button, task) {
  button.disabled = true;
  const original = button.innerHTML;
  const progress = (done, total) => {
    const percent = total ? Math.min(100, Math.round(done / total * 100)) : 0;
    button.textContent = "Preparando PDF " + percent + "%…";
  };
  button.textContent = "Preparando PDF 0%…";
  try { await task(progress); }
  catch (error) { showToast(error.message || "Não foi possível gerar o PDF."); }
  finally { button.disabled = false; button.innerHTML = original; }
}

function buildPrintCatalog() {
  const button = $("#generatePdfButton");
  withPdfButton(button, async (progress) => {
    const products = state.products.filter((product) => product.status === "active");
    const doc = await createCatalogPdf(products, "Catálogo completo", { onProgress: progress });
    doc.save("ostenty-catalogo-" + new Date().toISOString().slice(0, 10) + ".pdf");
    showToast("PDF completo baixado.");
  });
}

function buildCategoryPrintCatalogs() {
  const button = $("#generateCategoryPdfButton");
  withPdfButton(button, async (progress) => {
    const chosen = $$(".pdf-category:checked").map((checkbox) => checkbox.value);
    const all = $("#pdfAllCategories").checked;
    const categories = all || chosen.length === CATEGORIES.length ? CATEGORIES : chosen;
    if (!categories.length) throw new Error("Selecione pelo menos uma categoria.");
    const products = state.products.filter((product) => product.status === "active" && categories.includes(product.category));
    if (!products.length) throw new Error("Não há produtos ativos nas categorias selecionadas.");
    const doc = await createCatalogPdf(products, "Categorias selecionadas", { onProgress: progress });
    doc.save("ostenty-categorias-" + new Date().toISOString().slice(0, 10) + ".pdf");
    showToast("PDF das categorias selecionadas baixado.");
  });
}

function buildIndividualPdf(product) {
  if (!product || product.status !== "active") { showToast("Apenas produtos ativos podem gerar PDF."); return; }
  const button = document.querySelector('[data-print-product="' + CSS.escape(product.id) + '"]');
  withPdfButton(button || $("#generatePdfButton"), async (progress) => {
    const doc = await createCatalogPdf([product], product.name, { individual: true, onProgress: progress });
    doc.save("ostenty-" + safeFileName(product.code) + ".pdf");
    showToast("PDF de " + product.name + " baixado.");
  });
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-view-product], [data-catalog-category], [data-edit-product], [data-delete-product], [data-toggle-product], [data-print-product], [data-manage-photos], [data-photo-primary], [data-photo-replace], [data-photo-delete], [data-close-modal]");
  if (!target) return;
  if (target.matches("[data-catalog-category]")) { state.catalogCategory = target.dataset.catalogCategory; renderCatalog(); return; }
  if (target.matches("[data-view-product]")) { openProductDetail(state.products.find((product) => product.id === target.dataset.viewProduct)); return; }
  if (target.matches("[data-manage-photos]")) { openPhotoManager(state.products.find((product) => product.id === target.dataset.managePhotos)); return; }
  if (target.matches("[data-photo-primary]")) { state.photoPrimaryUrl = state.photoDraft[Number(target.dataset.photoPrimary)]?.url || state.photoPrimaryUrl; renderPhotoManager(); return; }
  if (target.matches("[data-photo-replace]")) { state.photoReplaceIndex = Number(target.dataset.photoReplace); const input = $("#photoAddInput"); input.multiple = false; input.value = ""; input.click(); return; }
  if (target.matches("[data-photo-delete]")) { const index = Number(target.dataset.photoDelete); const removed = state.photoDraft.splice(index, 1)[0]; if (removed?.url === state.photoPrimaryUrl) state.photoPrimaryUrl = state.photoDraft[0]?.url || ""; renderPhotoManager(); return; }
  if (target.matches("[data-edit-product]")) { openProductModal(state.products.find((product) => product.id === target.dataset.editProduct)); return; }
  if (target.matches("[data-print-product]")) { buildIndividualPdf(state.products.find((product) => product.id === target.dataset.printProduct)); return; }
  if (target.matches("[data-toggle-product]")) { const product = state.products.find((item) => item.id === target.dataset.toggleProduct); if (product) { const nextStatus = product.status === "active" ? "inactive" : "active"; product.status = nextStatus; saveProducts(); renderAdmin(); renderCatalog(); showToast(product.status === "active" ? "Produto ativado." : "Produto ocultado do catálogo."); } return; }
  if (target.matches("[data-delete-product]")) { const product = state.products.find((item) => item.id === target.dataset.deleteProduct); if (product && window.confirm(`Excluir “${product.name}”?`)) { state.products = state.products.filter((item) => item.id !== product.id); saveProducts(); renderAdmin(); renderCatalog(); showToast("Produto excluído."); } return; }
  if (target.matches("[data-close-modal]")) closeModals();
});

window.addEventListener("hashchange", routeFromHash);
$("#mobileMenuButton").addEventListener("click", () => $(".main-nav").classList.toggle("open"));
$("#catalogSearchButton").addEventListener("click", () => { state.catalogSearchQuery = $("#catalogSearch").value; renderCatalog(); });
$("#adminSearchButton").addEventListener("click", () => { state.adminSearchQuery = $("#adminSearch").value; renderAdmin(); });
$("#adminSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") event.preventDefault(); });
$("#catalogSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") event.preventDefault(); });
$("#adminCategoryFilter").addEventListener("change", (event) => { state.adminCategory = event.target.value; renderAdmin(); });
$("#openProductButton").addEventListener("click", () => openProductModal());
$("#openImportButton").addEventListener("click", () => { state.importRows = []; state.importedImages = {}; $("#csvInput").value = ""; $("#imageFolderInput").value = ""; renderImportPreview(); $("#importModal").classList.remove("hidden"); });
$("#photoAddInput").addEventListener("change", async (event) => { const files = [...event.target.files]; if (state.photoReplaceIndex !== null) await replacePhotoFile(files[0]); else await addPhotoFiles(files); event.target.value = ""; event.target.multiple = true; });
$("#savePhotosButton").addEventListener("click", saveManagedPhotos);

$("#productForm").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("#productId").value || uid(); const existing = state.products.find((product) => product.id === id); const code = $("#productCode").value.trim(); if (state.products.some((product) => product.code.toLowerCase() === code.toLowerCase() && product.id !== id)) { showToast("Esse código já está cadastrado."); return; } let image = existing?.image || ""; const file = $("#productImage").files[0]; if (file) image = await readFileAsDataUrl(file); const product = { id, code, name: $("#productName").value.trim(), description: $("#productDescription").value.trim(), price: normalizePrice($("#productPrice").value), category: $("#productCategory").value, status: $("#productStatus").value, image, additionalImages: $("#productAdditionalImages").value.split("\n").map((item) => item.trim()).filter(Boolean) }; if (existing) state.products = state.products.map((item) => item.id === id ? product : item); else state.products.push(product); saveProducts(); closeModals(); renderAdmin(); renderCatalog(); showToast(existing ? "Produto atualizado." : "Produto cadastrado."); });
$("#csvInput").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; const rows = parseCsv(await file.text()); const seenCodes = new Set(); state.importRows = rows.map((raw, index) => { const row = mapImportRow(raw, index); const normalizedCode = row.code.toLowerCase(); if (normalizedCode && seenCodes.has(normalizedCode)) { row.duplicate = true; row.valid = false; row.issue = "Código duplicado na planilha"; } if (normalizedCode) seenCodes.add(normalizedCode); return row; }); renderImportPreview(); });
$("#imageFolderInput").addEventListener("change", async (event) => { const files = [...event.target.files]; state.importedImages = {}; await Promise.all(files.map(async (file) => { const name = file.name.replace(/\.[^.]+$/, "").toLowerCase(); state.importedImages[name] = await readFileAsDataUrl(file); })); showToast(`${files.length} foto(s) relacionada(s) à importação.`); });
$("#confirmImportButton").addEventListener("click", async () => { const validRows = state.importRows.filter((row) => row.valid).map((row) => ({ id: uid(), code: row.code, name: row.name, description: row.description, price: row.price, category: row.category, status: row.status, image: row.image || state.importedImages[row.code.toLowerCase()] || "", additionalImages: [] })); const imported = validRows; imported.forEach((product) => state.products.push(product)); saveProducts(); closeModals(); renderAdmin(); renderCatalog(); showToast(`${imported.length} produto(s) importado(s).`); });
$("#generatePdfButton").addEventListener("click", buildPrintCatalog);
$("#generateCategoryPdfButton").addEventListener("click", buildCategoryPrintCatalogs);

renderCategoryFilters(); routeFromHash(); renderAdmin();
