// Offline shell: network-first for app files, cache fallback. API calls are never cached.
const CACHE = "wien-v13";
const SHELL = ["./", "index.html", "app.js", "data.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co") || u.hostname.includes("openstreetmap.de")) return;
  const isTile = (u.hostname === "tile.openstreetmap.org" || u.hostname === "tile.openstreetmap.de");
  e.respondWith(
    (isTile ? caches.match(e.request, { ignoreVary: true, ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return res; }))
      : (u.origin === self.location.origin ? fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(e.request)).then(res => { if (res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true })))
  );
});

// push notifications (reminders)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { title: "Wien Bələdçi", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Wien Bələdçi", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { for (const c of cs) { if ("focus" in c) return c.focus(); } return self.clients.openWindow("./"); }));
});
