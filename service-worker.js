const CACHE_NAME = "ostenty-app-v9";
const SHELL = [
  "/frontend/index.html",
  "/frontend/styles.css",
  "/frontend/app.js",
  "/frontend/products-seed.js",
  "/frontend/vendor/jspdf.umd.min.js",
  "/frontend/manifest.webmanifest",
  "/frontend/icons/icon-192.png",
  "/frontend/icons/icon-512.png",
  "/frontend/icons/icon-180.png"
];
const IMAGE_CACHE = "ostenty-images-v1";
const MAX_CACHED_IMAGES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, IMAGE_CACHE].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(new URL("/", self.location.origin).href, response.clone()));
      return response;
    }).catch(async () => (await caches.match(new URL("/", self.location.origin).href)) || (await caches.match(new URL("/frontend/index.html", self.location.origin).href))));
    return;
  }

  if (url.pathname.startsWith("/frontend/assets/products/")) {
    event.respondWith(caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > MAX_CACHED_IMAGES) await cache.delete(keys[0]);
      }
      return response;
    }));
    return;
  }

  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(request)));
  }
});
