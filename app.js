/* Wien Bələdçi — standalone web app (GitHub Pages + Supabase Edge Function). */
"use strict";
const API = "https://trdtnccapajlvowdavlb.supabase.co/functions/v1/api";
const PEOPLE = ["Fidan", "Sədaqət", "Kəmalə"];

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem("wb." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("wb." + k, JSON.stringify(v)); } catch (e) {} },
};
function toast(t, ms) { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove("on"), ms || 2600); }
const short = n => { n = String(n || ""); const m = n.match(/^Milad bazarı – (.+)$/); return m ? "🎄 " + m[1] : n.split(" (")[0].split(" – ")[0]; };
const AZM = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
const fmtT = t => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(t)); const o = {}; p.forEach(x => o[x.type] = x.value); return `${o.day} ${AZM[o.month - 1]}, ${o.hour}:${o.minute}`; };
function fm(v, dec) {
  if (!isFinite(v)) return "0";
  if (dec === 0) return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const s = (Math.round(v * 100) / 100).toFixed(2); let [i, f] = s.split(".");
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " "); return f === "00" ? i : i + "," + f;
}
const toNum = s => { const v = parseFloat(String(s || "").replace(/\s/g, "").replace(",", ".")); return isFinite(v) ? v : 0; };

/* ---------- state ---------- */
const HOTEL0 = { lat: 48.2152, lng: 16.3787, name: "Hotel Stefanie", addr: "Taborstraße 12, 1020 Wien", phone: "+43 1 211500", ci: "15:00-dan", co: "11:00-dək", note: "24 saat resepsiya." };
const DEFAULT_LIVE = { eurAzn: 1.96, eurTry: 55.2, weather: [], alerts: [] };
const S = {
  code: null, me: null, gps: "wait", hotel: LS.get("hotel", null) || HOTEL0, album: LS.get("album", []),
  live: LS.get("live", DEFAULT_LIVE), expenses: LS.get("expCache", []), pending: LS.get("expPending", []),
  ai: LS.get("aiOn", true), online: true, dest: null, filter: "all", friends: {}, share: LS.get("shareLoc", false), photos: LS.get("photosCache", []),
};
let ME = LS.get("who", null), ADMIN = LS.get("admin", false);
Object.defineProperty(byId, "hotel", { get: () => { const h = S.hotel || HOTEL0; return { id: "hotel", name: "🏨 " + (h.name || "Otel"), lat: h.lat, lng: h.lng, cat: "tarix", d: h.addr || "" }; } });
const TF_MIN = 75.01, TF_RATE = 0.12; // Austria: min €75.01 per receipt; ~12% net back after operator fees
const tfBack = eur => eur >= TF_MIN ? eur * TF_RATE : 0;
// Tax-free is only for goods taken out of the EU — never for restaurants, cafés, transport or tickets
const TF_NO_CAT = ["🍽 Yemək", "☕ Kafe", "🎟 Bilet", "🚇 Nəqliyyat"];
const TF_NO_WORD = /restoran|restaurant|kafe|caf[eé]|kaffee|schnitzel|nahar|şam yeməy|sam yemey|səhər yeməy|yemək|yemek|pizza|burger|mcdonald|kfc|starbucks|bar\b|beisl|heuriger|wirtshaus|taksi|taxi|uber|bolt|bilet|ticket|metro|tram|bus\b|qatar|zug|öbb|obb|muzey|museum|konsert|opera/i;
const tfEligible = e => !!e && !TF_NO_CAT.includes(e.cat) && !TF_NO_WORD.test(e.d || "");
const R = () => ({ azn: +S.live.eurAzn || 1.96, try: +S.live.eurTry || 55 });

/* ---------- Vienna time ---------- */
function vNow() {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const o = {}; f.formatToParts(new Date()).forEach(p => o[p.type] = p.value);
  const hh = o.hour === "24" ? "00" : o.hour;
  return { date: `${o.year}-${o.month}-${o.day}`, time: `${hh}:${o.minute}`, mins: (+hh) * 60 + (+o.minute), wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(o.weekday) };
}
const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
function openState(p) {
  if (!p.h) return null; const now = vNow();
  const h = (p.hd && p.hd[now.date]) || (Array.isArray(p.h) ? p.h[now.wd] : p.h);
  if (h === null) return { open: false, txt: "Bu gün bağlıdır", closedToday: true };
  if (!h) return null;
  const [a, b] = h.split("-"); let o = toMin(a), c = toMin(b), m = now.mins;
  if (c <= o) { c += 1440; if (m < o) m += 1440; }
  const open = m >= o && m < c;
  return { open, txt: open ? `Açıqdır · ${b}-dək` : (m < o ? `Bağlıdır · ${a}-da açılır` : "Bağlıdır"), closedToday: !open && m >= c };
}

/* ---------- geo ---------- */
function dist(a, b) { const R0 = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)); }
const walkM = d => Math.round(d * 1.3);
const walkMin = d => Math.max(1, Math.round(walkM(d) / 75));
const fmtKm = m => m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km";
const inVienna = (lat, lng) => lat > 47.9 && lat < 48.45 && lng > 16.0 && lng < 16.75;
const nearest = (pt, n, f) => POI.filter(p => !f || f(p)).map(p => ({ p, d: dist(pt, p) })).sort((a, b) => a.d - b.d).slice(0, n);
const taxiEst = m => { const km = m * 1.25 / 1000; const lo = Math.max(8, 4 + km * 1.6), hi = Math.max(11, 6 + km * 2.4); return [Math.round(lo), Math.round(hi)]; };
const taxiMin = m => Math.max(4, Math.round(m * 1.25 / 1000 / 18 * 60 + 3));
const uberLink = d => `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${d.lat}&dropoff[longitude]=${d.lng}&dropoff[nickname]=${encodeURIComponent(short(d.name || "Hədəf").replace(/^🏨 /, ""))}`;
function taxiBlock(d, meters, primary) {
  const [lo, hi] = taxiEst(meters);
  return `<div class="taxi-box mt"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>🚕 Taksi</b><span><b>~${taxiMin(meters)} dəq</b> · ≈ ${lo}–${hi} € <span class="dim sm">(3 nəfərə ≈ ${fm(lo / 3, 0)}–${fm(hi / 3, 0)} € adambaşı)</span></span></div>
   <div class="row mt"><a class="btn ${primary ? "pri" : ""} grow" href="${uberLink(d)}" target="_blank" rel="noopener">Uber ilə çağır</a><a class="btn grow" href="tel:+43140100">📞 Taxi 40100</a><button class="btn" data-taxicard="1" aria-label="Sürücüyə göstər">🪧</button></div>
   <div class="sm dim" style="margin-top:6px">Uber/Bolt qiyməti əvvəlcədən göstərir. Küçə taksisi taksometrlə işləyir — rəqəm təxminidir.</div></div>`;
}
function destCard(d) {
  $("#bigBox").innerHTML = `<div class="sm dim">🚕 Bitte bringen Sie mich zu:</div><div class="taxi">${esc(short(d.name || "").replace(/^🏨 /, ""))}</div>${d.addr || d.d ? `<div style="font-size:18px;font-weight:600">${esc(d.addr || "")}</div>` : ""}<div class="sm mute mt">“Zəhmət olmasa məni bura aparın”</div><button class="btn pri wide mt" id="bbX">Oldu</button>`;
  $("#bigModal").classList.add("on"); $("#bbX").onclick = () => $("#bigModal").classList.remove("on");
}
const gDir = (d, mode) => `https://www.google.com/maps/dir/?api=1${S.me ? `&origin=${S.me.lat},${S.me.lng}` : ""}&destination=${d.lat},${d.lng}&travelmode=${mode || "walking"}`;
const gPlace = p => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(short(p.name) + " Wien")}${p.pid ? `&query_place_id=${p.pid}` : ""}`;

function setMe(lat, lng, src, acc) {
  if (!inVienna(lat, lng)) { if (src === "gps") { S.gps = "away"; renderLoc(); } return false; }
  const n = nearest({ lat, lng }, 1)[0];
  S.me = { lat, lng, src, acc: acc || 0, ts: Date.now(), label: n && n.d < 400 ? short(n.p.name) : "Vyana" };
  if (src === "gps") { S.gps = "on"; track(lat, lng, acc); }
  renderLoc(); mapMe(); if (src === "gps") pushLoc(); return true;
}
/* ---------- daily tracking for the evening summary (stays on this phone) ---------- */
let lastFix = LS.get("lastFix", null);
function track(lat, lng, acc) {
  if ((acc || 99) > 40) return;
  const day = vNow().date, k = "trk." + day, t = LS.get(k, { m: 0, v: [] });
  if (lastFix && lastFix.day === day) { const d = dist(lastFix, { lat, lng }); if (d < 15) return; if (d < 1500 && Date.now() - lastFix.ts < 20 * 60000) t.m += d; }
  lastFix = { lat, lng, ts: Date.now(), day }; LS.set("lastFix", lastFix);
  const n = nearest({ lat, lng }, 1, p => p.cat !== "metro")[0];
  if (n && n.d < 60 && !t.v.includes(n.p.id)) t.v.push(n.p.id);
  LS.set(k, t);
}
function daySummary(date) {
  const t = LS.get("trk." + date, { m: 0, v: [] }), r = R();
  const spent = ME ? expAll().filter(e => vDate(e.ts) === date).reduce((a, e) => a + myShare(e), 0) : 0;
  const ph = (S.photos || []).filter(p => vDate(p.ts) === date).length + S.album.filter(a => vDate(a.ts) === date && !(S.photos || []).some(p => p.thumb === a.img)).length;
  return { km: t.m / 1000, places: t.v.map(id => byId[id]).filter(Boolean), spent, spentAzn: spent * r.azn, photos: ph };
}
function summaryHTML(date, title) {
  const s = daySummary(date);
  return `<div class="card mt sumcard"><div class="sm dim">${title}</div>
   <div class="stat"><div><b>${s.km.toFixed(1).replace(".", ",")} km</b><span>🚶 piyada</span></div><div><b>${fm(s.spent)} €</b><span>💶 xərcin</span></div><div><b>${s.photos}</b><span>📷 şəkil</span></div></div>
   ${s.places.length ? `<div class="sm mt">📍 ${s.places.slice(0, 8).map(p => esc(short(p.name))).join(" · ")}${s.places.length > 8 ? ` +${s.places.length - 8}` : ""}</div>` : ""}
   <button class="btn s mt" data-share="${date}">📤 Paylaş</button></div>`;
}
function briefHTML(date) {
  const day = PLAN.find(d => d.d === date); if (!day) return "";
  const wx = (S.live.weather || [])[0], al = (S.live.alerts || []).filter(a => (a.date === date || a.date === "all") && a.level !== "info");
  const bks = (typeof BOOK !== "undefined" ? BOOK : []).filter(b => vDate(b.at) === date);
  return `<div class="card mt" style="background:linear-gradient(135deg,#FFF8E6,#FFFFFF)"><div class="sm dim">☀️ Səhər brifinqi</div><b style="font:700 20px Fraunces,serif">${esc(day.title)}</b>
   ${wx ? `<div class="sm mt">🌦 ${esc(wx.t)}${wx.s ? ", " + esc(wx.s) : ""}${S.live.weatherNote ? " — " + esc(S.live.weatherNote) : ""}</div>` : ""}
   <div class="sm" style="margin-top:4px">${al.length ? "⚠️ " + al.map(a => esc(a.title)).join("; ") : "✅ Yollarda problem yoxdur"}</div>
   <div class="sm" style="margin-top:4px">🗓 ${day.items.filter(i => i[0] >= vNow().time || date !== vNow().date).slice(0, 4).map(i => `<b>${i[0]}</b> ${esc(short(i[1]))}`).join(" · ")}</div>
   ${bks.length ? `<div class="sm" style="margin-top:4px">🎟 ${bks.map(b => `<b>${hhmm(b.at)}</b> ${esc(b.title)}`).join(" · ")}</div>` : ""}</div>`;
}
function shareSummary(date) {
  const s = daySummary(date);
  const txt = `Vyana, ${fmtT(Date.parse(date + "T12:00:00+01:00")).split(",")[0]} 🇦🇹\n🚶 ${s.km.toFixed(1).replace(".", ",")} km · 💶 ${fm(s.spent)} € · 📷 ${s.photos} şəkil` + (s.places.length ? `\n📍 ${s.places.map(p => short(p.name)).join(", ")}` : "");
  if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else { try { navigator.clipboard.writeText(txt); toast("Kopyalandı"); } catch (e) {} }
}

/* ---------- group location (opt-in) ---------- */
let lastPush = 0;
const SHARE_END = Date.UTC(2026, 10, 20, 16, 0); // 20 Nov 20:00 Baku: sharing switches itself off after the trip
async function pushLoc(force) {
  if (ADMIN) return; // the test phone never shares (and never covers one of the girls' dots)
  if (S.share && Date.now() > SHARE_END) { S.share = false; LS.set("shareLoc", false); if (ME) api("kv.set", { key: "loc:" + ME, value: null }).catch(() => {}); return; }
  if (!S.share || !ME || !S.me || S.me.src !== "gps" || !S.code) return;
  if (!force && Date.now() - lastPush < 45000) return; lastPush = Date.now();
  try { await api("kv.set", { key: "loc:" + ME, value: { lat: +S.me.lat.toFixed(5), lng: +S.me.lng.toFixed(5), acc: Math.round(S.me.acc || 0) } }); } catch (e) {}
}
function friendsList() { return Object.entries(S.friends).filter(([n, v]) => (ADMIN || n !== ME) && v && Date.now() - v.ts < 3 * 3600000).map(([n, v]) => ({ n, ...v })); }
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? "indicə" : m < 60 ? m + " dəq əvvəl" : Math.floor(m / 60) + " saat əvvəl"; };
function renderFamily() {
  const box = $("#famCard"); if (!box) return;
  if (!ADMIN) { setHTML(box, ""); return; }
  const fr = Object.entries(S.friends).filter(([n, v]) => PEOPLE.includes(n) && v && v.ts).map(([n, v]) => ({ n, ...v }));
  const near = f => { const p = POI.map(x => ({ x, d: dist(f, x) })).sort((a, b) => a.d - b.d)[0]; return p && p.d < 600 ? p.x.name + " yaxınlığı" : ""; };
  setHTML(box, `<div class="card mt"><b>📍 Ailə harada?</b>${PEOPLE.map(n => { const f = fr.find(x => x.n === n);
    return `<div class="person"><div><b>${n}</b><span class="s2">${f ? (near(f) || "Vyana") + " · " + ago(f.ts) : "yerini paylaşmır"}</span></div>${f ? `<button class="btn s" data-famgo="${n}">Xəritədə</button>` : ""}</div>`; }).join("")}</div>`);
  $$("[data-famgo]").forEach(b => b.onclick = () => { const f = S.friends[b.dataset.famgo]; goView("map"); setTimeout(() => mapGo(f.lat, f.lng, 16), 700); });
}
function groupSheet() {
  const fr = friendsList();
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">👭 Qrup</h3>
   <p class="mute sm">${ADMIN ? "Qızlar yerini paylaşanda burada və xəritədə görünür." : "Yerini paylaşsan, qızlar və <b>Kənan</b> səni xəritədə görəcək (hər 45 saniyədən bir yenilənir). İstədiyin vaxt söndür. Səfər bitəndə (20 noyabr axşamı) özü sönür."}</p>
   ${ADMIN ? "" : ME ? `<button class="btn wide ${S.share ? "" : "pri"}" id="shTg">${S.share ? "⏸ Paylaşmanı dayandır" : "📍 Yerimi qrupla paylaş"}</button>` : `<button class="btn pri wide" id="shWho">Əvvəl adını seç</button>`}
   <ul class="list mt">${fr.length ? fr.map(f => `<li data-fr="${esc(f.n)}" style="cursor:pointer"><span class="friend"><i>${esc(f.n[0])}</i>${esc(f.n)}</span><div class="grow"></div><span class="sm dim">${S.me ? fmtKm(walkM(dist(S.me, f))) + " · " : ""}${ago(f.ts)}</span></li>`).join("") : `<li class="mute sm">Hələ heç kim yerini paylaşmır.</li>`}</ul>`;
  $("#sheet").classList.add("on");
  if ($("#shWho")) $("#shWho").onclick = askWho;
  if ($("#shTg")) $("#shTg").onclick = async () => { S.share = !S.share; LS.set("shareLoc", S.share); $("#grpBtn").classList.toggle("on", S.share);
    if (S.share) { if (!S.me || S.me.src !== "gps") toast("GPS yeri tapılan kimi paylaşılacaq"); await pushLoc(true); toast("📍 Yerin qrupla paylaşılır"); }
    else { try { await api("kv.set", { key: "loc:" + ME, value: null }); } catch (e) {} toast("Paylaşma dayandı"); }
    groupSheet(); };
  $$("[data-fr]").forEach(li => li.onclick = () => { const f = S.friends[li.dataset.fr]; if (f) routeTo({ id: "fr", name: li.dataset.fr, lat: f.lat, lng: f.lng, cat: "tarix", d: "" }); });
}
function renderLoc() {
  const c = $("#locChip"), t = $("#locTxt");
  c.classList.toggle("on", S.gps === "on");
  if (S.me) t.textContent = (S.me.src === "plan" ? "🗓 " : "") + S.me.label;
  else t.textContent = { wait: "Yer axtarılır…", denied: "GPS bağlıdır", away: "Vyanada deyilsən", off: "GPS yoxdur" }[S.gps] || "Yer";
}
function planGuess() {
  const now = vNow(); const day = PLAN.find(d => d.d === now.date); if (!day) return null;
  let last = null; for (const it of day.items) if (toMin(it[0]) <= now.mins && it[3]) last = it;
  return last ? byId[last[3]] : null;
}
let gpsWatch = null, gpsCentered = false, roughWarned = false;
function onFix(p) {
  const c = p.coords, acc = c.accuracy || 0;
  // ignore a much worse fix right after a good one (iOS sometimes mixes in cell-tower positions)
  if (S.me && S.me.src === "gps" && S.me.acc && acc > Math.max(150, S.me.acc * 4) && Date.now() - S.me.ts < 45000) return;
  if (!setMe(c.latitude, c.longitude, "gps", acc)) return;
  try { progFromGps(c.latitude, c.longitude); } catch (e) {}
  if (!gpsCentered && map && !S.dest && $("#v-map").classList.contains("on")) { gpsCentered = true; mapGo(c.latitude, c.longitude, Math.max(map.getZoom(), 15.5)); }
  if (acc > 600 && !roughWarned) { roughWarned = true; setTimeout(() => { if (S.me && S.me.acc > 600) toast("📍 Yer təxminidir (±" + Math.round(S.me.acc) + " m). iPhone: Ayarlar → Məxfilik → Məkan xidmətləri → Safari veb-saytları → “Dəqiq məkan” aç", 7000); }, 20000); }
}
function onGpsErr(e) {
  if (e.code === 1) S.gps = "denied"; else if (S.gps !== "on") S.gps = "off";
  if (!S.me) { const g = planGuess(); if (g) setMe(g.lat, g.lng, "plan"); }
  renderLoc();
}
function startGPS() {
  if (!navigator.geolocation) { S.gps = "off"; renderLoc(); return; }
  try {
    if (gpsWatch != null) navigator.geolocation.clearWatch(gpsWatch);
    gpsWatch = navigator.geolocation.watchPosition(onFix, onGpsErr, { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 });
  } catch (e) { S.gps = "off"; renderLoc(); }
}
// iPhone pauses GPS in the background: restart it every time the app comes back
let gpsRestart = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden || S.gps === "denied") return;
  const stale = !S.me || S.me.src !== "gps" || Date.now() - S.me.ts > 60000;
  if (stale && Date.now() - gpsRestart > 30000) { gpsRestart = Date.now(); startGPS(); }
});
$("#locChip").onclick = () => {
  if (S.gps === "denied") return alertBox("📍 GPS icazəsi bağlıdır", "iPhone: <b>Ayarlar → Məxfilik → Məkan xidmətləri → Safari veb-saytları → “İstifadə zamanı”</b>. Sonra səhifəni yenilə.");
  if (S.gps !== "on") startGPS();
  goView("map"); if (S.me && map) mapGo(S.me.lat, S.me.lng, 16);
};
function alertBox(title, html) { $("#bigBox").innerHTML = `<h3 style="font-size:20px">${title}</h3><p class="mute" style="text-align:left">${html}</p><button class="btn pri wide" id="bbX">Oldu</button>`; $("#bigModal").classList.add("on"); $("#bbX").onclick = () => $("#bigModal").classList.remove("on"); }

/* ---------- API ---------- */
const RETRY_OPS = /^(ai|price\.extract|price\.search|tts|gt)$/;
const transient = e => e && /^(network|timeout|upstream|rate_limited|http_50[0-9]|http_429|unknown)$/.test(e.code || "unknown");
async function api(op, data) {
  try { return await api1(op, data); }
  catch (e) {
    if (!RETRY_OPS.test(op) || !transient(e)) throw e;
    if (op === "price.search") { const got = await priceRecover(data); if (got) return got; } // the answer may have been saved even if it got lost on the way
    toast("⏳ Bir az da gözləyin…");
    await new Promise(r => setTimeout(r, e.code === "rate_limited" || e.code === "http_429" ? 3000 : 1500));
    try { return await api1(op, data); }
    catch (e2) { if (op === "price.search") { const got = await priceRecover(data); if (got) return got; } throw e2; }
  }
}
// a price check whose answer was lost on the way: the server has still saved it — fetch it from there
async function priceRecover(data) {
  try {
    const p = (data && data.product) || {}, since = Date.now() - 5 * 60000, n = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const j = await api1("prices", {});
    const hit = (j.prices || []).find(x => x.ts >= since && n(x.brand) === n(p.brand) && n(x.code) === n(p.code) && x.result);
    return hit ? { result: hit.result, cached: true, recovered: true } : null;
  } catch (e) { return null; }
}
async function api1(op, data) {
  const ctl = new AbortController(), slow = /^price\./.test(op), tm = setTimeout(() => ctl.abort(), slow ? 90000 : 20000);
  let r;
  try { r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ k: S.code, u: S.u, as: ADMIN ? ME : undefined, op }, data || {})), signal: ctl.signal }); }
  catch (e) { throw { code: e && e.name === "AbortError" ? "timeout" : "network" }; }
  let j = null; try { j = await r.json(); } catch (e) { if (e && e.name === "AbortError") { clearTimeout(tm); throw { code: "timeout" }; } }
  clearTimeout(tm);
  if (!r.ok) throw { code: (j && j.error) || "http_" + r.status };
  return j;
}
// streaming AI text
async function ai(o) {
  try { return await ai1(o); }
  catch (e) { if (!transient(e) || o.__retried) throw e; o.__retried = true; toast("⏳ Bir az da gözləyin…"); await new Promise(r => setTimeout(r, e.code === "rate_limited" ? 3000 : 1500)); return await ai1(o); }
}
async function ai1(o) {
  const body = { k: S.code, u: S.u, as: ADMIN ? ME : undefined, op: "ai", mode: o.mode || "", who: ME || "", tier: o.tier || "fast", system: o.system, messages: o.messages || [{ role: "user", content: o.prompt }], image: o.image, max_tokens: o.max_tokens, search: !!o.search, max_searches: o.max_searches };
  let r;
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 60000);
  try { r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal }); }
  catch (e) { clearTimeout(tm); throw { code: e && e.name === "AbortError" ? "timeout" : "network" }; }
  clearTimeout(tm);
  if (!r.ok) { let j = null; try { j = await r.json(); } catch (e) {} throw { code: (j && j.error) || "http_" + r.status }; }
  if (o.search) return await r.json();
  if (!r.body || !r.body.getReader) { const t = await r.text(); o.onText && o.onText(t); return t; }
  const rd = r.body.getReader(), dec = new TextDecoder(); let t = "";
  while (true) { const { value, done } = await rd.read(); if (done) break; t += dec.decode(value, { stream: true }); o.onText && o.onText(t); }
  return t;
}
function aiErr(e) {
  const c = e && e.code;
  return ({ no_key: "Süni intellekt hələ qoşulmayıb (API açarı əlavə olunmayıb).", bad_key: "API açarı səhvdir.", no_credit: "API balansı bitib. Kənana xəbər ver.", rate_limited: "Çox sorğu getdi, bir az sonra yenidən cəhd et.", network: "İnternet yoxdur. Bağlantını yoxla.", timeout: "Cavab çox gecikdi. Bir az sonra yenidən cəhd et.", forbidden: "Giriş kodu səhvdir." })[c] || "Xəta baş verdi, yenidən cəhd et.";
}
const CTX = () => {
  const n = vNow(); const day = PLAN.find(d => d.d === n.date);
  const al = todaysAlerts().filter(a => a.level !== "info").map(a => a.title + ": " + a.detail).join(" | ");
  return `Kontekst: 3 azərbaycanlı xanım (Fidan, Sədaqət, Kəmalə) 17–20 noyabr 2026 Vyanadadır. İndi Vyanada ${n.date}, saat ${n.time}.` +
    (day ? ` Bu günün planı: ${day.items.map(i => i[0] + " " + i[1]).join("; ")}.` : "") + (al ? ` Xəbərdarlıqlar: ${al}.` : "") +
    ` Gediş: 17 noyabr Bakıdan 09:30 (Bakı vaxtı), Vyanaya 11:00 (Vyana vaxtı). Dönüş uçuşu 20 noyabr 12:00 (Vyana vaxtı), Terminal 1, Bakıya 19:05 (Bakı vaxtı). Hava limanına CAT qatarı yox, Wien Mitte-dən CAT avtobusu gedir. Donuz əti olan yeməkləri qeyd et. Sadə Azərbaycan dilində yaz, markdown istifadə etmə.`;
};
const todaysAlerts = () => { const d = vNow().date; return (S.live.alerts || []).filter(a => a.date === "all" || a.date === d); };

/* ---------- sync shared data ---------- */
let syncing = false;
async function sync() {
  if (syncing || !S.code) return; syncing = true;
  try {
    const j = await api("sync", { who: ME || "" });
    S.online = true; S.ai = j.ai !== false; LS.set("aiOn", S.ai); applyWho(j, false);
    S.expenses = j.expenses || []; LS.set("expCache", S.expenses);
    if (j.kv && j.kv.live) { S.live = j.kv.live; LS.set("live", S.live); }
    if (j.kv && j.kv.prog) progMerge(j.kv.prog);
    if (Array.isArray(j.inbox)) { S.inbox = j.inbox; LS.set("inbox", j.inbox.slice(0, 60)); renderBell(); }
    if (j.kv && j.kv.hotel) { const hc = JSON.stringify(j.kv.hotel) !== JSON.stringify(S.hotel); S.hotel = j.kv.hotel; LS.set("hotel", S.hotel); if (hc) mapHotel(); }
    if (j.kv) { const pk = j.kv.pick || null; if (JSON.stringify(pk) !== JSON.stringify(S.pick || null)) { S.pick = pk; LS.set("pick", pk); mapPick(); } }
    S.friends = {}; Object.keys(j.kv || {}).forEach(k => { if (k.startsWith("loc:")) S.friends[k.slice(4)] = j.kv[k]; }); mapFriends(); renderFamily();
    await flushPending();
  } catch (e) { S.online = false; if (e.code === "forbidden" || e.code === "no_user") { syncing = false; return gate("Bu link işləmir. Kənanın göndərdiyi şəxsi linki yenidən aç."); } }
  finally { syncing = false; }
  const sig = JSON.stringify([JSON.stringify(S.prog).length, S.prog.q, S.expenses.length, S.expenses[0] && S.expenses[0].id, S.expenses.reduce((a, e) => a + (+e.eur || 0) + (e.paid ? 1 : 0), 0), S.live && S.live.updated, S.pending.length, S.online]);
  if (sig === lastSyncSig) return; lastSyncSig = sig;
  renderSafe();
}
let lastSyncSig = "", renderLater = false;
const typing = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
function renderSafe() {
  if (typing()) { renderLater = true; return; }
  renderLater = false; renderExpData(); renderHomeSoon(); mapAlerts();
}
document.addEventListener("focusout", () => setTimeout(() => { if (renderLater && !typing()) renderSafe(); }, 300));
async function flushPending() {
  if (!S.pending.length) return;
  const left = [];
  for (const p of S.pending) { try { const j = await api("exp.add", { row: p }); S.expenses.unshift(j.row); } catch (e) { left.push(p); } }
  S.pending = left; LS.set("expPending", left);
}
setInterval(() => { if (!document.hidden) sync(); }, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });

