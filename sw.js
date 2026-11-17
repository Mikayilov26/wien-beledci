// Offline shell: network-first for app files, cache fallback. API calls are never cached.
const CACHE = "wien-v24";
const SHELL = ["./", "index.html", "app.js", "data.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js", "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co") || u.hostname.includes("openstreetmap.de")) return;
  const put = (req, res) => { if (res && res.ok) { const cl = res.clone(); caches.open(CACHE).then(c => c.put(req, cl)); } return res; };
  const fromCache = req => caches.match(req, { ignoreVary: true }).then(r => r || caches.match(req, { ignoreSearch: true, ignoreVary: true }));
  // never wait forever on a weak connection: after a few seconds use the saved copy
  const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("slow")), ms); p.then(r => { clearTimeout(t); res(r); }, x => { clearTimeout(t); rej(x); }); });
  // 1) versioned files that never change (map library, app.js?v=…, data.js?v=…, map tiles, fonts, icons): cache-first
  const immutable = (u.hostname === "unpkg.com" && /@\d/.test(u.pathname)) || (u.origin === self.location.origin && /[?&]v=/.test(u.search)) ||
    (u.hostname === "tiles.openfreemap.org" && /\.(pbf|png|json|webp)$/.test(u.pathname));
  if (immutable) { e.respondWith(fromCache(e.request).then(r => r || fetch(e.request).then(res => put(e.request, res)))); return; }
  // 2) the app page itself: open instantly from the saved copy, refresh the copy in the background (a new version is used next time)
  const isPage = e.request.mode === "navigate" || (u.origin === self.location.origin && (u.pathname.endsWith("/") || u.pathname.endsWith("index.html")));
  if (isPage) {
    const fresh = fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(res => put(e.request, res));
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(fromCache(e.request).then(r => r || withTimeout(fresh, 8000)).catch(() => fromCache(e.request)));
    return;
  }
  // 3) everything else (version.txt, map style): network-first, but fall back to the saved copy after 4 s
  const net = u.origin === self.location.origin ? fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(e.request);
  e.respondWith(withTimeout(net.then(res => put(e.request, res)), u.pathname.endsWith("version.txt") ? 8000 : 4000)
    .catch(() => fromCache(e.request).then(r => r || net)));
});

// push notifications (reminders)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = { title: "Wien Bələdçi", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Wien Bələdçi", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./", go = (url.match(/[?&]go=([a-z]+)/) || [])[1];
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { for (const c of cs) { if ("focus" in c) { if (go) c.postMessage({ go }); return c.focus(); } } return self.clients.openWindow(url); }));
});
