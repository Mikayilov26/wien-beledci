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
function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove("on"), 2600); }
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
const DEFAULT_LIVE = { eurAzn: 1.96, eurTry: 55.2, weather: [], alerts: [] };
const S = {
  code: null, me: null, gps: "wait", hotel: LS.get("hotel", null), album: LS.get("album", []),
  live: LS.get("live", DEFAULT_LIVE), expenses: LS.get("expCache", []), pending: LS.get("expPending", []),
  ai: true, online: true, dest: null, filter: "all", friends: {}, share: LS.get("shareLoc", false), photos: LS.get("photosCache", []),
};
let ME = LS.get("who", null);
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
const gDir = (d, mode) => `https://www.google.com/maps/dir/?api=1${S.me ? `&origin=${S.me.lat},${S.me.lng}` : ""}&destination=${d.lat},${d.lng}&travelmode=${mode || "walking"}`;
const gPlace = p => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(short(p.name) + " Wien")}${p.pid ? `&query_place_id=${p.pid}` : ""}`;

function setMe(lat, lng, src, acc) {
  if (!inVienna(lat, lng)) { if (src === "gps") { S.gps = "away"; renderLoc(); } return false; }
  const n = nearest({ lat, lng }, 1)[0];
  S.me = { lat, lng, src, acc: acc || 0, ts: Date.now(), label: n && n.d < 400 ? short(n.p.name) : "Vyana" };
  if (src === "gps") S.gps = "on";
  renderLoc(); mapMe(); if (src === "gps") pushLoc(); return true;
}
/* ---------- group location (opt-in) ---------- */
let lastPush = 0;
async function pushLoc(force) {
  if (!S.share || !ME || !S.me || S.me.src !== "gps" || !S.code) return;
  if (!force && Date.now() - lastPush < 45000) return; lastPush = Date.now();
  try { await api("kv.set", { key: "loc:" + ME, value: { lat: +S.me.lat.toFixed(5), lng: +S.me.lng.toFixed(5), acc: Math.round(S.me.acc || 0) } }); } catch (e) {}
}
function friendsList() { return Object.entries(S.friends).filter(([n, v]) => n !== ME && v && Date.now() - v.ts < 3 * 3600000).map(([n, v]) => ({ n, ...v })); }
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? "indicə" : m < 60 ? m + " dəq əvvəl" : Math.floor(m / 60) + " saat əvvəl"; };
function groupSheet() {
  const fr = friendsList();
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">👭 Qrup</h3>
   <p class="mute sm">Yerini paylaşsan, qızlar səni xəritədə görəcək (hər 45 saniyədən bir yenilənir). İstədiyin vaxt söndür.</p>
   ${ME ? `<button class="btn wide ${S.share ? "" : "pri"}" id="shTg">${S.share ? "⏸ Paylaşmanı dayandır" : "📍 Yerimi qrupla paylaş"}</button>` : `<button class="btn pri wide" id="shWho">Əvvəl adını seç</button>`}
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
function startGPS() {
  if (!navigator.geolocation) { S.gps = "off"; renderLoc(); return; }
  try {
    navigator.geolocation.watchPosition(
      p => setMe(p.coords.latitude, p.coords.longitude, "gps", p.coords.accuracy),
      e => { S.gps = e.code === 1 ? "denied" : "off"; if (!S.me) { const g = planGuess(); if (g) setMe(g.lat, g.lng, "plan"); } renderLoc(); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  } catch (e) { S.gps = "off"; renderLoc(); }
}
$("#locChip").onclick = () => {
  if (S.gps === "denied") return alertBox("📍 GPS icazəsi bağlıdır", "iPhone: <b>Ayarlar → Məxfilik → Məkan xidmətləri → Safari veb-saytları → “İstifadə zamanı”</b>. Sonra səhifəni yenilə.");
  goView("map"); if (S.me && map) map.setView([S.me.lat, S.me.lng], 16);
};
function alertBox(title, html) { $("#bigBox").innerHTML = `<h3 style="font-size:20px">${title}</h3><p class="mute" style="text-align:left">${html}</p><button class="btn pri wide" id="bbX">Oldu</button>`; $("#bigModal").classList.add("on"); $("#bbX").onclick = () => $("#bigModal").classList.remove("on"); }

/* ---------- API ---------- */
async function api(op, data) {
  const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ k: S.code, op }, data || {})) });
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw { code: (j && j.error) || "http_" + r.status };
  return j;
}
// streaming AI text
async function ai(o) {
  const body = { k: S.code, op: "ai", mode: o.mode || "", who: ME || "", tier: o.tier || "fast", system: o.system, messages: o.messages || [{ role: "user", content: o.prompt }], image: o.image, max_tokens: o.max_tokens, search: !!o.search, max_searches: o.max_searches };
  let r;
  try { r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  catch (e) { throw { code: "network" }; }
  if (!r.ok) { let j = null; try { j = await r.json(); } catch (e) {} throw { code: (j && j.error) || "http_" + r.status }; }
  if (o.search) return await r.json();
  if (!r.body || !r.body.getReader) { const t = await r.text(); o.onText && o.onText(t); return t; }
  const rd = r.body.getReader(), dec = new TextDecoder(); let t = "";
  while (true) { const { value, done } = await rd.read(); if (done) break; t += dec.decode(value, { stream: true }); o.onText && o.onText(t); }
  return t;
}
function aiErr(e) {
  const c = e && e.code;
  return ({ no_key: "Süni intellekt hələ qoşulmayıb (API açarı əlavə olunmayıb).", bad_key: "API açarı səhvdir.", no_credit: "API balansı bitib. Kənana xəbər ver.", rate_limited: "Çox sorğu getdi, bir az sonra yenidən cəhd et.", network: "İnternet yoxdur. Bağlantını yoxla.", forbidden: "Giriş kodu səhvdir." })[c] || "Xəta baş verdi, yenidən cəhd et.";
}
const CTX = () => {
  const n = vNow(); const day = PLAN.find(d => d.d === n.date);
  const al = todaysAlerts().filter(a => a.level !== "info").map(a => a.title + ": " + a.detail).join(" | ");
  return `Kontekst: 3 azərbaycanlı xanım (Fidan, Sədaqət, Kəmalə) 17–20 noyabr 2026 Vyanadadır. İndi Vyanada ${n.date}, saat ${n.time}.` +
    (day ? ` Bu günün planı: ${day.items.map(i => i[0] + " " + i[1]).join("; ")}.` : "") + (al ? ` Xəbərdarlıqlar: ${al}.` : "") +
    ` Dönüş uçuşu 20 noyabr 12:00, Terminal 1. Hava limanına CAT qatarı yox, Wien Mitte-dən CAT avtobusu gedir. Donuz əti olan yeməkləri qeyd et. Sadə Azərbaycan dilində yaz, markdown istifadə etmə.`;
};
const todaysAlerts = () => { const d = vNow().date; return (S.live.alerts || []).filter(a => a.date === "all" || a.date === d); };

/* ---------- sync shared data ---------- */
let syncing = false;
async function sync() {
  if (syncing || !S.code) return; syncing = true;
  try {
    const j = await api("sync");
    S.online = true; S.ai = j.ai !== false;
    S.expenses = j.expenses || []; LS.set("expCache", S.expenses);
    if (j.kv && j.kv.live) { S.live = j.kv.live; LS.set("live", S.live); }
    if (j.kv && j.kv.hotel) { S.hotel = j.kv.hotel; LS.set("hotel", S.hotel); mapHotel(); }
    S.friends = {}; Object.keys(j.kv || {}).forEach(k => { if (k.startsWith("loc:")) S.friends[k.slice(4)] = j.kv[k]; }); mapFriends();
    await flushPending();
  } catch (e) { S.online = false; if (e.code === "forbidden") return gate("Kod səhvdir. Linki yenidən aç."); }
  finally { syncing = false; }
  renderExpData(); renderHome(); mapAlerts();
}
async function flushPending() {
  if (!S.pending.length) return;
  const left = [];
  for (const p of S.pending) { try { const j = await api("exp.add", { row: p }); S.expenses.unshift(j.row); } catch (e) { left.push(p); } }
  S.pending = left; LS.set("expPending", left);
}
setInterval(() => { if (!document.hidden) sync(); }, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });

/* ---------- gate (trip code) ---------- */
function readCode() {
  const u = new URL(location.href);
  const k = u.searchParams.get("k") || (location.hash.match(/k=([a-z0-9]+)/i) || [])[1];
  if (k) { LS.set("code", k); return k; }
  return LS.get("code", null);
}
function gate(msg) { $("#gate").hidden = false; $("#gateMsg").textContent = msg || ""; }
$("#gateF").onsubmit = async e => {
  e.preventDefault(); const k = $("#gateIn").value.trim().toLowerCase(); if (!k) return;
  S.code = k; $("#gateMsg").textContent = "Yoxlanılır…";
  try { await api("ping"); LS.set("code", k); $("#gate").hidden = true; boot2(); } catch (err) { $("#gateMsg").textContent = err.code === "forbidden" ? "Kod səhvdir." : aiErr(err); }
};

/* ---------- who am I ---------- */
function askWho() {
  $("#whoBtns").innerHTML = PEOPLE.map(p => `<button data-who="${p}">🙋‍♀️ ${p}</button>`).join("");
  $("#whoModal").classList.add("on");
  $$("[data-who]").forEach(b => b.onclick = () => { ME = b.dataset.who; LS.set("who", ME); $("#whoModal").classList.remove("on"); expUI.payer = ME; renderHome(); if (expBuilt) renderExp(true); });
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
$("#convCur").onclick = () => { convCur = convCur === "EUR" ? "AZN" : "EUR"; LS.set("convCur", convCur); renderConv(); };

/* ---------- home ---------- */
function renderHome() {
  $("#hello").textContent = ME ? `Salam, ${ME} 👋` : "Salam 👋";
  $("#whoBtn").textContent = ME ? "dəyiş" : "Sən kimsən?";
  const now = vNow();
  // alerts: only warnings + departure
  let a = "";
  todaysAlerts().filter(x => x.level !== "info").forEach(x => a += `<div class="alert"><span>⚠️</span><div><b>${esc(x.title)}</b><span class="mute">${esc(x.detail)}</span></div></div>`);
  if (now.date === "2026-11-20") {
    const left = toMin("08:45") - now.mins;
    if (left > -150) a = `<div class="alert"><span>✈️</span><div><b>${left > 0 ? `Otelden çıxmağa ${Math.floor(left / 60)} saat ${left % 60} dəq qalıb` : "İndi hava limanına yola düş!"}</b><span class="mute">Uçuş 12:00, Terminal 1. Wien Mitte → CAT avtobusu. 10:00-da hava limanında ol.</span></div></div>` + a;
  }
  $("#alertsBar").innerHTML = a;
  // next plan item
  const day = PLAN.find(d => d.d === now.date);
  let nx = "";
  if (day) {
    const next = day.items.find(i => i[0] >= now.time);
    nx = next ? `<div class="sm dim">Sıradakı · ${day.t}</div><div class="next" style="margin-top:6px"><span class="t">${next[0]}</span><div class="grow"><b>${esc(next[1])}</b><span class="s2">${esc(next[2])}</span></div>${next[3] ? `<button class="btn s pri" data-route="${next[3]}">Get</button>` : ""}</div>`
      : `<div class="sm dim">${day.t}</div><b>Bugünkü plan bitdi 🌙</b>`;
  } else {
    nx = now.date < "2026-11-17" ? `<div class="sm dim">Səfər</div><b>17 noyabr, 11:00 — Vyanaya eniş ✈️</b><span class="s2">Dönüş: 20 noyabr, 12:00, Terminal 1</span>` : `<b>Xoş səfər idi! 💛</b>`;
  }
  $("#nextCard").innerHTML = nx;
  $$("#nextCard [data-route]").forEach(b => b.onclick = () => { goView("map"); routeTo(byId[b.dataset.route]); });
  // weather + rates
  const wx = S.live.weather || [];
  $("#wxCard").innerHTML = `<div class="sm dim" style="margin-bottom:6px">Hava · məzənnə</div>` + (wx.length ? `<div class="wx">${wx.map(w => `<div>${esc(w.day)}<b>${esc(w.t)}</b>${esc(w.s || "")}</div>`).join("")}</div>` : "") +
    (S.live.weatherNote ? `<div class="note">🌦 ${esc(S.live.weatherNote)}</div>` : "") + `<div class="note">💱 1 € = ${fm(R().azn)} ₼ · ${fm(R().try)} ₺${S.live.updated ? ` · yeniləndi ${esc(S.live.updated)}` : ""}</div>`;
  renderConv(); renderInstall();
}
function renderInstall() {
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  if (standalone || LS.get("instDone", false)) { $("#installTip").innerHTML = ""; return; }
  $("#installTip").innerHTML = `<div class="card mt" style="display:flex;gap:12px;align-items:center"><span style="font-size:26px">📲</span><div class="grow sm"><b>Ana ekrana əlavə et</b>Safari-də aşağıda <b>Paylaş ⬆︎</b> → <b>“Ana ekrana əlavə et”</b>.</div><button class="x" style="position:static" id="instX">×</button></div>`;
  $("#instX").onclick = () => { LS.set("instDone", true); renderInstall(); };
}
$$("[data-go]").forEach(b => b.onclick = () => goView(b.dataset.go));

/* ---------- POI display helpers ---------- */
const MIN_R = 4.2;
const okFood = p => p.cat !== "yemek" || (p.g || 0) >= MIN_R;
const LVLS = { 1: "€ · ~5–15 € adambaşı", 2: "€€ · ~15–35 € adambaşı", 3: "€€€ · ~35–60 € adambaşı" };
const rating = p => p.g ? `<span class="rt ${p.g < MIN_R ? "low" : ""}">★ ${String(p.g).replace(".", ",")} <span class="dim" style="font-weight:500">(${p.n >= 1000 ? Math.round(p.n / 1000) + "k" : p.n})</span></span>` : "";
function pills(p) { const o = openState(p); let s = ""; if (o) s += `<span class="pill ${o.open ? "open" : "closed"}">${o.txt}</span>`; if (p.halal) s += `<span class="pill halal">Halal</span>`; if (p.free) s += `<span class="pill">Pulsuz</span>`; if (p.lvl) s += `<span class="pill">${"€".repeat(p.lvl)}</span>`; return s; }
const price = p => p.pr || (p.lvl ? LVLS[p.lvl] : "") || (p.free ? "Pulsuz" : "");
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
  let items = cand.slice(0, 4).map(x => ({ id: x.p.id, why: x.p.d }));
  if (S.ai && cand.length) {
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
  let img; try { img = await shrink(file, 1024, .8); } catch (e) { showResult(`<div class="card">Şəkli aça bilmədim.</div>`); return; }
  const thumb = (await shrink(file, 320, .7)).url;
  cur = { img: img.url, thumb, name: "", story: "", facts: [], tip: "", poi: null, history: [], loading: true };
  renderStory();
  const near = (S.me ? nearest(S.me, 30, p => p.cat !== "metro").map(x => x.p) : POI.filter(p => p.cat !== "metro"));
  try {
    let lastDraw = 0;
    const t = await ai({ mode: "identify", tier: "vision", image: img.b64, max_tokens: 900,
      prompt: `${CTX()}\n${S.me ? `Onların GPS yeri: ${S.me.lat.toFixed(5)}, ${S.me.lng.toFixed(5)} (${S.me.label} yaxınlığı).` : ""}\nŞəkildəki obyekti (bina, abidə, heykəl, meydan, küçə) tanı və bələdçi kimi danış.\nUyğun gəlirsə bu siyahıdan id seç:\n${near.map(p => p.id + ": " + p.name).join("\n")}\n\nDƏQİQ BU FORMATDA YAZ:\nID: <id və ya yox>\nAD: <ad (yerli adı)>\nƏMİNLİK: <yüksək|orta|aşağı>\n---\n<130–180 sözlük canlı hekayə: kim, nə vaxt tikib, maraqlı əhvalat, nəyə baxmalı. Dəqiq bilmədiyin rəqəmi yazma.>\nFAKTLAR:\n- <fakt>\n- <fakt>\n- <fakt>\nMƏSLƏHƏT: <1 cümlə>`,
      onText: txt => { const o = parseStory(txt); Object.assign(cur, { name: o.name || cur.name, story: o.story, poi: byId[o.id] || cur.poi }); if (Date.now() - lastDraw > 120) { lastDraw = Date.now(); renderStory(true); } } });
    const o = parseStory(t);
    Object.assign(cur, { name: o.name || "Naməlum yer", story: o.story, facts: o.facts, tip: o.tip, conf: o.conf, poi: byId[o.id] || null, loading: false });
    if (cur.poi) LS.set("st." + cur.poi.id, { s: cur.story, f: cur.facts, t: cur.tip });
    addStamp(cur);
  } catch (e) { cur.loading = false; cur.err = aiErr(e); }
  renderStory();
}
async function tellAbout(p) {
  const c = LS.get("st." + p.id, null);
  cur = { img: null, thumb: null, name: p.name, poi: p, story: c ? c.s : p.d, facts: c ? c.f : [], tip: c ? c.t : "", history: [], loading: !c };
  showResult(""); renderStory();
  if (c) return;
  try {
    let lastDraw = 0;
    const t = await ai({ mode: "story", tier: "fast", max_tokens: 800, prompt: `${CTX()}\nOnlar “${p.name}” yanındadır (${p.d}).\nDƏQİQ BU FORMATDA YAZ:\n---\n<130–180 sözlük canlı bələdçi hekayəsi>\nFAKTLAR:\n- <fakt>\n- <fakt>\n- <fakt>\nMƏSLƏHƏT: <1 cümlə>`,
      onText: txt => { const o = parseStory(txt); if (o.story && cur.poi === p) { cur.story = o.story; if (Date.now() - lastDraw > 120) { lastDraw = Date.now(); renderStory(true); } } } });
    const o = parseStory(t); if (cur.poi === p) { Object.assign(cur, { story: o.story || p.d, facts: o.facts, tip: o.tip }); LS.set("st." + p.id, { s: cur.story, f: cur.facts, t: cur.tip }); }
  } catch (e) { if (cur.poi === p) cur.err = aiErr(e); }
  if (cur.poi === p) { cur.loading = false; renderStory(); }
}
function renderStory(fast) {
  const c = cur, p = c.poi;
  if (fast && $("#stBox")) { $("#stBox").textContent = c.story || "…"; if (c.name) $("#stTitle").textContent = c.name; return; }
  $("#result").innerHTML = `<button class="back" data-back>‹ Geri</button>${c.img ? `<img class="photo" src="${c.img}" alt="">` : ""}
  <div class="ttl"><div class="grow"><h2 id="stTitle">${esc(c.name || "Tanıyıram…")}</h2>${p ? `<div>${rating(p)} ${pills(p)}</div>${price(p) ? `<div class="sm mute" style="margin-top:4px">💶 ${esc(price(p))}</div>` : ""}` : ""}${c.conf && !/yüksək/i.test(c.conf) ? `<div class="sm dim">Əminlik: ${esc(c.conf)}</div>` : ""}</div><button class="btn s" id="spk">🔊 Dinlə</button></div>
  <div class="card"><div class="story" id="stBox">${esc(c.story || "")}${c.loading && !c.story ? '<span class="spin"></span>' : ""}</div>
  ${c.facts && c.facts.length ? `<ul class="facts">${c.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}${c.tip ? `<div class="note">💡 ${esc(c.tip)}</div>` : ""}${c.err ? `<div class="note" style="color:#B23A2B">⚠️ ${esc(c.err)}</div>` : ""}</div>
  <div class="hscroll mt"><button class="chip" data-q="Daha ətraflı danış, maraqlı əhvalatlar əlavə et.">📖 Daha çox</button><button class="chip" data-q="İçəri girmək olar? Bilet və saatlar? Dəqiq bilmirsənsə rəsmi saytı yoxlamağı de.">🎟 Bilet</button><button class="chip" data-q="Ən gözəl foto bucağı haradadır?">📸 Foto</button></div>
  <div id="chat">${c.history.map(m => `<div class="msg ${m.role === "user" ? "me" : "ai"}">${esc(m.content)}</div>`).join("")}</div>
  <form class="ask" id="askF"><input class="inp" id="askI" placeholder="Sual ver…" autocomplete="off"><button class="btn pri">→</button></form>
  <div class="row mt">${p ? `<button class="btn" id="goP">🧭 Get</button><a class="btn" href="${gPlace(p)}" target="_blank" rel="noopener">Google</a>` : ""}<button class="btn" id="nextP">✨ Buradan hara?</button></div>`;
  bindBack();
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
  } catch (e) {
    $("#prB").innerHTML = `<div class="note" style="color:#B23A2B;margin-top:0">⚠️ ${esc(aiErr(e))}</div>${priceLinks(p)}<button class="btn wide mt" id="pfBack">✏️ Düzəlt</button>`;
    $("#pfBack").onclick = () => priceForm("");
  }
}
const toAzn = (o, r) => o.currency === "TRY" ? o.price / r.try * r.azn : o.currency === "EUR" ? o.price * r.azn : o.price;
const bestOf = arr => { const ex = (arr || []).filter(o => o.match === "exact"); const pool = ex.length ? ex : (arr || []); return pool.length ? pool.reduce((a, c) => a.price <= c.price ? a : c) : null; };
function priceLinks(p) {
  const q = [p.brand, p.code || p.model].filter(Boolean).join(" ");
  const L = [[`https://www.google.com/search?q=${encodeURIComponent(q + " qiymət Bakı")}`, "Google AZ"], [`https://www.google.com/search?q=${encodeURIComponent(q + " fiyat")}`, "Google TR"], [`https://www.trendyol.com/sr?q=${encodeURIComponent(q)}`, "Trendyol"], [`https://umico.az/search?query=${encodeURIComponent(q)}`, "Umico"]];
  return `<div class="row mt" style="flex-wrap:wrap">${L.map(l => `<a class="btn s" href="${l[0]}" target="_blank" rel="noopener">${l[1]}</a>`).join("")}</div>`;
}
function offerList(arr, flag, r) {
  if (!arr || !arr.length) return "";
  return `<div class="sm dim mt">${flag}</div><ul class="offers">${arr.slice().sort((a, b) => a.price - b.price).map(o => `<li><div class="grow"><b>${esc(o.store || "Mağaza")}</b>${o.match === "similar" ? `<span class="tag sim">oxşar</span>` : `<span class="tag">eyni</span>`}${o.url ? `<br><a class="sm" href="${esc(o.url)}" target="_blank" rel="noopener">bax ›</a>` : ""}</div><div class="pr">${fm(o.price, o.currency === "AZN" ? 2 : 0)} ${o.currency === "TRY" ? "₺" : o.currency === "EUR" ? "€" : "₼"}${o.currency !== "AZN" ? `<span>≈ ${fm(toAzn(o, r))} ₼</span>` : ""}</div></li>`).join("")}</ul>`;
}
function renderPrice(p, res, cached) {
  const r = R(), v = +p.vienna_eur || null, va = v ? v * r.azn : null;
  const bb = bestOf(res.baku), bt = bestOf(res.turkey);
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
    <div class="${best === "vie" ? "best" : ""}"><span>🇦🇹 Vyana</span><b>${v ? fm(v) + " €" : "—"}</b><span>${va ? "≈ " + fm(va) + " ₼" : "yazılmayıb"}</span></div>
    <div class="${best === "bak" ? "best" : ""}"><span>🇦🇿 Bakı</span><b>${bb ? fm(bb.price, 0) + " ₼" : "—"}</b><span>${bb ? (bb.match === "similar" ? "oxşar məhsul" : esc(bb.store)) : "tapılmadı"}</span></div>
    <div class="${best === "tr" ? "best" : ""}"><span>🇹🇷 Türkiyə</span><b>${bt ? fm(bt.price, 0) + " ₺" : "—"}</b><span>${ta ? "≈ " + fm(ta) + " ₼" : "tapılmadı"}</span></div>
   </div>
   ${save ? `<div class="settle mt">💡 <b>${esc(save)}</b></div>` : ""}
   ${none ? `<div class="note">Bu məhsulun Bakı və Türkiyə qiyməti internetdə tapılmadı. Artikul kodunu yazıb yenidən yoxla və ya aşağıdakı linklərə bax.</div>` : ""}
   ${offerList(res.baku, "🇦🇿 Bakı mağazaları", r)}${offerList(res.turkey, "🇹🇷 Türkiyə mağazaları", r)}
   ${res.note ? `<div class="note">${esc(res.note)}</div>` : ""}
   <div class="note">“eyni” — eyni artikul, “oxşar” — yaxın model. Qiymətlər ${cached ? "son 12 saatda" : "indi"} internetdən götürülüb${res.at ? ` (${fmtT(res.at)})` : ""}; endirim və ölçüyə görə fərqlənə bilər.</div>
   ${priceLinks(p)}
   <div class="row mt"><button class="btn grow" id="prEdit">✏️ Düzəlt</button><button class="btn grow" id="prFresh">🔄 Təzədən</button></div>
   ${v ? `<button class="btn pri wide mt" id="prAdd">💶 Aldım — xərclərə yaz</button>` : ""}`;
  $("#prEdit").onclick = () => { prCur = prCur || { p }; priceForm(""); };
  $("#prFresh").onclick = () => { prCur = prCur || { p, thumb: null }; prCur.p = p; priceSearch(true); };
  if ($("#prAdd")) $("#prAdd").onclick = () => { goView("exp"); setTimeout(() => { $("#expA").value = String(v).replace(".", ","); setExpCur("EUR"); $("#expD").value = name.slice(0, 80); $("#expA").dispatchEvent(new Event("input")); }, 60); };
}
async function priceHistory() {
  showResult(`<div class="ttl"><h2>🧾 Baxılan qiymətlər</h2></div><div class="card" id="phB"><span class="spin"></span></div>`);
  let list = [];
  try { list = (await api("prices")).prices || []; } catch (e) { $("#phB").textContent = aiErr(e); return; }
  if (!list.length) { $("#phB").innerHTML = `<div class="mute" style="text-align:center;padding:16px">Hələ heç nə yoxlanmayıb.<br>“🛍 Qiymət” ilə başla.</div>`; return; }
  const r = R(), seen = new Set();
  list = list.filter(x => { const k = (x.brand + "|" + (x.code || x.name)).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  $("#phB").innerHTML = `<div class="sm dim" style="margin-bottom:6px">Hər üç telefonda görünür</div><ul class="list">${list.map((x, i) => { const bb = bestOf(x.result && x.result.baku), bt = bestOf(x.result && x.result.turkey);
    return `<li class="hist" data-h="${i}">${x.thumb ? `<img src="${x.thumb}" alt="">` : `<img alt="">`}<div class="grow"><b>${esc([x.brand, x.name].filter(Boolean).join(" · ") || "Məhsul")}</b><span class="s2">${x.vienna_eur ? "🇦🇹 " + fm(+x.vienna_eur) + " € · " : ""}${bb ? "🇦🇿 " + fm(bb.price, 0) + " ₼ · " : ""}${bt ? "🇹🇷 ≈" + fm(toAzn(bt, r), 0) + " ₼" : ""}</span><span class="s2 dim">${esc(x.who || "")} · ${fmtT(x.ts)}</span></div></li>`; }).join("")}</ul>`;
  $$("[data-h]").forEach(li => li.onclick = () => { const x = list[+li.dataset.h]; const p = { brand: x.brand, model: x.name, code: x.code, vienna_eur: x.vienna_eur };
    prCur = { img: null, thumb: x.thumb, p }; showResult(`${x.thumb ? `<img class="photo" src="${x.thumb}" alt="" style="max-height:200px;object-fit:contain">` : ""}<div class="ttl"><h2 id="prT"></h2></div><div class="card" id="prB"></div>`); renderPrice(p, x.result || {}, true); });
}
$("#prManual").onclick = priceManual;
$("#prHist").onclick = priceHistory;

/* ---------- speech ---------- */
let speaking = false;
function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) {} speaking = false; $$("#spk").forEach(b => b.textContent = "🔊 Dinlə"); }
function speak(text, lang) {
  stopSpeak(); if (!text || !window.speechSynthesis) return;
  const vs = speechSynthesis.getVoices();
  const v = lang === "de" ? vs.find(x => /^de/i.test(x.lang)) : lang === "tr" ? vs.find(x => /^tr/i.test(x.lang)) : (vs.find(x => /^az/i.test(x.lang)) || vs.find(x => /^tr/i.test(x.lang)));
  const parts = text.match(/[^.!?\n]+[.!?]*/g) || [text]; speaking = true; $$("#spk").forEach(b => b.textContent = "⏹ Dayan");
  parts.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p.trim()); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang === "de" ? "de-DE" : "tr-TR"; u.rate = lang === "de" ? .9 : 1; if (i === parts.length - 1) u.onend = u.onerror = () => stopSpeak(); speechSynthesis.speak(u); });
}
try { speechSynthesis.getVoices(); } catch (e) {}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

/* ---------- translator ---------- */
function normT(s) { return String(s || "").toLowerCase().replace(/ə/g, "e").replace(/ı/g, "i").replace(/i̇/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ä/g, "a").replace(/ß/g, "ss").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
function lev(a, b) { if (a === b) return 0; const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let pr = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(pr[j] + 1, c[j - 1] + 1, pr[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); pr = c; } return pr[n]; }
const PIDX = PHR.map(p => ({ p, w: [...new Set(normT(p[0] + " " + p[1] + " " + p[3]).split(" ").filter(w => w.length > 1))] }));
function searchPhr(q) {
  const qt = normT(q).split(" ").filter(w => w.length > 1); if (!qt.length) return [];
  return PIDX.map(x => { let sc = 0; for (const t of qt) { let best = 0; for (const w of x.w) { let v = 0;
    if (w === t) v = 1; else if (w.startsWith(t) || (t.startsWith(w) && w.length >= 3)) v = .85; else if (w.includes(t) && t.length >= 3) v = .7;
    else if (t.length >= 4) { const d = Math.min(lev(t, w), lev(t, w.slice(0, t.length + 1))); if (d <= 1) v = .7; else if (d <= 2 && t.length >= 6) v = .5; }
    if (v > best) best = v; } sc += best; } return { p: x.p, sc: sc / qt.length }; }).filter(x => x.sc >= .5).sort((a, b) => b.sc - a.sc).slice(0, 8).map(x => x.p);
}
const phrRow = p => { const i = PHR.indexOf(p); return `<div class="phr"><div class="grow"><b class="de" data-big="${i}">${esc(p[1])}</b><span>${esc(p[0])} · <i>${esc(p[2])}</i></span></div><button class="btn s" data-say="${i}">🔊</button></div>`; };
function renderPhr() {
  const q = $("#trIn").value.trim(), box = $("#phrList");
  if (!q) { const cats = [...new Set(PHR.map(p => p[4]))]; box.innerHTML = cats.map(c => `<details ${c === "Restoran" ? "open" : ""}><summary style="cursor:pointer;font-weight:700;padding:8px 0">${c}</summary>${PHR.filter(p => p[4] === c).map(phrRow).join("")}</details>`).join(""); }
  else { const r = searchPhr(q); box.innerHTML = r.length ? r.map(phrRow).join("") : `<div class="mute sm">Hazır ifadə yoxdur. <b>→ DE</b> bas, tərcümə edim.</div>`; }
  box.querySelectorAll("[data-say]").forEach(b => b.onclick = () => speak(PHR[+b.dataset.say][1].replace(" / ", ". "), "de"));
  box.querySelectorAll("[data-big]").forEach(b => b.onclick = () => showBig(PHR[+b.dataset.big][1], PHR[+b.dataset.big][0]));
}
function showBig(de, az) {
  $("#bigBox").innerHTML = `<div class="sm dim">Bu ekranı göstər</div><div class="big-de">${esc(de)}</div><div class="mute">${esc(az || "")}</div><div class="row" style="justify-content:center;margin-top:16px"><button class="btn pri" id="bgS">🔊 Səsləndir</button><button class="btn" id="bgX">Bağla</button></div>`;
  $("#bigModal").classList.add("on"); $("#bgS").onclick = () => speak(de, "de"); $("#bgX").onclick = () => $("#bigModal").classList.remove("on");
}
$("#bigModal").addEventListener("click", e => { if (e.target.id === "bigModal") $("#bigModal").classList.remove("on"); });
let trT = 0; $("#trIn").addEventListener("input", () => { clearTimeout(trT); trT = setTimeout(renderPhr, 120); });
$("#trF").onsubmit = async e => {
  e.preventDefault(); const q = $("#trIn").value.trim(); if (!q) return; $("#trIn").blur();
  const out = $("#trOut"); out.innerHTML = `<div class="card mt"><span class="spin"></span></div>`;
  try {
    const t = await ai({ mode: "tr", tier: "fast", max_tokens: 300, prompt: `Bu mətni Vyanada danışılan təbii almancaya (nəzakətli Sie) tərcümə et. Mətn azərbaycan, türk, rus və ya ingilis dilində və səhv yazılmış ola bilər.\nMətn: """${q}"""\nDƏQİQ FORMAT:\nDE: <almanca>\nOXU: <Azərbaycan hərfləri ilə oxunuş>\nMƏNA: <qısa geri tərcümə az>`,
      onText: x => { const d = (x.match(/DE:\s*([^\n]*)/) || [])[1]; if (d) out.innerHTML = `<div class="card mt"><div class="de">${esc(d)}</div></div>`; } });
    const g = re => { const m = t.match(re); return m ? m[1].trim() : ""; }; const de = g(/DE:\s*([^\n]*)/), ox = g(/OXU:\s*([^\n]*)/), mn = g(/MƏNA:\s*([^\n]*)/);
    if (!de) throw { code: "x" };
    out.innerHTML = `<div class="card mt"><div class="de" id="trDe">${esc(de)}</div><div class="mute sm" style="margin-top:4px">🗣 ${esc(ox)}</div><div class="dim sm">${esc(mn)}</div><div class="row mt"><button class="btn s pri" id="trS">🔊 Səsləndir</button><button class="btn s" id="trB">⛶ Böyük göstər</button></div></div>`;
    $("#trS").onclick = () => speak(de, "de"); $("#trB").onclick = $("#trDe").onclick = () => showBig(de, q); speak(de, "de");
  } catch (err) { out.innerHTML = `<div class="card mt">${esc(aiErr(err))}</div>`; }
};
$$("#trMode button").forEach(b => b.onclick = () => { $$("#trMode button").forEach(x => x.classList.toggle("on", x === b)); $("#trSay").hidden = b.dataset.m !== "say"; $("#trListen").hidden = b.dataset.m !== "listen"; });
let lsTarget = LS.get("lsTarget", "az"), lsSeq = 0, lsLast = "", lsTimer = 0, rec = null;
$$("#lsTarget .chip").forEach(b => { b.classList.toggle("on", b.dataset.l === lsTarget); b.onclick = () => { lsTarget = b.dataset.l; LS.set("lsTarget", lsTarget); $$("#lsTarget .chip").forEach(x => x.classList.toggle("on", x === b)); lsLast = ""; listenTr(); }; });
$("#lsIn").addEventListener("input", () => { clearTimeout(lsTimer); lsTimer = setTimeout(listenTr, 1100); });
async function listenTr() {
  const src = $("#lsIn").value.trim(); if (!src || src === lsLast) return; lsLast = src;
  const out = $("#lsOut"); out.hidden = false; const my = ++lsSeq;
  try {
    const t = await ai({ mode: "listen", tier: "fast", max_tokens: 400, prompt: `Bu, Vyanada kiminsə dediyi sözlərdir (almanca, Avstriya dialekti, danışıq tanıma səhvləri ola bilər). Təbii ${lsTarget === "tr" ? "türk" : "Azərbaycan"} dilinə tərcümə et. Yalnız tərcüməni yaz.\nMətn: """${src}"""`,
      onText: x => { if (my === lsSeq) out.innerHTML = `<div class="story">${esc(x)}</div>`; } });
    if (my === lsSeq) { out.innerHTML = `<div class="story">${esc(t)}</div><button class="btn s mt" id="lsSay">🔊 Dinlə</button>`; $("#lsSay").onclick = () => speak(t, lsTarget === "tr" ? "tr" : "az"); }
  } catch (e) { if (my === lsSeq) out.textContent = aiErr(e); }
}
$("#lsMic").onclick = () => {
  if (!SR) return alertBox("🎤 Səs tanıma", "Bu brauzerdə yoxdur. Safari-də aç və ya klaviaturada 🌐 ilə Deutsch seçib 🎤 bas.");
  if (rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = "de-AT"; rec.interimResults = true; rec.continuous = true;
  const base = $("#lsIn").value ? $("#lsIn").value + " " : "";
  rec.onresult = e => { let t = ""; for (const r of e.results) t += r[0].transcript; $("#lsIn").value = base + t; clearTimeout(lsTimer); lsTimer = setTimeout(listenTr, e.results[e.results.length - 1].isFinal ? 100 : 1100); };
  rec.onerror = e => { if (e.error === "language-not-supported" && rec.lang !== "de-DE") { rec.lang = "de-DE"; } else if (e.error === "not-allowed") alertBox("🎤 Mikrofon", "Mikrofona icazə ver: Ayarlar → Safari → Mikrofon."); };
  rec.onend = () => { rec = null; $("#lsMic").classList.remove("on"); $("#lsHint").textContent = "Bas və telefonu danışan adama tut"; };
  try { rec.start(); $("#lsMic").classList.add("on"); $("#lsHint").textContent = "Dinləyirəm… dayandırmaq üçün yenə bas"; } catch (e) { rec = null; }
};

/* ---------- expenses ---------- */
const expUI = { cur: "EUR", payer: ME || PEOPLE[0], parts: PEOPLE.slice(), view: "all", cat: "" };
const CATS = ["🍽 Yemək", "☕ Kafe", "🎟 Bilet", "🚇 Nəqliyyat", "🛍 Alış-veriş", "🎄 Bazar"];
let expBuilt = false;
function expAll() { return S.expenses.concat(S.pending.map(p => Object.assign({ pending: true, id: "p" + p.ts }, p))).sort((a, b) => (b.ts || 0) - (a.ts || 0)); }
function expSum(list) { const s = {}; PEOPLE.forEach(p => s[p] = { paid: 0, share: 0 }); let tot = 0;
  list.forEach(e => { const eur = +e.eur || 0; const parts = (e.parts && e.parts.length ? e.parts : PEOPLE).filter(p => s[p]); if (!parts.length) return; tot += eur; if (s[e.payer]) s[e.payer].paid += eur; parts.forEach(p => s[p].share += eur / parts.length); });
  return { tot, s }; }
function settle(s) { const bal = PEOPLE.map(p => ({ p, v: Math.round((s[p].paid - s[p].share) * 100) / 100 }));
  const cr = bal.filter(x => x.v > .009).sort((a, b) => b.v - a.v), db = bal.filter(x => x.v < -.009).map(x => ({ p: x.p, v: -x.v })).sort((a, b) => b.v - a.v); const out = []; let i = 0, j = 0;
  while (i < db.length && j < cr.length) { const m = Math.min(db[i].v, cr[j].v); out.push({ from: db[i].p, to: cr[j].p, v: m }); db[i].v -= m; cr[j].v -= m; if (db[i].v < .01) i++; if (cr[j].v < .01) j++; } return out; }
function setExpCur(c) { expUI.cur = c; $$("#expCur button").forEach(x => x.classList.toggle("on", x.dataset.c === c)); }
function renderExp(force) {
  if (!expBuilt || force) {
    expBuilt = true; expUI.payer = ME || expUI.payer;
    $("#expBody").innerHTML = `<div id="expSync"></div>
    <form class="card" id="expF" autocomplete="off">
      <div class="conv"><div class="in"><input id="expA" inputmode="decimal" placeholder="Məbləğ"></div><div class="seg" id="expCur" style="flex:none"><button type="button" data-c="EUR" class="on">€</button><button type="button" data-c="AZN">₼</button></div></div>
      <div class="sm dim" id="expConv" style="margin-top:4px;min-height:18px"></div>
      <div class="hscroll" id="expCats">${CATS.map(c => `<button type="button" class="chip" data-cat="${c}">${c}</button>`).join("")}</div>
      <input class="inp mt" id="expD" placeholder="Qeyd (istəyə görə)">
      <div class="sm dim mt">Kim ödədi?</div><div class="chips" id="expPay" style="margin-top:6px">${PEOPLE.map(p => `<button type="button" class="chip ${expUI.payer === p ? "on" : ""}" data-p="${p}">${p}</button>`).join("")}</div>
      <div class="sm dim mt">Kimlər üçün?</div><div class="chips" id="expParts" style="margin-top:6px">${PEOPLE.map(p => `<button type="button" class="chip on" data-p="${p}">${p}</button>`).join("")}</div>
      <button class="btn pri wide mt" type="submit">+ Əlavə et</button>
    </form>
    <div id="expSum"></div>
    <div class="tabs mt" id="expView"><button data-v="all" class="on">Hamısı</button>${PEOPLE.map(p => `<button data-v="${p}">${p}</button>`).join("")}</div>
    <div id="expList"></div>`;
    const upd = () => { const v = toNum($("#expA").value), r = R(); $("#expConv").textContent = v ? (expUI.cur === "EUR" ? `≈ ${fm(v * r.azn)} ₼` : `≈ ${fm(v / r.azn)} €`) : ""; };
    $("#expA").oninput = upd;
    $$("#expCur button").forEach(b => b.onclick = () => { setExpCur(b.dataset.c); upd(); });
    $$("#expCats .chip").forEach(b => b.onclick = () => { const on = !b.classList.contains("on"); $$("#expCats .chip").forEach(x => x.classList.remove("on")); expUI.cat = on ? b.dataset.cat : ""; if (on) b.classList.add("on"); });
    $$("#expPay .chip").forEach(b => b.onclick = () => { expUI.payer = b.dataset.p; $$("#expPay .chip").forEach(x => x.classList.toggle("on", x === b)); });
    $$("#expParts .chip").forEach(b => b.onclick = () => { const p = b.dataset.p; expUI.parts = expUI.parts.includes(p) ? expUI.parts.filter(x => x !== p) : expUI.parts.concat(p); if (!expUI.parts.length) expUI.parts = [p]; $$("#expParts .chip").forEach(x => x.classList.toggle("on", expUI.parts.includes(x.dataset.p))); });
    $$("#expView button").forEach(b => b.onclick = () => { expUI.view = b.dataset.v; $$("#expView button").forEach(x => x.classList.toggle("on", x === b)); renderExpData(); });
    $("#expF").onsubmit = async e => {
      e.preventDefault(); const v = toNum($("#expA").value); if (!(v > 0)) { toast("Məbləği yaz"); return; }
      const r = R(); const row = { d: $("#expD").value.trim() || expUI.cat || "Xərc", eur: Math.round((expUI.cur === "EUR" ? v : v / r.azn) * 100) / 100, orig: v, cur: expUI.cur, payer: expUI.payer, parts: expUI.parts.slice(), by: ME || "", ts: Date.now() };
      $("#expA").value = ""; $("#expD").value = ""; upd(); $$("#expCats .chip").forEach(x => x.classList.remove("on")); expUI.cat = "";
      try { const j = await api("exp.add", { row }); S.expenses.unshift(j.row); LS.set("expCache", S.expenses); toast("✓ Əlavə olundu — hamı görür"); }
      catch (err) { S.pending.push(row); LS.set("expPending", S.pending); toast("📱 İnternet yoxdur — sonra göndəriləcək"); }
      renderExpData();
    };
  }
  renderExpData();
}
function renderExpData() {
  if (!$("#expSum")) return;
  const list = expAll(), { tot, s } = expSum(list), r = R(), st = settle(s);
  $("#expSync").innerHTML = S.online ? `<span class="sync">☁️ Ortaq — hamı eyni siyahını görür</span>` : `<span class="sync warn">📱 Oflayn — ${S.pending.length} xərc göndərilməyi gözləyir</span>`;
  $("#expSum").innerHTML = `<div class="card mt"><div class="sm dim">Ümumi (${list.length} xərc)</div><div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="font-size:32px">${fm(tot)} €</h2><span class="mute">≈ ${fm(tot * r.azn)} ₼</span></div>
   <div class="mt">${PEOPLE.map(p => { const b = s[p].paid - s[p].share; return `<div class="person"><div><b>${p}${p === ME ? " (sən)" : ""}</b><span class="s2">Payı ${fm(s[p].share)} € · Ödədi ${fm(s[p].paid)} €</span></div><div class="bal ${b > .009 ? "pos" : b < -.009 ? "neg" : ""}">${b > .009 ? "+" : ""}${fm(b)} €<span class="s2" style="font-weight:500">${b > .009 ? "alacaq" : b < -.009 ? "verəcək" : "bərabər"}</span></div></div>`; }).join("")}</div>
   <div class="mt"><b>🤝 Hesablaşma</b>${st.length ? st.map(x => `<div class="settle"><b>${x.from}</b> → <b>${x.to}</b>: ${fm(x.v)} € <span class="dim">(${fm(x.v * r.azn)} ₼)</span></div>`).join("") : `<div class="sm mute">Hamı bərabərdir.</div>`}</div></div>`;
  const v = expUI.view, shown = v === "all" ? list : list.filter(e => e.payer === v || (e.parts || PEOPLE).includes(v));
  const my = v !== "all" ? shown.reduce((a, e) => { const ps = e.parts && e.parts.length ? e.parts : PEOPLE; return a + (ps.includes(v) ? (+e.eur || 0) / ps.length : 0); }, 0) : 0;
  const ft = fmtT;
  $("#expList").innerHTML = `${v !== "all" ? `<div class="card"><b>${v}</b>: öz payı ${fm(my)} € (≈ ${fm(my * r.azn)} ₼) · ödədiyi ${fm(s[v].paid)} €</div>` : ""}
   <div class="card mt"><ul class="list">${shown.length ? shown.map(e => { const ps = e.parts && e.parts.length ? e.parts : PEOPLE;
     return `<li><div class="grow"><b>${esc(e.d)}${e.pending ? " 📱" : ""}</b><span class="s2">${esc(e.payer)} ödədi · ${ps.length === 3 ? "hamı üçün" : esc(ps.join(", ")) + " üçün"}</span><span class="s2">${ft(e.ts)}${e.cur === "AZN" ? ` · ${fm(+e.orig)} ₼` : ""}</span></div><span class="km">${fm(+e.eur)} €<br><span class="dim" style="font-weight:500">${v !== "all" && ps.includes(v) ? "payı " + fm(e.eur / ps.length) : fm(e.eur * r.azn) + " ₼"}</span></span>${e.pending ? "" : `<button class="btn s" data-del="${esc(e.id)}">✕</button>`}</li>`; }).join("") : `<li class="mute">Hələ xərc yoxdur.</li>`}</ul></div>`;
  $$("[data-del]").forEach(b => { let armed = false; b.onclick = async () => {
    if (!armed) { armed = true; b.textContent = "Sil?"; b.classList.add("pri"); setTimeout(() => { armed = false; b.textContent = "✕"; b.classList.remove("pri"); }, 2500); return; }
    try { await api("exp.del", { id: b.dataset.del }); S.expenses = S.expenses.filter(x => x.id !== b.dataset.del); LS.set("expCache", S.expenses); renderExpData(); } catch (e) { toast("Silinmədi: " + aiErr(e)); } }; });
}

/* ---------- map (Leaflet) ---------- */
let map = null, poiLayer = null, meLayer = null, routeLayer = null, alertLayer = null, hotelLayer = null, frLayer = null;
const MAJOR = new Set(["stephansdom", "hofburg", "staatsoper", "rathaus", "karlskirche", "belvedere", "schonbrunn", "gloriette", "riesenrad", "hundertwasser", "khm", "naschmarkt", "parlament", "votiv", "xm-rathaus", "albertina", "central", "domschnitzel", "zaytouna", "xm-schonbrunn"]);
function initMap() {
  if (map || !window.L) { if (!window.L) $("#map").innerHTML = `<div class="card" style="margin:70px 16px">Xəritə yüklənmədi. İnterneti yoxla. <a class="btn s mt" href="https://www.google.com/maps/@48.2082,16.3719,15z" target="_blank" rel="noopener">Google Maps-da aç</a></div>`; return; }
  map = L.map("map", { zoomControl: false, attributionControl: true }).setView(S.me ? [S.me.lat, S.me.lng] : [48.2075, 16.3705], 15);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd", attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>' }).addTo(map);
  poiLayer = L.layerGroup().addTo(map); alertLayer = L.layerGroup().addTo(map); hotelLayer = L.layerGroup().addTo(map); routeLayer = L.layerGroup().addTo(map); frLayer = L.layerGroup().addTo(map); meLayer = L.layerGroup().addTo(map);
  drawPOI(); mapAlerts(); mapHotel(); mapFriends(); mapMe();
  map.on("zoomend", drawPOI);
}
function drawPOI() {
  if (!map) return; poiLayer.clearLayers(); const z = map.getZoom();
  POI.forEach(p => {
    if (S.filter !== "all" && p.cat !== S.filter) return;
    if (p.cat === "metro" && S.filter !== "metro" && z < 16) return;
    const low = p.g && p.g < MIN_R;
    const m = L.circleMarker([p.lat, p.lng], { radius: p.cat === "metro" ? 6 : 9, color: "#fff", weight: 2, fillColor: CAT[p.cat].c, fillOpacity: low ? .45 : 1 }).addTo(poiLayer);
    m.on("click", () => openPoi(p));
    if ((MAJOR.has(p.id) && z >= 14) || z >= 17 || (S.filter !== "all" && z >= 15)) m.bindTooltip(short(p.name) + (p.g ? ` ★${p.g}` : ""), { permanent: true, direction: "right", offset: [8, 0], className: "lbl" });
  });
}
function mapMe() { if (!map || !meLayer) return; meLayer.clearLayers(); if (!S.me) return;
  if (S.me.acc && S.me.acc < 300) L.circle([S.me.lat, S.me.lng], { radius: S.me.acc, color: "#2F6FB5", weight: 1, fillOpacity: .08 }).addTo(meLayer);
  L.marker([S.me.lat, S.me.lng], { icon: L.divIcon({ className: "", html: '<div class="medot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(meLayer); }
function mapAlerts() { if (!map || !alertLayer) return; alertLayer.clearLayers(); todaysAlerts().filter(a => a.lat && a.level !== "info").forEach(a => L.circle([a.lat, a.lng], { radius: a.r || 300, color: "#C8102E", weight: 2, dashArray: "6 4", fillOpacity: .12 }).bindTooltip("⚠ " + a.title).addTo(alertLayer)); }
function mapHotel() { if (!map || !hotelLayer) return; hotelLayer.clearLayers(); if (S.hotel) L.marker([S.hotel.lat, S.hotel.lng], { icon: L.divIcon({ className: "", html: '<div style="font-size:26px">🏨</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).on("click", () => routeTo({ id: "hotel", name: S.hotel.name || "Otel", lat: S.hotel.lat, lng: S.hotel.lng, cat: "tarix", d: "Otelimiz" })).addTo(hotelLayer); }
function mapFriends() { if (!map || !frLayer) return; frLayer.clearLayers(); friendsList().forEach(f => L.marker([f.lat, f.lng], { icon: L.divIcon({ className: "", html: `<div class="friend"><i>${esc(f.n[0])}</i>${esc(f.n)}</div>`, iconSize: null, iconAnchor: [12, 12] }) }).on("click", () => groupSheet()).addTo(frLayer)); }
const FL = [["all", "Hamısı"], ["tarix", "🏛 Görməli"], ["muzey", "🖼 Muzey"], ["yemek", "🍽 Yemək"], ["bazar", "🎄 Bazar"], ["kilse", "⛪ Kilsə"], ["park", "🌳 Park"], ["metro", "Ⓜ Metro"]];
$("#filters").innerHTML = FL.map(([k, t]) => `<button class="chip ${k === "all" ? "on" : ""}" data-f="${k}">${t}</button>`).join("");
$$("#filters .chip").forEach(b => b.onclick = () => { S.filter = b.dataset.f; $$("#filters .chip").forEach(x => x.classList.toggle("on", x === b)); drawPOI(); });
$("#grpBtn").classList.toggle("on", !!S.share);
$("#grpBtn").onclick = groupSheet;
$("#meBtn").onclick = () => { if (S.me && map) map.setView([S.me.lat, S.me.lng], 16); else $("#locChip").click(); };
$("#sheetX").onclick = () => $("#sheet").classList.remove("on");
function openPoi(p) {
  const d = S.me ? dist(S.me, p) : null, an = alertNear(p);
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">${esc(p.name)}</h3><div>${rating(p)} ${pills(p)}</div>
   ${p.g && p.g < MIN_R ? `<div class="note" style="color:#B5651D">Reytinq aşağıdır, tövsiyə etmirəm.</div>` : ""}${an ? `<div class="alert mt"><span>⚠️</span><div><b>${esc(an.title)}</b><span class="mute">${esc(an.detail)}</span></div></div>` : ""}
   <p class="mute" style="margin:8px 0">${esc(p.d)}</p>${price(p) ? `<div class="sm">💶 ${esc(price(p))}</div>` : ""}
   ${d != null ? `<div class="stat"><div><b>${walkMin(d)} dəq</b><span>piyada</span></div><div><b>${fmtKm(walkM(d))}</b><span>məsafə</span></div></div>` : ""}
   <div class="row mt"><button class="btn pri" id="pGo">🧭 Get</button><button class="btn" id="pTell">🔊 Hekayə</button><a class="btn" href="${gPlace(p)}" target="_blank" rel="noopener">Google</a></div>`;
  $("#sheet").classList.add("on"); $("#pGo").onclick = () => routeTo(p); $("#pTell").onclick = () => tellAbout(p);
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
  if (map) { routeLayer.clearLayers(); L.polyline(line.map(c => [c.lat, c.lng]), { color: "#C8102E", weight: 6, opacity: .85, dashArray: real ? null : "4 10" }).addTo(routeLayer); map.fitBounds(L.latLngBounds(line.map(c => [c.lat, c.lng])).pad(.25), { paddingBottomRight: [0, 260] }); }
  const along = POI.filter(x => x.id !== p.id && dist(x, from) > 60 && dist(x, p) > 60 && okFood(x) && lineOff(line, x) < 120).map(x => ({ x, d: dist(from, x) })).sort((a, b) => a.d - b.d).slice(0, 10);
  const blocks = todaysAlerts().filter(a => a.lat && a.level !== "info" && lineOff(line, a) <= (a.r || 300));
  const far = meters > 2200, cats = c => along.filter(a => a.x.cat === c).length;
  $("#sheetBody").innerHTML = `<h3 style="font-size:21px;margin-right:36px">→ ${esc(short(p.name))}</h3>
   ${blocks.map(a => `<div class="alert mt"><span>⚠️</span><div><b>Yolda: ${esc(a.title)}</b><span class="mute">${esc(a.detail)} Metro ilə get.</span></div></div>`).join("")}
   <div class="stat"><div><b>${mins} dəq</b><span>piyada</span></div><div><b>${fmtKm(meters)}</b><span>${real ? "real yol" : "təxmini"}</span></div>${far ? `<div><b>🚇</b><span>metro daha tez</span></div>` : ""}</div>
   <div class="row"><a class="btn pri" href="${gDir(p, blocks.length || far ? "transit" : "walking")}" target="_blank" rel="noopener">Google Maps ilə get</a><a class="btn" href="${gDir(p, blocks.length || far ? "walking" : "transit")}" target="_blank" rel="noopener">${blocks.length || far ? "🚶 Piyada" : "🚇 Metro"}</a></div>
   <div class="chips mt">${[["tarix", "🏛"], ["kilse", "⛪"], ["muzey", "🖼"], ["yemek", "🍽"], ["bazar", "🎄"], ["metro", "Ⓜ"]].map(([c, e]) => `<span class="pill" style="${cats(c) ? "" : "opacity:.4"}">${e} ${cats(c) ? "✓ " + cats(c) : "✗"}</span>`).join("")}</div>
   ${along.length ? `<div class="sm dim mt">Yol boyunca:</div><ul class="list">${along.map(a => `<li data-p="${a.x.id}" style="cursor:pointer;padding:9px 0"><span class="dot" style="background:${CAT[a.x.cat].c}"></span><div class="grow"><b style="font-weight:600">${esc(short(a.x.name))}</b> ${a.x.g ? `<span class="rt">★${a.x.g}</span>` : ""}</div><span class="dim sm">${fmtKm(a.d)}</span></li>`).join("")}</ul>` : ""}`;
  $$("#sheetBody [data-p]").forEach(li => li.onclick = () => openPoi(byId[li.dataset.p]));
}