/* ---------- gate + identity (personal link: ?k=<trip>&u=<person>) ---------- */
function parseLink(str) {
  let k = null, u = null;
  try { const x = new URL(str, location.href); k = x.searchParams.get("k"); u = x.searchParams.get("u"); } catch (e) {}
  const h = String(str || ""); k = k || (h.match(/[?&#]k=([a-z0-9]+)/i) || [])[1] || null; u = u || (h.match(/[?&#]u=([a-z0-9]+)/i) || [])[1] || null;
  return { k, u };
}
function readCode() {
  const { k, u } = parseLink(location.href);
  if (k) LS.set("code", k);
  if (u) { if (u !== LS.get("u", null)) { LS.set("who", null); ME = null; LS.set("admin", false); ADMIN = false; } LS.set("u", u); }
  S.u = LS.get("u", null);
  return LS.get("code", null);
}
function gate(msg) { $("#gate").hidden = false; $("#gateMsg").textContent = msg || ""; }
$("#gateF").onsubmit = async e => {
  e.preventDefault(); const v = $("#gateIn").value.trim(); if (!v) return;
  const { k, u } = parseLink(v); if (!k || !u) { $("#gateMsg").textContent = "Linkin tamamını yapışdır (…?k=…&u=…)."; return; }
  if (u !== LS.get("u", null)) { LS.set("who", null); ME = null; }
  S.code = k; S.u = u; $("#gateMsg").textContent = "Yoxlanılır…";
  try { const j = await api("ping"); LS.set("code", k); LS.set("u", u); $("#gate").hidden = true; applyWho(j, true); boot2(); }
  catch (err) { $("#gateMsg").textContent = err.code === "forbidden" || err.code === "no_user" ? "Link səhvdir." : aiErr(err); }
};
function applyWho(j, fresh) {
  if (!j) return;
  ADMIN = !!j.admin; LS.set("admin", ADMIN);
  if (!ADMIN && j.who && j.who !== ME) { ME = j.who; LS.set("who", ME); expUI.payer = ME; if (expBuilt) renderExp(true); renderHome(); }
  if (ADMIN && !ME && !$("#whoModal").classList.contains("on")) askWho();
  renderWho();
}
function renderWho() {
  const b = $("#whoBtn"); if (!b) return;
  b.hidden = !ADMIN; b.textContent = ADMIN ? `🧪 Test: ${ME || "seç"} · dəyiş` : "";
}

/* ---------- who am I (only the test link can switch) ---------- */
function askWho() {
  if (!ADMIN) return;
  $("#whoBtns").innerHTML = PEOPLE.map(p => `<button data-who="${p}">🙋‍♀️ ${p}</button>`).join("");
  $("#whoModal").classList.add("on");
  $$("[data-who]").forEach(b => b.onclick = () => { ME = b.dataset.who; LS.set("who", ME); $("#whoModal").classList.remove("on"); expUI.payer = ME; renderWho(); renderHome(); if (expBuilt) renderExp(true); sync(); });
}
$("#whoBtn").onclick = askWho;

/* ---------- converter ---------- */
let convCur = LS.get("convCur", "EUR");
function renderConv() {
  const v = toNum($("#convIn").value), r = R();
  $("#convCur").textContent = convCur === "EUR" ? "€" : "₼";
  $("#convOut").innerHTML = convCur === "EUR"
    ? `<b>${fm(v * r.azn)} ₼</b><span>${fm(v * r.try, 0)} ₺ · 1 € = ${fm(r.azn)} ₼</span>`
    : `<b>${fm(v / r.azn)} €</b><span>${fm(v / r.azn * r.try, 0)} ₺ · 1 ₼ = ${fm(1 / r.azn)} €</span>`;
}
$("#convIn").addEventListener("input", renderConv);
$$("#convQuick [data-q]").forEach(b => b.onclick = () => { $("#convIn").value = b.dataset.q; renderConv(); });
$("#convCur").onclick = () => { convCur = convCur === "EUR" ? "AZN" : "EUR"; LS.set("convCur", convCur); renderConv(); };

/* ---------- home ---------- */
/* ---------- live progress: the plan follows reality (GPS first, one tap as fallback, shared by all three) ---------- */
const VIE = { lat: 48.1103, lng: 16.5697, name: "Vyana hava limanı (VIE) Terminal 1" };
const FIXED_DAY = "2026-11-20"; // flight day: times never move
S.prog = LS.get("prog", null) || { a: {}, skip: {}, dis: {}, q: 0 };
const iKey = it => it[0] + "|" + it[1];
const fmtHM = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const vMinOf = ts => { const d = new Date(ts), o = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).forEach(p => o[p.type] = p.value); return (+o.hour % 24) * 60 + +o.minute; };
function progMerge(srv) {
  if (!srv || typeof srv !== "object") return;
  const P = S.prog;
  Object.keys(srv.a || {}).forEach(d => { const have = new Set((P.a[d] || []).map(x => x.k + "@" + x.t)); P.a[d] = (P.a[d] || []).concat((srv.a[d] || []).filter(x => !have.has(x.k + "@" + x.t))).sort((x, y) => x.t - y.t).slice(-30); });
  Object.keys(srv.skip || {}).forEach(d => { P.skip[d] = [...new Set((P.skip[d] || []).concat(srv.skip[d] || []))]; });
  Object.keys(srv.unskip || {}).forEach(d => { const u = new Set(srv.unskip[d] || []); P.unskip = P.unskip || {}; P.unskip[d] = [...new Set((P.unskip[d] || []).concat(srv.unskip[d] || []))]; P.skip[d] = (P.skip[d] || []).filter(k => !u.has(k)); });
  Object.keys(srv.dis || {}).forEach(d => { P.dis[d] = Math.max(P.dis[d] || 0, srv.dis[d] || 0); });
  P.q = Math.max(P.q || 0, srv.q || 0);
  LS.set("prog", P);
}
let progT = null;
function progSave() {
  LS.set("prog", S.prog);
  clearTimeout(progT); progT = setTimeout(() => api("kv.set", { key: "prog", value: S.prog }).catch(() => {}), 800);
}
function anchor(date, k, plannedMin, ts) {
  const L = S.prog.a[date] = S.prog.a[date] || [];
  if (k !== "still" && k !== "reset" && L.some(x => x.k === k)) return false;
  L.push({ k, p: plannedMin, t: ts || Date.now() }); progSave(); return true;
}
const hasA = (date, k) => (S.prog.a[date] || []).some(x => x.k === k);
function dayShift(date) {
  if (date === FIXED_DAY) return 0;
  const L = S.prog.a[date] || []; if (!L.length) return 0;
  const last = L.reduce((a, b) => (b.t > a.t ? b : a));
  if (last.k === "reset") return 0;
  let s = Math.round((vMinOf(last.t) - last.p) / 5) * 5;
  s = Math.max(-60, Math.min(240, s));
  return Math.abs(s) < 10 ? 0 : s;
}
function lastAnchorP(date) { const L = S.prog.a[date] || []; return L.length ? L.reduce((a, b) => (b.t > a.t ? b : a)).p : -1; }
// the plan of a day as it stands now: adjusted time, done, skipped
function effPlan(date) {
  const day = PLAN.find(d => d.d === date); if (!day) return [];
  const sh = dayShift(date), ap = lastAnchorP(date), skip = new Set(S.prog.skip[date] || []);
  const visited = new Set((S.prog.a[date] || []).filter(x => x.k.startsWith("v:")).map(x => x.k.slice(2)));
  return day.items.map(it => {
    const o = toMin(it[0]), fixed = it[4] === 1 || date === FIXED_DAY, moved = !fixed && sh && o > ap;
    return { it, o, m: moved ? o + sh : o, moved, fixed, skip: skip.has(iKey(it)), done: !!(it[3] && visited.has(it[3])) };
  });
}
function nextEff(date, mins) {
  const L = effPlan(date).filter(x => !x.skip && !x.done);
  return L.find(x => x.m >= mins - 10) || null;
}
// automatic detection from GPS (no questions)
let nearStop = null, progLast = 0, wasAtHotel = LS.get("wasAtHotel", "");
function progFromGps(lat, lng) {
  if (Date.now() - progLast < 30000) return; progLast = Date.now();
  const now = vNow(), d = now.date, me = { lat, lng };
  if (!PLAN.some(x => x.d === d)) return;
  const nearHotel = S.hotel && dist(me, S.hotel) < 150;
  if (d === "2026-11-17") {
    if (!hasA(d, "land") && now.mins >= 615 && dist(me, VIE) < 2500) anchor(d, "land", 660);
    if (!hasA(d, "hotel") && nearHotel) { if (!hasA(d, "land")) anchor(d, "land", 660, Date.now() - 1); anchor(d, "hotel", 780); }
  }
  if (nearHotel) { wasAtHotel = d; LS.set("wasAtHotel", d); }
  const out = { "2026-11-18": 525, "2026-11-19": 540 }[d];
  if (out && !hasA(d, "out") && wasAtHotel === d && !nearHotel && now.mins >= 420 && now.mins <= 720 && S.hotel && dist(me, S.hotel) > 300) anchor(d, "out", out);
  // a plan stop counts as "visited" only after staying near it for 5+ minutes (walking past does not count)
  const cand = effPlan(d).find(x => { const id = x.it[3]; return id && id !== "hotel" && !/^u-/.test(id) && byId[id] && !x.done && !x.skip && Math.abs(x.o - now.mins) < 180 && dist(me, byId[id]) < 90; });
  if (!cand) { nearStop = null; return; }
  if (!nearStop || nearStop.id !== cand.it[3]) { nearStop = { id: cand.it[3], since: Date.now() }; return; }
  if (Date.now() - nearStop.since >= 5 * 60000) anchor(d, "v:" + cand.it[3], cand.o, nearStop.since);
}
// one-tap question when there is no GPS
function progQuestion(now) {
  if (S.gps === "on" || Date.now() - (S.prog.q || 0) < 45 * 60000) return "";
  const d = now.date, m = now.mins;
  let ask = "";
  if (d === "2026-11-17" && m >= 645 && m <= 900 && !hasA(d, "hotel")) ask = hasA(d, "land") ? "🏨 Otelə çatdınız?" : "✈️ Vyanaya endiniz? Hazırda haradasınız?";
  else if ((d === "2026-11-18" || d === "2026-11-19") && m >= 510 && m <= 660 && !hasA(d, "out")) ask = "🚪 Hazırda haradasınız?";
  else if (d === FIXED_DAY && m >= 510 && m <= 630 && !hasA(d, "airport")) ask = "🛫 Hazırda haradasınız?";
  if (!ask) return "";
  return `<div class="qcard"><b>${ask}</b><span class="s2">Bir toxunuş kifayətdir — plan özü yenilənəcək.</span><div class="qbtns">
    <button data-q="air">✈️ Hava limanı</button><button data-q="road">🚗 Yoldayıq</button><button data-q="hotel">🏨 Oteldə</button><button data-q="city">📍 Şəhərdə</button></div></div>`;
}
function progAnswer(a) {
  const now = vNow(), d = now.date;
  S.prog.q = Date.now();
  if (d === "2026-11-17") {
    if (a === "air" && !hasA(d, "land")) anchor(d, "land", 660);
    if (a === "road" && !hasA(d, "land")) anchor(d, "land", 660, Date.now() - 20 * 60000);
    if (a === "hotel") { if (!hasA(d, "land")) anchor(d, "land", 660, Date.now() - 50 * 60000); anchor(d, "hotel", 780); }
  } else if (d === FIXED_DAY) {
    if (a === "air") anchor(d, "airport", 600);
    if (a === "hotel") { S.lateHotel = Date.now(); }
  } else {
    const out = { "2026-11-18": 525, "2026-11-19": 540 }[d];
    if (out) { if (a === "road" || a === "city") anchor(d, "out", out); else if (a === "hotel" && now.mins > out) anchor(d, "still", out); }
  }
  progSave(); renderHome(); if ($("#v-plan").classList.contains("on")) renderPlan(); toast("✓ Qeyd olundu — plan yeniləndi");
}
// cards on top of the home screen: shift info, late warning, "you won't make it" suggestion
function progCards(now) {
  const d = now.date; if (!PLAN.some(x => x.d === d)) return "";
  let h = progQuestion(now);
  const sh = dayShift(d);
  if (sh) h += `<div class="shbar">⏱ Plan real vaxta görə <b>${sh > 0 ? "+" : ""}${sh} dəq</b> sürüşdü <button class="lnk" id="shReset">Geri qaytar</button></div>`;
  if (d === FIXED_DAY && now.mins >= 520 && now.mins <= 660 && !hasA(d, "airport") && ((S.me && S.hotel && S.me.src === "gps" && dist(S.me, S.hotel) < 200) || (S.lateHotel && Date.now() - S.lateHotel < 30 * 60000)))
    h += `<div class="alert"><span>🚕</span><div><b>Hava limanına getmək vaxtıdır!</b><span class="mute">Uçuş 12:00. Ən sürətlisi taksi ilə birbaşa hava limanına (~25–30 dəq, ~40–50 €).</span><div class="row mt"><a class="btn s pri" href="${uberLink(VIE)}" target="_blank" rel="noopener">🚕 Uber → Hava limanı</a><a class="btn s" href="tel:+43140100">📞 Taxi 40100</a></div></div></div>`;
  if (sh > 45 && (S.prog.dis[d] || 0) < sh) {
    const late = effPlan(d).filter(x => !x.skip && !x.done && !x.fixed && x.moved && x.m > 22 * 60 && x.it[3] && x.it[3] !== "hotel" && !/^u-/.test(x.it[3]));
    if (late.length) h += `<div class="qcard"><b>Bu gün hamısına çatmayacaqsınız</b><span class="s2">Plan ${sh} dəq gecikir. Bunları buraxaq? ${late.map(x => esc(short(byId[x.it[3]] ? byId[x.it[3]].name : x.it[1]))).join(", ")}</span>
      <div class="qbtns"><button data-skipall="${late.map(x => encodeURIComponent(iKey(x.it))).join(",")}">✓ Bəli, burax</button><button data-keep="1">Xeyr, qalsın</button></div></div>`;
  }
  return h;
}
function bindProgCards(box) {
  box.querySelectorAll("[data-q]").forEach(b => b.onclick = () => progAnswer(b.dataset.q));
  const r = box.querySelector("#shReset"); if (r) r.onclick = () => { anchor(vNow().date, "reset", vNow().mins); renderHome(); toast("Plan əvvəlki saatlara qaytarıldı"); };
  box.querySelectorAll("[data-skipall]").forEach(b => b.onclick = () => { const d = vNow().date; S.prog.skip[d] = [...new Set((S.prog.skip[d] || []).concat(b.dataset.skipall.split(",").map(decodeURIComponent)))]; progSave(); renderHome(); toast("Buraxıldı — Plan bölməsindən qaytara bilərsən"); });
  box.querySelectorAll("[data-keep]").forEach(b => b.onclick = () => { const d = vNow().date; S.prog.dis[d] = dayShift(d); progSave(); renderHome(); });
}
function toggleSkip(date, key) {
  const L = S.prog.skip[date] = S.prog.skip[date] || [];
  const i = L.indexOf(key);
  if (i >= 0) { L.splice(i, 1); S.prog.unskip = S.prog.unskip || {}; (S.prog.unskip[date] = S.prog.unskip[date] || []).push(key); }
  else { L.push(key); if (S.prog.unskip && S.prog.unskip[date]) S.prog.unskip[date] = S.prog.unskip[date].filter(k => k !== key); }
  progSave();
}
// three ways to the next stop, from where you are now
function waysTo(p) {
  const from = S.me && S.me.src === "gps" ? S.me : null;
  const d = from ? dist(from, p) : 0;
  const t = from ? { taxi: Math.round(d * 1.4 / 400) + 4, tr: Math.round(d * 1.3 / 330) + 8, walk: walkMin(d) } : null;
  return `<div class="ways"><a href="${uberLink(p)}" target="_blank" rel="noopener">🚕<b>Taksi</b>${t ? `<span>~${t.taxi} dəq</span>` : ""}</a>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=transit" target="_blank" rel="noopener">🚇<b>Metro</b>${t ? `<span>~${t.tr} dəq</span>` : ""}</a>
    <a href="#" data-walk="${p.id}">🚶<b>Piyada</b>${t ? `<span>~${t.walk} dəq</span>` : ""}</a></div>`;
}

/* ---------- calm rendering: never swap content under a finger or during a scroll, and only when it really changed ---------- */
let touchOn = false, quietAt = 0;
addEventListener("touchstart", () => { touchOn = true; }, { passive: true, capture: true });
addEventListener("touchend", () => { touchOn = false; quietAt = Date.now() + 700; }, { passive: true, capture: true });
addEventListener("touchcancel", () => { touchOn = false; quietAt = Date.now() + 700; }, { passive: true, capture: true });
addEventListener("scroll", () => { quietAt = Date.now() + 500; }, { passive: true, capture: true });
const userBusy = () => touchOn || Date.now() < quietAt;
function setHTML(el, html) { if (typeof el === "string") el = $(el); if (el && el.__h !== html) { el.innerHTML = html; el.__h = html; } }
let homeQueued = false;
function renderHomeSoon() { // background updates (sync, GPS, timers) go through here
  if (homeQueued) return; homeQueued = true;
  const go = () => { if (userBusy() || typing()) return setTimeout(go, 300); homeQueued = false; renderHome(); };
  setTimeout(go, 0);
}
function renderHome() {
  $("#hello").textContent = (ME ? `Salam, ${ME} 👋` : "Salam 👋") + (ADMIN ? " · 🧪 test" : "");
  renderWho();
  const now = vNow();
  // alerts: only warnings + departure
  let a = "";
  todaysAlerts().filter(x => x.level !== "info").forEach(x => a += `<div class="alert"><span>⚠️</span><div><b>${esc(x.title)}</b><span class="mute">${esc(x.detail)}</span></div></div>`);
  if (now.date === "2026-11-20") {
    const left = toMin("08:40") - now.mins;
    if (left > -150) a = `<div class="alert"><span>✈️</span><div><b>${left > 0 ? `Otelden çıxmağa ${Math.floor(left / 60)} saat ${left % 60} dəq qalıb` : "İndi hava limanına yola düş!"}</b><span class="mute">Uçuş 12:00, Terminal 1. Wien Mitte → CAT avtobusu. 10:00-da hava limanında ol.${expAll().some(e => e.tf) ? ` 🧾 ${expAll().filter(e => e.tf).length} tax-free çekin var — əvvəl gömrükdə möhürlət (+20 dəq).` : ""}</span></div></div>` + a;
  }
  let alertsHTML = (typeof upcomingAlert === "function" ? upcomingAlert() : "") + a;
  // next plan item
  const day = PLAN.find(d => d.d === now.date);
  let nx = "";
  if (day) {
    const nxe = nextEff(now.date, now.mins), next = nxe && nxe.it, np = next && next[3] && next[3] !== "hotel" ? byId[next[3]] : (next && next[3] === "hotel" ? Object.assign({ id: "hotel" }, S.hotel) : null);
    nx = progCards(now) + (next ? `<div class="sm dim">Sıradakı · ${day.t}</div><div class="next" style="margin-top:6px"><span class="t">${nxe.moved ? "~" : ""}${fmtHM(nxe.m)}</span><div class="grow"><b>${esc(next[1])}</b><span class="s2">${esc(next[2])}</span></div>${!nxe.fixed ? `<button class="btn s" data-skipnext="${encodeURIComponent(iKey(next))}" title="Keç">Keç</button>` : ""}</div>${np && np.lat ? waysTo(np) : ""}`
      : `<div class="sm dim">${day.t}</div><b>Bugünkü plan bitdi 🌙</b>`);
  } else {
    const left = Math.max(0, Math.round((Date.parse("2026-11-17T09:30:00+04:00") - Date.now()) / 60000)), dd = Math.floor(left / 1440), hh = Math.floor(left % 1440 / 60);
    const pk = packDone();
    nx = now.date < "2026-11-17" ? `<div class="sm dim">Uçuşa qalıb</div><div class="cd"><b>${dd}</b><span>gün</span><b>${hh}</b><span>saat</span></div><b>17 noyabr: Bakıdan 09:30 ✈️ → Vyana 11:00</b><span class="s2">Bakı hava limanında ən gec 07:00-da olun · Dönüş: 20 noyabr, Vyana 12:00 (Terminal 1) → Bakı 19:05</span>
      <button class="btn wide mt" id="packGo">🧳 Hazırlıq siyahısı · ${pk.n}/${pk.t} ✓</button>` : `<b>Xoş səfər idi! 💛</b>`;
  }
  setHTML("#nextCard", nx);
  if ($("#packGo")) $("#packGo").onclick = () => { moreTab = "pack"; goView("plan"); };
  $$("#nextCard [data-route]").forEach(b => b.onclick = () => { goView("map"); routeTo(byId[b.dataset.route]); });
  bindProgCards($("#nextCard"));
  $$("#nextCard [data-skipnext]").forEach(b => b.onclick = () => { toggleSkip(now.date, decodeURIComponent(b.dataset.skipnext)); renderHome(); toast("Keçildi — Plan bölməsindən qaytara bilərsən"); });
  $$("#nextCard [data-walk]").forEach(a => a.onclick = e => { e.preventDefault(); const id = a.dataset.walk; goView("map"); routeTo(id === "hotel" ? Object.assign({ id: "hotel", name: S.hotel.name, cat: "tarix", d: "Otelimiz" }, S.hotel) : byId[id]); });
  // weather + rates
  const wx = S.live.weather || [];
  setHTML("#wxCard", `<div class="sm dim" style="margin-bottom:6px">Hava · məzənnə</div>` + (wx.length ? `<div class="wx">${wx.map(w => `<div>${esc(w.day)}<b>${esc(w.t)}</b>${esc(w.s || "")}</div>`).join("")}</div>` : "") +
    (S.live.weatherNote ? `<div class="note">🌦 ${esc(S.live.weatherNote)}</div>` : "") + `<div class="note">💱 1 € = ${fm(R().azn)} ₼ · ${fm(R().try)} ₺${S.live.updated ? ` · yeniləndi ${esc(S.live.updated)}` : ""}</div>`);
  renderConv(); renderInstall(); renderPushTip(); renderFamily();
  const tdy = expAll().filter(e => vDate(e.ts) === now.date), mine = ME ? tdy.reduce((a, e) => a + myShare(e), 0) : 0;
  const tripDay = now.date >= "2026-11-17" && now.date <= "2026-11-20";
  const wxToday = (S.live.weather || [])[0], rainy = wxToday && /yağış|qar|leysan/i.test(wxToday.s || "");
  if (rainy && tripDay) alertsHTML += (`<div class="alert" style="background:#EEF2FF"><span>🌧</span><div><b>Bu gün ${esc(wxToday.s)} — qapalı yerlərə üstünlük ver</b><span class="mute">Ticarət mərkəzləri, muzeylər. <a href="#" id="rainShop">🛍 Alış-veriş bələdçisi ›</a></span></div></div>`);
  setHTML("#alertsBar", alertsHTML);
  if ($("#rainShop")) $("#rainShop").onclick = e => { e.preventDefault(); shopGuide(); };
  setHTML("#daySum", tripDay && now.mins >= 18 * 60 ? summaryHTML(now.date, "🌙 Bu günün xülasəsi") : (tripDay && now.mins < 12 * 60) || /[?&]brief=1/.test(location.search) ? briefHTML(now.date) : "");
  $$("#daySum [data-share]").forEach(b => b.onclick = () => shareSummary(b.dataset.share));
  setHTML("#todaySpend", tdy.length && ME ? `<button class="lnk" data-go2="exp">💶 Bu gün xərcin: <b>${fm(mine)} €</b> (≈ ${fm(mine * R().azn)} ₼) ›</button>` : "");
  $$("[data-go2]").forEach(b => b.onclick = () => goView(b.dataset.go2));
}
/* ---------- usage stats (who · which section · when — no content) for the end-of-trip report ---------- */
const USEQ = LS.get("useq", []);
function useTrack(e) { if (ADMIN || !ME) return; USEQ.push({ e, t: Date.now() }); if (USEQ.length > 200) USEQ.splice(0, USEQ.length - 200); LS.set("useq", USEQ); }
async function useFlush() {
  if (ADMIN || !ME || !USEQ.length || !navigator.onLine) return;
  const batch = USEQ.slice(0, 60);
  try { await api("use", { ev: batch }); USEQ.splice(0, batch.length); LS.set("useq", USEQ); } catch (e) { /* retry later */ }
}
setInterval(() => { if (!document.hidden) { useTrack("beat"); useFlush(); } }, 5 * 60000);
document.addEventListener("visibilitychange", () => { if (document.hidden) useFlush(); else useTrack("open"); });
/* ---------- deep links from notifications: ?go=map|tr|exp|plan|alb|mem|cam|price|menu|reco ---------- */
function handleGo(go) {
  if (!go) return;
  useTrack("go:" + go);
  const pulse = sel => { goView("home"); const el = $(sel) && $(sel).closest(".tile, button"); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("hl"); setTimeout(() => el.classList.remove("hl"), 4000); } };
  if (["map", "tr", "exp", "plan"].includes(go)) goView(go);
  else if (go === "alb") { goView("plan"); const t = $('#moreTabs button[data-t="alb"]'); if (t) t.click(); }
  else if (go === "mem") { goView("home"); const t = $('[data-act="book"]'); if (t) t.click(); }
  else if (go === "cam") pulse("#camIn"); else if (go === "price") pulse("#priceIn"); else if (go === "menu") pulse("#menuIn");
  else if (go === "reco") pulse("#recoBtn");
  else if (go === "pick") { goView("map"); const t0 = Date.now(), w = () => { if (map && mapReady) { if (pickList().length) { if (S.filter !== "steak") setFilter("steak"); else { drawPOI(); renderNear(); } } } else if (Date.now() - t0 < 8000) setTimeout(w, 300); }; setTimeout(w, 200); }
  else if (go === "tf") { goView("exp"); setTimeout(() => tfAsk(), 300); }
  else if (go === "tfback") { goView("exp"); setTimeout(() => tfBackDialog(false), 300); }
  else if (go === "inbox") openInbox();
  else if (go === "share") { goView("map"); setTimeout(groupSheet, 600); }
}
function goFromUrl() { const m = location.search.match(/[?&]go=([a-z]+)/); if (!m) return; history.replaceState(null, "", location.pathname + location.search.replace(/([?&])go=[a-z]+&?/, "$1").replace(/[?&]$/, "")); setTimeout(() => handleGo(m[1]), 400); }
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.go) handleGo(e.data.go); });
/* ---------- push health: every open re-checks the real subscription and re-registers it on the server ---------- */
S.push = "unknown";
let pushChecked = 0;
async function pushCheck(force) {
  if (!force && Date.now() - pushChecked < 10 * 60000) return; pushChecked = Date.now();
  const before = S.push;
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) S.push = /iPhone|iPad/.test(navigator.userAgent) && !isStandalone() ? "install" : "unsupported";
    else if (Notification.permission === "denied") S.push = "denied";
    else if (Notification.permission !== "granted") S.push = "off";
    else {
      const reg = await navigator.serviceWorker.ready; if (!VAPID) await bookingsLoad();
      let sub = await reg.pushManager.getSubscription();
      if (!sub && VAPID) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) }); // permission already given: quietly renew
      if (sub && (ME || ADMIN)) { await api("push.sub", { sub: sub.toJSON() }); S.push = "on"; } else S.push = "off";
    }
  } catch (e) { if (S.push === "unknown") S.push = "off"; }
  LS.set("pushOn", S.push === "on");
  if (S.push !== before) renderPushTip();
}
function renderPushTip() {
  const box = $("#pushTip"); if (!box) return;
  if ((!ME && !ADMIN) || S.push === "on" || S.push === "unknown" || S.push === "unsupported") { setHTML(box, ""); return; }
  const msg = S.push === "install" ? "Bildiriş üçün tətbiqi <b>ana ekrana əlavə et</b> və oradan aç." : S.push === "denied" ? "Bildirişlər bağlıdır: iPhone <b>Ayarlar → Bildirişlər → Wien Bələdçi</b> → “İcazə ver”." : "Səhər brifinqi və xatırlatmalar üçün bildirişləri aç.";
  setHTML(box, `<div class="card mt" style="display:flex;gap:12px;align-items:center;background:#FFF7E6"><span style="font-size:26px">🔔</span><div class="grow sm"><b>Bildirişlər gəlmir</b>${msg}</div>${S.push === "off" ? `<button class="btn pri s" id="pushGo">Aç</button>` : ""}</div>`);
  if ($("#pushGo")) $("#pushGo").onclick = async () => { await enablePush(); pushCheck(true); };
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) pushCheck(); });
const vDate = ts => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" }).format(new Date(ts));
function renderInstall() {
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  if (standalone || LS.get("instDone", false)) { setHTML("#installTip", ""); return; }
  setHTML("#installTip", `<div class="card mt" style="display:flex;gap:12px;align-items:center"><span style="font-size:26px">📲</span><div class="grow sm"><b>Ana ekrana əlavə et</b>Safari-də aşağıda <b>Paylaş ⬆︎</b> → <b>“Ana ekrana əlavə et”</b>.</div><button class="x" style="position:static" id="instX">×</button></div>`);
  $("#instX").onclick = () => { LS.set("instDone", true); renderInstall(); };
}
$$("[data-go]").forEach(b => b.onclick = () => goView(b.dataset.go));

