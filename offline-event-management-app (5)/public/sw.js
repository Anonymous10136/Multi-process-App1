/* EventOps PWA Service Worker — v4 (resilient offline-first)
   Navigation uses STALE-WHILE-REVALIDATE (cache-first):
   the installed app opens instantly from cache even if the origin/server is gone.
*/
const CACHE = "eventops-v4";
const APP_SHELL = [
  "/",
  "/dashboard",
  "/inventory",
  "/packages",
  "/calendar",
  "/more",
  "/events",
  "/equipment",
  "/reports",
  "/backup",
  "/settings",
  "/about",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const path of APP_SHELL) {
        try {
          const res = await fetch(path, { cache: "no-cache" });
          if (res && res.ok) await cache.put(path, res);
        } catch {
          /* ignore individual failures so SW install always succeeds */
        }
      }
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // STALE-WHILE-REVALIDATE: serve cache immediately (works with dead origin),
    // then refresh cache in background when the network is available.
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          // Return cached page instantly; update cache silently in background.
          event.waitUntil(networkFetch);
          return cached;
        }

        return networkFetch.then((res) => {
          if (res) return res;
          // Last-resort fallbacks so the app ALWAYS opens even offline/origin-dead.
          return caches.match("/dashboard").then((f) => f || caches.match("/"));
        });
      })
    );
    return;
  }

  // Static assets: cache-first, then network, then cache fallback.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
