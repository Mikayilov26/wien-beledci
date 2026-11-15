// Offline shell: network-first for app files, cache fallback. API calls are never cached.
const CACHE = "wien-v2";
const SHELL = ["./", "index.html", "app.js", "data.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co") || u.hostname.includes("openstreetmap.de")) return;
  const isTile = u.hostname.includes("basemaps.cartocdn.com");
  e.respondWith(
    (isTile ? caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return res; }))
      : fetch(e.request).then(res => { if (res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true })))
  );
});