/* ---------- POI display helpers ---------- */
const MIN_R = 4.2;
const okFood = p => p.cat !== "yemek" || (p.g || 0) >= MIN_R;
const LVLS = { 1: "$ ucuz · 3 nəfərə ~15–45 €", 2: "$$ orta · 3 nəfərə ~45–105 €", 3: "$$$ bahalı · 3 nəfərə ~105–180 €+" };
const dol = p => p && p.lvl ? "$".repeat(Math.min(3, p.lvl)) : "";
const rating = p => p.g ? `<span class="rt ${p.g < MIN_R ? "low" : ""}">★ ${String(p.g).replace(".", ",")} <span class="dim" style="font-weight:500">(${p.n >= 1000 ? Math.round(p.n / 1000) + "k" : p.n})</span></span>` : "";
function pills(p) { const o = openState(p); let s = ""; if (o) s += `<span class="pill ${o.open ? "open" : "closed"}">${o.txt}</span>`; if (p.halal) s += `<span class="pill halal">Halal</span>`; if (p.free) s += `<span class="pill">Pulsuz</span>`; if (p.lvl) s += `<span class="pill">${"€".repeat(p.lvl)}</span>`; return s; }
const price = p => (p.lvl ? LVLS[Math.min(3, p.lvl)] : "") || p.pr || (p.free ? "Pulsuz" : "");
const alertNear = p => todaysAlerts().find(a => a.lat && a.level !== "info" && dist(a, p) <= (a.r || 300));

/* ---------- recommendations ---------- */
let recoKind = "hamısı";
$("#recoBtn").onclick = () => reco(recoKind);
async function reco(kind) {
  recoKind = kind; const out = $("#recoOut");
  const chips = `<div class="hscroll mt">${[["hamısı", "✨ Hamısı"], ["yemək", "🍽 Yemək"], ["halal", "🥙 Halal"], ["kafe", "☕ Kafe"], ["tarix", "🏛 Görməli"], ["bazar", "🎄 Bazar"], ["pulsuz", "🆓 Pulsuz"]].map(([k, t]) => `<button class="chip ${k === kind ? "on" : ""}" data-rk="${k}">${t}</button>`).join("")}</div>`;
  const pt = S.me || planGuess() || byId.stephansdom;
  const f = { "yemək": p => p.cat === "yemek" && p.lvl >= 2, halal: p => p.halal || ["shakomaako", "neni", "papas"].includes(p.id), kafe: p => ["central", "landtmann", "demel", "kameel", "sacher"].includes(p.id), tarix: p => ["tarix", "kilse", "muzey"].includes(p.cat), bazar: p => p.cat === "bazar", pulsuz: p => !!p.free }[kind] || (p => p.cat !== "metro");
  const ok = p => f(p) && okFood(p) && !alertNear(p) && !((openState(p) || {}).closedToday);
  const cand = nearest(pt, 18, ok).filter(x => x.d > 80);
  const bind = () => { $$("[data-rk]").forEach(b => b.onclick = () => reco(b.dataset.rk)); $$("#recoOut [data-route]").forEach(b => b.onclick = () => { goView("map"); routeTo(byId[b.dataset.route]); }); $$("#recoOut [data-tell]").forEach(b => b.onclick = () => tellAbout(byId[b.dataset.tell])); };
  out.innerHTML = chips + `<div class="card mt"><span class="spin"></span> <span class="mute">Seçirəm…</span></div>`; bind();
  const score = x => { const g = x.p.g || 4.3, o = openState(x.p); return g * 2 - x.d / 600 + (o && o.open ? .6 : 0) + (STORIES[x.p.id] ? .3 : 0); };
  const why = x => { const o = openState(x.p), bits = []; if (x.p.g >= 4.6) bits.push(`çox yüksək reytinq ★${x.p.g}`); else if (x.p.g) bits.push(`★${x.p.g}`); if (o && o.open) bits.push(o.txt.toLowerCase()); bits.push(`${walkMin(x.d)} dəq piyada`); return (x.p.d || "").split(".")[0] + ". " + bits.join(" · "); };
  let items = cand.slice().sort((a, b) => score(b) - score(a)).slice(0, 4).map(x => ({ id: x.p.id, why: why(x) }));
  if (false) {
    try {
      const t = await ai({ mode: "reco", tier: "fast", max_tokens: 500, prompt: `${CTX()}\nOnlar indi “${S.me ? S.me.label : "mərkəz"}” yanındadır. İstək: ${kind}.\nNamizədlər (id: ad — piyada — Google reytinqi — qiymət — açıq/bağlı):\n${cand.map(x => { const o = openState(x.p); return `${x.p.id}: ${x.p.name} — ${fmtKm(walkM(x.d))} — ${x.p.g ? "★" + x.p.g : "-"} — ${price(x.p) || "-"} — ${o ? o.txt : "-"}`; }).join("\n")}\nVaxtı və planı nəzərə alıb ən yaxşı 4-ü seç (yaxın və açıq olanlar). Yalnız JSON: {"items":[{"id":"...","why":"1 qısa cümlə"}]}` });
      const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
      const it = (j.items || []).filter(i => byId[i.id] && ok(byId[i.id])).slice(0, 4); if (it.length) items = it;
    } catch (e) {}
  }
  out.innerHTML = chips + (items.length ? `<div class="card mt"><ul class="list">${items.map(i => { const p = byId[i.id], d = dist(pt, p); return `<li><span class="dot" style="background:${CAT[p.cat].c}"></span><div class="grow"><b>${esc(short(p.name))}</b><div>${rating(p)} ${pills(p)}</div><span class="s2">${esc(i.why)}</span>${price(p) ? `<span class="s2">💶 ${esc(price(p))}</span>` : ""}<div class="row" style="margin-top:8px"><button class="btn s pri" data-route="${p.id}">Get</button><button class="btn s" data-tell="${p.id}">Hekayə</button>${p.pid ? `<a class="btn s" href="${gPlace(p)}" target="_blank" rel="noopener">Google</a>` : ""}</div></div><span class="km">${walkMin(d)} dəq<br><span class="dim" style="font-weight:500">${fmtKm(walkM(d))}</span></span></li>`; }).join("")}</ul></div>` : `<div class="card mt mute">Yaxında uyğun yer tapmadım.</div>`);
  bind();
}

/* ---------- images ---------- */
function loadImg(file) { return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; }); }
async function shrink(file, max, q) {
  const img = await loadImg(file); const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); const url = c.toDataURL("image/jpeg", q || .8);
  return { url, b64: url.split(",")[1] };
}

/* ---------- result screen ---------- */
function showResult(html) { goView("home"); $("#homeMain").hidden = true; const r = $("#result"); r.hidden = false; r.innerHTML = `<button class="back" data-back>‹ Geri</button>` + html; $("#v-home").scrollTop = 0; bindBack(); }
function bindBack() { $$("[data-back]").forEach(b => b.onclick = closeResult); }
function closeResult() { stopSpeak(); $("#result").hidden = true; $("#homeMain").hidden = false; }
const AI_OFF_MSG = "Süni intellekt hələ qoşulmayıb — Kənan tezliklə qoşacaq. O vaxta qədər xəritə, tərcümə siyahısı, xərclər, konvertor, albom işləyir.";
["menuIn"].forEach(id => $("#" + id).addEventListener("click", e => { if (S.ai === false) { e.preventDefault(); alertBox("🤖 Tezliklə", AI_OFF_MSG); } }));
["camIn", "galIn"].forEach(id => $("#" + id).onchange = e => identify(e.target.files[0]));
$("#menuIn").onchange = e => menu(e.target.files[0]);
$("#priceIn").onchange = e => priceCheck(e.target.files[0]);
const clearInputs = () => $$("input[type=file]").forEach(i => i.value = "");

/* ---------- identify place ---------- */
let cur = null;
function parseStory(t) {
  const g = re => { const m = (t || "").match(re); return m ? m[1].trim() : ""; };
  const o = { id: g(/ID:\s*([^\n]*)/i), name: g(/AD:\s*([^\n]*)/i), conf: g(/ƏMİNLİK:\s*([^\n]*)/i) };
  const sep = t.indexOf("---"); const body = sep >= 0 ? t.slice(sep + 3) : "";
  const fi = body.search(/FAKTLAR:/i), ti = body.search(/MƏSLƏHƏT:/i);
  o.story = (fi >= 0 ? body.slice(0, fi) : ti >= 0 ? body.slice(0, ti) : body).trim();
  o.facts = fi >= 0 ? body.slice(fi + 8, ti >= 0 ? ti : undefined).split("\n").map(s => s.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean) : [];
  o.tip = ti >= 0 ? body.slice(ti + 9).trim() : "";
  return o;
}
async function identify(file) {
  if (!file) return; clearInputs();
  showResult(`<div class="card"><span class="spin"></span> <span class="mute">Şəkil hazırlanır…</span></div>`);
  let img, thumb; try { img = await shrink(file, 1024, .8); thumb = (await shrink(file, 320, .7)).url; } catch (e) { showResult(`<div class="card">Şəkli aça bilmədim.</div>`); return; }
  // 1) free: what's around me right now (GPS)?
  const near = S.me && S.me.src === "gps" ? nearest(S.me, 4, p => !["metro", "yemek"].includes(p.cat)).filter(x => x.d < 160) : [];
  if (near.length) {
    showResult(`<img class="photo" src="${img.url}" alt="" style="max-height:230px;object-fit:cover"><div class="ttl"><h2>Bu hansıdır?</h2></div>
     <div class="card"><div class="sm dim" style="margin-bottom:6px">📍 Yaxınlıqdakı yerlər</div><ul class="list">${near.map(x => `<li data-pick="${x.p.id}" style="cursor:pointer"><span class="dot" style="background:${CAT[x.p.cat].c}"></span><div class="grow"><b>${esc(short(x.p.name))}</b><span class="s2">${fmtKm(x.d)} · ${esc((x.p.d || "").split(".")[0])}</span></div><span class="btn s pri">Bu</span></li>`).join("")}</ul>
     <button class="btn wide mt" id="pickAi">${S.ai === false ? "Heç biri deyil" : "🔍 Heç biri — şəkildən tanı"}</button></div>`);
    $$("[data-pick]").forEach(li => li.onclick = () => { const p = byId[li.dataset.pick]; addStamp({ thumb, name: p.name, poi: p }); tellAbout(p, img.url); });
    $("#pickAi").onclick = () => S.ai === false ? alertBox("🤖 Tezliklə", AI_OFF_MSG) : identifyAI(img, thumb);
    return;
  }
  if (S.ai === false) { showResult(`<img class="photo" src="${img.url}" alt=""><div class="card mt">Yaxınlıqda tanınmış yer tapmadım (GPS). Xəritədən yeri seçib “🔊 Hekayə”yə bas.</div>`); return; }
  identifyAI(img, thumb);
}
async function identifyAI(img, thumb) {
  cur = { img: img.url, thumb, name: "", story: "", facts: [], tip: "", poi: null, history: [], loading: true };
  showResult(""); renderStory();
  const near = (S.me ? nearest(S.me, 30, p => p.cat !== "metro").map(x => x.p) : POI.filter(p => p.cat !== "metro"));
  try {
    let lastDraw = 0;
    const t = await ai({ mode: "identify", tier: "vision", image: img.b64, max_tokens: 900,
      prompt: `${CTX()}\n${S.me ? `Onların GPS yeri: ${S.me.lat.toFixed(5)}, ${S.me.lng.toFixed(5)} (${S.me.label} yaxınlığı).` : ""}\nŞəkildəki obyekti (bina, abidə, heykəl, meydan, küçə) tanı və bələdçi kimi danış.\nUyğun gəlirsə bu siyahıdan id seç:\n${near.map(p => p.id + ": " + p.name).join("\n")}\n\nDƏQİQ BU FORMATDA YAZ:\nID: <id və ya yox>\nAD: <ad (yerli adı)>\nƏMİNLİK: <yüksək|orta|aşağı>\n---\n<130–180 sözlük canlı hekayə: kim, nə vaxt tikib, maraqlı əhvalat, nəyə baxmalı. Dəqiq bilmədiyin rəqəmi yazma.>\nFAKTLAR:\n- <fakt>\n- <fakt>\n- <fakt>\nMƏSLƏHƏT: <1 cümlə>`,
      onText: txt => { const o = parseStory(txt); Object.assign(cur, { name: o.name || cur.name, story: o.story, poi: byId[o.id] || cur.poi }); if (Date.now() - lastDraw > 120) { lastDraw = Date.now(); renderStory(true); } } });
    const o = parseStory(t);
    const poi = byId[o.id] || null;
    if (poi && STORIES[poi.id]) { addStamp({ thumb, name: poi.name, poi }); return tellAbout(poi, img.url); } // known place → use free, verified story
    Object.assign(cur, { name: o.name || "Naməlum yer", story: o.story, facts: o.facts, tip: o.tip, conf: o.conf, poi, loading: false });
    if (cur.poi) LS.set("st." + cur.poi.id, { s: cur.story, f: cur.facts, t: cur.tip });
    addStamp(cur);
  } catch (e) { cur.loading = false; cur.err = aiErr(e); }
  renderStory();
}
async function tellAbout(p, imgUrl) {
  const st = STORIES[p.id], c = st ? { s: st.s, f: st.f, t: st.t } : LS.get("st." + p.id, null);
  cur = { img: imgUrl || null, thumb: null, name: p.name, poi: p, story: c ? c.s : p.d, facts: c ? c.f : [], tip: c ? c.t : "", history: [], loading: false, short: !c };
  showResult(""); renderStory();
}
async function moreStory(p) {
  cur.loading = true; renderStory();
  try {
    let lastDraw = 0;
    const t = await ai({ mode: "story", tier: "fast", max_tokens: 800, prompt: `${CTX()}\nOnlar “${p.name}” yanındadır (${p.d}).\nDƏQİQ BU FORMATDA YAZ:\n---\n<130–180 sözlük canlı bələdçi hekayəsi. Dəqiq bilmədiyin rəqəmi yazma.>\nFAKTLAR:\n- <fakt>\n- <fakt>\n- <fakt>\nMƏSLƏHƏT: <1 cümlə>`,
      onText: txt => { const o = parseStory(txt); if (o.story && cur.poi === p) { cur.story = o.story; if (Date.now() - lastDraw > 120) { lastDraw = Date.now(); renderStory(true); } } } });
    const o = parseStory(t); if (cur.poi === p) { Object.assign(cur, { story: o.story || p.d, facts: o.facts, tip: o.tip, short: false }); LS.set("st." + p.id, { s: cur.story, f: cur.facts, t: cur.tip }); }
  } catch (e) { if (cur.poi === p) cur.err = aiErr(e); }
  if (cur.poi === p) { cur.loading = false; renderStory(); }
}
function renderStory(fast) {
  const c = cur, p = c.poi;
  if (fast && $("#stBox")) { $("#stBox").textContent = c.story || "…"; if (c.name) $("#stTitle").textContent = c.name; return; }
  $("#result").innerHTML = `<button class="back" data-back>‹ Geri</button>${c.img ? `<img class="photo" src="${c.img}" alt="">` : ""}
  <div class="ttl"><div class="grow"><h2 id="stTitle">${esc(c.name || "Tanıyıram…")}</h2>${p ? `<div>${rating(p)} ${pills(p)}</div>${price(p) ? `<div class="sm mute" style="margin-top:4px">💶 ${esc(price(p))}</div>` : ""}` : ""}${c.conf && !/yüksək/i.test(c.conf) ? `<div class="sm dim">Əminlik: ${esc(c.conf)}</div>` : ""}</div><button class="btn s" id="spk">🔊 Dinlə</button></div>
  <div class="card"><div class="story" id="stBox">${esc(c.story || "")}${c.loading && !c.story ? '<span class="spin"></span>' : ""}</div>
  ${c.facts && c.facts.length ? `<ul class="facts">${c.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}${c.tip ? `<div class="note">💡 ${esc(c.tip)}</div>` : ""}${p && PHOTO[p.id] ? `<div class="note">📸 ${esc(PHOTO[p.id][0])} <b>${esc(PHOTO[p.id][1])}</b></div>` : ""}${c.err ? `<div class="note" style="color:#B23A2B">⚠️ ${esc(c.err)}</div>` : ""}</div>
  ${c.short && p && !c.loading ? `<button class="btn wide mt" id="moreSt">📖 Ətraflı hekayə${S.ai === false ? "" : " (AI)"}</button>` : ""}
  <div class="hscroll mt"><button class="chip" data-q="Daha ətraflı danış, maraqlı əhvalatlar əlavə et.">📖 Daha çox</button><button class="chip" data-q="İçəri girmək olar? Bilet və saatlar? Dəqiq bilmirsənsə rəsmi saytı yoxlamağı de.">🎟 Bilet</button><button class="chip" data-q="Ən gözəl foto bucağı haradadır?">📸 Foto</button></div>
  <div id="chat">${c.history.map(m => `<div class="msg ${m.role === "user" ? "me" : "ai"}">${esc(m.content)}</div>`).join("")}</div>
  <form class="ask" id="askF"><input class="inp" id="askI" placeholder="Sual ver…" autocomplete="off"><button class="btn pri">→</button></form>
  <div class="row mt">${p && TICKETS[p.id] ? `<a class="btn" href="${TICKETS[p.id][0]}" target="_blank" rel="noopener">🎟 Bilet</a>` : ""}${p ? `<button class="btn" id="goP">🧭 Get</button><a class="btn" href="${gPlace(p)}" target="_blank" rel="noopener">Google</a>` : ""}<button class="btn" id="nextP">✨ Buradan hara?</button></div>`;
  bindBack();
  if ($("#moreSt")) $("#moreSt").onclick = () => S.ai === false ? alertBox("🤖 Tezliklə", AI_OFF_MSG) : moreStory(p);
  $("#spk").onclick = () => speaking ? stopSpeak() : speak((c.name || "") + ". " + (c.story || "") + " " + (c.facts || []).join(". "));
  $$("#result [data-q]").forEach(b => b.onclick = () => ask(b.dataset.q));
  $("#askF").onsubmit = e => { e.preventDefault(); const v = $("#askI").value.trim(); if (v) { $("#askI").value = ""; ask(v); } };
  if ($("#goP")) $("#goP").onclick = () => { goView("map"); routeTo(p); };
  $("#nextP").onclick = () => { closeResult(); reco("hamısı"); setTimeout(() => $("#recoOut").scrollIntoView({ behavior: "smooth" }), 50); };
}
async function ask(q) {
  const c = cur; c.history.push({ role: "user", content: q });
  $("#chat").insertAdjacentHTML("beforeend", `<div class="msg me">${esc(q)}</div><div class="msg ai" id="pend"><span class="spin"></span></div>`);
  const el = $("#pend"); el.scrollIntoView({ behavior: "smooth", block: "center" }); el.removeAttribute("id");
  try {
    const t = await ai({ mode: "chat", tier: "fast", max_tokens: 500, system: `${CTX()} Sən Vyanada səmimi bələdçisən. Söhbət “${c.name}” haqqındadır. Qısa cavab ver (maks. 100 söz).`,
      messages: [{ role: "user", content: "Hekayə: " + (c.story || "") }, { role: "assistant", content: "Aydındır." }].concat(c.history), onText: x => el.textContent = x });
    c.history.push({ role: "assistant", content: t }); el.textContent = t;
  } catch (e) { el.textContent = aiErr(e); c.history.pop(); }
}

/* ---------- menu ---------- */
async function menu(file) {
  if (!file) return; clearInputs();
  showResult(`<div class="card"><span class="spin"></span> Oxuyuram…</div>`);
  const img = await shrink(file, 1400, .85);
  showResult(`<img class="photo" src="${img.url}" alt=""><div class="ttl"><h2>Menyu</h2><button class="btn s" id="spk">🔊</button></div><div class="card"><div class="story" id="mBox"><span class="spin"></span></div></div>`);
  let txt = ""; $("#spk").onclick = () => speaking ? stopSpeak() : speak(txt);
  try { txt = await ai({ mode: "menu", tier: "vision", image: img.b64, max_tokens: 1400, prompt: `${CTX()}\nŞəkildəki menyunu və ya yazını Azərbaycan dilinə tərcümə et. Hər sətir: “Orijinal — tərcümə/izah — qiymət”. Donuz ətini 🐷, alkoqolu 🍷 ilə işarələ. Sonda “Tövsiyə:” ilə 2–3 yemək məsləhət gör.`, onText: x => $("#mBox").textContent = x }); $("#mBox").textContent = txt; }
  catch (e) { $("#mBox").textContent = aiErr(e); }
}

/* ---------- price check: 1) read label  2) search Baku + Turkey ---------- */
let prCur = null;
async function priceCheck(file) {
  if (!file) return; clearInputs();
  showResult(`<div class="card"><span class="spin"></span> Şəkil hazırlanır…</div>`);
  let img, th; try { img = await shrink(file, 1280, .82); th = (await shrink(file, 200, .6)).url; } catch (e) { showResult(`<div class="card">Şəkli aça bilmədim.</div>`); return; }
  prCur = { img: img.url, thumb: th, p: {} };
  showResult(`<img class="photo" src="${img.url}" alt="" style="max-height:170px;object-fit:cover"><div class="ttl"><h2 id="prT">Etiketi oxuyuram…</h2></div><div class="card" id="prB"><span class="spin"></span> <span class="mute">Marka və artikul tapılır…</span></div>`);
  let err = "";
  try { const j = await api("price.extract", { image: img.b64, who: ME || "" }); prCur.p = j.product || {}; }
  catch (e) { err = aiErr(e); }
  priceForm(err);
}
function priceManual() { prCur = { img: null, thumb: null, p: {} }; showResult(`<div class="ttl"><h2 id="prT">Qiyməti yoxla</h2></div><div class="card" id="prB"></div>`); priceForm(""); }
function priceForm(err) {
  const p = prCur.p, got = p.brand || p.model || p.code;
  $("#prT").textContent = got ? "Düzdürmü? Yoxla və axtar" : "Məhsulu yaz";
  $("#prB").innerHTML = `${err ? `<div class="note" style="color:#B23A2B;margin-top:0">⚠️ ${esc(err)}</div>` : ""}
   ${!got && prCur.img && !err ? `<div class="note" style="margin-top:0">Etiketi oxuya bilmədim — markanı və adı özün yaz. Artikul kodu (məs. 1234/567) olsa nəticə daha dəqiq olur.</div>` : ""}
   <label class="fld">Marka<input class="inp" id="pfB" value="${esc(p.brand || "")}" placeholder="Zara, Nike, Sephora…" autocapitalize="words"></label>
   <label class="fld">Məhsul / model<input class="inp" id="pfM" value="${esc(p.model || p.name_az || "")}" placeholder="Air Max 90, palto, ətir 50 ml…"></label>
   <div class="row"><label class="fld grow">Artikul / kod<input class="inp" id="pfC" value="${esc(p.code || p.ean || "")}" placeholder="istəyə bağlı"></label><label class="fld" style="width:34%">Vyana €<input class="inp" id="pfE" inputmode="decimal" value="${p.vienna_eur ? String(p.vienna_eur).replace(".", ",") : ""}" placeholder="0"></label></div>
   <button class="btn pri wide mt" id="pfGo">🔎 Bakı və Türkiyədə axtar</button>
   <div class="sm dim" style="margin-top:8px;text-align:center">Rəsmi saytlarda və mağazalarda canlı axtarılır · 15–40 san.</div>`;
  $("#pfGo").onclick = () => priceSearch(false);
}
async function priceSearch(fresh) {
  const v = id => ($(id) ? $(id).value.trim() : "");
  if ($("#pfB")) Object.assign(prCur.p, { brand: v("#pfB"), model: v("#pfM"), code: v("#pfC"), vienna_eur: toNum(v("#pfE")) || null });
  const p = prCur.p;
  if (!p.brand && !p.model && !p.code) { toast("Ən azı markanı və ya adı yaz"); return; }
  $("#prT").textContent = [p.brand, p.model].filter(Boolean).join(" · ") || "Məhsul";
  $("#prB").innerHTML = `<span class="spin"></span> <span class="mute">Bakı və Türkiyə saytlarında axtarıram…</span>`;
  try {
    const j = await api("price.search", { product: p, who: ME || "", thumb: prCur.thumb, fresh: !!fresh });
    renderPrice(p, j.result || {}, j.cached);
    if (j.result && j.result.grounded !== false) { const mine = (LS.get("myPrices", []) || []).filter(x => Date.now() - x.ts < RECENT_MS); mine.unshift({ ts: Date.now(), who: ME || "", brand: p.brand, name: p.name_az || p.model, code: p.code, vienna_eur: p.vienna_eur, result: j.result, thumb: prCur.thumb }); LS.set("myPrices", mine.slice(0, 40)); recentPrices(); }
  } catch (e) {
    $("#prB").innerHTML = `<div class="note" style="color:#B23A2B;margin-top:0">⚠️ ${esc(aiErr(e))}</div>${priceLinks(p)}<button class="btn wide mt" id="pfBack">✏️ Düzəlt</button>`;
    $("#pfBack").onclick = () => priceForm("");
  }
}
// keep only offers from the right country (an adidas.com/us price must not count as "Baku")
const okDom = (o, cc) => { let h = "", seg = ""; try { const u = new URL(o.url); h = u.hostname.replace(/^www\./, ""); seg = (u.pathname.split("/")[1] || "").toLowerCase(); } catch (e) { return true; } if (/vertexaisearch|google\./.test(h)) return true;
  if (new RegExp(`^(${cc}|[a-z]{2}[-_]${cc}|${cc}[-_][a-z]{2})$`).test(seg)) return true;
  if (h.startsWith(cc + ".")) return true; // tr.dior.com // zara.com/az, apple.com/az, hm.com/tr_tr
  return cc === "az" ? /\.az$/.test(h) : /\.tr$/.test(h) || /(^|\.)(trendyol|hepsiburada|n11|beymen|vakko|gratis|boyner|morhipo|lcwaikiki|koton|defacto|mavi|network|ipekyol|sephora)\.com$/.test(h); };
const sane = res => Object.assign({}, res || {}, { baku: ((res || {}).baku || []).filter(o => okDom(o, "az")), turkey: ((res || {}).turkey || []).filter(o => okDom(o, "tr")) });
const toAzn = (o, r) => o.currency === "TRY" ? o.price / r.try * r.azn : o.currency === "EUR" ? o.price * r.azn : o.price;
// an offer counts only if it is the same article, not sold out, and (when the page could be opened) the price is really on it
const liveOffer = o => o.stock !== "out" && o.check !== "price_missing" && o.check !== "gone";
const bestOf = (arr, any) => { const ok = (arr || []).filter(o => liveOffer(o) && (any || o.match === "exact")); return ok.length ? ok.reduce((a, c) => a.price <= c.price ? a : c) : null; };
const offerBadge = o => o.stock === "out" ? `<span class="tag" style="background:#FDECEA;color:#B23A2B">⛔ stokda yoxdur</span>` : o.check === "price_missing" ? `<span class="tag" style="background:#FFF4E0;color:#9A6200">⚠️ qiymət səhifədə görünmədi</span>` : o.check === "ok" ? `<span class="tag">✓ səhifədə yoxlandı</span>` : o.check === "blocked" ? `<span class="tag" style="background:#EEE;color:#666">sayt yoxlamağa icazə vermədi</span>` : "";
function priceLinks(p) {
  const q = [p.brand, p.code || p.model].filter(Boolean).join(" ");
  const L = [[`https://www.google.com/search?q=${encodeURIComponent(q + " qiymət Bakı")}`, "Google AZ"], [`https://www.google.com/search?q=${encodeURIComponent(q + " fiyat")}`, "Google TR"], [`https://www.trendyol.com/sr?q=${encodeURIComponent(q)}`, "Trendyol"], [`https://umico.az/search?query=${encodeURIComponent(q)}`, "Umico"]];
  return `<div class="row mt" style="flex-wrap:wrap">${L.map(l => `<a class="btn s" href="${l[0]}" target="_blank" rel="noopener">${l[1]}</a>`).join("")}</div>`;
}
// a usable "look" link: real product page if we have one, otherwise a Google search on that store
function offerUrl(o, p) {
  const u = String(o.url || ""); let bare = true;
  try { const x = new URL(u); bare = x.pathname.length <= 1 || /\.(jpe?g|png|webp|gif|svg)$/i.test(x.pathname) || /\/(storage|images?|cdn|media)\//i.test(x.pathname); } catch (e) {}
  if (u && !bare) return u;
  let site = ""; try { site = new URL(u).hostname.replace(/^www\./, ""); } catch (e) {}
  const q = [p && p.brand, p && (p.code || p.model)].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q + (site ? " site:" + site : " " + (o.store || "")))}`;
}
// "different variant" only when the shop shows a related but different article code; otherwise we simply could not confirm it
function simLabel(o) {
  const n = x => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""), mine = n(prCur && prCur.p && prCur.p.code), theirs = n(o.code_on_page);
  return mine.length >= 6 && theirs && theirs.includes(mine.slice(0, 6)) ? "oxşar · fərqli variant" : "oxşar model · artikul yoxlanmadı";
}
function offerList(arr, flag, r) {
  if (!arr || !arr.length) return "";
  return `<div class="sm dim mt">${flag}</div><ul class="offers">${arr.slice().sort((a, b) => (liveOffer(a) ? 0 : 1) - (liveOffer(b) ? 0 : 1) || a.price - b.price).map(o => `<li${liveOffer(o) ? "" : ` style="opacity:.55"`}><div class="grow"><b>${esc(o.store || "Mağaza")}</b>${o.match === "similar" ? `<span class="tag sim">${simLabel(o)}</span>` : `<span class="tag">eyni</span>`} ${offerBadge(o)}<br><a class="sm" href="${esc(offerUrl(o, prCur && prCur.p))}" target="_blank" rel="noopener">bax ›</a> · <a class="sm dim" href="${esc(offerUrl({ store: o.store, url: (() => { try { return "https://" + new URL(o.url).hostname + "/"; } catch (e) { return ""; } })() }, prCur && prCur.p))}" target="_blank" rel="noopener">Google-da</a></div><div class="pr">${fm(o.price, o.currency === "AZN" ? 2 : 0)} ${o.currency === "TRY" ? "₺" : o.currency === "EUR" ? "€" : "₼"}${o.currency !== "AZN" ? `<span>≈ ${fm(toAzn(o, r))} ₼</span>` : ""}</div></li>`).join("")}</ul>`;
}
function renderPrice(p, res, cached) {
  res = sane(res);
  const r = R(), v = +p.vienna_eur || null, tf = v ? tfBack(v) : 0, va = v ? (v - tf) * r.azn : null;
  // the comparison and the advice use only same-article, in-stock, checked offers; a similar model is shown but never decides
  const bb = bestOf(res.baku), bt = bestOf(res.turkey), sb2 = bb ? null : bestOf(res.baku, true), st2 = bt ? null : bestOf(res.turkey, true);
  const ba = bb ? toAzn(bb, r) : null, ta = bt ? toAzn(bt, r) : null;
  const opts = [["vie", va], ["bak", ba], ["tr", ta]].filter(x => x[1]);
  const best = opts.length > 1 ? opts.reduce((a, c) => a[1] <= c[1] ? a : c)[0] : null;
  const name = [p.brand, p.model || p.name_az].filter(Boolean).join(" · ") || "Məhsul";
  if ($("#prT")) $("#prT").textContent = name;
  let save = "";
  if (best === "vie" && opts.length > 1) { const nx = Math.min(...opts.filter(o => o[0] !== "vie").map(o => o[1])); save = `Vyanada almaq ${fm(nx - va)} ₼ sərfəlidir`; }
  else if (best && va) save = `Burada alma — ${{ bak: "Bakıda", tr: "Türkiyədə" }[best]} ${fm(va - Math.min(ba || 1e9, ta || 1e9))} ₼ ucuzdur`;
  const none = !bb && !bt;
  $("#prB").innerHTML = `${p.code ? `<div class="sm dim">Artikul: ${esc(p.code)}</div>` : ""}
   <div class="pbox">
    <div class="${best === "vie" ? "best" : ""}"><span>🇦🇹 Vyana</span><b>${v ? fm(v) + " €" : "—"}</b><span>${va ? "≈ " + fm(va) + " ₼" : "yazılmayıb"}</span>${tf ? `<span style="color:#2F6FB5">tax-free ilə</span>` : ""}</div>
    <div class="${best === "bak" ? "best" : ""}"><span>🇦🇿 Bakı</span><b>${bb ? fm(bb.price, 0) + " ₼" : sb2 ? `<span style="opacity:.6">${fm(sb2.price, 0)} ₼</span>` : "—"}</b><span>${bb ? esc(bb.store) : sb2 ? "yalnız oxşar variant" : "tapılmadı"}</span></div>
    <div class="${best === "tr" ? "best" : ""}"><span>🇹🇷 Türkiyə</span><b>${bt ? fm(bt.price, 0) + " ₺" : st2 ? `<span style="opacity:.6">${fm(st2.price, 0)} ₺</span>` : "—"}</b><span>${ta ? "≈ " + fm(ta) + " ₼" : st2 ? "yalnız oxşar variant" : "tapılmadı"}</span></div>
   </div>
   ${save ? `<div class="settle mt">💡 <b>${esc(save)}</b></div>` : ""}
   ${res.grounded === false ? `<div class="note" style="color:#B23A2B">⚠️ Bu dəfə internet axtarışı alınmadı, ona görə qiymət göstərmirəm. “🔄 Təzədən” bas.</div>` : none ? `<div class="note">Bu məhsulun Bakı və Türkiyə qiyməti internetdə tapılmadı. Artikul kodunu yazıb yenidən yoxla və ya aşağıdakı linklərə bax.</div>` : ""}
   ${offerList(res.baku, "🇦🇿 Bakı mağazaları", r)}${offerList(res.turkey, "🇹🇷 Türkiyə mağazaları", r)}
   ${tf ? `<div class="note">🧾 75 €-dan çox olduğu üçün tax-free ilə ≈ ${fm(tf)} € geri ala bilərsən — müqayisə bunu nəzərə alır. Kassada “Tax free, bitte” de, pasportu göstər.</div>` : v && v < TF_MIN ? `<div class="note">🧾 Eyni mağazada bir çekdə 75,01 €-dan çox alsan, ≈12% ƏDV geri ala bilərsən.</div>` : ""}
   ${res.note ? `<div class="note">${esc(res.note)}</div>` : ""}
   ${res.v !== 2 && (res.baku.length || res.turkey.length) ? `<div class="note" style="color:#B23A2B">⚠️ Bu köhnə üsulla edilmiş yoxlamadır, mağazalar yoxlanmayıb. Dəqiq nəticə üçün “🔄 Təzədən” bas.</div>` : ""}
   <div class="note">“eyni” — eyni artikul, “oxşar” — başqa rəng/variant (müqayisəyə daxil edilmir). “✓ səhifədə yoxlandı” — mağaza səhifəsini açıb qiyməti və stoku yoxladım. Qiymətlər ${cached ? "son 24 saatda" : "indi"} internetdən götürülüb${res.at ? ` (${fmtT(res.at)})` : ""}; endirim və ölçüyə görə fərqlənə bilər.</div>
   ${priceLinks(p)}
   <div class="row mt"><button class="btn grow" id="prEdit">✏️ Düzəlt</button><button class="btn grow" id="prFresh">🔄 Təzədən</button></div>
   ${v ? `<button class="btn pri wide mt" id="prAdd">💶 Aldım — xərclərə yaz</button>` : ""}`;
  $("#prEdit").onclick = () => { prCur = prCur || { p }; priceForm(""); };
  $("#prFresh").onclick = () => { prCur = prCur || { p, thumb: null }; prCur.p = p; priceSearch(true); };
  if ($("#prAdd")) $("#prAdd").onclick = () => { if (ME) { expUI.mode = "mine"; LS.set("expMode", "mine"); expBuilt = false; } goView("exp"); setTimeout(() => { $("#expA").value = String(v).replace(".", ","); setExpCur("EUR"); $("#expD").value = name.slice(0, 80); $("#expA").dispatchEvent(new Event("input")); }, 60); };
}
// 🕒 products checked in the last 72 hours (own by default; "Hamının" shows the friends' too)
const RECENT_MS = 72 * 3600000;
let recentAll = false, recentSrv = null;
const priceKey = x => ((x.brand || "") + "|" + (x.code || x.name || "")).toLowerCase();
function histRow(x, i) {
  const r = R(), sr = sane(x.result), bb = bestOf(sr.baku), bt = bestOf(sr.turkey), h = Math.max(1, Math.round((Date.now() - x.ts) / 3600000));
  return `<li class="hist" data-rh="${i}">${x.thumb ? `<img src="${x.thumb}" alt="">` : `<img alt="">`}<div class="grow"><b>${esc([x.brand, x.name].filter(Boolean).join(" · ") || "Məhsul")}</b><span class="s2">${x.vienna_eur ? "🇦🇹 " + fm(+x.vienna_eur) + " € · " : ""}${bb ? "🇦🇿 " + fm(bb.price, 0) + " ₼ · " : ""}${bt ? "🇹🇷 ≈" + fm(toAzn(bt, r), 0) + " ₼" : ""}</span><span class="s2 dim">${recentAll && x.who && x.who !== ME ? esc(x.who) + " · " : ""}${h < 24 ? h + " saat əvvəl" : Math.round(h / 24) + " gün əvvəl"}</span></div><span class="dim">›</span></li>`;
}
function openHist(x) {
  const p = { brand: x.brand, model: x.name, code: x.code, vienna_eur: x.vienna_eur };
  prCur = { img: null, thumb: x.thumb, p };
  showResult(`${x.thumb ? `<img class="photo" src="${x.thumb}" alt="" style="max-height:200px;object-fit:contain">` : ""}<div class="ttl"><h2 id="prT"></h2></div><div class="card" id="prB"></div>`);
  renderPrice(p, x.result || {}, true);
}
async function recentPrices(refresh) {
  const box = $("#prRecent"); if (!box) return;
  const now = Date.now(), local = (LS.get("myPrices", []) || []).filter(x => now - x.ts < RECENT_MS);
  const draw = () => {
    const seen = new Set();
    const list = local.concat(recentSrv || []).filter(x => x && x.ts && now - x.ts < RECENT_MS && x.result && (recentAll || !ME || x.who === ME))
      .sort((a, b) => b.ts - a.ts).filter(x => { const k = priceKey(x); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 15);
    if (!list.length && !recentAll) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="card mt"><div class="row" style="align-items:center"><b class="grow">🕒 Son yoxladıqlarım <span class="dim sm">· 72 saat</span></b><button class="chip ${recentAll ? "on" : ""}" id="rcAll">👭 Hamının</button></div>
      ${list.length ? `<ul class="list">${list.map(histRow).join("")}</ul>` : `<div class="mute sm mt">Son 72 saatda heç nə yoxlanmayıb.</div>`}</div>`;
    $("#rcAll").onclick = () => { recentAll = !recentAll; draw(); };
    box.querySelectorAll("[data-rh]").forEach(li => li.onclick = () => openHist(list[+li.dataset.rh]));
  };
  draw();
  if (refresh || recentSrv == null) { try { recentSrv = ((await api("prices")).prices || []).map(x => Object.assign({}, x, { ts: +x.ts })); draw(); } catch (e) {} }
}
async function priceHistory() {
  showResult(`<div class="ttl"><h2>🧾 Baxılan qiymətlər</h2></div><div class="card" id="phB"><span class="spin"></span></div>`);
  let list = [];
  try { list = (await api("prices")).prices || []; } catch (e) { $("#phB").textContent = aiErr(e); return; }
  if (!list.length) { $("#phB").innerHTML = `<div class="mute" style="text-align:center;padding:16px">Hələ heç nə yoxlanmayıb.<br>“🛍 Qiymət” ilə başla.</div>`; return; }
  const r = R(), seen = new Set();
  list = list.filter(x => { const k = (x.brand + "|" + (x.code || x.name)).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  $("#phB").innerHTML = `<div class="sm dim" style="margin-bottom:6px">Hər üç telefonda görünür</div><ul class="list">${list.map((x, i) => { const sr = sane(x.result), bb = bestOf(sr.baku), bt = bestOf(sr.turkey);
    return `<li class="hist" data-h="${i}">${x.thumb ? `<img src="${x.thumb}" alt="">` : `<img alt="">`}<div class="grow"><b>${esc([x.brand, x.name].filter(Boolean).join(" · ") || "Məhsul")}</b><span class="s2">${x.vienna_eur ? "🇦🇹 " + fm(+x.vienna_eur) + " € · " : ""}${bb ? "🇦🇿 " + fm(bb.price, 0) + " ₼ · " : ""}${bt ? "🇹🇷 ≈" + fm(toAzn(bt, r), 0) + " ₼" : ""}</span><span class="s2 dim">${esc(x.who || "")} · ${fmtT(x.ts)}</span></div></li>`; }).join("")}</ul>`;
  $$("[data-h]").forEach(li => li.onclick = () => { const x = list[+li.dataset.h]; const p = { brand: x.brand, model: x.name, code: x.code, vienna_eur: x.vienna_eur };
    prCur = { img: null, thumb: x.thumb, p }; showResult(`${x.thumb ? `<img class="photo" src="${x.thumb}" alt="" style="max-height:200px;object-fit:contain">` : ""}<div class="ttl"><h2 id="prT"></h2></div><div class="card" id="prB"></div>`); renderPrice(p, x.result || {}, true); });
}
$("#prManual").onclick = priceManual;
$("#prHist").onclick = priceHistory;

/* ---------- speech ---------- */
let speaking = false;
/* speech: MP3 from the server played like music (works even when the iPhone is on silent); device voice as fallback */
const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABAAAAlgAenp6enp6enp6enp6enp6enp6enp6enp6pqampqampqampqampqampqampqampqamptPT09PT09PT09PT09PT09PT09PT09PT09P/////////////////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCcQAAAAAAAAJY+/rsqgAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
const player = new Audio(); player.preload = "auto"; player.setAttribute("playsinline", ""); window.__player = player;
const ttsCache = new Map(); let spkSeq = 0, unlocked = false;
const audioMode = t => { try { if (navigator.audioSession) navigator.audioSession.type = t; } catch (e) {} };
// iPhone only lets a page play sound after a tap: "unlock" the player on the first touch
function unlockAudio() { if (unlocked) return; unlocked = true; try { player.src = SILENT; const p = player.play(); if (p && p.catch) p.catch(() => { unlocked = false; }); } catch (e) { unlocked = false; } }
["touchend", "click"].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
function stopSpeak() { spkSeq++; try { speechSynthesis.cancel(); } catch (e) {} try { player.pause(); } catch (e) {} speaking = false; $$("#spk").forEach(b => b.textContent = "🔊 Dinlə"); }
async function ttsUrl(text, lang) {
  const key = lang + "|" + text; if (ttsCache.has(key)) return ttsCache.get(key);
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ k: S.code, u: S.u, op: "tts", q: text, tl: lang }), signal: ctl.signal });
    if (!r.ok || !/audio/.test(r.headers.get("content-type") || "")) throw 0;
    const url = URL.createObjectURL(await r.blob()); ttsCache.set(key, url); return url;
  } finally { clearTimeout(tm); }
}
function speak(text, lang) {
  stopSpeak(); text = String(text || "").trim(); if (!text) return; lang = lang || "az";
  audioMode("playback"); unlockAudio();
  const my = ++spkSeq; speaking = true; $$("#spk").forEach(b => b.textContent = "⏹ Dayan");
  const done = () => { if (my === spkSeq) { speaking = false; $$("#spk").forEach(b => b.textContent = "🔊 Dinlə"); } };
  const fallback = () => { if (my === spkSeq) speakDevice(text, lang); };
  if (!navigator.onLine) return fallback();
  ttsUrl(text, lang).then(url => {
    if (my !== spkSeq) return;
    player.onended = done; player.onerror = fallback;
    player.src = url; const p = player.play(); if (p && p.catch) p.catch(fallback);
  }).catch(fallback);
}
function speakDevice(text, lang) {
  if (!text || !window.speechSynthesis) { stopSpeak(); return; }
  const vs = speechSynthesis.getVoices();
  const v = lang === "en" ? (vs.find(x => /^en-GB/i.test(x.lang)) || vs.find(x => /^en/i.test(x.lang))) : lang === "de" ? vs.find(x => /^de/i.test(x.lang)) : lang === "tr" ? vs.find(x => /^tr/i.test(x.lang)) : (vs.find(x => /^az/i.test(x.lang)) || vs.find(x => /^tr/i.test(x.lang)));
  const parts = text.match(/[^.!?\n]+[.!?]*/g) || [text]; speaking = true; $$("#spk").forEach(b => b.textContent = "⏹ Dayan");
  parts.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p.trim()); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : "tr-TR"; u.rate = lang === "de" || lang === "en" ? .9 : 1; if (i === parts.length - 1) u.onend = u.onerror = () => stopSpeak(); speechSynthesis.speak(u); });
}
try { speechSynthesis.getVoices(); } catch (e) {}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

