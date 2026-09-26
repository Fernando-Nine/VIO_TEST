/* Only immutable app assets. Room navigation and live traffic ALWAYS use the network. */
const CACHE = "vio-static-2.4.0";
const ICONS = [
  "/icons/vio-192.png",
  "/icons/vio-512.png",
  "/icons/vio-maskable-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ICONS)));
  // No skipWaiting or forced reload: do not interrupt an ongoing call.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("vio-static-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    request.mode === "navigate" ||
    url.origin !== self.location.origin ||
    url.searchParams.has("sala")
  )
    return;
  // An explicit allowlist also excludes custom socket paths, /api, /room, /sala,
  // session requests, source downloads and every non-static endpoint.
  if (
    !/^\/assets\/[^/]+\.(?:js|css|woff2?|png|svg)$/.test(url.pathname) &&
    !ICONS.includes(url.pathname) &&
    url.pathname !== "/favicon.svg"
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic")
        await cache.put(request, response.clone());
      return response;
    }),
  );
});