/* ---------- plan & more ---------- */
let planDay = 0, moreTab = "plan";
function renderPlan() {
  const now = vNow();
  $("#dayTabs").innerHTML = PLAN.map((d, i) => `<button data-d="${i}" class="${i === planDay ? "on" : ""}">${d.t.split(" ")[0]} noy${d.d === now.date ? " · bu gün" : ""}</button>`).join("");
  $$("#dayTabs button").forEach(b => b.onclick = () => { planDay = +b.dataset.d; renderPlan(); });
  const d = PLAN[planDay]; const today = d.d === now.date; const nextIdx = today ? d.items.findIndex(i => i[0] >= now.time) : -1;
  $("#planBody").innerHTML = `<h2 style="font-size:23px">${esc(d.title)}</h2><div class="sm dim" style="margin-bottom:10px">${d.t}, ${d.w}</div>
   <div class="card"><ul class="tl">${d.items.map((it, k) => { const p = it[3] ? byId[it[3]] : null; return `<li class="${k === nextIdx ? "now" : ""}"><div class="t">${it[0]}</div><div class="x2"><b>${esc(it[1])}</b><span>${esc(it[2])}</span>${p ? `<div style="margin-top:6px"><a class="lnk" data-route="${p.id}">🧭 Get</a><a class="lnk" data-tell="${p.id}">🔊 Hekayə</a>${p.pid ? `<a class="lnk" href="${gPlace(p)}" target="_blank" rel="noopener">Google</a>` : ""}</div>` : ""}</div></li>`; }).join("")}</ul></div>
   ${planDay === 3 ? `<div class="alert mt"><span>✈️</span><div><b>Uçuş 12:00, Terminal 1</b><span class="mute">10:00-da hava limanında ol. CAT avtobusu Wien Mitte (Marxergasse 1b). Wien Mitte S-Bahn bağlıdır, U3/U4 işləyir.</span></div></div>` : ""}`;
  $$("#planBody [data-route]").forEach(a => a.onclick = () => { goView("map"); routeTo(byId[a.dataset.route]); });
  $$("#planBody [data-tell]").forEach(a => a.onclick = () => tellAbout(byId[a.dataset.tell]));
}
$$("#moreTabs button").forEach(b => b.onclick = () => { moreTab = b.dataset.t; $$("#moreTabs button").forEach(x => x.classList.toggle("on", x === b)); renderMore(); });
function renderMore() {
  const plan = moreTab === "plan"; $("#morePlan").hidden = !plan; $("#moreBody").hidden = plan;
  if (plan) return renderPlan();
  const B = $("#moreBody");
  if (moreTab === "info") B.innerHTML = INFO_HTML;
  if (moreTab === "alb") renderAlbum(B);
  if (moreTab === "hotel") {
    B.innerHTML = `<div class="card"><h3>🏨 Otelimiz</h3>${S.hotel ? `<p class="mute">${esc(S.hotel.name || "Otel")} — hamıda görünür.</p><button class="btn pri wide" id="hGo">🧭 Otelə qayıt</button>` : `<p class="mute">Oteldə olanda aşağıdakı düyməni bas — yer hamı üçün yadda qalacaq.</p>`}
     ${S.hotel ? `<button class="btn wide mt" id="hTaxi">🚕 Taksiyə göstər</button>` : ""}
     <input class="inp mt" id="hName" placeholder="Otelin adı" value="${esc(S.hotel && S.hotel.name || "")}">
     <input class="inp mt" id="hAddr" placeholder="Ünvan (məs. Kärntner Str. 1, 1010 Wien)" value="${esc(S.hotel && S.hotel.addr || "")}">
     <button class="btn wide mt" id="hSet" ${S.me ? "" : "disabled"}>📍 İndi oteldəyəm — yadda saxla</button>${S.me ? "" : `<div class="note">GPS yeri hələ tapılmayıb.</div>`}</div>`;
    if ($("#hTaxi")) $("#hTaxi").onclick = taxiCard;
    if ($("#hGo")) $("#hGo").onclick = () => { goView("map"); routeTo({ id: "hotel", name: S.hotel.name || "Otel", lat: S.hotel.lat, lng: S.hotel.lng, cat: "tarix", d: "" }); };
    $("#hSet").onclick = async () => { const v = { lat: S.me.lat, lng: S.me.lng, name: $("#hName").value.trim() || "Otel", addr: $("#hAddr").value.trim() }; S.hotel = v; LS.set("hotel", v); mapHotel(); try { await api("kv.set", { key: "hotel", value: v }); toast("🏨 Otel yadda saxlandı (hamı üçün)"); } catch (e) { toast("Yadda saxlandı (yalnız bu telefonda)"); } renderMore(); };
  }
}
function addStamp(c) { if (!c.thumb) return; const id = c.poi ? c.poi.id : "x" + Date.now(); S.album = [{ id, name: c.name, img: c.thumb, ts: Date.now() }].concat(S.album.filter(a => a.id !== id)).slice(0, 40); LS.set("album", S.album); sharePhoto(c.thumb, c.name, c.poi ? c.poi.id : ""); }
async function sharePhoto(thumb, name, poi) { if (!thumb || !S.code) return; try { await api("photo.add", { thumb, name: name || "", poi: poi || "", who: ME || "", ts: Date.now() }); } catch (e) {} }
function taxiCard() {
  const h = S.hotel || {};
  $("#bigBox").innerHTML = `<div class="sm dim">🚕 Bitte bringen Sie mich zu:</div><div class="taxi">${esc(h.name || "Hotel")}</div>${h.addr ? `<div style="font-size:20px;font-weight:600">${esc(h.addr)}</div>` : ""}<div class="sm mute mt">“Zəhmət olmasa məni bu ünvana aparın”</div>
   <div class="row mt"><a class="btn grow" href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}" target="_blank" rel="noopener">📍 Xəritə</a><button class="btn pri grow" id="bbX">Oldu</button></div>`;
  $("#bigModal").classList.add("on"); $("#bbX").onclick = () => $("#bigModal").classList.remove("on");
}
async function renderAlbum(B) {
  const draw = () => {
    const shared = S.photos.map(p => ({ id: "s" + p.id, name: p.name || "Şəkil", img: p.thumb, ts: p.ts, who: p.who, poi: p.poi }));
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
function goView(v) {
  $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $$(".view").forEach(x => x.classList.toggle("on", x.id === "v-" + v));
  if (v === "map") { initMap(); setTimeout(() => map && map.invalidateSize(), 50); }
  if (v === "tr") renderPhr();
  if (v === "exp") { renderExp(); sync(); }
  if (v === "plan") renderMore();
  if (v === "home") renderHome();
}
$$("#nav button").forEach(b => b.onclick = () => { if (b.dataset.v === "home" && !$("#result").hidden) closeResult(); goView(b.dataset.v); });
window.goView = goView; window.routeTo = routeTo;

/* ---------- boot ---------- */
function boot2() {
  const ti = PLAN.findIndex(d => d.d === vNow().date); planDay = ti >= 0 ? ti : 0;
  renderHome(); renderLoc(); startGPS(); sync();
  if (!ME) askWho();
  setInterval(() => { if (!document.hidden && $("#v-home").classList.contains("on") && $("#result").hidden) renderHome(); }, 60000);
}
(function boot() {
  S.code = readCode();
  if (!S.code) { gate(); return; }
  boot2();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