/* ---------- translator ---------- */
function normT(s) { return String(s || "").toLowerCase().replace(/ə/g, "e").replace(/ı/g, "i").replace(/i̇/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ä/g, "a").replace(/ß/g, "ss").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
function lev(a, b) { if (a === b) return 0; const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let pr = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(pr[j] + 1, c[j - 1] + 1, pr[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); pr = c; } return pr[n]; }
const PIDX = PHR.map((p, i) => ({ p, w: [...new Set(normT(p[0] + " " + p[1] + " " + p[3] + " " + ((PHR_EN[i] || [])[0] || "")).split(" ").filter(w => w.length > 1))] }));
// target language for "Mən deyirəm": de (German) or en (English)
let trLang = LS.get("trLang", "de");
const phrT = i => trLang === "en" ? PHR_EN[i][0] : PHR[i][1];
const phrSay = i => trLang === "en" ? PHR_EN[i][1] : PHR[i][2];
const LNAME = { de: "Almanca", en: "İngiliscə" };
function setTrLang(l) {
  trLang = l; LS.set("trLang", l);
  $$("#trLang .chip").forEach(x => x.classList.toggle("on", x.dataset.l === l));
  $("#trGo").textContent = l === "en" ? "→ EN" : "→ DE"; $("#trOut").innerHTML = ""; renderPhr();
}
function searchPhr(q) {
  const qt = normT(q).split(" ").filter(w => w.length > 1); if (!qt.length) return [];
  return PIDX.map(x => { let sc = 0; for (const t of qt) { let best = 0; for (const w of x.w) { let v = 0;
    if (w === t) v = 1; else if (w.startsWith(t) || (t.startsWith(w) && w.length >= 3)) v = .85; else if (w.includes(t) && t.length >= 3) v = .7;
    else if (t.length >= 4) { const d = Math.min(lev(t, w), lev(t, w.slice(0, t.length + 1))); if (d <= 1) v = .7; else if (d <= 2 && t.length >= 6) v = .5; }
    if (v > best) best = v; } sc += best; } return { p: x.p, sc: sc / qt.length }; }).filter(x => x.sc >= .5).sort((a, b) => b.sc - a.sc).slice(0, 8).map(x => x.p);
}
const phrRow = p => { const i = PHR.indexOf(p); return `<div class="phr"><div class="grow"><b class="de" data-big="${i}">${esc(phrT(i))}</b><span>${esc(p[0])} · <i>${esc(phrSay(i))}</i></span></div><button class="btn s" data-say="${i}">🔊</button></div>`; };
function renderPhr() {
  const q = $("#trIn").value.trim(), box = $("#phrList");
  if (!q) { const cats = [...new Set(PHR.map(p => p[4]))]; box.innerHTML = cats.map(c => `<details ${c === "Restoran" ? "open" : ""}><summary style="cursor:pointer;font-weight:700;padding:8px 0">${c}</summary>${PHR.filter(p => p[4] === c).map(phrRow).join("")}</details>`).join(""); }
  else { const r = searchPhr(q); box.innerHTML = r.length ? r.map(phrRow).join("") : `<div class="mute sm">Hazır ifadə yoxdur. <b>${trLang === "en" ? "→ EN" : "→ DE"}</b> bas, tərcümə edim.</div>`; }
  box.querySelectorAll("[data-say]").forEach(b => b.onclick = () => speak(phrT(+b.dataset.say).replace(" / ", ". "), trLang));
  box.querySelectorAll("[data-big]").forEach(b => b.onclick = () => showBig(phrT(+b.dataset.big), PHR[+b.dataset.big][0], trLang));
}
function showBig(de, az, lang) {
  lang = lang || "de";
  $("#bigBox").innerHTML = `<div class="sm dim">Bu ekranı göstər</div><div class="big-de">${esc(de)}</div><div class="mute">${esc(az || "")}</div><div class="row" style="justify-content:center;margin-top:16px"><button class="btn pri" id="bgS">🔊 Səsləndir</button><button class="btn" id="bgX">Bağla</button></div>`;
  $("#bigModal").classList.add("on"); $("#bgS").onclick = () => speak(de, lang); $("#bgX").onclick = () => $("#bigModal").classList.remove("on");
}
$("#bigModal").addEventListener("click", e => { if (e.target.id === "bigModal") $("#bigModal").classList.remove("on"); });
let trT = 0; $("#trIn").addEventListener("input", () => { clearTimeout(trT); trT = setTimeout(renderPhr, 120); });
// rough German → Azerbaijani-letter pronunciation (offline, free)
function deSay(t) {
  let s = " " + t.toLowerCase() + " ";
  const R = [[/tsch/g, "ç"], [/sch/g, "ş"], [/(^|\s)st/g, "$1şt"], [/(^|\s)sp/g, "$1şp"], [/ch/g, "x"], [/ck/g, "k"], [/ei/g, "ay"], [/ie/g, "i"], [/eu|äu/g, "oy"], [/au/g, "au"], [/ä/g, "e"], [/ß/g, "s"], [/tz/g, "ts"], [/z/g, "ts"], [/qu/g, "kv"], [/v/g, "f"], [/w/g, "v"], [/j/g, "y"], [/ph/g, "f"], [/([aeiouöü])h/g, "$1"], [/(^|\s|[aeiouöü])s([aeiouöü])/g, "$1z$2"], [/er\b/g, "ər"]];
  R.forEach(([a, b]) => s = s.replace(a, b));
  return s.trim();
}
async function freeTr(q, sl, tl) { const j = await api("gt", { q, sl, tl }); if (!j || !j.text) throw { code: "upstream" }; return j.text; }
$("#trF").onsubmit = async e => {
  e.preventDefault(); const q = $("#trIn").value.trim(); if (!q) return; $("#trIn").blur();
  const L = trLang, out = $("#trOut"); out.innerHTML = `<div class="card mt"><span class="spin"></span></div>`;
  const show = (t, ox, mn) => {
    out.innerHTML = `<div class="card mt"><div class="sm dim">${L === "en" ? "🇬🇧 İngiliscə" : "🇩🇪 Almanca"}</div><div class="de" id="trDe">${esc(t)}</div>${ox ? `<div class="mute sm" style="margin-top:4px">🗣 ${esc(ox)}</div>` : ""}${mn ? `<div class="dim sm">↩︎ ${esc(mn)}</div>` : ""}<div class="row mt"><button class="btn s pri" id="trS">🔊 Səsləndir</button><button class="btn s" id="trB">⛶ Böyük göstər</button></div></div>`;
    $("#trS").onclick = () => speak(t, L); $("#trB").onclick = $("#trDe").onclick = () => showBig(t, q, L); speak(t, L);
  };
  try {
    const t = await freeTr(q, "auto", L); let mn = ""; try { mn = await freeTr(t, L, "az"); } catch (x) {}
    show(t, L === "de" ? deSay(t) : "", mn); return;
  } catch (e0) { if (S.ai === false) { out.innerHTML = `<div class="card mt">${esc(aiErr(e0))}</div>`; return; } }
  try {
    const lname = L === "en" ? "sadə, nəzakətli ingilis dilinə" : "Vyanada danışılan təbii almancaya (nəzakətli Sie)";
    const t = await ai({ mode: "tr", tier: "fast", max_tokens: 300, prompt: `Bu mətni ${lname} tərcümə et. Mətn azərbaycan, türk, rus və ya ingilis dilində və səhv yazılmış ola bilər.\nMətn: """${q}"""\nDƏQİQ FORMAT:\nTR: <tərcümə>\nOXU: <Azərbaycan hərfləri ilə oxunuş>\nMƏNA: <qısa geri tərcümə az>`,
      onText: x => { const d = (x.match(/TR:\s*([^\n]*)/) || [])[1]; if (d) out.innerHTML = `<div class="card mt"><div class="de">${esc(d)}</div></div>`; } });
    const g = re => { const m = t.match(re); return m ? m[1].trim() : ""; }; const tt = g(/TR:\s*([^\n]*)/);
    if (!tt) throw { code: "x" };
    show(tt, g(/OXU:\s*([^\n]*)/), g(/MƏNA:\s*([^\n]*)/));
  } catch (err) { out.innerHTML = `<div class="card mt">${esc(aiErr(err))}</div>`; }
};
$$("#trLang .chip").forEach(b => b.onclick = () => setTrLang(b.dataset.l));
setTimeout(() => setTrLang(trLang), 0);
$$("#trMode button").forEach(b => b.onclick = () => { $$("#trMode button").forEach(x => x.classList.toggle("on", x === b)); $("#trSay").hidden = b.dataset.m !== "say"; $("#trListen").hidden = b.dataset.m !== "listen"; });
let lsSrc = LS.get("lsSrc", "de"), lsTarget = LS.get("lsTarget", "az"), lsSeq = 0, lsLast = "", lsTimer = 0, rec = null;
$$("#lsTarget .chip").forEach(b => { b.classList.toggle("on", b.dataset.l === lsTarget); b.onclick = () => { lsTarget = b.dataset.l; LS.set("lsTarget", lsTarget); $$("#lsTarget .chip").forEach(x => x.classList.toggle("on", x === b)); lsLast = ""; listenTr(); }; });
$$("#lsSrc .chip").forEach(b => { b.classList.toggle("on", b.dataset.l === lsSrc); b.onclick = () => { lsSrc = b.dataset.l; LS.set("lsSrc", lsSrc); $$("#lsSrc .chip").forEach(x => x.classList.toggle("on", x === b)); $("#lsIn").placeholder = (lsSrc === "en" ? "İngiliscə" : "Almanca") + " mətn bura yazılacaq (əl ilə də yaza bilərsən)"; if (rec) rec.stop(); lsLast = ""; listenTr(); }; });
$("#lsIn").addEventListener("input", () => { clearTimeout(lsTimer); lsTimer = setTimeout(listenTr, 1100); });
async function listenTr() {
  const src = $("#lsIn").value.trim(); if (!src || src === lsLast) return; lsLast = src;
  const out = $("#lsOut"); out.hidden = false; const my = ++lsSeq;
  try {
    const t = await freeTr(src, lsSrc, lsTarget === "tr" ? "tr" : "az");
    if (my === lsSeq) { out.innerHTML = `<div class="story">${esc(t)}</div><button class="btn s mt" id="lsSay">🔊 Dinlə</button>`; $("#lsSay").onclick = () => speak(t, lsTarget === "tr" ? "tr" : "az"); }
    return;
  } catch (e0) { if (S.ai === false) { if (my === lsSeq) out.textContent = aiErr(e0); return; } }
  try {
    const t = await ai({ mode: "listen", tier: "fast", max_tokens: 400, prompt: `Bu, Vyanada kiminsə dediyi sözlərdir (${lsSrc === "en" ? "ingiliscə" : "almanca, Avstriya dialekti"}, danışıq tanıma səhvləri ola bilər). Təbii ${lsTarget === "tr" ? "türk" : "Azərbaycan"} dilinə tərcümə et. Yalnız tərcüməni yaz.\nMətn: """${src}"""`,
      onText: x => { if (my === lsSeq) out.innerHTML = `<div class="story">${esc(x)}</div>`; } });
    if (my === lsSeq) { out.innerHTML = `<div class="story">${esc(t)}</div><button class="btn s mt" id="lsSay">🔊 Dinlə</button>`; $("#lsSay").onclick = () => speak(t, lsTarget === "tr" ? "tr" : "az"); }
  } catch (e) { if (my === lsSeq) out.textContent = aiErr(e); }
}
$("#lsMic").onclick = () => {
  if (!SR) return alertBox("🎤 Səs tanıma", "Bu brauzerdə yoxdur. Safari-də aç və ya klaviaturada 🌐 ilə Deutsch seçib 🎤 bas.");
  if (rec) { rec.stop(); return; }
  stopSpeak(); audioMode("auto"); rec = new SR(); rec.lang = lsSrc === "en" ? "en-GB" : "de-AT"; rec.interimResults = true; rec.continuous = true;
  const base = $("#lsIn").value ? $("#lsIn").value + " " : "";
  rec.onresult = e => { let t = ""; for (const r of e.results) t += r[0].transcript; $("#lsIn").value = base + t; clearTimeout(lsTimer); lsTimer = setTimeout(listenTr, e.results[e.results.length - 1].isFinal ? 100 : 1100); };
  rec.onerror = e => { if (e.error === "language-not-supported" && rec.lang !== "de-DE" && rec.lang !== "en-US") { rec.lang = lsSrc === "en" ? "en-US" : "de-DE"; } else if (e.error === "not-allowed") alertBox("🎤 Mikrofon", "Mikrofona icazə ver: Ayarlar → Safari → Mikrofon."); };
  rec.onend = () => { rec = null; $("#lsMic").classList.remove("on"); $("#lsHint").textContent = "Bas və telefonu danışan adama tut"; };
  try { rec.start(); $("#lsMic").classList.add("on"); $("#lsHint").textContent = "Dinləyirəm… dayandırmaq üçün yenə bas"; } catch (e) { rec = null; }
};

/* ---------- expenses ---------- */
const expUI = { cur: "EUR", payer: ME || PEOPLE[0], parts: PEOPLE.slice(), view: "all", cat: "", mode: LS.get("expMode", "shared") };
const PCATS = ["👗 Geyim", "👟 Ayaqqabı", "💄 Kosmetika", "🎁 Hədiyyə", "🍫 Suvenir", "🍽 Yemək", "☕ Kafe", "🛍 Digər"];
const CATS = ["🍽 Yemək", "☕ Kafe", "🎟 Bilet", "🚇 Nəqliyyat", "🛍 Alış-veriş", "🎄 Bazar"];
let expBuilt = false;
const shared = l => l.filter(e => !e.priv);
const netEur = e => (+e.eur || 0) - (+e.tf_back || 0); // what it really cost after the tax-free money came back
const myShare = e => { const ps = e.parts && e.parts.length ? e.parts : PEOPLE; return e.priv ? (e.by === ME ? netEur(e) : 0) : ps.includes(ME) ? netEur(e) / ps.length : 0; };
function expAll() { return S.expenses.concat(S.pending.map(p => Object.assign({ pending: true, id: "p" + p.ts }, p))).sort((a, b) => (b.ts || 0) - (a.ts || 0)); }
function expSum(list) { list = shared(list); const s = {}; PEOPLE.forEach(p => s[p] = { paid: 0, share: 0 }); let tot = 0;
  list.forEach(e => { const eur = (+e.eur || 0) - (+e.tf_back || 0); const parts = (e.parts && e.parts.length ? e.parts : PEOPLE).filter(p => s[p]); if (!parts.length) return; tot += eur; if (s[e.payer]) s[e.payer].paid += eur; parts.forEach(p => s[p].share += eur / parts.length); });
  return { tot, s }; }
function settle(s) { const bal = PEOPLE.map(p => ({ p, v: Math.round((s[p].paid - s[p].share) * 100) / 100 }));
  const cr = bal.filter(x => x.v > .009).sort((a, b) => b.v - a.v), db = bal.filter(x => x.v < -.009).map(x => ({ p: x.p, v: -x.v })).sort((a, b) => b.v - a.v); const out = []; let i = 0, j = 0;
  while (i < db.length && j < cr.length) { const m = Math.min(db[i].v, cr[j].v); out.push({ from: db[i].p, to: cr[j].p, v: m }); db[i].v -= m; cr[j].v -= m; if (db[i].v < .01) i++; if (cr[j].v < .01) j++; } return out; }
function budgetOf() { return ME ? +LS.get("budget." + ME, 0) || 0 : 0; }
function renderBudget(all) {
  const B = $("#budgetBox"); if (!B) return;
  if (!ME) { B.innerHTML = ""; return; }
  const b = budgetOf(), spent = all.reduce((a, e) => a + myShare(e), 0), r = R();
  if (!b) { B.innerHTML = `<button class="lnk mt" id="bdSet">🎯 Öz büdcəni təyin et</button>`; }
  else { const pct = Math.min(100, Math.round(spent / b * 100)), left = b - spent;
    B.innerHTML = `<div class="card mt"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="sm dim">🎯 ${esc(ME)} — büdcə ${fm(b, 0)} €</span><button class="lnk sm" id="bdSet">dəyiş</button></div>
     <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4px"><b style="font:700 22px Fraunces,serif">${fm(spent)} € xərcləndi</b><span class="${left < 0 ? "neg" : "mute"}" style="font-weight:600">${left >= 0 ? "qalıb " + fm(left) + " €" : "aşılıb " + fm(-left) + " €"}</span></div>
     <div class="bar mt"><i style="width:${pct}%;background:${pct >= 100 ? "#C8102E" : pct >= 80 ? "#E09B2D" : "#2E8B57"}"></i></div>
     <div class="sm dim" style="margin-top:6px">≈ ${fm(spent * r.azn)} ₼ · ortaq payın + şəxsi xərclərin</div></div>`; }
  $("#bdSet").onclick = () => { const v = prompt("Səfər üçün büdcən neçə avrodur? (məs. 800)", b || ""); if (v === null) return; LS.set("budget." + ME, Math.max(0, toNum(v))); renderExpData(); };
}
function renderMine(all) {
  $("#expSync").innerHTML = `<span class="sync">🔒 Şəxsi xərclərin yalnız səndə görünür · ortaq paylar avtomatik burada</span>`;
  const r = R(), mineP = all.filter(e => e.priv && e.by === ME), mineS = shared(all).filter(e => myShare(e) > 0);
  const sP = mineP.reduce((a, e) => a + (+e.eur || 0), 0), sS = mineS.reduce((a, e) => a + myShare(e), 0);
  const byCat = {}; mineP.forEach(e => { const c = e.cat || "🛍 Digər"; byCat[c] = (byCat[c] || 0) + (+e.eur || 0); });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  $("#expSum").innerHTML = `<div class="card mt"><div class="sm dim">${esc(ME)} — cəmi xərcim</div><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="font-size:32px">${fm(sS + sP)} €</h2><span class="mute">≈ ${fm((sS + sP) * r.azn)} ₼</span></div>
    <div class="stat"><div><b>${fm(sS)} €</b><span>👭 ortaq payım</span></div><div><b>${fm(sP)} €</b><span>🔒 şəxsi</span></div></div>
    ${cats.length ? `<div class="mt">${cats.map(([c, v]) => `<div class="catrow"><span>${esc(c)}</span><div class="bar grow"><i style="width:${Math.round(v / cats[0][1] * 100)}%"></i></div><b>${fm(v)} €</b></div>`).join("")}</div>` : ""}</div>`;
  const rows = mineP.map(e => ({ e, priv: true })).concat(mineS.map(e => ({ e, priv: false }))).sort((a, b) => (b.e.ts || 0) - (a.e.ts || 0));
  $("#mineBox").innerHTML = "";
  $("#expList").innerHTML = `<div class="card mt"><ul class="list">${rows.length ? rows.map(({ e, priv }) => `<li><div class="grow"><b>${priv ? "🔒 " : "👭 "}${esc(e.d)}${e.pending ? " 📱" : ""}${e.tf ? ` <span class="tag" style="background:#EEF6FF;color:#2F6FB5">🧾 tax-free</span>` : ""}</b><span class="s2">${priv ? "şəxsi" : esc(e.payer) + " ödədi · sənin payın"} · ${fmtT(e.ts)}</span></div><span class="km">${fm(myShare(e))} €<br><span class="dim" style="font-weight:500">${fm(myShare(e) * r.azn)} ₼</span></span>${priv && !e.pending ? `<button class="btn s" data-ed="${esc(e.id)}" aria-label="Düzəlt">✎</button><button class="btn s" data-del="${esc(e.id)}">✕</button>` : ""}</li>`).join("") : `<li class="mute">Hələ heç nə yoxdur. Yuxarıdan şəxsi xərc əlavə et (məs. 👗 paltar).</li>`}</ul></div>`;
  bindDel();
}
/* ---------- tax-free: ask after a big purchase, and later ask how much really came back ---------- */
function tfAsk(list) {
  const no = LS.get("tfNo", []);
  list = (list || S.expenses.filter(e => +e.eur >= TF_MIN && !e.tf && tfEligible(e) && (e.payer === ME || e.by === ME))).filter(e => !no.includes(e.id));
  if (!list.length) { goView("exp"); return; }
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">🧾 Tax-free formu aldınız?</h3><div class="sm mute" style="text-align:left">75 €-dan çox alışda ≈12% geri qayıdır. Formu aldınızsa “Bəli” basın — 20 noyabrda hava limanında xatırladacam.</div>
   ${list.map(e => `<div class="card mt" style="text-align:left"><b>${esc(e.d)}</b><div class="sm dim">${fm(+e.eur)} € · ≈ ${fm(tfBack(+e.eur))} € geri</div><div class="row mt"><button class="btn grow" data-tfno="${esc(e.id)}">Xeyr</button><button class="btn pri grow" data-tfyes="${esc(e.id)}">✓ Bəli, aldım</button></div></div>`).join("")}
   <button class="btn wide mt" id="tfClose">Bağla</button>`;
  const done = el => { el.closest(".card").remove(); if (!$("#bigBox [data-tfyes]")) $("#bigModal").classList.remove("on"); };
  $$("[data-tfyes]").forEach(b => b.onclick = async () => { try { await api("exp.tf", { id: b.dataset.tfyes, tf: true }); const e = S.expenses.find(x => x.id === b.dataset.tfyes); if (e) e.tf = true; LS.set("expCache", S.expenses); toast("✓ Tax-free qeyd olundu"); renderExpData(); done(b); } catch (err) { toast("Alınmadı: " + aiErr(err)); } });
  $$("[data-tfno]").forEach(b => b.onclick = () => { LS.set("tfNo", LS.get("tfNo", []).concat(b.dataset.tfno)); done(b); });
  $("#tfClose").onclick = () => $("#bigModal").classList.remove("on");
  $("#bigModal").classList.add("on");
}
function tfBackDialog(all) {
  const list = S.expenses.filter(e => e.tf && !e.priv && (all || e.payer === ME)).concat(S.expenses.filter(e => e.tf && e.priv && e.by === ME));
  if (!list.length) { toast("Tax-free işarəli xərc yoxdur"); goView("exp"); return; }
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">🧾 Tax-free nə qədər qayıtdı?</h3><div class="sm mute" style="text-align:left">Kartınıza və ya nağd qayıdan məbləği yazın. Hesablaşma özü düzələcək: geri qayıdan pul xərcə qatılanlar arasında bölünür.</div>
   ${list.map(e => `<div class="card mt" style="text-align:left"><b>${esc(e.d)}</b><div class="sm dim">${fm(+e.eur)} € · ${esc(e.payer)} ödəyib · gözlənilən ≈ ${fm(tfBack(+e.eur))} €${e.tf_back != null ? ` · <b>qeyd olunub: ${fm(+e.tf_back)} €</b>` : ""}</div>
     <div class="conv mt"><div class="in"><input inputmode="decimal" data-tfin="${esc(e.id)}" placeholder="${String(Math.round(tfBack(+e.eur) * 100) / 100).replace(".", ",")}" value="${e.tf_back != null ? String(e.tf_back).replace(".", ",") : ""}"><span class="cur">€</span></div></div>
     <div class="row mt"><button class="btn grow" data-tfwait="${esc(e.id)}">⏳ Hələ gəlməyib</button><button class="btn pri grow" data-tfsave="${esc(e.id)}">💾 Qeyd et</button></div></div>`).join("")}
   <button class="btn wide mt" id="tfClose">Bağla</button>`;
  const save = async (id, back) => {
    try { const j = await api("exp.tfback", { id, back }); const i = S.expenses.findIndex(x => x.id === id); if (i >= 0) S.expenses[i] = j.row; LS.set("expCache", S.expenses); renderExpData(); toast(back == null ? "Yaxşı — sonra yenə soruşacağam" : "✓ Qeyd olundu — hesablaşma yeniləndi"); }
    catch (err) { toast("Alınmadı: " + aiErr(err)); }
  };
  $$("[data-tfsave]").forEach(b => b.onclick = async () => { const v = toNum($(`[data-tfin="${b.dataset.tfsave}"]`).value); if (!(v >= 0)) { toast("Məbləği yaz"); return; } await save(b.dataset.tfsave, v); b.closest(".card").style.opacity = ".6"; });
  $$("[data-tfwait]").forEach(b => b.onclick = async () => { await save(b.dataset.tfwait, null); b.closest(".card").style.opacity = ".6"; });
  $("#tfClose").onclick = () => $("#bigModal").classList.remove("on");
  $("#bigModal").classList.add("on");
}
/* ---------- 🔔 inbox: every notification can be read again inside the app ---------- */
S.inbox = LS.get("inbox", []);
function renderBell() {
  const b = $("#bellBtn"); if (!b) return;
  const seen = +LS.get("inboxSeen", 0), n = (S.inbox || []).filter(x => x.t > seen).length;
  b.innerHTML = `🔔${n ? `<i class="bdg">${n > 9 ? "9+" : n}</i>` : ""}`;
}
if ($("#bellBtn")) $("#bellBtn").onclick = () => openInbox();
setTimeout(renderBell, 0);
function openInbox() {
  const L = S.inbox || [];
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">🔔 Bildirişlər</h3>${L.length ? L.map((x, i) => `<button class="card mt" data-ib="${i}" style="display:block;width:100%;text-align:left;border:1px solid var(--line)"><div class="sm dim">${fmtT(x.t)}</div><b>${esc(x.title)}</b>${x.body ? `<div class="sm" style="white-space:pre-line;margin-top:4px">${esc(x.body)}</div>` : ""}</button>`).join("") : `<div class="mute mt">Hələ bildiriş yoxdur.</div>`}<button class="btn wide mt" id="ibClose">Bağla</button>`;
  $$("[data-ib]").forEach(b => b.onclick = () => { const x = L[+b.dataset.ib]; const g = (String(x.url || "").match(/go=([a-z]+)/) || [])[1]; $("#bigModal").classList.remove("on"); if (g) handleGo(g); });
  $("#ibClose").onclick = () => $("#bigModal").classList.remove("on");
  LS.set("inboxSeen", Date.now()); renderBell(); useTrack("inbox");
  $("#bigModal").classList.add("on");
}
function editExp(id) {
  const e = S.expenses.find(x => x.id === id); if (!e) return;
  const st = { payer: e.payer, parts: (e.parts && e.parts.length ? e.parts : PEOPLE).slice(), tf: !!e.tf, cur: e.cur === "AZN" ? "AZN" : "EUR" };
  const amt = st.cur === "AZN" && e.orig ? e.orig : e.eur;
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">✎ Xərci düzəlt${e.priv ? " 🔒" : ""}</h3>
   <div class="conv mt"><div class="in"><input id="edA" inputmode="decimal" value="${String(amt).replace(".", ",")}"></div><div class="seg" id="edCur" style="flex:none"><button type="button" data-c="EUR">€</button><button type="button" data-c="AZN">₼</button></div></div>
   <input class="inp mt" id="edD" value="${esc(e.d)}">
   ${e.priv ? "" : `<div class="sm dim mt" style="text-align:left">Kim ödədi?</div><div class="chips" id="edPay" style="margin-top:6px">${PEOPLE.map(p => `<button type="button" class="chip" data-p="${p}">${p}</button>`).join("")}</div>
   <div class="sm dim mt" style="text-align:left">Kimlər üçün?</div><div class="chips" id="edParts" style="margin-top:6px">${PEOPLE.map(p => `<button type="button" class="chip" data-p="${p}">${p}</button>`).join("")}</div>`}
   ${tfEligible(e) || e.tf ? `<button type="button" class="chip mt" id="edTf">🧾 Tax-free</button>` : ""}
   <div class="row mt"><button class="btn grow" id="edX">Ləğv et</button><button class="btn pri grow" id="edOk">💾 Yadda saxla</button></div>`;
  const draw = () => { $$("#edCur button").forEach(x => x.classList.toggle("on", x.dataset.c === st.cur)); $$("#edPay .chip").forEach(x => x.classList.toggle("on", x.dataset.p === st.payer)); $$("#edParts .chip").forEach(x => x.classList.toggle("on", st.parts.includes(x.dataset.p))); if ($("#edTf")) $("#edTf").classList.toggle("on", st.tf); };
  $$("#edCur button").forEach(b => b.onclick = () => { st.cur = b.dataset.c; draw(); });
  $$("#edPay .chip").forEach(b => b.onclick = () => { st.payer = b.dataset.p; draw(); });
  $$("#edParts .chip").forEach(b => b.onclick = () => { const p = b.dataset.p; st.parts = st.parts.includes(p) ? st.parts.filter(x => x !== p) : st.parts.concat(p); if (!st.parts.length) st.parts = [p]; draw(); });
  if ($("#edTf")) $("#edTf").onclick = () => { st.tf = !st.tf; draw(); };
  $("#edX").onclick = () => $("#bigModal").classList.remove("on");
  $("#edOk").onclick = async () => {
    const v = toNum($("#edA").value); if (!(v > 0)) { toast("Məbləği yaz"); return; }
    const r = R(), row = { d: $("#edD").value.trim() || "Xərc", eur: Math.round((st.cur === "EUR" ? v : v / r.azn) * 100) / 100, orig: v, cur: st.cur, payer: st.payer, parts: st.parts, tf: st.tf, cat: e.cat || null };
    try { const j = await api("exp.upd", { id, row }); const i = S.expenses.findIndex(x => x.id === id); if (i >= 0) S.expenses[i] = j.row; LS.set("expCache", S.expenses); $("#bigModal").classList.remove("on"); toast("✓ Düzəldildi"); renderExpData(); }
    catch (err) { toast("Alınmadı: " + aiErr(err)); }
  };
  draw(); $("#bigModal").classList.add("on");
}
function bindDel() {
  $$("[data-ed]").forEach(b => { b.onclick = ev => { ev.stopPropagation(); editExp(b.dataset.ed); }; const li = b.closest("li"); if (li) { li.style.cursor = "pointer"; li.onclick = ev => { if (ev.target.closest("button,a")) return; editExp(b.dataset.ed); }; } });
  $$("[data-del]").forEach(b => { let armed = false; b.onclick = async () => {
    if (!armed) { armed = true; b.textContent = "Sil?"; b.classList.add("pri"); setTimeout(() => { armed = false; b.textContent = "✕"; b.classList.remove("pri"); }, 2500); return; }
    try { await api("exp.del", { id: b.dataset.del }); S.expenses = S.expenses.filter(x => x.id !== b.dataset.del); LS.set("expCache", S.expenses); renderExpData(); } catch (e) { toast("Silinmədi: " + aiErr(e)); } }; });
}
async function markPaid(x) {
  const row = { d: `💸 ${x.from} → ${x.to} qaytardı`, eur: Math.round(x.v * 100) / 100, orig: Math.round(x.v * 100) / 100, cur: "EUR", payer: x.from, parts: [x.to], by: ME || "", ts: Date.now(), tf: false, priv: false, cat: "💸 Qaytarma" };
  try { const j = await api("exp.add", { row }); S.expenses.unshift(j.row); LS.set("expCache", S.expenses); toast("✓ Hesablaşma qeyd olundu"); }
  catch (e) { S.pending.push(row); LS.set("expPending", S.pending); toast("📱 İnternet yoxdur — sonra göndəriləcək"); }
  renderExpData();
}
function setExpCur(c) { expUI.cur = c; $$("#expCur button").forEach(x => x.classList.toggle("on", x.dataset.c === c)); }
// 🧾 receipt photo → total, place, category filled in automatically (cheap AI vision, ~1 cent)
async function readReceipt(file, upd) {
  const out = $("#rcOut"); out.innerHTML = `<div class="note" style="margin-top:0"><span class="spin"></span> Çek oxunur…</div>`;
  let img; try { img = await shrink(file, 1600, .85); } catch (e) { out.innerHTML = `<div class="note">Şəkli aça bilmədim.</div>`; return; }
  let t = "";
  try {
    t = await ai({ mode: "receipt", tier: "vision", max_tokens: 900, image: img.b64, prompt: `Bu, Vyanada (Avstriya) çekin/qəbzin şəklidir. Çekdən oxu və YALNIZ JSON yaz:
{"store":"<mağaza/restoran adı>","total":<ödənilən YEKUN məbləğ rəqəm, endirim və bahşiş daxil — 'Summe/Gesamt/Total/Zu zahlen' sətri>,"currency":"EUR","kind":"<food|cafe|shop|ticket|transport|other>","items":[{"n":"<məhsul adı, qısa>","q":<say>,"p":<sətir məbləği>}],"date":"<YYYY-MM-DD və ya boş>"}
Qaydalar: rəqəmləri nöqtə ilə yaz (12.50). Görünməyən şeyi uydurma. Çek deyilsə {"total":null} yaz.` });
  } catch (e) { out.innerHTML = `<div class="note" style="color:#B23A2B">⚠️ ${esc(aiErr(e))} Məbləği əl ilə yaz.</div>`; return; }
  let j = null; try { j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch (e) {}
  const total = j && Number(j.total);
  if (!(total > 0)) { out.innerHTML = `<div class="note">Çeki oxuya bilmədim — şəkli düz, işıqlı yerdə yenidən çək və ya məbləği əl ilə yaz.</div>`; return; }
  const cur = String(j.currency || "EUR").toUpperCase() === "AZN" ? "AZN" : "EUR";
  setExpCur(cur); $("#expA").value = String(Math.round(total * 100) / 100).replace(".", ",");
  if (j.store) $("#expD").value = String(j.store).slice(0, 60);
  const want = { food: "🍽 Yemək", cafe: "☕ Kafe", shop: expUI.mode === "mine" ? "🛍 Digər" : "🛍 Alış-veriş", ticket: "🎟 Bilet", transport: "🚇 Nəqliyyat" }[j.kind];
  const chip = want && [...$$("#expCats .chip")].find(c => c.dataset.cat === want);
  if (chip && !chip.classList.contains("on")) chip.click();
  upd();
  const items = Array.isArray(j.items) ? j.items.filter(x => x && x.n).slice(0, 25) : [];
  const sum = items.reduce((a, x) => a + (Number(x.p) || 0), 0);
  out.innerHTML = `<div class="note" style="margin-top:0"><b>✓ Çek oxundu: ${esc(j.store || "")} — ${fm(total)} ${cur === "EUR" ? "€" : "₼"}</b>
    ${items.length ? `<ul class="list" style="margin:6px 0 0">${items.map(x => `<li style="padding:4px 0"><span class="grow">${x.q > 1 ? x.q + "× " : ""}${esc(x.n)}</span><span class="dim">${Number(x.p) ? fm(+x.p) : ""}</span></li>`).join("")}</ul>` : ""}
    ${items.length && Math.abs(sum - total) > 0.05 && sum > 0 ? `<div class="sm dim mt">Sətirlərin cəmi ${fm(sum)} — yekun fərqlidir (bahşiş/endirim ola bilər). Lazımsa məbləği düzəlt.</div>` : ""}
    <div class="sm mt">Kim ödədi, kimlər üçün — seç və <b>“Əlavə et”</b> bas. Bərabər bölünəcək.</div></div>`;
}
function renderExp(force) {
  if (!expBuilt || force) {
    expBuilt = true; expUI.payer = ME || expUI.payer;
    $("#expBody").innerHTML = `<div class="seg mt" id="expMode"><button data-m="shared">👭 Ortaq</button><button data-m="mine">👤 Mənim xərclərim</button></div><div id="expSync"></div>
    <div id="budgetBox"></div>
    <form class="card" id="expF" autocomplete="off">
      <button type="button" class="btn wide" id="rcBtn" style="margin-bottom:10px">🧾 Çekin şəklini çək — özü yazılsın</button><input type="file" accept="image/*" capture="environment" id="rcIn" hidden>
      <div id="rcOut"></div>
      <div class="conv"><div class="in"><input id="expA" inputmode="decimal" placeholder="Məbləğ"></div><div class="seg" id="expCur" style="flex:none"><button type="button" data-c="EUR" class="on">€</button><button type="button" data-c="AZN">₼</button></div></div>
      <div class="sm dim" id="expConv" style="margin-top:4px;min-height:18px"></div>
      <div class="hscroll" id="expCats"></div>
      <input class="inp mt" id="expD" placeholder="Qeyd (istəyə görə)">
      <button type="button" class="chip mt" id="expTf">🧾 Tax-free forması aldım</button>
      <div id="sharedOnly"><div class="sm dim mt">Kim ödədi?</div><div class="chips" id="expPay" style="margin-top:6px">${PEOPLE.map(p => `<button type="button" class="chip ${expUI.payer === p ? "on" : ""}" data-p="${p}">${p}</button>`).join("")}</div>
      <div class="sm dim mt">Kimlər üçün?</div><div class="chips" id="expParts" style="margin-top:6px">${PEOPLE.map(p => `<button type="button" class="chip on" data-p="${p}">${p}</button>`).join("")}</div></div>
      <div class="note" id="privNote" hidden>🔒 Şəxsi xərc — yalnız sən görürsən, ortaq hesablaşmaya düşmür.</div>
      <button class="btn pri wide mt" type="submit">+ Əlavə et</button>
    </form>
    <div id="expSum"></div>
    <div id="mineBox"></div>
    <div class="tabs mt" id="expView"><button data-v="all" class="on">Hamısı</button>${PEOPLE.map(p => `<button data-v="${p}">${p}</button>`).join("")}</div>
    <div id="expList"></div>`;
    const upd = () => { const v = toNum($("#expA").value), r = R(), eur = expUI.cur === "EUR" ? v : v / r.azn;
      $("#expConv").textContent = v ? (expUI.cur === "EUR" ? `≈ ${fm(v * r.azn)} ₼` : `≈ ${fm(v / r.azn)} €`) + (eur >= TF_MIN ? ` · 🧾 75 €-dan çox: kassada “Tax free, bitte” de — ≈ ${fm(tfBack(eur))} € geri` : "") : ""; };
    $("#expTf").onclick = () => { expUI.tf = !expUI.tf; $("#expTf").classList.toggle("on", expUI.tf); };
    $("#rcBtn").onclick = () => $("#rcIn").click();
    $("#rcIn").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) readReceipt(f, upd); };
    $("#expA").oninput = upd;
    $$("#expCur button").forEach(b => b.onclick = () => { setExpCur(b.dataset.c); upd(); });
    const drawCats = () => { const cs = expUI.mode === "mine" ? PCATS : CATS; $("#expCats").innerHTML = cs.map(c => `<button type="button" class="chip ${expUI.cat === c ? "on" : ""}" data-cat="${c}">${c}</button>`).join("");
      $$("#expCats .chip").forEach(b => b.onclick = () => { const on = !b.classList.contains("on"); $$("#expCats .chip").forEach(x => x.classList.remove("on")); expUI.cat = on ? b.dataset.cat : ""; if (on) b.classList.add("on"); tfChipVis(); }); };
    const tfChipVis = () => { const ok = !TF_NO_CAT.includes(expUI.cat); $("#expTf").style.display = ok ? "" : "none"; if (!ok && expUI.tf) { expUI.tf = false; $("#expTf").classList.remove("on"); } };
    const setMode = m => { if (m === "mine" && !ME) { askWho(); return; } expUI.mode = m; LS.set("expMode", m); expUI.cat = ""; drawCats();
      $$("#expMode button").forEach(x => x.classList.toggle("on", x.dataset.m === m));
      $("#sharedOnly").hidden = m === "mine"; $("#privNote").hidden = m !== "mine"; $("#expView").hidden = m === "mine";
      $("#expF button[type=submit]").textContent = m === "mine" ? "+ Şəxsi xərc əlavə et" : "+ Ortaq xərc əlavə et"; renderExpData(); };
    $$("#expMode button").forEach(b => b.onclick = () => setMode(b.dataset.m));
    $$("#expPay .chip").forEach(b => b.onclick = () => { expUI.payer = b.dataset.p; $$("#expPay .chip").forEach(x => x.classList.toggle("on", x === b)); });
    $$("#expParts .chip").forEach(b => b.onclick = () => { const p = b.dataset.p; expUI.parts = expUI.parts.includes(p) ? expUI.parts.filter(x => x !== p) : expUI.parts.concat(p); if (!expUI.parts.length) expUI.parts = [p]; $$("#expParts .chip").forEach(x => x.classList.toggle("on", expUI.parts.includes(x.dataset.p))); });
    $$("#expView button").forEach(b => b.onclick = () => { expUI.view = b.dataset.v; $$("#expView button").forEach(x => x.classList.toggle("on", x === b)); renderExpData(); });
    $("#expF").onsubmit = async e => {
      e.preventDefault(); const v = toNum($("#expA").value); if (!(v > 0)) { toast("Məbləği yaz"); return; }
      const r = R(), mine = expUI.mode === "mine";
      const row = { d: $("#expD").value.trim() || expUI.cat || "Xərc", eur: Math.round((expUI.cur === "EUR" ? v : v / r.azn) * 100) / 100, orig: v, cur: expUI.cur, payer: mine ? ME : expUI.payer, parts: mine ? [ME] : expUI.parts.slice(), by: ME || "", ts: Date.now(), tf: !!expUI.tf, priv: mine, cat: expUI.cat || null };
      $("#expA").value = ""; $("#expD").value = ""; $("#rcOut").innerHTML = ""; upd(); $$("#expCats .chip").forEach(x => x.classList.remove("on")); expUI.cat = ""; expUI.tf = false; $("#expTf").classList.remove("on"); $("#expTf").style.display = "";
      try { const j = await api("exp.add", { row }); S.expenses.unshift(j.row); LS.set("expCache", S.expenses); toast(row.priv ? "✓ Şəxsi xərc yazıldı 🔒" : "✓ Əlavə olundu — hamı görür"); if (+j.row.eur >= TF_MIN && !j.row.tf && tfEligible(j.row)) setTimeout(() => tfAsk([j.row]), 700); }
      catch (err) { S.pending.push(row); LS.set("expPending", S.pending); toast("📱 İnternet yoxdur — sonra göndəriləcək"); }
      renderExpData();
    };
    setMode(expUI.mode === "mine" && ME ? "mine" : "shared"); return;
  }
  renderExpData();
}
function renderExpData() {
  if (!$("#expSum")) return;
  const all = expAll(), r = R();
  renderBudget(all);
  if (expUI.mode === "mine") return renderMine(all);
  $("#mineBox").innerHTML = "";
  const list = shared(all), { tot, s } = expSum(list), st = settle(s);
  setTimeout(() => { if ($("#tfBackBtn")) $("#tfBackBtn").onclick = () => tfBackDialog(true); }, 0);
  setTimeout(() => $$("[data-paid]").forEach(b => { let armed = false; b.onclick = () => { if (!armed) { armed = true; b.textContent = "Əminsən?"; b.classList.add("pri"); setTimeout(() => { armed = false; b.textContent = "✓ Ödəndi"; b.classList.remove("pri"); }, 3000); return; } markPaid(st[+b.dataset.paid]); }; }), 0);
  $("#expSync").innerHTML = S.online ? `<span class="sync">☁️ Ortaq — hamı eyni siyahını görür</span>` : `<span class="sync warn">📱 Oflayn — ${S.pending.length} xərc göndərilməyi gözləyir</span>`;
  $("#expSum").innerHTML = `<div class="card mt"><div class="sm dim">Ümumi (${list.length} xərc)</div><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="font-size:32px">${fm(tot)} €</h2><span class="mute">≈ ${fm(tot * r.azn)} ₼</span></div>
   <div class="mt">${PEOPLE.map(p => { const b = s[p].paid - s[p].share; return `<div class="person"><div><b>${p}${p === ME ? " (sən)" : ""}</b><span class="s2">Payı ${fm(s[p].share)} € · Ödədi ${fm(s[p].paid)} €</span></div><div class="bal ${b > .009 ? "pos" : b < -.009 ? "neg" : ""}">${b > .009 ? "+" : ""}${fm(b)} €<span class="s2" style="font-weight:500">${b > .009 ? "alacaq" : b < -.009 ? "verəcək" : "bərabər"}</span></div></div>`; }).join("")}</div>
   ${(() => { const t = list.filter(e => e.tf); if (!t.length) return ""; const back = t.reduce((a, e) => a + tfBack(+e.eur), 0);
     const got = t.filter(e => e.tf_back != null), real = got.reduce((a, e) => a + (+e.tf_back || 0), 0), expGot = got.reduce((a, e) => a + tfBack(+e.eur), 0);
     return `<div class="alert mt" style="background:#EEF6FF"><span>🧾</span><div><b>Tax-free: ${t.length} çek · ≈ ${fm(back)} € gözlənilir</b>${got.length ? `<span>✅ Qayıdıb: <b>${fm(real)} €</b> (${got.length} çek, gözlənilən ≈ ${fm(expGot)} €${Math.abs(real - expGot) > 1 ? `, fərq ${real > expGot ? "+" : ""}${fm(real - expGot)} €` : ""}) — hesablaşmaya daxildir</span>` : ""}<span class="mute">20 noyabrda hava limanında, qeydiyyatdan ƏVVƏL gömrükdə möhürlət. Mallar istifadə olunmamış, çeklər və pasport yanında olsun.</span><button class="btn s mt" id="tfBackBtn">🧾 Qayıdan məbləği yaz</button></div></div>`; })()}
   <div class="mt"><b>🤝 Hesablaşma</b>${st.length ? st.map((x, i) => `<div class="settle" style="display:flex;align-items:center;gap:8px"><div class="grow"><b>${x.from}</b> → <b>${x.to}</b>: ${fm(x.v)} € <span class="dim">(${fm(x.v * r.azn)} ₼)</span></div>${x.from === ME || x.to === ME ? `<button class="btn s" data-paid="${i}">✓ Ödəndi</button>` : ""}</div>`).join("") : `<div class="sm mute">Hamı bərabərdir. 🎉</div>`}</div></div>`;
  const v = expUI.view, shown = v === "all" ? list : list.filter(e => e.payer === v || (e.parts || PEOPLE).includes(v));
  const my = v !== "all" ? shown.reduce((a, e) => { const ps = e.parts && e.parts.length ? e.parts : PEOPLE; return a + (ps.includes(v) ? (+e.eur || 0) / ps.length : 0); }, 0) : 0;
  const ft = fmtT;
  $("#expList").innerHTML = `${v !== "all" ? `<div class="card"><b>${v}</b>: öz payı ${fm(my)} € (≈ ${fm(my * r.azn)} ₼) · ödədiyi ${fm(s[v].paid)} €</div>` : ""}
   <div class="card mt"><ul class="list">${shown.length ? shown.map(e => { const ps = e.parts && e.parts.length ? e.parts : PEOPLE;
     return `<li><div class="grow"><b>${esc(e.d)}${e.pending ? " 📱" : ""}${e.tf ? ` <span class="tag" style="background:#EEF6FF;color:#2F6FB5">🧾 tax-free${e.tf_back != null ? " · " + fm(+e.tf_back) + " € qayıdıb" : ""}</span>` : ""}</b><span class="s2">${esc(e.payer)} ödədi · ${ps.length === 3 ? "hamı üçün" : esc(ps.join(", ")) + " üçün"}</span><span class="s2">${ft(e.ts)}${e.cur === "AZN" ? ` · ${fm(+e.orig)} ₼` : ""}</span></div><span class="km">${fm(+e.eur)} €<br><span class="dim" style="font-weight:500">${v !== "all" && ps.includes(v) ? "payı " + fm(e.eur / ps.length) : fm(e.eur * r.azn) + " ₼"}</span></span>${e.pending ? "" : `<button class="btn s" data-ed="${esc(e.id)}" aria-label="Düzəlt">✎</button><button class="btn s" data-del="${esc(e.id)}">✕</button>`}</li>`; }).join("") : `<li class="mute">Hələ xərc yoxdur.</li>`}</ul></div>`;
  bindDel();
}

/* ---------- map (MapLibre + OpenFreeMap: free, clean Google-like vector map, no key) ---------- */
let map = null, mapReady = false, selPoi = null, lastRoute = null;
const MK = { poi: [], me: null, hotel: null, fr: [], pick: [] };
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CEMO = { tarix: "🏛", muzey: "🖼", yemek: "🍽", bazar: "🎄", kilse: "⛪", park: "🌳", shop: "🛍", metro: "Ⓜ" };
const MAJOR = new Set(["stephansdom", "hofburg", "staatsoper", "rathaus", "karlskirche", "belvedere", "schonbrunn", "gloriette", "riesenrad", "hundertwasser", "khm", "naschmarkt", "parlament", "votiv", "xm-rathaus", "albertina", "central", "domschnitzel", "zaytouna", "xm-schonbrunn", "shop-kaerntner", "shop-graben", "shop-goldenes", "shop-wienmitte", "shop-mahue", "xm-karlsplatz", "xm-spittelberg"]);
S.filter = null; // null = today's plan only; "all" = everything; otherwise one category
const ML = () => window.maplibregl;
const fc = f => ({ type: "FeatureCollection", features: f });
const meHere = () => S.me && S.me.src === "gps" && inVienna(S.me.lat, S.me.lng);
function mapGo(lat, lng, z) { if (map) map.easeTo({ center: [lng, lat], zoom: z == null ? map.getZoom() : z, duration: 600 }); }
function circlePoly(lat, lng, r, n = 48) { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; pts.push([lng + r / (111320 * Math.cos(lat * Math.PI / 180)) * Math.cos(a), lat + r / 110540 * Math.sin(a)]); } return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [pts] } }; }
function setSrc(id, data) { if (!map || !mapReady) return; const s = map.getSource(id); if (s) s.setData(data); }
function addMk(el, lng, lat, anchor) { return new (ML().Marker)({ element: el, anchor: anchor || "center" }).setLngLat([lng, lat]).addTo(map); }
function fitTo(pts, maxZ, minZ) {
  if (!map || !pts.length) return;
  if (pts.length === 1) return mapGo(pts[0].lat, pts[0].lng, maxZ || 16);
  const b = new (ML().LngLatBounds)(); pts.forEach(p => b.extend([p.lng, p.lat]));
  // never fly far out of the city: if the box is too big, just centre on it at a sane zoom
  const cam = map.cameraForBounds ? map.cameraForBounds(b, { padding: { top: 90, bottom: 120, left: 40, right: 70 }, maxZoom: maxZ || 16.5 }) : null;
  if (cam && minZ && cam.zoom < minZ) return map.easeTo({ center: cam.center, zoom: minZ, bearing: 0, pitch: 0, duration: 450 });
  map.fitBounds(b, { padding: { top: 90, bottom: 120, left: 40, right: 70 }, maxZoom: maxZ || 16.5, duration: 450, bearing: 0, pitch: 0 });
}
const ML_JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js", ML_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
let mlLoading = null;
function loadMapLib() {
  if (window.maplibregl) return Promise.resolve();
  if (mlLoading) return mlLoading;
  mlLoading = new Promise((ok, bad) => {
    if (!document.querySelector(`link[href="${ML_CSS}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = ML_CSS; l.crossOrigin = ""; document.head.appendChild(l); }
    const sc = document.createElement("script"); sc.src = ML_JS; sc.crossOrigin = ""; sc.onload = () => ok(); sc.onerror = () => { mlLoading = null; bad(); };
    document.head.appendChild(sc);
  });
  return mlLoading;
}
function initMap() {
  if (map) return;
  if (!window.maplibregl) {
    if (!$("#map .card")) $("#map").innerHTML = `<div class="card" style="margin:70px 16px"><span class="spin"></span> Xəritə yüklənir…</div>`;
    loadMapLib().then(() => { if (!map) { $("#map").innerHTML = ""; initMap(); if (map) setTimeout(() => { map.resize(); renderNear(); }, 50); } })
      .catch(() => { $("#map").innerHTML = `<div class="card" style="margin:70px 16px">Xəritə yüklənmədi — internet zəifdir. <button class="btn s mt" onclick="initMap()">🔄 Yenidən</button> <a class="btn s mt" href="https://www.google.com/maps/@48.2082,16.3719,15z" target="_blank" rel="noopener">Google Maps</a></div>`; });
    return;
  }
  const fail = () => { map = null; $("#map").innerHTML = `<div class="card" style="margin:70px 16px">Xəritə yüklənmədi. İnterneti yoxla. <a class="btn s mt" href="https://www.google.com/maps/@48.2082,16.3719,15z" target="_blank" rel="noopener">Google Maps-da aç</a></div>`; };
  if (!ML()) return fail();
  const c = meHere() ? S.me : (S.hotel || { lat: 48.2085, lng: 16.3745 });
  try {
    $("#map").innerHTML = "";
    map = new (ML().Map)({ container: "map", style: MAP_STYLE, center: [c.lng, c.lat], zoom: meHere() ? 15.5 : 14.5, minZoom: 10, maxZoom: 19, dragRotate: false, pitchWithRotate: false, touchPitch: false, attributionControl: { compact: true } });
  } catch (e) { return fail(); }
  window.__map = map;
  try { map.touchZoomRotate.disableRotation(); } catch (e) {}
  map.on("load", () => {
    mapReady = true;
    // the base map has its own shop/restaurant icons: hide them so only our pins show (keep metro/train stations)
    try { (map.getStyle().layers || []).forEach(l => { if (/^poi/.test(l.id) && !/transit|rail|station|subway/.test(l.id)) map.setLayoutProperty(l.id, "visibility", "none"); }); } catch (e) {}
    const src = id => map.addSource(id, { type: "geojson", data: fc([]) });
    src("alerts"); src("meacc"); src("route");
    map.addLayer({ id: "alerts", type: "fill", source: "alerts", paint: { "fill-color": "#C8102E", "fill-opacity": 0.13 } });
    map.addLayer({ id: "alerts-line", type: "line", source: "alerts", paint: { "line-color": "#C8102E", "line-width": 2, "line-dasharray": [3, 2] } });
    map.addLayer({ id: "meacc", type: "fill", source: "meacc", paint: { "fill-color": "#2F6FB5", "fill-opacity": 0.1 } });
    map.addLayer({ id: "route", type: "line", source: "route", filter: ["!=", ["get", "d"], 1], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#C8102E", "line-width": 6, "line-opacity": 0.85 } });
    map.addLayer({ id: "route-d", type: "line", source: "route", filter: ["==", ["get", "d"], 1], layout: { "line-cap": "round" }, paint: { "line-color": "#C8102E", "line-width": 5, "line-dasharray": [0.5, 2] } });
    mapAlerts(); mapMe(); if (lastRoute) drawRoute(lastRoute.line, lastRoute.real, false);
  });
  map.on("moveend", drawPOI);
  map.on("click", () => { if (selPoi) { selPoi = null; drawPOI(); } });
  map.on("error", () => {}); // offline tiles: keep the pins working
  map.on("webglcontextlost", () => { try { setTimeout(() => map && map.triggerRepaint(), 500); } catch (e) {} });
  drawPOI(); renderNear(); mapHotel(); mapFriends(); mapMe(); mapAlerts(); mapPick();
  if (!meHere() && S.filter == null) setTimeout(() => fitTo(planStops().concat(S.hotel ? [S.hotel] : [])), 50);
}
// today's plan stops (before the trip: day 1), numbered in order
function planStops() {
  const now = vNow(); let day = PLAN.find(d => d.d === now.date); if (!day && now.date < PLAN[0].d) day = PLAN[0]; if (!day) return [];
  const seen = new Set(), out = [];
  day.items.forEach(it => { const id = it[3]; if (!id || id === "hotel" || /^u-/.test(id) || seen.has(id) || !byId[id]) return; seen.add(id); out.push(Object.assign({}, byId[id], { _n: out.length + 1, _t: it[0] })); });
  return out;
}
function visiblePois() { if (S.filter === "steak") return pickPois(); return S.filter == null ? planStops() : POI.filter(p => S.filter === "all" ? p.cat !== "metro" : p.cat === S.filter); }
function pinEl(p, num, lbl) {
  const el = document.createElement("div");
  el.className = "pin" + (selPoi === p.id ? " sel" : "") + (p.g && p.g < MIN_R ? " low" : "");
  el.dataset.id = p.id; el.style.setProperty("--c", CAT[p.cat] ? CAT[p.cat].c : "#888");
  el.innerHTML = `<b><i>${num != null ? num : (CEMO[p.cat] || "•")}</i></b>${lbl ? `<span class="pl">${esc(short(p.name))}</span>` : ""}`;
  el.addEventListener("click", ev => { ev.stopPropagation(); selectPoi(p.id); });
  return el;
}
function drawPOI() {
  if (!map) return;
  MK.poi.forEach(m => m.remove()); MK.poi = [];
  const list = visiblePois(), z = map.getZoom(), plan = S.filter == null;
  // group pins that would overlap on screen into one numbered bubble (Google-style clustering)
  const groups = [];
  if (!plan && z < 16.5 && list.length > 6) {
    const cell = 52, g = new Map();
    list.forEach(p => { const pt = map.project([p.lng, p.lat]), k = Math.floor(pt.x / cell) + ":" + Math.floor(pt.y / cell); if (!g.has(k)) g.set(k, []); g.get(k).push(p); });
    g.forEach(v => groups.push(v));
  } else list.forEach(p => groups.push([p]));
  groups.forEach(gr => {
    if (gr.length === 1 || gr.some(p => p.id === selPoi)) {
      gr.forEach(p => MK.poi.push(addMk(pinEl(p, plan ? p._n : null, plan || z >= 16 || p.id === selPoi), p.lng, p.lat, "bottom")));
      return;
    }
    const lat = gr.reduce((a, p) => a + p.lat, 0) / gr.length, lng = gr.reduce((a, p) => a + p.lng, 0) / gr.length;
    const el = document.createElement("div"); el.className = "clu"; el.textContent = gr.length;
    const cats = new Set(gr.map(p => p.cat)); el.style.setProperty("--c", cats.size === 1 ? CAT[gr[0].cat].c : "#3B3631");
    el.addEventListener("click", ev => { ev.stopPropagation(); fitTo(gr, 18); });
    MK.poi.push(addMk(el, lng, lat, "center"));
  });
}
function selectPoi(id, fly) {
  const p = byId[id]; if (!p) return; selPoi = id; drawPOI();
  if (fly && map) mapGo(p.lat, p.lng, Math.max(map.getZoom(), 16));
  openPoi(p);
}
// bottom cards: today's plan, or the nearest places of the chosen category
function renderNear() {
  const box = $("#nearBar"); if (!box) return;
  const ref = meHere() ? S.me : (map ? (c => ({ lat: c.lat, lng: c.lng }))(map.getCenter()) : S.hotel);
  let cards;
  if (S.filter == null) {
    const st = planStops(); const today = PLAN.some(d => d.d === vNow().date);
    cards = st.length ? `<div class="nc lbl0">📅 ${today ? "Bugünkü plan" : "17 noyabr planı"}<span>kateqoriya seç ↑</span></div>` + st.map(p => `<button class="nc" data-p="${p.id}"><b><em style="background:${CAT[p.cat].c}">${p._n}</em>${esc(short(p.name))}</b><span>${p._t}${ref ? " · " + fmtKm(walkM(dist(ref, p))) : ""}</span></button>`).join("") : "";
  } else {
    const l = visiblePois().filter(okFood).map(p => ({ p, d: ref ? dist(ref, p) : 0 })).sort((a, b) => a.d - b.d).slice(0, 10);
    const all = visiblePois().filter(okFood).length;
    cards = (all ? `<button class="nc" id="listBtn" style="background:#3B3631;color:#fff"><b>☰ Siyahı</b><span style="color:#ddd">${all} yer</span></button>` : "") + l.map(({ p, d }) => `<button class="nc" data-p="${p.id}"><b>${CEMO[p.cat] || ""} ${esc(short(p.name))}</b><span>${p.g ? "★" + p.g + " · " : ""}${dol(p) ? dol(p) + " · " : ""}${ref ? (d > 15000 ? Math.round(d / 1000) + " km · şəhərdən kənar" : fmtKm(walkM(d)) + " · " + walkMin(d) + " dəq") : ""}</span></button>`).join("");
  }
  box.innerHTML = cards; box.hidden = !cards; box.scrollLeft = 0;
  box.querySelectorAll("[data-p]").forEach(b => b.onclick = () => selectPoi(b.dataset.p, true));
  const lb = $("#listBtn"); if (lb) lb.onclick = openList;
}
function openList() {
  const ref = meHere() ? S.me : (map ? (c => ({ lat: c.lat, lng: c.lng }))(map.getCenter()) : S.hotel);
  const l = visiblePois().filter(okFood).map(p => ({ p, d: ref ? dist(ref, p) : 0 })).sort((a, b) => a.d - b.d);
  const name = ((S.filter === "steak" ? [["steak", (S.pick && S.pick.chip) || "🥩 Steaklər"]] : []).concat(FL).find(x => x[0] === S.filter) || [0, "Yerlər"])[1];
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">${esc(name)} · ${l.length}</h3>
   ${l.map(({ p, d }) => `<button class="card mt" data-lp="${esc(p.id)}" style="display:block;width:100%;text-align:left;border:1px solid var(--line)"><b>${CEMO[p.cat] || ""} ${esc(p.name)}</b><div class="sm" style="margin-top:3px">${p.g ? `<span class="rt">★ ${String(p.g).replace(".", ",")}</span>${p.n ? ` <span class="dim">(${p.n >= 1000 ? Math.round(p.n / 1000) + "k" : p.n})</span>` : ""} · ` : ""}${ref ? (d > 15000 ? Math.round(d / 1000) + " km" : fmtKm(walkM(d)) + " · " + walkMin(d) + " dəq piyada") : ""}</div>${p.lvl ? `<div class="sm" style="margin-top:3px"><b style="color:#2E7D32">${dol(p)}</b> <span class="dim">${esc(LVLS[Math.min(3, p.lvl)].replace(/^\$+ /, ""))}</span></div>` : ""}${p.d ? `<div class="sm dim" style="margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.d)}</div>` : ""}</button>`).join("")}
   <button class="btn wide mt" id="lsClose">Bağla</button>`;
  $$("[data-lp]").forEach(b => b.onclick = () => { $("#bigModal").classList.remove("on"); selectPoi(b.dataset.lp, true); });
  $("#lsClose").onclick = () => $("#bigModal").classList.remove("on");
  $("#bigModal").classList.add("on"); useTrack("list");
}
function setFilter(f) {
  S.filter = S.filter === f ? null : f; selPoi = null;
  $$("#filters .chip").forEach(x => x.classList.toggle("on", x.dataset.f === S.filter));
  $("#sheet").classList.remove("on");
  drawPOI(); renderNear();
  if (!map) return;
  if (S.filter == null) return fitTo(planStops().concat(meHere() ? [S.me] : []));
  const ref = meHere() ? S.me : map.getCenter();
  const city = { lat: 48.2085, lng: 16.3721 }; // Stephansplatz
  const near = visiblePois().filter(p => dist(city, p) < 7000).map(p => ({ p, d: dist(ref, p) })).sort((a, b) => a.d - b.d).slice(0, S.filter === "all" ? 25 : 8).map(x => x.p);
  if (near.length) fitTo(near.concat(meHere() ? [S.me] : []), 16, 11.5);
}
function mapMe() {
  if (!map) return; if (MK.me) { MK.me.remove(); MK.me = null; }
  setSrc("meacc", fc(S.me && S.me.acc && S.me.acc < 300 ? [circlePoly(S.me.lat, S.me.lng, S.me.acc)] : []));
  if (!S.me) return; const el = document.createElement("div"); el.className = "medot"; el.style.pointerEvents = "none";
  MK.me = addMk(el, S.me.lng, S.me.lat, "center");
}
function mapAlerts() { if (map) setSrc("alerts", fc(todaysAlerts().filter(a => a.lat && a.level !== "info").map(a => circlePoly(a.lat, a.lng, a.r || 300)))); }
function mapHotel() {
  if (!map) return; if (MK.hotel) { MK.hotel.remove(); MK.hotel = null; } if (!S.hotel) return;
  const el = document.createElement("div"); el.className = "hpin"; el.textContent = "🏨";
  el.addEventListener("click", ev => { ev.stopPropagation(); routeTo({ id: "hotel", name: S.hotel.name || "Otel", lat: S.hotel.lat, lng: S.hotel.lng, cat: "tarix", d: "Otelimiz" }); });
  MK.hotel = addMk(el, S.hotel.lng, S.hotel.lat, "center");
}
function mapFriends() {
  if (!map) return; MK.fr.forEach(m => m.remove()); MK.fr = [];
  friendsList().forEach(f => { const el = document.createElement("div"); el.className = "friend"; el.innerHTML = `<i>${esc(f.n[0])}</i>${esc(f.n)}`; el.addEventListener("click", ev => { ev.stopPropagation(); groupSheet(); }); MK.fr.push(addMk(el, f.lng, f.lat, "left")); });
}
function drawRoute(line, real, fit = true) {
  lastRoute = { line, real }; if (!map) return;
  setSrc("route", fc([{ type: "Feature", properties: { d: real ? 0 : 1 }, geometry: { type: "LineString", coordinates: line.map(c => [c.lng, c.lat]) } }]));
  if (fit) { const b = new (ML().LngLatBounds)(); line.forEach(c => b.extend([c.lng, c.lat])); map.fitBounds(b, { padding: { top: 80, bottom: Math.round(innerHeight * 0.5), left: 40, right: 60 }, maxZoom: 17, duration: 600 }); }
}
const FL = [["all", "Hamısı"], ["tarix", "🏛 Görməli"], ["muzey", "🖼 Muzey"], ["yemek", "🍽 Yemək"], ["bazar", "🎄 Bazar"], ["shop", "🛍 Mağaza"], ["kilse", "⛪ Kilsə"], ["park", "🌳 Park"], ["metro", "Ⓜ Metro"]];
function renderFilters() {
  const fl = (pickList().length ? [["steak", (S.pick && S.pick.chip) || "🥩 Steaklər"]] : []).concat(FL);
  if (S.filter === "steak" && !pickList().length) S.filter = null;
  $("#filters").innerHTML = fl.map(([k, t]) => `<button class="chip ${k === "steak" ? "hot" : ""} ${S.filter === k ? "on" : ""}" data-f="${k}" >${t}</button>`).join("");
  $$("#filters .chip").forEach(b => b.onclick = () => setFilter(b.dataset.f));
}
renderFilters();
$("#grpBtn").classList.toggle("on", !!S.share);
$("#grpBtn").onclick = groupSheet;
$("#hotBtn").onclick = () => { routeTo({ id: "hotel", name: S.hotel.name || "Otel", lat: S.hotel.lat, lng: S.hotel.lng, cat: "tarix", d: "" }); };
$("#meBtn").onclick = () => { if (S.gps !== "on" && S.gps !== "denied") startGPS(); if (S.me && map) mapGo(S.me.lat, S.me.lng, 17); else $("#locChip").click(); };
$("#sheetX").onclick = () => { $("#sheet").classList.remove("on"); if (selPoi) { selPoi = null; drawPOI(); } };
const IGTAG = {"stephansdom": "stephansdom", "hofburg": "hofburg", "reitschule": "spanischehofreitschule", "staatsoper": "wienerstaatsoper", "albertina": "albertina", "rathaus": "wienerrathaus", "burgtheater": "burgtheater", "parlament": "parlamentwien", "votiv": "votivkirche", "uni": "univie", "khm": "kunsthistorischesmuseum", "nhm": "naturhistorischesmuseum", "mq": "museumsquartier", "karlskirche": "karlskirche", "secession": "secession", "naschmarkt": "naschmarkt", "belvedere": "belvedere", "schonbrunn": "schoenbrunn", "gloriette": "gloriette", "zoo": "tiergartenschoenbrunn", "riesenrad": "riesenrad", "hundertwasser": "hundertwasserhaus", "kunsthaus": "kunsthauswien", "peterskirche": "peterskirche", "graben": "pestsaeule", "kohlmarkt": "kohlmarkt", "amhof": "amhof", "freyung": "freyung", "ruprecht": "ruprechtskirche", "mozarthaus": "mozarthaus", "stadtpark": "stadtparkwien", "burggarten": "palmenhaus", "volksgarten": "volksgarten", "heldenplatz": "heldenplatz", "ankeruhr": "ankeruhr", "judenplatz": "judenplatz", "augustiner": "augustinerkirche", "kapuziner": "kapuzinergruft", "hausdermusik": "hausdermusik", "minoriten": "minoritenkirche", "donauturm": "donauturm", "domschnitzel": "domschnitzel", "figlmuller": "figlmueller", "reinthalerbeisl": "reinthalersbeisl", "gasthausreinthaler": "gasthausreinthaler", "melker": "melkerstiftskeller", "plachutta": "plachutta", "zaytouna": "alzaytouna", "shakomaako": "shakomaako", "kameel": "schwarzeskameel", "central": "cafecentral", "landtmann": "cafelandtmann", "demel": "demel", "sacher": "cafesacher", "neni": "neniamnaschmarkt", "papas": "papasamnaschmarkt", "bitzinger": "bitzinger", "xm-rathaus": "wienerchristkindlmarkt", "xm-stephan": "stephansplatz", "xm-schonbrunn": "schoenbrunnchristmasmarket", "xm-amhof": "amhof", "xm-freyung": "freyung", "xm-karlsplatz": "artadvent", "xm-spittelberg": "spittelberg", "shop-kaerntner": "kaerntnerstrasse", "shop-graben": "graben", "shop-goldenes": "goldenesquartier", "shop-wienmitte": "wienmitte", "shop-mahue": "mariahilferstrasse", "shop-donauzentrum": "donauzentrum", "shop-parndorf": "designeroutletparndorf"};
const igTag = p => (IGTAG[p.id] || String(short(p.name)).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/ə/g, "e").replace(/[^a-z0-9]/g, "")).slice(0, 40);
// the same quick links for every place: Google (photos + reviews), Instagram, site, call
function placeLinks(p) {
  if (!p || p.cat === "metro" || p.id === "hotel") return "";
  const x = p.pick || {}, web = x.web || p.web, tel = x.tel || p.tel;
  const ig = /^https:\/\/(www\.)?instagram\.com\//.test(x.ig || p.ig || "") ? (x.ig || p.ig) : (igTag(p) ? `https://www.instagram.com/explore/tags/${encodeURIComponent(igTag(p))}/` : "");
  return `<div class="pbtns mt"><a class="btn" href="${gPlace(p)}" target="_blank" rel="noopener">📸 Şəkillər və rəylər</a>${ig ? `<a class="btn" href="${esc(ig)}" target="_blank" rel="noopener">📷 Instagram${(x.ig || p.ig) ? "" : " #" + esc(igTag(p))}</a>` : ""}${/^https:\/\//.test(web || "") ? `<a class="btn" href="${esc(web)}" target="_blank" rel="noopener">🌐 Sayt / menyu</a>` : ""}${tel ? `<a class="btn" href="tel:${esc(String(tel).replace(/[^+\d]/g, ""))}">📞 Zəng et</a>` : ""}</div>`;
}
function openPoi(p) {
  const d = S.me ? dist(S.me, p) : null, an = alertNear(p);
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">${esc(p.name)}</h3><div>${rating(p)} ${pills(p)}</div>
   ${p.g && p.g < MIN_R ? `<div class="note" style="color:#B5651D">Reytinq aşağıdır, tövsiyə etmirəm.</div>` : ""}${an ? `<div class="alert mt"><span>⚠️</span><div><b>${esc(an.title)}</b><span class="mute">${esc(an.detail)}</span></div></div>` : ""}
   <p class="mute" style="margin:8px 0">${esc(p.d)}</p>${price(p) ? `<div class="sm">💶 ${esc(price(p))}</div>` : ""}
   ${d != null ? `<div class="stat"><div><b>${walkMin(d)} dəq</b><span>piyada</span></div><div><b>${fmtKm(walkM(d))}</b><span>məsafə</span></div></div>` : ""}
   ${TICKETS[p.id] ? `<div class="note">🎟 ${esc(TICKETS[p.id][1])}</div>` : ""}${PHOTO[p.id] ? `<div class="note">📸 ${esc(PHOTO[p.id][0])} <b>${esc(PHOTO[p.id][1])}</b></div>` : ""}
   <div class="pbtns mt"><button class="btn pri" id="pGo">🧭 Get</button><a class="btn" href="${uberLink(p)}" target="_blank" rel="noopener">🚕 Uber</a>${TICKETS[p.id] ? `<a class="btn" href="${TICKETS[p.id][0]}" target="_blank" rel="noopener">🎟 Bilet</a>` : ""}<button class="btn" id="pTell">🔊 Hekayə</button><a class="btn" href="${gPlace(p)}" target="_blank" rel="noopener">🗺 Google Maps</a></div>`;
  $("#sheetBody").insertAdjacentHTML("beforeend", placeLinks(p));
  $("#sheet").scrollTop = 0; $("#sheet").classList.add("on"); $("#pGo").onclick = () => routeTo(p); $("#pTell").onclick = () => tellAbout(p);
}
function segOff(a, b, pt) { const kx = 111320 * Math.cos(48.2 * Math.PI / 180), ky = 111320; const ax = a.lng * kx, ay = a.lat * ky, bx = b.lng * kx, by = b.lat * ky, px = pt.lng * kx, py = pt.lat * ky, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); }
function lineOff(line, pt) { let m = 1e9; for (let i = 1; i < line.length; i++) m = Math.min(m, segOff(line[i - 1], line[i], pt)); return m; }
async function routeTo(p) {
  if (!p) return; S.dest = p; if (!map) initMap();
  const from = S.me || planGuess();
  if (!from) { toast("Yerini tapa bilmirəm — GPS-ə icazə ver"); openPoi(p); return; }
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">→ ${esc(short(p.name))}</h3><div class="mt"><span class="spin"></span> Marşrut hesablanır…</div>`; $("#sheet").classList.add("on");
  let line = [{ lat: from.lat, lng: from.lng }, { lat: p.lat, lng: p.lng }], meters = walkM(dist(from, p)), mins = walkMin(dist(from, p)), real = false;
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${from.lng},${from.lat};${p.lng},${p.lat}?overview=full&geometries=geojson`, { signal: ctl.signal });
    const j = await r.json(); if (j.routes && j.routes[0]) { line = j.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })); meters = Math.round(j.routes[0].distance); mins = Math.max(1, Math.round(meters / 75)); real = true; }
  } catch (e) {}
  drawRoute(line, real);
  const along = POI.filter(x => x.id !== p.id && dist(x, from) > 60 && dist(x, p) > 60 && okFood(x) && lineOff(line, x) < 120).map(x => ({ x, d: dist(from, x) })).sort((a, b) => a.d - b.d).slice(0, 10);
  const blocks = todaysAlerts().filter(a => a.lat && a.level !== "info" && lineOff(line, a) <= (a.r || 300));
  const far = meters > 2200, cats = c => along.filter(a => a.x.cat === c).length;
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">→ ${esc(short(p.name))}</h3>
   ${blocks.map(a => `<div class="alert mt"><span>⚠️</span><div><b>Yolda: ${esc(a.title)}</b><span class="mute">${esc(a.detail)} Taksi bu yeri dolanıb keçəcək.</span></div></div>`).join("")}
   <div class="stat"><div><b>${mins} dəq</b><span>piyada</span></div><div><b>${fmtKm(meters)}</b><span>${real ? "real yol" : "təxmini"}</span></div>${far ? `<div><b>🚕</b><span>taksi daha rahat</span></div>` : ""}</div>
   ${far || blocks.length || vNow().mins >= 21 * 60 ? taxiBlock(p, meters, true) : ""}
   <div class="row mt"><a class="btn ${far || blocks.length ? "" : "pri"}" href="${gDir(p, "walking")}" target="_blank" rel="noopener">🚶 Piyada (Google)</a><a class="btn" href="${gDir(p, "transit")}" target="_blank" rel="noopener">🚌 Avtobus/metro</a></div>
   ${far || blocks.length || vNow().mins >= 21 * 60 ? "" : taxiBlock(p, meters, false)}
   <div class="chips mt">${[["tarix", "🏛"], ["kilse", "⛪"], ["muzey", "🖼"], ["yemek", "🍽"], ["bazar", "🎄"], ["metro", "Ⓜ"]].map(([c, e]) => `<span class="pill" style="${cats(c) ? "" : "opacity:.4"}">${e} ${cats(c) ? "✓ " + cats(c) : "✗"}</span>`).join("")}</div>
   ${along.length ? `<div class="sm dim mt">Yol boyunca:</div><ul class="list">${along.map(a => `<li data-p="${a.x.id}" style="cursor:pointer;padding:9px 0"><span class="dot" style="background:${CAT[a.x.cat].c}"></span><div class="grow"><b style="font-weight:600">${esc(short(a.x.name))}</b> ${a.x.g ? `<span class="rt">★${a.x.g}</span>` : ""}</div><span class="dim sm">${fmtKm(a.d)}</span></li>`).join("")}</ul>` : ""}`;
  $$("#sheetBody [data-p]").forEach(li => li.onclick = () => openPoi(byId[li.dataset.p]));
  $$("#sheetBody [data-taxicard]").forEach(b => b.onclick = () => p.id === "hotel" ? taxiCard() : destCard(p));
}

/* ---------- plan & more ---------- */
let planDay = 0, moreTab = "plan";
function renderPlan() {
  const now = vNow();
  $("#dayTabs").innerHTML = PLAN.map((d, i) => `<button data-d="${i}" class="${i === planDay ? "on" : ""}">${d.t.split(" ")[0]} noy${d.d === now.date ? " · bu gün" : ""}</button>`).join("");
  $$("#dayTabs button").forEach(b => b.onclick = () => { planDay = +b.dataset.d; renderPlan(); });
  const d = PLAN[planDay]; const today = d.d === now.date; const eff = effPlan(d.d); const nxe = today ? nextEff(d.d, now.mins) : null; const nextIdx = nxe ? d.items.indexOf(nxe.it) : -1; const shP = dayShift(d.d);
  $("#planBody").innerHTML = `<h2 style="font-size:23px">${esc(d.title)}</h2><div class="sm dim" style="margin-bottom:10px">${d.t}, ${d.w}</div>
   ${shP ? `<div class="shbar">⏱ Saatlar real vaxta görə <b>${shP > 0 ? "+" : ""}${shP} dəq</b> sürüşdürülüb</div>` : ""}
   <div class="card"><ul class="tl">${d.items.map((it, k) => { const p = it[3] ? byId[it[3]] : null, e = eff[k]; return `<li class="${k === nextIdx ? "now" : ""}${e.skip ? " skip" : ""}${e.done ? " done" : ""}"><div class="t">${e.moved ? "~" + fmtHM(e.m) + `<s>${it[0]}</s>` : it[0]}</div><div class="x2"><b>${e.done ? "✓ " : ""}${esc(it[1])}</b>${!e.fixed && (e.skip || !e.done) ? `<a class="lnk sk" data-skip="${encodeURIComponent(iKey(it))}">${e.skip ? "↩︎ Qaytar" : "Keç"}</a>` : ""}<span>${esc(it[2])}</span>${p ? `<div style="margin-top:6px"><a class="lnk" data-route="${p.id}">🧭 Get</a><a class="lnk" data-tell="${p.id}">🔊 Hekayə</a>${p.pid ? `<a class="lnk" href="${gPlace(p)}" target="_blank" rel="noopener">Google</a>` : ""}</div>` : ""}</div></li>`; }).join("")}</ul></div>
   ${planDay === 3 ? `<div class="alert mt"><span>✈️</span><div><b>Uçuş 12:00 (Vyana vaxtı), Terminal 1 → Bakı 19:05</b><span class="mute">10:00-da hava limanında ol. CAT avtobusu Wien Mitte (Marxergasse 1b). Wien Mitte S-Bahn bağlıdır, U3/U4 işləyir.</span></div></div>` : ""}`;
  if (d.d <= now.date) { $("#planBody").insertAdjacentHTML("beforeend", summaryHTML(d.d, d.d === now.date ? "📊 Bu gün indiyədək" : "📊 Günün xülasəsi")); $$("#planBody [data-share]").forEach(b => b.onclick = () => shareSummary(b.dataset.share)); }
  const bks = (typeof BOOK !== "undefined" ? BOOK : []).filter(b => vDate(b.at) === d.d);
  if (bks.length) $("#planBody .card").insertAdjacentHTML("afterbegin", `<div class="sm dim" style="font-weight:700">🎟 Rezervlər</div><ul class="tl" style="margin-bottom:8px">${bks.map(b => `<li><div class="t">${hhmm(b.at)}</div><div class="x2"><b>${esc(b.title)}</b><span>${esc(b.place || "")}${b.note ? " · " + esc(b.note) : ""}</span></div></li>`).join("")}</ul>`);
  $$("#planBody [data-route]").forEach(a => a.onclick = () => { goView("map"); routeTo(byId[a.dataset.route]); });
  $$("#planBody [data-skip]").forEach(a => a.onclick = () => { toggleSkip(d.d, decodeURIComponent(a.dataset.skip)); renderPlan(); });
  $$("#planBody [data-tell]").forEach(a => a.onclick = () => tellAbout(byId[a.dataset.tell]));
}
$$("#moreTabs button").forEach(b => b.onclick = () => { moreTab = b.dataset.t; useTrack("more:" + moreTab); $$("#moreTabs button").forEach(x => x.classList.toggle("on", x === b)); renderMore(); });
function renderMore() {
  $$("#moreTabs button").forEach(x => x.classList.toggle("on", x.dataset.t === moreTab));
  const plan = moreTab === "plan"; $("#morePlan").hidden = !plan; $("#moreBody").hidden = plan;
  if (plan) return renderPlan();
  const B = $("#moreBody");
  if (moreTab === "info") {
    B.innerHTML = `<button class="btn pri wide" id="helpBtn2">❓ Necə istifadə edim?</button><div class="card mt"><h3>📶 İnternetsiz</h3><p class="mute sm">Xəritədə baxdığın hissələr telefonda yadda qalır və internet olmayanda da açılır. Tərcümə ifadələri, hekayələr, plan və otel məlumatı da internetsiz işləyir.</p></div>
     <div class="card mt"><h3>🎟 Biletlər (rəsmi saytlar)</h3><ul class="list">${Object.entries(TICKETS).filter(([id]) => byId[id]).map(([id, t]) => `<li><div class="grow"><b>${esc(short(byId[id].name))}</b>${byId[id].pr ? `<span class="s2">💶 ${esc(byId[id].pr)}</span>` : ""}<span class="s2">${esc(t[1])}</span></div><a class="btn s" href="${t[0]}" target="_blank" rel="noopener">Bilet ›</a></li>`).join("")}</ul></div>` + INFO_HTML;
    $("#helpBtn2").onclick = helpScreen;
  }
  if (moreTab === "alb") renderAlbum(B);
  if (moreTab === "pack") renderPack(B);
  if (moreTab === "hotel") {
    const h = S.hotel || HOTEL0, d = S.me ? dist(S.me, h) : null;
    B.innerHTML = `<div class="card"><div class="sm dim">🏨 Otelimiz</div><h3 style="font-size:21px;margin:2px 0 6px">${esc(h.name || "Otel")}</h3>
      <div class="mute">${esc(h.addr || "")}</div>
      ${d != null ? `<div class="stat"><div><b>${walkMin(d)} dəq</b><span>piyada</span></div><div><b>${fmtKm(walkM(d))}</b><span>buradan</span></div></div>` : ""}
      <button class="btn pri wide mt" id="hGo">🧭 Otelə qayıt</button>
      <div class="row mt"><button class="btn grow" id="hTaxi">🚕 Taksiyə göstər</button>${h.phone ? `<a class="btn grow" href="tel:${esc(h.phone.replace(/\s/g, ""))}">📞 Zəng et</a>` : ""}</div>
      <ul class="list mt">
        ${h.ci ? `<li><span>🔑</span><div class="grow"><b>Check-in</b><span class="s2">${esc(h.ci)}</span></div></li>` : ""}
        ${h.co ? `<li><span>🧳</span><div class="grow"><b>Check-out</b><span class="s2">${esc(h.co)}</span></div></li>` : ""}
      </ul>
      <div class="note">🛎 Otelin 24 saat resepsiyası var. 12:00–13:00-da çatırsınız, check-in 15:00-dandır — çantaları resepsiyada saxlatmağı xahiş edin. Yaxınlıqda: Schwedenplatz (U1/U4) 5 dəq, Stephansdom ~12 dəq piyada. Check-in/out saatlarını Booking təsdiqində yoxla.</div></div>
     <details class="card mt"><summary class="sm mute">✏️ Otel məlumatını düzəlt</summary>
      <input class="inp mt" id="hName" placeholder="Otelin adı" value="${esc(h.name || "")}">
      <input class="inp mt" id="hAddr" placeholder="Ünvan" value="${esc(h.addr || "")}">
      <button class="btn wide mt" id="hSave">💾 Yadda saxla</button>
      <button class="btn wide mt" id="hSet" ${S.me ? "" : "disabled"}>📍 İndi oteldəyəm — xəritədə yerini dəqiqləşdir</button></details>`;
    const back = () => { goView("map"); routeTo({ id: "hotel", name: h.name || "Otel", lat: h.lat, lng: h.lng, cat: "tarix", d: "" }); };
    $("#hGo").onclick = back; $("#hTaxi").onclick = taxiCard;
    const save = async v => { S.hotel = v; LS.set("hotel", v); mapHotel(); try { await api("kv.set", { key: "hotel", value: v }); toast("🏨 Yadda saxlandı (hamı üçün)"); } catch (e) { toast("Yadda saxlandı (yalnız bu telefonda)"); } renderMore(); };
    $("#hSave").onclick = () => save(Object.assign({}, h, { name: $("#hName").value.trim() || h.name, addr: $("#hAddr").value.trim() }));
    $("#hSet").onclick = () => save(Object.assign({}, h, { lat: S.me.lat, lng: S.me.lng }));
  }
}
const PACK = [["Pasport (etibarlılıq 3+ ay)", "doc"], ["Şengen vizası / uçuş biletləri", "doc"], ["Tibbi sığorta", "doc"], ["Otel təsdiqi (telefonda)", "doc"], ["Bank kartı + bir az nağd avro", "pul"], ["Telefonda internet (roaming və ya eSIM)", "tel"], ["Powerbank + adapter lazım deyil (Avstriyada da eyni rozetka)", "tel"], ["Bu tətbiq ana ekranda + yerə icazə verilib", "tel"], ["İsti palto, şərf, əlcək (2–7°)", "geyim"], ["Rahat, su keçirməyən ayaqqabı", "geyim"], ["Kiçik çətir", "geyim"], ["Lazımi dərmanlar", "sağlıq"], ["Alış-veriş üçün boş yer çamadanda 😄", "geyim"]];
function packState() { return LS.get("pack." + (ME || "x"), {}); }
function packDone() { const st = packState(); return { n: PACK.filter((_, i) => st[i]).length, t: PACK.length }; }
function renderPack(B) {
  const st = packState(), d = packDone();
  B.innerHTML = `<div class="card"><h3>🧳 Hazırlıq${ME ? " — " + esc(ME) : ""}</h3><div class="sm dim">${d.n}/${d.t} hazırdır${d.n === d.t ? " — əla, yola hazırsan! 🎉" : ""}</div>
   <div class="bar mt"><i style="width:${Math.round(d.n / d.t * 100)}%"></i></div>
   <ul class="list mt">${PACK.map((p, i) => `<li class="chk ${st[i] ? "on" : ""}" data-pk="${i}"><span class="bx">${st[i] ? "✓" : ""}</span><div class="grow">${esc(p[0])}</div></li>`).join("")}</ul></div>`;
  $$("[data-pk]").forEach(li => li.onclick = () => { const s2 = packState(); s2[li.dataset.pk] = !s2[li.dataset.pk]; LS.set("pack." + (ME || "x"), s2); renderPack(B); });
}
function addStamp(c) { if (!c.thumb) return; const id = c.poi ? c.poi.id : "x" + Date.now(); S.album = [{ id, name: c.name, img: c.thumb, ts: Date.now() }].concat(S.album.filter(a => a.id !== id)).slice(0, 40); LS.set("album", S.album); sharePhoto(c.thumb, c.name, c.poi ? c.poi.id : ""); }
async function sharePhoto(thumb, name, poi) { if (!thumb || !S.code) return; try { await api("photo.add", { thumb, name: name || "", poi: poi || "", who: ME || "", ts: Date.now() }); } catch (e) {} }
function taxiCard() {
  const h = S.hotel || {};
  $("#bigBox").innerHTML = `<div class="sm dim">🚕 Bitte bringen Sie mich zu:</div><div class="taxi">${esc(h.name || "Hotel")}</div>${h.addr ? `<div style="font-size:20px;font-weight:600">${esc(h.addr)}</div>` : ""}<div class="sm mute mt">“Zəhmət olmasa məni bu ünvana aparın”</div>${h.phone ? `<div class="sm mt">📞 <a href="tel:${esc(h.phone.replace(/\s/g, ""))}">${esc(h.phone)}</a></div>` : ""}
   <div class="row mt"><a class="btn grow" href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}" target="_blank" rel="noopener">📍 Xəritə</a><button class="btn pri grow" id="bbX">Oldu</button></div>`;
  $("#bigModal").classList.add("on"); $("#bbX").onclick = () => $("#bigModal").classList.remove("on");
}
async function renderAlbum(B) {
  const draw = () => {
    const shared = S.photos.filter(p => !p.priv).map(p => ({ id: "s" + p.id, name: p.name || "Şəkil", img: p.thumb, ts: p.ts, who: p.who, poi: p.poi }));
    const keys = new Set(shared.map(x => x.img));
    const all = shared.concat(S.album.filter(a => !keys.has(a.img))).sort((a, b) => b.ts - a.ts);
    B.innerHTML = `<label class="btn pri wide" style="position:relative;overflow:hidden">📷 Şəkil əlavə et (hamı görəcək)<input type="file" accept="image/*" multiple id="albIn" style="position:absolute;inset:0;opacity:0"></label>
     ${all.length ? `<div class="grid2 mt">${all.map(a => `<div class="stamp" data-a="${esc(a.poi || a.id)}" data-img="${esc(a.img)}"><img src="${a.img}" alt="" loading="lazy"><div><b>${esc(short(a.name))}</b><br><span class="dim">${a.who ? esc(a.who) + " · " : ""}${fmtT(a.ts)}</span></div></div>`).join("")}</div>` : `<div class="card mute mt" style="text-align:center;padding:30px">Hələ şəkil yoxdur.<br>“Yeri tanı” ilə çəkilənlər də bura düşür.</div>`}`;
    $("#albIn").onchange = async e => { const fs = Array.from(e.target.files || []).slice(0, 10); e.target.value = ""; if (!fs.length) return; toast("Yüklənir…");
      for (const f of fs) { try { const t = (await shrink(f, 480, .72)).url; S.photos.unshift({ id: "l" + Date.now(), ts: Date.now(), who: ME || "", name: "", thumb: t }); await sharePhoto(t, "", ""); } catch (er) {} }
      toast("✅ Albomda"); draw(); load(); };
    $$("[data-a]").forEach(s => s.onclick = () => { const p = byId[s.dataset.a]; if (p) tellAbout(p); else { $("#bigBox").innerHTML = `<img src="${s.dataset.img}" style="width:100%;border-radius:14px"><button class="btn pri wide mt" id="bbX">Bağla</button>`; $("#bigModal").classList.add("on"); $("#bbX").onclick = () => $("#bigModal").classList.remove("on"); } });
  };
  const load = async () => { try { S.photos = (await api("photos")).photos || []; LS.set("photosCache", S.photos.slice(0, 30)); if (moreTab === "alb" && !$("#moreBody").hidden) draw(); } catch (e) {} };
  draw(); load();
}

/* ---------- navigation ---------- */
function unstick(v) {
  if (!v) return;
  requestAnimationFrame(() => { v.style.overflowY = "hidden"; void v.offsetHeight; v.style.overflowY = ""; const t = v.scrollTop; v.scrollTop = t + 1; v.scrollTop = t; });
}
const curView = () => $(".view.on");
document.addEventListener("visibilitychange", () => { if (!document.hidden) unstick(curView()); });
addEventListener("pageshow", () => unstick(curView()));
function goView(v) {
  useTrack("view:" + v);
  $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $$(".view").forEach(x => x.classList.toggle("on", x.id === "v-" + v));
  if (v === "map") { initMap(); setTimeout(() => { if (map) { map.resize(); renderNear(); } }, 50); }
  if (v === "tr") renderPhr();
  if (v === "exp") { renderExp(); sync(); }
  if (v === "plan") renderMore();
  if (v === "home") renderHome();
  unstick($("#v-" + v));
}
$$("#nav button").forEach(b => b.onclick = () => { if (b.dataset.v === "home" && !$("#result").hidden) closeResult(); goView(b.dataset.v); });
window.goView = goView; window.routeTo = routeTo;


/* ================= v11: quick actions & guides ================= */
const APPV = "40";
// auto-update: if a newer version is deployed, reload once so nobody sits on an old copy
let pendingVersion = null;
document.addEventListener("visibilitychange", () => { if (document.hidden && pendingVersion && !typing()) { LS.set("reloadedFor", { v: pendingVersion, t: Date.now() }); location.reload(); } });
async function checkVersion() {
  try {
    const v = (await (await fetch("version.txt?t=" + Date.now(), { cache: "no-store" })).text()).trim();
    if (!v || v === APPV) return;
    // reload at most once per 2 minutes for the same version (no loops), but keep trying until the new code is in
    const last = LS.get("reloadedFor", null), now = Date.now();
    if (last && last.v === v && now - last.t < 120000) return;
    try { const rg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (rg) await rg.update(); } catch (e) {}
    // never reload while she is looking at the screen: the new version is applied quietly when the app goes to the background
    if (document.hidden) { LS.set("reloadedFor", { v, t: now }); location.reload(); }
    else pendingVersion = v;
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkVersion(); });
window.addEventListener("pageshow", () => checkVersion());
setInterval(() => { if (!document.hidden) checkVersion(); }, 10 * 60000);

function modal(html) { $("#bigBox").innerHTML = html + `<button class="btn wide mt" id="mdX">Bağla</button>`; $("#bigModal").classList.add("on"); $("#mdX").onclick = () => $("#bigModal").classList.remove("on"); }
const closeModal = () => $("#bigModal").classList.remove("on");

// ---------- 🚕 quick taxi ----------
function quickTaxi() {
  const h = S.hotel || HOTEL0, hotelDest = { id: "hotel", name: h.name, lat: h.lat, lng: h.lng, addr: h.addr };
  const now = vNow(), day = PLAN.find(d => d.d === now.date), nx = day && day.items.find(i => i[0] >= now.time && i[3] && i[3] !== "hotel");
  const nxp = nx ? byId[nx[3]] : null, from = S.me || planGuess();
  const row = (d, label) => { const m = from ? walkM(dist(from, d)) : 2000, [lo, hi] = taxiEst(m);
    return `<div class="taxi-box mt" style="text-align:left"><b>${label}</b><div class="sm dim">~${taxiMin(m)} dəq · ≈ ${lo}–${hi} €</div>
     <div class="row mt"><a class="btn pri grow" href="${uberLink(d)}" target="_blank" rel="noopener">Uber</a><a class="btn grow" href="tel:+43140100">📞 40100</a><button class="btn" data-dc="${d.id}">🪧</button></div></div>`; };
  modal(`<h3 style="font-size:20px">🚕 Taksi</h3>${row(hotelDest, "🏨 Otelə")}${nxp ? row(nxp, "🗓 Sıradakı: " + short(nxp.name)) : ""}
    <button class="btn wide mt" id="qtMap">🗺 Başqa yer — xəritədən seç</button>
    <div class="sm dim mt" style="text-align:left">Uber qiyməti əvvəlcədən göstərir. 🪧 — sürücüyə göstərmək üçün iri ünvan.</div>`);
  $$("[data-dc]").forEach(b => b.onclick = () => b.dataset.dc === "hotel" ? taxiCard() : destCard(byId[b.dataset.dc]));
  $("#qtMap").onclick = () => { closeModal(); goView("map"); toast("Yerə toxun → “🧭 Get” → Taksi"); };
}

// ---------- 🆘 lost ----------
function sos() {
  const me = S.me, link = me ? `https://maps.google.com/?q=${me.lat.toFixed(5)},${me.lng.toFixed(5)}` : "";
  modal(`<h3 style="font-size:20px">🆘 Narahat olma</h3>
   <button class="btn pri wide mt" id="sosShare">📍 Yerimi qızlara göndər</button>
   <button class="btn wide mt" id="sosHotel">🏨 Otelə taksi</button>
   <button class="btn wide mt" id="sosAsk">🗣 Almanca kömək istə</button>
   <a class="btn wide mt" href="tel:112">📞 112 — təcili yardım</a>
   ${me ? "" : `<div class="note">GPS yeri hələ tapılmayıb — açıq yerə çıx və ya icazəni yoxla.</div>`}`);
  $("#sosShare").onclick = async () => {
    if (ME && !ADMIN) { S.share = true; LS.set("shareLoc", true); try { $("#grpBtn").classList.add("on"); } catch (e) {} await pushLoc(true); }
    const txt = `🆘 ${ME || "Mən"}: buradayam${me ? " → " + link : ""}${S.me ? ` (${S.me.label} yaxınlığı)` : ""}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else { try { await navigator.clipboard.writeText(txt); toast("Kopyalandı — WhatsApp-a yapışdır"); } catch (e) {} }
  };
  $("#sosHotel").onclick = () => { closeModal(); quickTaxi(); };
  $("#sosAsk").onclick = () => showBig("Entschuldigung, ich habe mich verlaufen. Können Sie mir bitte helfen?", "Bağışlayın, azmışam. Mənə kömək edə bilərsiniz?");
}

// ---------- 🎄 Christmas markets ----------
function xmasGuide() {
  const from = S.me || planGuess() || byId.stephansdom;
  const list = MARKETS.filter(m => byId[m.id]).map(m => ({ m, p: byId[m.id], d: dist(from, byId[m.id]) })).sort((a, b) => a.d - b.d);
  showResult(`<div class="ttl"><h2>🎄 Milad bazarları</h2></div>
   <div class="card">${MARKET_TIPS.map(t => `<div class="sm" style="margin:6px 0">${t}</div>`).join("")}</div>
   ${list.map(({ m, p, d }) => { const o = openState(p); return `<div class="card mt"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:17px">${esc(short(p.name))}</b><span class="km">${fmtKm(walkM(d))}</span></div>
     <div>${o ? `<span class="pill ${o.open ? "open" : "closed"}">${o.txt}</span>` : ""} <span class="pill">${esc(m.when)}</span></div>
     <div class="sm mute" style="margin-top:6px">${esc(m.why)}</div><div class="sm" style="margin-top:4px">🕘 ${esc(m.hrs)}</div><div class="sm" style="margin-top:4px">😋 ${esc(m.eat)}</div>
     <div class="row mt"><button class="btn s pri" data-route="${p.id}">🧭 Get</button><a class="btn s" href="${uberLink(p)}" target="_blank" rel="noopener">🚕 Uber</a></div></div>`; }).join("")}`);
  $$("#result [data-route]").forEach(b => b.onclick = () => { goView("map"); routeTo(byId[b.dataset.route]); });
}

// ---------- 🛍 shopping (malls & good brands first) ----------
function shopGuide() {
  const from = S.me || planGuess() || (S.hotel || HOTEL0);
  const ids = ["shop-kaerntner", "shop-goldenes", "shop-wienmitte", "shop-mahue", "shop-donauzentrum"];
  showResult(`<div class="ttl"><h2>🛍 Alış-veriş</h2></div>
   <div class="card">${SHOP_TIPS.map(t => `<div class="sm" style="margin:6px 0">${t}</div>`).join("")}</div>
   <div class="card mt" style="border:2px solid #8a5cf6"><div style="display:flex;justify-content:space-between"><b style="font-size:18px">⭐ Designer Outlet Parndorf</b><span class="pill">30–70% endirim</span></div>
    <div class="sm mute" style="margin-top:6px">${esc(byId["shop-parndorf"].d)}</div>
    <div class="sm" style="margin-top:6px">🕘 ${esc(PARNDORF.hrs)}</div><div class="sm" style="margin-top:4px">🚌 ${esc(PARNDORF.shuttle)}</div><div class="sm" style="margin-top:4px">💡 ${esc(PARNDORF.tip)}</div>
    <div class="row mt"><a class="btn s pri" href="${PARNDORF.url}" target="_blank" rel="noopener">Shuttle bileti / saatlar</a></div></div>
   ${ids.map(id => { const p = byId[id], d = dist(from, p); return `<div class="card mt"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:17px">${esc(p.name)}</b><span class="km">${fmtKm(walkM(d))}</span></div>
     <div class="sm mute" style="margin-top:6px">${esc(p.d)}</div>
     <div class="row mt"><button class="btn s pri" data-route="${id}">🧭 Get</button><a class="btn s" href="${uberLink(p)}" target="_blank" rel="noopener">🚕 Uber</a><a class="btn s" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " Wien")}" target="_blank" rel="noopener">Google</a></div></div>`; }).join("")}`);
  $$("#result [data-route]").forEach(b => b.onclick = () => { goView("map"); routeTo(byId[b.dataset.route]); });
}

// ---------- 🎁 private gift planner ----------
let GIFTS = LS.get("gifts." + (ME || "x"), []);
async function giftsLoad() { try { GIFTS = (await api("gifts")).gifts || []; LS.set("gifts." + ME, GIFTS); } catch (e) {} }
async function giftScreen(skipLoad) {
  if (!ME) { toast("Əvvəl şəxsi linkini aç"); return; }
  if (!skipLoad) { showResult(`<div class="card"><span class="spin"></span></div>`); await giftsLoad(); }
  const groups = {}; GIFTS.forEach(g => (groups[g.recipient] = groups[g.recipient] || []).push(g));
  const done = GIFTS.filter(g => g.bought).length, spent = GIFTS.reduce((a, g) => a + (g.bought ? +g.eur || 0 : 0), 0), plan = GIFTS.reduce((a, g) => a + (+g.budget || 0), 0);
  const names = Object.keys(groups);
  showResult(`<div class="ttl"><h2>🎁 Hədiyyələrim</h2></div><div class="sm dim" style="margin:-6px 0 8px">🔒 Yalnız sən görürsən</div>
   ${GIFTS.length ? `<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>${done}/${GIFTS.length} alınıb</b><span class="mute">${fm(spent)} €${plan ? ` / plan ${fm(plan, 0)} €` : ""}</span></div><div class="bar mt"><i style="width:${Math.round(done / GIFTS.length * 100)}%"></i></div></div>` : ""}
   <form class="card mt" id="gfF" autocomplete="off"><b>+ Yeni hədiyyə</b>
    <input class="inp mt" id="gfTo" placeholder="Kimə? (məs. Anam)" list="gfNames"><datalist id="gfNames">${names.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    <input class="inp mt" id="gfIt" placeholder="Nə? (məs. Swarovski boyunbağı)">
    <input class="inp mt" id="gfBu" inputmode="decimal" placeholder="Büdcə € (istəyə bağlı)">
    <button class="btn pri wide mt">Əlavə et</button></form>
   ${names.map(n => `<div class="card mt"><b style="font-size:17px">👤 ${esc(n)}</b><ul class="list">${groups[n].map(g => `<li class="chk ${g.bought ? "on" : ""}"><span class="bx" data-gb="${g.id}">${g.bought ? "✓" : ""}</span><div class="grow" data-gb="${g.id}" style="cursor:pointer">${esc(g.item)}<span class="s2" style="text-decoration:none">${g.bought ? `alındı${g.eur ? " · " + fm(+g.eur) + " €" : ""}${g.store ? " · " + esc(g.store) : ""}` : g.budget ? "büdcə " + fm(+g.budget, 0) + " €" : ""}</span></div><button class="btn s" data-gd="${g.id}">✕</button></li>`).join("")}</ul></div>`).join("")}
   ${GIFTS.length ? "" : `<div class="card mt mute" style="text-align:center">Səfərdən əvvəl kimlərə nə almaq istədiyini yaz. Vyanada alanda ✓ bas.</div>`}`);
  $("#gfF").onsubmit = async e => { e.preventDefault(); const to = $("#gfTo").value.trim(), it = $("#gfIt").value.trim(); if (!to || !it) { toast("Kimə və nə — ikisini də yaz"); return; }
    try { const j = await api("gift.add", { recipient: to, item: it, budget: toNum($("#gfBu").value) || null }); GIFTS.push(j.gift); LS.set("gifts." + ME, GIFTS); giftScreen(true); } catch (err) { toast("Alınmadı: " + aiErr(err)); } };
  $$("[data-gb]").forEach(el => el.onclick = () => { const g = GIFTS.find(x => x.id === el.dataset.gb); if (!g) return; g.bought ? giftToggle(g, false) : giftBuy(g); });
  $$("[data-gd]").forEach(b => { let armed = false; b.onclick = async () => { if (!armed) { armed = true; b.textContent = "Sil?"; setTimeout(() => { armed = false; b.textContent = "✕"; }, 2500); return; }
    try { await api("gift.del", { id: b.dataset.gd }); GIFTS = GIFTS.filter(x => x.id !== b.dataset.gd); LS.set("gifts." + ME, GIFTS); giftScreen(true); } catch (err) { toast(aiErr(err)); } }; });
}
function giftBuy(g) {
  $("#bigBox").innerHTML = `<h3 style="font-size:20px">✓ Aldım: ${esc(g.item)}</h3><div class="sm dim">👤 ${esc(g.recipient)}</div>
   <input class="inp mt" id="gbE" inputmode="decimal" placeholder="Neçəyə aldın? €" value="${g.budget ? String(g.budget).replace(".", ",") : ""}">
   <input class="inp mt" id="gbS" placeholder="Harada? (istəyə bağlı)">
   <button type="button" class="chip on mt" id="gbX">💶 Şəxsi xərclərimə də yaz</button>
   <div class="row mt"><button class="btn grow" id="gbC">Ləğv et</button><button class="btn pri grow" id="gbOk">✓ Aldım</button></div>`;
  $("#bigModal").classList.add("on"); let toExp = true;
  $("#gbX").onclick = () => { toExp = !toExp; $("#gbX").classList.toggle("on", toExp); };
  $("#gbC").onclick = closeModal;
  $("#gbOk").onclick = async () => {
    const eur = toNum($("#gbE").value), store = $("#gbS").value.trim();
    try { const j = await api("gift.upd", { id: g.id, bought: true, eur: eur || null, store }); Object.assign(g, j.gift); LS.set("gifts." + ME, GIFTS);
      if (toExp && eur > 0) { const row = { d: `🎁 ${g.item} → ${g.recipient}`.slice(0, 80), eur, orig: eur, cur: "EUR", payer: ME, parts: [ME], by: ME, ts: Date.now(), tf: eur >= TF_MIN, priv: true, cat: "🎁 Hədiyyə" };
        try { const k = await api("exp.add", { row }); S.expenses.unshift(k.row); LS.set("expCache", S.expenses); } catch (e2) { S.pending.push(row); LS.set("expPending", S.pending); } }
      closeModal(); toast("🎁 Qeyd olundu"); giftScreen(true);
    } catch (err) { toast("Alınmadı: " + aiErr(err)); }
  };
}
async function giftToggle(g, v) { try { const j = await api("gift.upd", { id: g.id, bought: v }); Object.assign(g, j.gift); LS.set("gifts." + ME, GIFTS); giftScreen(true); } catch (err) { toast(aiErr(err)); } }

// ---------- 📔 private memory book ----------
async function bookScreen() {
  if (!ME) { toast("Əvvəl şəxsi linkini aç"); return; }
  showResult(`<div class="card"><span class="spin"></span></div>`);
  let notes = [], photos = [];
  try { [notes, photos] = await Promise.all([api("notes").then(j => j.notes || []), api("photos").then(j => (j.photos || []).filter(p => p.who === ME))]); } catch (e) {}
  const days = PLAN.map(d => d.d), today = vNow().date, tot = days.reduce((a, d) => { const s = daySummary(d); return { km: a.km + s.km, sp: a.sp + s.spent }; }, { km: 0, sp: 0 });
  showResult(`<div class="ttl noprint"><h2>📔 Xatirələrim</h2><button class="btn s" id="bkPrint">🖨 PDF</button></div><div class="sm dim noprint" style="margin:-6px 0 8px">🔒 Yalnız sən görürsən</div>
   <div class="book"><div class="card"><h2 style="font-size:24px">Vyana · 17–20 noyabr 2026</h2><div class="mute">${esc(ME)}</div>
    <div class="stat"><div><b>${tot.km.toFixed(1).replace(".", ",")} km</b><span>🚶 piyada</span></div><div><b>${photos.length}</b><span>📷 şəkil</span></div><div><b>${fm(tot.sp, 0)} €</b><span>💶 xərc</span></div></div></div>
   ${days.map((d, i) => { const s = daySummary(d), dn = notes.filter(n => n.day === d), dp = photos.filter(p => vDate(p.ts) === d), dd = PLAN[i];
     return `<div class="card mt"><b style="font-size:18px">${esc(dd.t)} — ${esc(dd.title)}</b>
      ${s.places.length ? `<div class="sm mt">📍 ${s.places.map(p => esc(short(p.name))).join(" · ")}</div>` : ""}
      ${s.km || s.spent ? `<div class="sm dim">🚶 ${s.km.toFixed(1).replace(".", ",")} km · 💶 ${fm(s.spent)} €</div>` : ""}
      ${dp.length ? `<div class="bkph mt">${dp.map(p => `<img src="${p.thumb}" alt="">`).join("")}</div>` : ""}
      ${dn.map(n => `<div class="bknote mt">${esc(n.txt)}<button class="lnk sm noprint" data-nd="${n.id}">sil</button></div>`).join("")}
      ${d <= today ? `<div class="row mt noprint"><button class="btn s" data-na="${d}">✍️ Qeyd yaz</button><label class="btn s" style="position:relative;overflow:hidden">📷 Şəxsi şəkil<input type="file" accept="image/*" data-np="${d}" style="position:absolute;inset:0;opacity:0"></label></div>` : `<div class="sm dim mt noprint">Bu gün gələndə doldurulacaq.</div>`}</div>`; }).join("")}</div>`);
  $("#bkPrint").onclick = () => window.print();
  $$("[data-na]").forEach(b => b.onclick = async () => { const t = prompt("Bu gün nə yadda qaldı?"); if (!t || !t.trim()) return; try { await api("note.add", { day: b.dataset.na, txt: t.trim() }); bookScreen(); } catch (e) { toast(aiErr(e)); } });
  $$("[data-nd]").forEach(b => b.onclick = async () => { try { await api("note.del", { id: b.dataset.nd }); bookScreen(); } catch (e) { toast(aiErr(e)); } });
  $$("[data-np]").forEach(inp => inp.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const t = (await shrink(f, 480, .72)).url; await api("photo.add", { thumb: t, name: "", poi: "", ts: Date.parse(inp.dataset.np + "T12:00:00+01:00") === Date.parse(today + "T12:00:00+01:00") ? Date.now() : Date.parse(inp.dataset.np + "T12:00:00+01:00"), priv: true }); toast("📷 Əlavə olundu"); bookScreen(); } catch (er) { toast(aiErr(er)); } });
}

// ---------- wire up home mini tiles ----------
$$("[data-act]").forEach(b => b.onclick = () => ({ taxi: quickTaxi, sos, xmas: xmasGuide, shop: shopGuide, gifts: () => giftScreen(), book: bookScreen })[b.dataset.act]());


/* ================= v12: bookings, reminders, push, photo spots ================= */
let BOOK = LS.get("bookings", []), VAPID = LS.get("vapid", "");
const viennaISO = (date, time) => { const off = "+01:00"; return new Date(`${date}T${time}:00${off}`).toISOString(); };
const hhmm = iso => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
async function bookingsLoad() { try { const j = await api("bookings"); BOOK = j.bookings || []; if (j.vapid) { VAPID = j.vapid; LS.set("vapid", VAPID); } LS.set("bookings", BOOK.map(b => Object.assign({}, b, { img: b.img ? "1" : null }))); } catch (e) {} }
const bkMine = b => b.by === ME;
function icsFor(b) {
  const dt = d => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(new Date(b.at).getTime() + 3600000).toISOString();
  const esc2 = t => String(t || "").replace(/[,;\\]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WienBeledci//AZ", "BEGIN:VEVENT", `UID:${b.id}@wien-beledci`, `DTSTAMP:${dt(Date.now())}`, `DTSTART:${dt(b.at)}`, `DTEND:${dt(end)}`, `SUMMARY:${esc2(b.title)}`, `LOCATION:${esc2(b.place || "")}`, `DESCRIPTION:${esc2(b.note || "")}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc2(b.title)}`, `TRIGGER:-PT${b.lead_min || 60}M`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "wien-" + (b.title || "rezerv").replace(/[^\wəöüğışçƏÖÜĞIŞÇ]+/g, "-").slice(0, 30) + ".ics"; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
}
const isStandalone = () => navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
const b64u = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function enablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return alertBox("🔔 Bildirişlər", /iPhone|iPad/.test(navigator.userAgent) && !isStandalone() ? "iPhone-da bildiriş üçün əvvəl tətbiqi <b>ana ekrana əlavə et</b> (Paylaş ⬆︎ → “Ana ekrana əlavə et”), sonra oradan açıb bu düyməni yenə bas.<br><br>O vaxta qədər “📅 Təqvimə” düyməsi ilə xatırlatma qura bilərsən — o, tətbiq bağlı olsa da işləyir." : "Bu brauzer bildirişləri dəstəkləmir. “📅 Təqvimə” düyməsindən istifadə et.");
  }
  try {
    const perm = await Notification.requestPermission(); if (perm !== "granted") return toast("İcazə verilmədi");
    const reg = await navigator.serviceWorker.ready; if (!VAPID) await bookingsLoad();
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) });
    await api("push.sub", { sub: sub.toJSON() }); LS.set("pushOn", true); S.push = "on"; renderPushTip(); await api("push.test"); toast("🔔 Bildirişlər açıldı");
    if ($("#bkPush")) $("#bkPush").outerHTML = `<div class="sync">🔔 Bildirişlər açıqdır</div>`;
  } catch (e) { alertBox("🔔 Alınmadı", "Bildirişi aça bilmədim. “📅 Təqvimə” düyməsindən istifadə et."); }
}
const BK_PRESETS = Object.keys(TICKETS).filter(id => byId[id]).map(id => [id, "🎟 " + short(byId[id].name)]);
async function bookScreen2(skip) {
  if (!skip) { showResult(`<div class="card"><span class="spin"></span></div>`); await bookingsLoad(); }
  const days = PLAN.map(d => d), now = Date.now();
  const list = BOOK.slice().sort((a, b) => new Date(a.at) - new Date(b.at));
  showResult(`<div class="ttl"><h2>📅 Rezerv və biletlər</h2></div>
   ${S.push === "on" ? `<div class="sync">🔔 Bildirişlər açıqdır</div>` : `<button class="btn pri wide" id="bkPush">🔔 Xatırlatma bildirişlərini aç</button>`}
   ${days.map(d => { const items = list.filter(b => vDate(b.at) === d.d); return items.length ? `<div class="sm dim mt" style="font-weight:700">${esc(d.t)} · ${esc(d.w)}</div>${items.map(b => { const past = new Date(b.at).getTime() < now - 3600000;
     return `<div class="card mt" style="${past ? "opacity:.55" : ""}"><div style="display:flex;gap:10px;align-items:baseline"><b style="font:700 20px Fraunces,serif">${hhmm(b.at)}</b><div class="grow"><b>${esc(b.title)}</b>${b.place ? `<span class="s2">📍 ${esc(b.place)}</span>` : ""}${b.note ? `<span class="s2">📝 ${esc(b.note)}</span>` : ""}<span class="s2">${b.shared ? "👭 hamı üçün" : "🔒 yalnız mən"} · ⏰ ${b.lead_min >= 60 ? b.lead_min / 60 + " saat" : b.lead_min + " dəq"} əvvəl${b.sent ? " · ✓ xatırladıldı" : ""}</span></div></div>
      <div class="row mt" style="flex-wrap:wrap">${b.img ? `<button class="btn s pri" data-bi="${b.id}">🎫 Bilet</button>` : ""}${b.poi && byId[b.poi] ? `<button class="btn s" data-bg="${b.poi}">🧭 Get</button>` : ""}<button class="btn s" data-bc="${b.id}">📅 Təqvimə</button>${bkMine(b) ? `<button class="btn s" data-be="${b.id}">✎</button><button class="btn s" data-bd="${b.id}">✕</button>` : ""}</div></div>`; }).join("")}` : ""; }).join("")}
   ${list.length ? "" : `<div class="card mt mute" style="text-align:center">Bilet aldınız, masa sifariş etdiniz? Bura yazın — vaxtında xatırladacağam.</div>`}
   <button class="btn pri wide mt" id="bkAdd">+ Rezerv / bilet əlavə et</button>`);
  if ($("#bkPush")) $("#bkPush").onclick = enablePush;
  $("#bkAdd").onclick = () => bookingForm(null);
  $$("[data-bi]").forEach(x => x.onclick = () => { const b = BOOK.find(y => y.id === x.dataset.bi); if (b && b.img && b.img !== "1") { $("#bigBox").innerHTML = `<div class="sm dim">${esc(b.title)} · ${hhmm(b.at)}</div><img src="${b.img}" style="width:100%;border-radius:12px;margin-top:8px"><div class="sm mute mt">Ekran parlaqlığını artır ki, QR oxunsun.</div><button class="btn pri wide mt" id="bbX">Bağla</button>`; $("#bigModal").classList.add("on"); $("#bbX").onclick = closeModal; } else bookScreen2(); });
  $$("[data-bg]").forEach(x => x.onclick = () => { goView("map"); routeTo(byId[x.dataset.bg]); });
  $$("[data-bc]").forEach(x => x.onclick = () => icsFor(BOOK.find(y => y.id === x.dataset.bc)));
  $$("[data-be]").forEach(x => x.onclick = () => bookingForm(BOOK.find(y => y.id === x.dataset.be)));
  $$("[data-bd]").forEach(x => { let armed = false; x.onclick = async () => { if (!armed) { armed = true; x.textContent = "Sil?"; setTimeout(() => { armed = false; x.textContent = "✕"; }, 2500); return; } try { await api("booking.del", { id: x.dataset.bd }); BOOK = BOOK.filter(y => y.id !== x.dataset.bd); bookScreen2(true); } catch (e) { toast(aiErr(e)); } }; });
}
function bookingForm(b) {
  if (!ME) { toast("Əvvəl şəxsi linkini aç"); return; }
  const d0 = b ? vDate(b.at) : (PLAN.find(d => d.d >= vNow().date) || PLAN[0]).d, t0 = b ? hhmm(b.at) : "10:00";
  let img = b && b.img && b.img !== "1" ? b.img : null, shared = b ? b.shared : true;
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">${b ? "✎ Düzəlt" : "+ Rezerv / bilet"}</h3>
   <div class="hscroll mt" id="bfPre">${BK_PRESETS.slice(0, 10).map(([id, t]) => `<button type="button" class="chip" data-pre="${id}">${esc(t)}</button>`).join("")}<button type="button" class="chip" data-pre="table">🍽 Masa sifarişi</button></div>
   <input class="inp mt" id="bfT" placeholder="Nə? (məs. Schönbrunn bileti)" value="${esc(b ? b.title : "")}">
   <div class="row mt"><select class="inp grow" id="bfD">${PLAN.map(d => `<option value="${d.d}" ${d.d === d0 ? "selected" : ""}>${esc(d.t)}</option>`).join("")}</select><input class="inp" id="bfH" type="time" value="${t0}" style="width:42%"></div>
   <select class="inp mt" id="bfP"><option value="">📍 Yer (istəyə bağlı)</option>${POI.filter(p => !["metro"].includes(p.cat)).map(p => `<option value="${p.id}" ${b && b.poi === p.id ? "selected" : ""}>${esc(short(p.name))}</option>`).join("")}</select>
   <input class="inp mt" id="bfN" placeholder="Qeyd: bron kodu, neçə nəfər…" value="${esc(b ? b.note || "" : "")}">
   <div class="sm dim mt" style="text-align:left">Nə vaxt xatırladım?</div><div class="chips" id="bfL" style="margin-top:6px">${[[15, "15 dəq"], [30, "30 dəq"], [60, "1 saat"], [120, "2 saat"]].map(([v, t]) => `<button type="button" class="chip ${(b ? b.lead_min : 60) === v ? "on" : ""}" data-l="${v}">${t}</button>`).join("")}</div>
   <div class="chips mt"><button type="button" class="chip ${shared ? "on" : ""}" id="bfS">👭 Hamı üçün</button><label class="chip" style="position:relative;overflow:hidden">🎫 ${img ? "Bilet şəkli ✓" : "Bilet şəkli/QR əlavə et"}<input type="file" accept="image/*" id="bfI" style="position:absolute;inset:0;opacity:0"></label></div>
   <div class="row mt"><button class="btn grow" id="bfX">Ləğv et</button><button class="btn pri grow" id="bfOk">💾 Yadda saxla</button></div>`;
  $("#bigModal").classList.add("on");
  let lead = b ? b.lead_min : 60;
  $$("#bfPre [data-pre]").forEach(x => x.onclick = () => { const id = x.dataset.pre; if (id === "table") { $("#bfT").value = "🍽 Masa sifarişi — "; $("#bfT").focus(); return; } $("#bfT").value = "🎟 " + short(byId[id].name) + " bileti"; $("#bfP").value = id; });
  $$("#bfL .chip").forEach(x => x.onclick = () => { lead = +x.dataset.l; $$("#bfL .chip").forEach(y => y.classList.toggle("on", y === x)); });
  $("#bfS").onclick = () => { shared = !shared; $("#bfS").classList.toggle("on", shared); };
  $("#bfI").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { img = (await shrink(f, 1100, .82)).url; e.target.parentElement.firstChild.textContent = "🎫 Bilet şəkli ✓"; } catch (er) { toast("Şəkli aça bilmədim"); } };
  $("#bfX").onclick = closeModal;
  $("#bfOk").onclick = async () => {
    const title = $("#bfT").value.trim(); if (!title) { toast("Nə olduğunu yaz"); return; }
    const poi = $("#bfP").value || null, row = { title, at: viennaISO($("#bfD").value, $("#bfH").value || "10:00"), poi, place: poi ? short(byId[poi].name) : "", note: $("#bfN").value.trim(), lead_min: lead, shared, img };
    try { const j = await api(b ? "booking.upd" : "booking.add", b ? { id: b.id, row } : { row }); BOOK = BOOK.filter(x => x.id !== (b && b.id)).concat(j.booking); closeModal(); toast("✓ Yadda saxlandı" + (LS.get("pushOn", false) ? " — xatırladacağam" : "")); bookScreen2(true); }
    catch (e) { toast("Alınmadı: " + aiErr(e)); }
  };
}
// in-app reminder while the app is open (works even without push)
setInterval(() => { const now = Date.now(); BOOK.forEach(b => { const due = new Date(b.at).getTime() - (b.lead_min || 60) * 60000, k = "rem." + b.id; if (now >= due && now < new Date(b.at).getTime() && !LS.get(k, false)) { LS.set(k, true); toast(`⏰ ${hhmm(b.at)}: ${b.title}`); try { if (Notification.permission === "granted") navigator.serviceWorker.ready.then(r => r.showNotification("⏰ " + b.title, { body: hhmm(b.at) + (b.place ? " · " + b.place : "") })); } catch (e) {} } }); }, 60000);
function upcomingAlert() {
  const now = Date.now(), nx = BOOK.filter(b => { const t = new Date(b.at).getTime(); return t > now && t - now < 3 * 3600000; }).sort((a, b) => new Date(a.at) - new Date(b.at))[0];
  if (!nx) return ""; const m = Math.round((new Date(nx.at).getTime() - now) / 60000);
  return `<div class="alert" style="background:#FFF8E6"><span>⏰</span><div><b>${hhmm(nx.at)} · ${esc(nx.title)}</b><span class="mute">${m >= 60 ? Math.floor(m / 60) + " saat " + (m % 60) + " dəq" : m + " dəq"} qalıb${nx.place ? " · " + esc(nx.place) : ""}</span></div></div>`;
}

// ---------- 📸 photo spots ----------
function photoGuide() {
  const from = S.me || planGuess() || byId.stephansdom;
  const list = Object.keys(PHOTO).filter(id => byId[id]).map(id => ({ p: byId[id], d: dist(from, byId[id]) })).sort((a, b) => a.d - b.d);
  showResult(`<div class="ttl"><h2>📸 Foto nöqtələri</h2></div><div class="sm dim" style="margin:-6px 0 8px">Yaxından uzağa · noyabrda gün ~16:20-də batır</div>
   ${list.map(({ p, d }) => `<div class="card mt"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:17px">${esc(short(p.name))}</b><span class="km">${fmtKm(walkM(d))}</span></div>
    <div class="sm" style="margin-top:6px">📍 ${esc(PHOTO[p.id][0])}</div><div class="sm" style="margin-top:4px">🕘 ${esc(PHOTO[p.id][1])}</div>
    <div class="row mt"><button class="btn s pri" data-route="${p.id}">🧭 Get</button><a class="btn s" href="${uberLink(p)}" target="_blank" rel="noopener">🚕 Uber</a></div></div>`).join("")}`);
  $$("#result [data-route]").forEach(b => b.onclick = () => { goView("map"); routeTo(byId[b.dataset.route]); });
}
function helpScreen() {
  showResult(`<div class="ttl"><h2>❓ Necə istifadə edim?</h2></div>${HELP.map(([t, h], i) => `<details class="card mt help" ${i === 0 ? "open" : ""}><summary><b style="font-size:17px">${t}</b></summary><div class="sm" style="margin-top:8px">${h}</div></details>`).join("")}`);
}
$("#helpBtn").onclick = helpScreen;
$$("[data-act2]").forEach(b => b.onclick = () => ({ book: () => bookScreen2(), photo: photoGuide })[b.dataset.act2]());

/* ---------- boot ---------- */
function boot2() {
  const ti = PLAN.findIndex(d => d.d === vNow().date); planDay = ti >= 0 ? ti : 0;
  renderHome(); renderLoc(); startGPS(); sync(); checkVersion(); { const b0 = JSON.stringify(BOOK); bookingsLoad().then(() => { if (JSON.stringify(BOOK) !== b0) renderHomeSoon(); pushCheck(true); }); } useTrack("open"); goFromUrl(); setTimeout(useFlush, 5000); setTimeout(() => recentPrices(true), 600);
  if (ADMIN && !ME) askWho();
  setInterval(() => { if (!document.hidden && !typing() && $("#v-home").classList.contains("on") && $("#result").hidden) renderHomeSoon(); }, 60000);
}
(function boot() {
  S.code = readCode();
  if (!S.code || !S.u) { gate(S.code ? "Kənanın göndərdiyi şəxsi linki aç (sonunda &u=… olan)." : ""); return; }
  boot2();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
})();

/* ---------- 📍 suggested places sent by Kənan (kv 'pick'): pins on the map + a sheet with photos / route / site ---------- */
S.pick = LS.get("pick", null); try { renderFilters(); } catch (e) {}
function pickList() { const p = S.pick; if (!p || !Array.isArray(p.items) || (p.until && Date.now() > p.until)) return []; return p.items.filter(x => x && typeof x.lat === "number" && typeof x.lng === "number"); }
function pickPois() { return pickList().map((x, i) => { const p = { id: "pk" + i, name: x.name, lat: x.lat, lng: x.lng, cat: "yemek", g: x.rating, n: parseInt(String(x.n || "0").replace(/\D/g, "")) || 0, pid: x.pid, lvl: Math.min(3, +x.lvl || 0) || undefined, d: [x.note, x.addr].filter(Boolean).join(" · "), pick: x }; byId[p.id] = p; return p; }); }
function mapPick() {
  try { renderFilters(); } catch (e) {}
  if (!map) return; MK.pick.forEach(m => m.remove()); MK.pick = [];
  if (S.filter === "steak") { drawPOI(); renderNear(); }
}
function pickSheet(i) {
  const L = pickList(), x = L[i]; if (!x) return;
  const gq = encodeURIComponent(x.name + " " + (x.addr || "Wien"));
  const photos = `https://www.google.com/maps/search/?api=1&query=${gq}${x.pid ? "&query_place_id=" + encodeURIComponent(x.pid) : ""}`;
  const route = `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}&travelmode=walking`;
  const link = (u, t) => /^https:\/\//.test(u || "") ? `<a class="btn grow" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>` : "";
  $("#bigBox").innerHTML = `<h3 style="font-size:20px;text-align:left">${esc(x.e || "📍")} ${esc(x.name)}</h3>
   <div class="sm" style="text-align:left">${x.rating ? `⭐ ${esc(String(x.rating))}${x.n ? ` · ${esc(String(x.n))} rəy` : ""} · ` : ""}${esc(x.addr || "")}</div>
   ${x.note ? `<div class="sm mute mt" style="text-align:left">${esc(x.note)}</div>` : ""}
   <div class="row mt">${link(photos, "📸 Şəkillər və rəylər")}</div>
   <div class="row mt">${link(route, "🧭 Piyada marşrut")}${link(x.web, "🌐 Sayt / menyu")}</div>
   ${x.ig ? `<div class="row mt">${link(x.ig, "📷 Instagram")}</div>` : ""}
   ${x.tel ? `<div class="row mt"><a class="btn grow" href="tel:${esc(x.tel.replace(/[^+\d]/g, ""))}">📞 Zəng et / masa sifariş</a></div>` : ""}
   <div class="row mt">${L.length > 1 ? L.map((y, k) => `<button class="btn grow ${k === i ? "pri" : ""}" data-pk="${k}">${k + 1}</button>`).join("") : ""}</div>
   <button class="btn wide mt" id="pkClose">Bağla</button>`;
  $$("[data-pk]").forEach(b => b.onclick = () => { const k = +b.dataset.pk; mapGo(L[k].lat, L[k].lng, 16); pickSheet(k); });
  $("#pkClose").onclick = () => $("#bigModal").classList.remove("on");
  $("#bigModal").classList.add("on"); useTrack("pick");
}
