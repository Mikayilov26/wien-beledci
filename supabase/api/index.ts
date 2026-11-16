// Wien Bələdçi API v2 — trip-code protected gateway: shared data + AI (Claude or Gemini, whichever key exists).
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

const PEOPLE = ["Fidan", "Sədaqət", "Kəmalə"];
const LOC_KEY = /^loc:(Fidan|Sədaqət|Kəmalə)$/;
const keys = () => ({ claude: Deno.env.get("ANTHROPIC_API_KEY") || "", gemini: Deno.env.get("GEMINI_API_KEY") || "" });

const cfgCache: Record<string, { v: string; t: number }> = {};
async function cfg(key: string, def = ""): Promise<string> {
  const c = cfgCache[key];
  if (c && Date.now() - c.t < 60_000) return c.v;
  const { data } = await sb.from("config").select("value").eq("key", key).maybeSingle();
  const v = data?.value ?? def;
  cfgCache[key] = { v, t: Date.now() };
  return v;
}
async function models() { try { return JSON.parse(await cfg("models", "{}")); } catch { return {}; } }

// Pick provider for a task: "price" prefers Gemini (free Google grounding), everything else prefers Claude.
async function pick(task: "text" | "price"): Promise<"claude" | "gemini" | null> {
  const k = keys();
  const pref = await cfg(task === "price" ? "provider_price" : "provider_text", "auto");
  if (pref === "claude" && k.claude) return "claude";
  if (pref === "gemini" && k.gemini) return "gemini";
  const order: ("claude" | "gemini")[] = task === "price" ? ["gemini", "claude"] : ["claude", "gemini"];
  for (const p of order) if (k[p]) return p;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  // cron tick (pg_cron → every 2 min): send due reminders as push notifications
  if (b && b.op === "push.tick") {
    if (!b.cron || b.cron !== (await cfg("cron_secret"))) return json({ error: "forbidden" }, 403);
    return json(await pushTick());
  }
  if (b && b.op === "brief.preview") {
    if (!b.cron || b.cron !== (await cfg("cron_secret"))) return json({ error: "forbidden" }, 403);
    return json(await briefMsg(String(b.date)));
  }
  if (b && b.op === "dbg.search") {
    if (!b.cron || b.cron !== (await cfg("cron_secret"))) return json({ error: "forbidden" }, 403);
    const model = String(b.model || "gemini-3.8-flash"), q = String(b.q || "adidas Samba OG B75806 fiyat");
    const variants: Record<string, any> = {
      snake: { tools: [{ google_search: {} }] },
      camel: { tools: [{ googleSearch: {} }] },
      snake_nothink: { tools: [{ google_search: {} }], noThink: true },
    };
    const out: Record<string, unknown> = {};
    for (const [name, v] of Object.entries(variants)) {
      const body: any = { contents: [{ role: "user", parts: [{ text: q }] }], tools: v.tools };
      if (!v.noThink) body.generationConfig = { thinkingConfig: { thinkingLevel: "low" } };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": keys().gemini, "content-type": "application/json" }, body: JSON.stringify(body) });
      const t = await r.text();
      let j: any = {}; try { j = JSON.parse(t); } catch { /* */ }
      const c = j.candidates?.[0] ?? {};
      out[name] = { status: r.status, keys: Object.keys(c), gm: c.groundingMetadata ? Object.keys(c.groundingMetadata) : null, q: c.groundingMetadata?.webSearchQueries, n: (c.groundingMetadata?.groundingChunks ?? []).length, usage: j.usageMetadata, text: (c.content?.parts ?? []).map((p: any) => p.text || "").join("").slice(0, 300), err: r.ok ? undefined : t.slice(0, 400) };
    }
    return json(out);
  }
  const code = await cfg("trip_code");
  if (!b || !code || b.k !== code) return json({ error: "forbidden" }, 403);
  // personal link → identity (server decides who you are; admin can act as anyone for testing)
  let users: Record<string, string> = {};
  try { users = JSON.parse(await cfg("users", "{}")); } catch { /* */ }
  const uname = users[String(b.u ?? "")];
  if (!uname) return json({ error: "no_user" }, 403);
  const admin = uname === "admin";
  const who = admin ? (PEOPLE.includes(b.as) ? b.as : "") : uname;
  b.who = who;
  const k = keys();
  const aiStatus = { claude: !!k.claude, gemini: !!k.gemini };

  try {
    switch (b.op) {
      case "ping": return json({ ok: true, ai: aiStatus.claude || aiStatus.gemini, providers: aiStatus, who, admin });

      case "sync": {
        const [ex, kv, pl] = await Promise.all([
          sb.from("expenses").select("*").or(`priv.eq.false,by.eq.${who || "-"}`).order("ts", { ascending: false }).limit(1500),
          sb.from("kv").select("key,value,updated_at"),
          sb.from("price_log").select("id", { count: "exact", head: true }),
        ]);
        if (ex.error) throw ex.error;
        if (kv.error) throw kv.error;
        const kvm: Record<string, unknown> = {};
        for (const r of kv.data ?? []) kvm[r.key] = r.value;
        return json({ expenses: ex.data, kv: kvm, ai: aiStatus.claude || aiStatus.gemini, providers: aiStatus, priceCount: pl.count ?? 0, who, admin });
      }

      case "exp.add": {
        const r = b.row ?? {};
        const eur = Number(r.eur);
        const parts = Array.isArray(r.parts) ? r.parts.filter((p: string) => PEOPLE.includes(p)) : [];
        if (!(eur > 0 && eur < 100000) || !PEOPLE.includes(r.payer) || !parts.length) return json({ error: "invalid" }, 400);
        if (!who) return json({ error: "no_user" }, 403);
        if (r.priv === true && r.payer !== who) return json({ error: "invalid" }, 400);
        const row = {
          d: String(r.d ?? "Xərc").slice(0, 80), eur: Math.round(eur * 100) / 100,
          orig: r.orig != null ? Math.round(Number(r.orig) * 100) / 100 : null,
          cur: r.cur === "AZN" ? "AZN" : "EUR", payer: r.payer, parts,
          by: who, ts: Number(r.ts) || Date.now(), tf: r.tf === true,
          priv: r.priv === true, cat: r.cat ? String(r.cat).slice(0, 30) : null,
        };
        const { data, error } = await sb.from("expenses").insert(row).select().single();
        if (error) throw error;
        return json({ row: data });
      }
      case "exp.upd": {
        if (!who) return json({ error: "no_user" }, 403);
        const { data: old } = await sb.from("expenses").select("priv,by").eq("id", String(b.id)).maybeSingle();
        if (!old) return json({ error: "not_found" }, 404);
        if (old.priv && old.by !== who) return json({ error: "forbidden" }, 403);
        const r = b.row ?? {};
        const eur = Number(r.eur);
        const parts = Array.isArray(r.parts) ? r.parts.filter((p: string) => PEOPLE.includes(p)) : [];
        if (!(eur > 0 && eur < 100000) || !PEOPLE.includes(r.payer) || !parts.length) return json({ error: "invalid" }, 400);
        if (old.priv && (r.payer !== who || parts.length !== 1 || parts[0] !== who)) return json({ error: "invalid" }, 400);
        const upd = {
          d: String(r.d ?? "Xərc").slice(0, 80), eur: Math.round(eur * 100) / 100,
          orig: r.orig != null ? Math.round(Number(r.orig) * 100) / 100 : null, cur: r.cur === "AZN" ? "AZN" : "EUR",
          payer: r.payer, parts, tf: r.tf === true, cat: r.cat ? String(r.cat).slice(0, 30) : null,
        };
        const { data, error } = await sb.from("expenses").update(upd).eq("id", String(b.id)).select().single();
        if (error) throw error;
        return json({ row: data });
      }
      case "exp.tf": {
        const { error } = await sb.from("expenses").update({ tf: b.tf === true }).eq("id", String(b.id));
        if (error) throw error;
        return json({ ok: true });
      }
      case "exp.del": {
        const { data: row } = await sb.from("expenses").select("priv,by").eq("id", String(b.id)).maybeSingle();
        if (row && row.priv && row.by !== who) return json({ error: "forbidden" }, 403);
        const { error } = await sb.from("expenses").delete().eq("id", String(b.id));
        if (error) throw error;
        return json({ ok: true });
      }

      case "kv.set": {
        const key = String(b.key || ""), v = b.value;
        if (key === "hotel") {
          if (!(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        } else if (LOC_KEY.test(key)) {
          if (key !== "loc:" + who) return json({ error: "forbidden" }, 403);
          if (v !== null && !(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        } else return json({ error: "readonly" }, 400);
        if (v === null) { await sb.from("kv").delete().eq("key", key); return json({ ok: true }); }
        const val = key === "hotel" ? { lat: v.lat, lng: v.lng, name: String(v.name ?? "").slice(0, 80), addr: String(v.addr ?? "").slice(0, 160), phone: String(v.phone ?? "").slice(0, 30), ci: String(v.ci ?? "").slice(0, 30), co: String(v.co ?? "").slice(0, 30), note: String(v.note ?? "").slice(0, 300) }
          : { lat: v.lat, lng: v.lng, acc: Number(v.acc) || 0, ts: Date.now() };
        const { error } = await sb.from("kv").upsert({ key, value: val, updated_at: new Date().toISOString() });
        if (error) throw error;
        return json({ ok: true });
      }

      case "photo.add": {
        const t = String(b.thumb || "");
        if (!t.startsWith("data:image/jpeg;base64,") || t.length > 115000) return json({ error: "invalid" }, 400);
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("photos").insert({ ts: Number(b.ts) || Date.now(), who, name: String(b.name ?? "").slice(0, 100), poi: String(b.poi ?? "").slice(0, 40), thumb: t, priv: b.priv === true });
        if (error) throw error;
        return json({ ok: true });
      }
      case "photos": {
        const { data, error } = await sb.from("photos").select("id,ts,who,name,poi,thumb,priv").or(`priv.eq.false,who.eq.${who || "-"}`).order("ts", { ascending: false }).limit(120);
        if (error) throw error;
        return json({ photos: data });
      }
      case "prices": {
        const { data, error } = await sb.from("price_log").select("id,ts,who,brand,name,code,vienna_eur,result,thumb").order("ts", { ascending: false }).limit(100);
        if (error) throw error;
        return json({ prices: data });
      }

      // ---- private per-person lists (only the owner ever sees them) ----
      case "gifts": {
        if (!who) return json({ gifts: [] });
        const { data, error } = await sb.from("gifts").select("*").eq("by", who).order("ts", { ascending: true });
        if (error) throw error;
        return json({ gifts: data });
      }
      case "gift.add": {
        if (!who) return json({ error: "no_user" }, 403);
        const recipient = String(b.recipient ?? "").trim().slice(0, 40), item = String(b.item ?? "").trim().slice(0, 100);
        if (!recipient || !item) return json({ error: "invalid" }, 400);
        const budget = Number(b.budget) > 0 ? Math.round(Number(b.budget) * 100) / 100 : null;
        const { data, error } = await sb.from("gifts").insert({ by: who, recipient, item, budget, ts: Date.now() }).select().single();
        if (error) throw error;
        return json({ gift: data });
      }
      case "gift.upd": {
        if (!who) return json({ error: "no_user" }, 403);
        const upd: Record<string, unknown> = {};
        if (typeof b.bought === "boolean") upd.bought = b.bought;
        if (b.eur !== undefined) upd.eur = Number(b.eur) > 0 ? Math.round(Number(b.eur) * 100) / 100 : null;
        if (b.store !== undefined) upd.store = String(b.store ?? "").slice(0, 60);
        if (b.item !== undefined) upd.item = String(b.item).slice(0, 100);
        if (b.budget !== undefined) upd.budget = Number(b.budget) > 0 ? Number(b.budget) : null;
        const { data, error } = await sb.from("gifts").update(upd).eq("id", String(b.id)).eq("by", who).select().single();
        if (error) throw error;
        return json({ gift: data });
      }
      case "gift.del": {
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("gifts").delete().eq("id", String(b.id)).eq("by", who);
        if (error) throw error;
        return json({ ok: true });
      }
      case "notes": {
        if (!who) return json({ notes: [] });
        const { data, error } = await sb.from("notes").select("id,day,txt,ts").eq("by", who).order("ts", { ascending: true });
        if (error) throw error;
        return json({ notes: data });
      }
      case "note.add": {
        if (!who) return json({ error: "no_user" }, 403);
        const txt = String(b.txt ?? "").trim().slice(0, 2000), day = String(b.day ?? "").slice(0, 10);
        if (!txt || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: "invalid" }, 400);
        const { data, error } = await sb.from("notes").insert({ by: who, day, txt, ts: Date.now() }).select("id,day,txt,ts").single();
        if (error) throw error;
        return json({ note: data });
      }
      case "note.del": {
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("notes").delete().eq("id", String(b.id)).eq("by", who);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- bookings / tickets (own + shared) and reminders ----
      case "bookings": {
        const { data, error } = await sb.from("bookings").select("*").or(`shared.eq.true,by.eq.${who || "-"}`).order("at", { ascending: true });
        if (error) throw error;
        return json({ bookings: data, vapid: await cfg("vapid_pub") });
      }
      case "booking.add": case "booking.upd": {
        if (!who) return json({ error: "no_user" }, 403);
        const r = b.row ?? {};
        const at = new Date(String(r.at ?? ""));
        const title = String(r.title ?? "").trim().slice(0, 100);
        if (!title || isNaN(at.getTime())) return json({ error: "invalid" }, 400);
        const img = typeof r.img === "string" && r.img.startsWith("data:image/jpeg;base64,") && r.img.length < 600000 ? r.img : (r.img === null ? null : undefined);
        const row: Record<string, unknown> = { title, at: at.toISOString(), shared: r.shared === true, poi: r.poi ? String(r.poi).slice(0, 40) : null, place: String(r.place ?? "").slice(0, 120), note: String(r.note ?? "").slice(0, 500), lead_min: Math.max(0, Math.min(1440, Number(r.lead_min) || 60)), sent: false };
        if (img !== undefined) row.img = img;
        if (b.op === "booking.add") {
          const { data, error } = await sb.from("bookings").insert({ ...row, by: who }).select().single();
          if (error) throw error;
          return json({ booking: data });
        }
        const { data, error } = await sb.from("bookings").update(row).eq("id", String(b.id)).eq("by", who).select().single();
        if (error) throw error;
        return json({ booking: data });
      }
      case "booking.del": {
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("bookings").delete().eq("id", String(b.id)).eq("by", who);
        if (error) throw error;
        return json({ ok: true });
      }
      case "push.sub": {
        if (!who) return json({ error: "no_user" }, 403);
        const sub = b.sub;
        if (!sub || typeof sub.endpoint !== "string" || !sub.keys) return json({ error: "invalid" }, 400);
        const { error } = await sb.from("push_subs").upsert({ endpoint: sub.endpoint, who, sub });
        if (error) throw error;
        return json({ ok: true });
      }
      case "push.test": {
        if (!who) return json({ error: "no_user" }, 403);
        const n = await sendTo([who], { title: "🔔 Wien Bələdçi", body: "Bildirişlər işləyir! Xatırlatmalar bura gələcək." });
        return json({ sent: n });
      }

      case "gt": return await freeTranslate(b);
      case "ai": return await aiText(b);
      case "price.extract": return await priceExtract(b);
      case "price.search": return await priceSearch(b);
      default: return json({ error: "unknown_op" }, 400);
    }
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

/* ------------------------------------------------------------------ free machine translation (no AI cost) */
async function sendTo(people: string[], msg: { title: string; body: string; url?: string }): Promise<number> {
  const pub = await cfg("vapid_pub"), priv = await cfg("vapid_priv");
  if (!pub || !priv) return 0;
  webpush.setVapidDetails("https://wien-beledci.onrender.com", pub, priv);
  const { data } = await sb.from("push_subs").select("endpoint,sub").in("who", people);
  let n = 0;
  for (const s of data ?? []) {
    try { await webpush.sendNotification(s.sub, JSON.stringify(msg), { TTL: 3600 }); n++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint); }
  }
  return n;
}
// ☀️ daily morning briefing (one push per trip day to everyone who enabled notifications)
const BRIEF: Record<string, { at: string; title: string; items: string[] }> = {
  "2026-11-17": { at: "11:20", title: "Xoş gəldiniz! Gəliş və Köhnə şəhər", items: ["12:00 CAT avtobusu → Wien Mitte", "13:00 Hotel Stefanie — çantalar resepsiyaya", "15:00 Stephansdom + bazar", "19:00 Rathaus Milad bazarı"] },
  "2026-11-18": { at: "08:00", title: "İmperator günü", items: ["08:45 U4 ilə Schönbrunn", "09:30 Schönbrunn sarayı", "11:30 Bağlar və Gloriette", "12:45 Schönbrunn Milad bazarı"] },
  "2026-11-19": { at: "08:00", title: "Klimt, Hundertvasser, Prater", items: ["09:30 Belvedere – “Öpüş”", "11:45 Hundertwasserhaus", "13:00 Nahar: Al Zaytouna (halal)", "14:30 Prater – Riesenrad"] },
  "2026-11-20": { at: "06:45", title: "Dönüş günü — yaxşı yol!", items: ["07:30 Səhər yeməyi, check-out", "08:40 Taksi: otel → Wien Mitte", "09:10 CAT avtobusu", "10:00 Tax-free möhürü, sonra qeydiyyat"] },
};
const vParts = (t: number) => { const o: Record<string, string> = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(t)).forEach((p) => o[p.type] = p.value); return { date: `${o.year}-${o.month}-${o.day}`, time: `${o.hour === "24" ? "00" : o.hour}:${o.minute}` }; };
async function briefMsg(date: string) {
  const br = BRIEF[date]; if (!br) return null;
  const { data: kv } = await sb.from("kv").select("value").eq("key", "live").maybeSingle();
  const live: any = kv?.value ?? {};
  const wx = (live.weather ?? [])[0];
  const alerts = (live.alerts ?? []).filter((a: any) => (a.date === date || a.date === "all") && a.level !== "info");
  const dayStart = new Date(`${date}T00:00:00+01:00`).toISOString(), dayEnd = new Date(`${date}T23:59:59+01:00`).toISOString();
  const { data: bks } = await sb.from("bookings").select("title,at,shared").eq("shared", true).gte("at", dayStart).lte("at", dayEnd).order("at");
  const hm = (iso: string) => vParts(new Date(iso).getTime()).time;
  const lines = [
    wx ? `🌦 ${wx.t}${wx.s ? ", " + wx.s : ""}` : "",
    alerts.length ? `⚠️ ${alerts.map((a: any) => a.title).join("; ")}` : "✅ Yollarda problem yoxdur",
    `🗓 ${br.items.slice(0, 3).join(" · ")}`,
    (bks ?? []).length ? `🎟 ${(bks ?? []).map((x: any) => hm(x.at) + " " + x.title).join(" · ")}` : "",
  ].filter(Boolean);
  return { title: `☀️ ${br.title}`, body: lines.join("\n"), url: "./?brief=1" };
}
async function pushTick() {
  const now = Date.now();
  // morning briefing
  const vp = vParts(now), br = BRIEF[vp.date];
  if (br && vp.time >= br.at && vp.time < "13:00") {
    const flag = "brief:" + vp.date;
    const { data: done } = await sb.from("kv").select("key").eq("key", flag).maybeSingle();
    if (!done) {
      await sb.from("kv").upsert({ key: flag, value: { ts: now }, updated_at: new Date().toISOString() });
      const m = await briefMsg(vp.date);
      if (m) await sendTo(PEOPLE, m);
    }
  }
  const { data } = await sb.from("bookings").select("*").eq("sent", false).lte("at", new Date(now + 1440 * 60000).toISOString()).gte("at", new Date(now - 3600000).toISOString());
  let sent = 0;
  for (const bk of data ?? []) {
    const due = new Date(bk.at).getTime() - (bk.lead_min ?? 60) * 60000;
    if (due > now) continue;
    const mins = Math.max(0, Math.round((new Date(bk.at).getTime() - now) / 60000));
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" }).format(new Date(bk.at));
    const people = bk.shared ? PEOPLE : [bk.by];
    sent += await sendTo(people, { title: `⏰ ${mins > 0 ? mins + " dəq sonra" : "İndi"}: ${bk.title}`, body: `${t}${bk.place ? " · " + bk.place : ""}${bk.note ? "\n" + bk.note : ""}` });
    await sb.from("bookings").update({ sent: true }).eq("id", bk.id);
  }
  return { ok: true, sent };
}

async function freeTranslate(b: any): Promise<Response> {
  const q = String(b.q ?? "").slice(0, 1500).trim();
  const sl = /^[a-z]{2}$|^auto$/.test(b.sl) ? b.sl : "auto", tl = /^[a-z]{2}$/.test(b.tl) ? b.tl : "de";
  if (!q) return json({ error: "invalid" }, 400);
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(q)}`, { headers: { "user-agent": "Mozilla/5.0" } });
    if (r.ok) {
      const j = await r.json();
      const text = (j?.[0] ?? []).map((x: any) => x?.[0] ?? "").join("").trim();
      if (text) return json({ text, src: j?.[2] ?? sl, via: "google" });
    }
  } catch { /* fall through */ }
  try {
    const pair = `${sl === "auto" ? "az" : sl}|${tl}`;
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${pair}`);
    if (r.ok) { const j = await r.json(); const text = String(j?.responseData?.translatedText ?? "").trim(); if (text && j?.responseStatus === 200) return json({ text, src: sl, via: "mymemory" }); }
  } catch { /* */ }
  return json({ error: "upstream" }, 502);
}

/* ------------------------------------------------------------------ limits */
async function allow(mode: string, who: string, provider: string, isPrice = false): Promise<boolean> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  let q = sb.from("ai_log").select("id", { count: "exact", head: true }).gte("created_at", since);
  if (isPrice) q = q.eq("mode", "price.search");
  const { count } = await q;
  const limit = Number(await cfg(isPrice ? "price_daily_limit" : "ai_daily_limit", isPrice ? "400" : "2500"));
  if ((count ?? 0) >= limit) return false;
  await sb.from("ai_log").insert({ mode: mode.slice(0, 20), who: who.slice(0, 20), provider });
  return true;
}

/* ------------------------------------------------------------------ generic text/vision (streaming) */
function cleanMessages(b: any) {
  let m = Array.isArray(b.messages) ? b.messages.slice(-12) : [];
  m = m.filter((x: any) => (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .map((x: any) => ({ role: x.role, content: x.content.slice(0, 12000) }));
  return m;
}
async function aiText(b: any): Promise<Response> {
  const prov = await pick("text");
  if (!prov) return json({ error: "no_key" }, 503);
  if (!(await allow(String(b.mode ?? ""), String(b.who ?? ""), prov))) return json({ error: "rate_limited" }, 429);
  const msgs = cleanMessages(b);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "invalid" }, 400);
  const tier = ["fast", "vision", "search"].includes(b.tier) ? b.tier : "fast";
  const M = await models();
  const maxTok = Math.min(Number(b.max_tokens) || 900, 1600);
  const image = typeof b.image === "string" && b.image.length < 3_000_000 ? b.image : null;
  const system = typeof b.system === "string" ? b.system.slice(0, 6000) : undefined;
  return prov === "claude"
    ? claudeStream(M.claude?.[tier] || "claude-haiku-5-5", msgs, image, system, maxTok)
    : geminiStream(M.gemini?.[tier] || "gemini-3.8-flash", msgs, image, system, maxTok);
}

const textStream = (gen: (push: (t: string) => void) => Promise<void>) => {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({
    async start(ctrl) { try { await gen((t) => ctrl.enqueue(enc.encode(t))); } finally { ctrl.close(); } },
  }), { headers: { ...CORS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" } });
};
async function sseLines(body: ReadableStream<Uint8Array>, onData: (d: any) => void) {
  const reader = body.getReader(); const dec = new TextDecoder(); let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      try { onData(JSON.parse(line.slice(5))); } catch { /* ignore */ }
    }
  }
}

async function claudeStream(model: string, msgs: any[], image: string | null, system: string | undefined, maxTok: number) {
  const messages = msgs.map((m) => ({ ...m }));
  if (image) messages[messages.length - 1].content = [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
    { type: "text", text: messages[messages.length - 1].content },
  ];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: claudeHeaders(),
    body: JSON.stringify({ model, max_tokens: maxTok, messages, system, stream: true }),
  });
  if (!r.ok || !r.body) return upstreamError(r);
  return textStream((push) => sseLines(r.body!, (ev) => { if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") push(ev.delta.text); }));
}
const claudeHeaders = () => ({ "x-api-key": keys().claude, "anthropic-version": "2023-06-01", "content-type": "application/json" });

function geminiContents(msgs: any[], image: string | null) {
  return msgs.map((m, i) => {
    const parts: any[] = [];
    if (image && i === msgs.length - 1) parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });
    parts.push({ text: m.content });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
}
async function geminiStream(model: string, msgs: any[], image: string | null, system: string | undefined, maxTok: number) {
  const body: any = { contents: geminiContents(msgs, image), generationConfig: { maxOutputTokens: maxTok + 1500, thinkingConfig: { thinkingLevel: "low" } } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  let r: Response | null = null;
  for (const m of gemChain(model)) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse`, {
      method: "POST", headers: { "x-goog-api-key": keys().gemini, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok || ![429, 500, 503].includes(r.status)) break;
  }
  if (!r || !r.ok || !r.body) return upstreamError(r!);
  return textStream((push) => sseLines(r.body!, (ev) => {
    for (const p of ev.candidates?.[0]?.content?.parts ?? []) if (p.text && !p.thought) push(p.text);
  }));
}

/* ------------------------------------------------------------------ non-streaming helpers */
async function claudeOnce(model: string, content: any, maxTok: number, tools?: any[]) {
  const messages = [{ role: "user", content }];
  let all: any[] = []; let msgs: any[] = messages;
  for (let i = 0; i < 3; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: claudeHeaders(), body: JSON.stringify({ model, max_tokens: maxTok, messages: msgs, tools }) });
    if (!r.ok) throw await upstreamErr(r);
    const j = await r.json();
    all = all.concat(j.content ?? []);
    if (j.stop_reason !== "pause_turn") break;
    msgs = [...messages, { role: "assistant", content: j.content }];
  }
  const text = all.filter((c) => c.type === "text").map((c) => c.text).join("");
  const sources: { url: string; title: string }[] = [];
  for (const c of all) {
    if (c.type === "web_search_tool_result" && Array.isArray(c.content)) for (const s of c.content) if (s.url && !sources.find((x) => x.url === s.url)) sources.push({ url: s.url, title: s.title ?? s.url });
  }
  return { text, sources };
}
async function geminiOnce(model: string, parts: any[], maxTok: number, search: boolean, thinking = "low") {
  const body: any = { contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens: maxTok + 1200, thinkingConfig: { thinkingLevel: thinking } } };
  if (search) body.tools = [{ google_search: {} }];
  let r: Response | null = null, used = model;
  for (const m of gemChain(model)) {
    used = m;
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": keys().gemini, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok || ![429, 500, 503].includes(r.status)) break;
  }
  if (!r || !r.ok) throw await upstreamErr(r!);
  const j = await r.json();
  const cand = j.candidates?.[0] ?? {};
  const text = (cand.content?.parts ?? []).filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join("");
  // collect grounding data wherever the API puts it (field placement differs between model versions)
  const deep = (o: any, k: string, acc: any[] = []): any[] => { if (o && typeof o === "object") { for (const [kk, v] of Object.entries(o)) { if (kk === k || kk === k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())) acc.push(v); else deep(v, k, acc); } } return acc; };
  const chunks = deep(j, "groundingChunks").flat();
  const sources = chunks.filter((c: any) => c?.web?.uri).map((c: any) => ({ url: c.web.uri, title: c.web.title ?? c.web.domain ?? "" }));
  const queries = deep(j, "webSearchQueries").flat().filter((x: any) => typeof x === "string");
  const dbg = { model: used, finish: cand.finishReason ?? "", keys: Object.keys(cand).join(","), gm: deep(j, "groundingMetadata").length, tools: (j.usageMetadata?.toolUsePromptTokenCount ?? 0) };
  return { text, sources, queries, dbg };
}
// if one Gemini model is overloaded (503) or rate-limited, try the other one
const gemChain = (m: string) => m === "gemini-3.1-flash-lite" ? [m, "gemini-3.8-flash"] : [m, "gemini-3.1-flash-lite"];
const parseJSON = (t: string) => { try { return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch { return null; } };

/* ------------------------------------------------------------------ price: step 1, read the product/label */
async function priceExtract(b: any): Promise<Response> {
  const prov = await pick("text");
  if (!prov) return json({ error: "no_key" }, 503);
  if (typeof b.image !== "string" || b.image.length > 3_000_000) return json({ error: "invalid" }, 400);
  if (!(await allow("price.extract", String(b.who ?? ""), prov))) return json({ error: "rate_limited" }, 429);
  const prompt = `Şəkildə mağazada məhsul və/və ya onun qiymət etiketi var. Etiketdən və məhsulun özündən oxu:
- marka (brand)
- məhsulun adı/modeli (orijinal dildə, məs. "Air Max 90", "Wool blend coat")
- qısa ad Azərbaycan dilində
- artikul/model kodu (məs. Zara 1234/567/800, Nike DM0029-100, H&M 1234567001) — yalnız şəkildə görünürsə
- barkod (EAN) — yalnız görünürsə
- etiketdəki avro qiyməti (endirimli qiymət varsa onu yaz)
- kateqoriya (geyim, ayaqqabı, kosmetika, elektronika, çanta, aksesuar, digər)
Görünməyən şeyi uydurma, boş saxla. YALNIZ JSON yaz:
{"brand":"","model":"","name_az":"","code":"","ean":"","vienna_eur":null,"category":""}`;
  const M = await models();
  try {
    const out = prov === "claude"
      ? await claudeOnce(M.claude?.vision || "claude-haiku-5-5", [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.image } }, { type: "text", text: prompt }], 400)
      : await geminiOnce(M.gemini?.extract || M.gemini?.vision || "gemini-3.1-flash-lite", [{ inline_data: { mime_type: "image/jpeg", data: b.image } }, { text: prompt }], 400, false);
    const o = parseJSON(out.text) ?? {};
    return json({ product: o, provider: prov });
  } catch (e: any) { return json({ error: e.code ?? "upstream" }, e.status ?? 502); }
}

/* ------------------------------------------------------------------ price: step 2, live search AZ + TR */
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
async function priceSearch(b: any): Promise<Response> {
  const p = b.product ?? {};
  const brand = String(p.brand ?? "").slice(0, 60), model = String(p.model ?? "").slice(0, 100), code = String(p.code ?? "").slice(0, 60), ean = String(p.ean ?? "").slice(0, 20);
  const cat = String(p.category ?? "").slice(0, 30);
  if (!brand && !model && !code && !ean) return json({ error: "invalid" }, 400);
  const key = norm(brand) + ":" + (norm(code) || norm(ean) || norm(model));

  // shared cache (12 h)
  if (!b.fresh) {
    const { data } = await sb.from("price_cache").select("result,provider,created_at").eq("key", key).maybeSingle();
    if (data && Date.now() - new Date(data.created_at).getTime() < 24 * 3600_000) {
      await logPrice(b, p, data.result);
      return json({ result: data.result, cached: true, provider: data.provider });
    }
  }
  const prov = await pick("price");
  if (!prov) return json({ error: "no_key" }, 503);
  if (!(await allow("price.search", String(b.who ?? ""), prov, true))) return json({ error: "rate_limited" }, 429);

  const ident = [brand && `Marka: ${brand}`, model && `Model/ad: ${model}`, code && `Artikul/kod: ${code}`, ean && `Barkod (EAN): ${ean}`, cat && `Kateqoriya: ${cat}`].filter(Boolean).join("\n");
  const prompt = `Bu məhsulun HAZIRKI satış qiymətini internetdə tap:
${ident}

1) AZƏRBAYCAN (Bakı), qiymət AZN ilə: əvvəlcə markanın rəsmi Azərbaycan saytı (məs. zara.com/az, hm.com, lcwaikiki.az, nike.az, adidas.az, apple.com/az), sonra Azərbaycan onlayn mağazaları (umico.az, birmarket.az, trendyol.com/az, kontakt.az, irshad.az, bakuelectronics.az, ideal.az, sportmaster.az, parfum.az və s.).
2) TÜRKİYƏ, qiymət TRY ilə: markanın rəsmi Türkiyə saytı, sonra trendyol.com, hepsiburada.com, n11.com, boyner.com.tr, beymen.com, sephora.com.tr, gratis.com, mediamarkt.com.tr və s.
MÜTLƏQ Google Search alətindən istifadə et — yaddaşdan qiymət yazmaq qadağandır. Ən azı bu sorğuları et: "${[brand, code || model].filter(Boolean).join(" ")} fiyat" və "${[brand, code || model].filter(Boolean).join(" ")} qiymət Bakı". Hər ölkədə ən çox 3 təklif.
QAYDALAR: Yalnız axtarış nəticələrində həqiqətən GÖRDÜYÜN qiymətləri yaz. Təxmin etmə. Eyni artikul/model isə "match":"exact", oxşar məhsuldursa "match":"similar". Tapmasan, siyahını boş qoy.
Sonda YALNIZ bu JSON-u yaz:
{"baku":[{"store":"","price":0,"currency":"AZN","url":"","match":"exact"}],"turkey":[{"store":"","price":0,"currency":"TRY","url":"","match":"exact"}],"note":"<1 qısa cümlə Azərbaycan dilində>"}`;

  const M = await models();
  try {
    let out: { text: string; sources: { url: string; title: string }[]; queries?: string[]; dbg?: any };
    let o: any = {}, grounded = false;
    if (prov === "gemini") {
      // 1) two real Google searches in parallel (natural questions — strict-JSON prompts make the model skip searching)
      const q = [brand, model, code].filter(Boolean).join(" ") || ean;
      const sm = M.gemini?.search || "gemini-3.8-flash";
      const trQ = `${q} fiyat. Bu ürünün Türkiye'deki güncel satış fiyatlarını bul: markanın resmi Türkiye sitesi, Trendyol, Hepsiburada, Boyner, n11 vb. Her mağaza için mağaza adı, fiyat (TL), ürün linki ve ürün kodunun aynı olup olmadığını yaz. En fazla 4 mağaza.`;
      const azQ = `${q} qiymət Bakı. Bu məhsulun Azərbaycanda (Bakı) hazırkı satış qiymətini tap: markanın rəsmi Azərbaycan saytı, Umico, Birmarket, Trendyol Azərbaycan, Bakı mağazaları və s. Hər mağaza üçün ad, qiymət (AZN), link və artikulun eyni olub-olmadığını yaz. Ən çox 4 mağaza.`;
      const [tr, az] = await Promise.all([geminiOnce(sm, [{ text: trQ }], 900, true, "low"), geminiOnce(sm, [{ text: azQ }], 900, true, "low")]);
      const isG = (x: any) => x.sources.length > 0 || (x.queries ?? []).length > 0;
      grounded = isG(tr) || isG(az);
      out = { text: "", sources: [...tr.sources, ...az.sources], queries: [...(tr.queries ?? []), ...(az.queries ?? [])], dbg: { tr: tr.dbg, az: az.dbg } };
      // 2) cheap structuring step, no search: only prices that appear in the found text
      if (grounded) {
        const fx = M.gemini?.fast || "gemini-3.1-flash-lite";
        const conv = `Aşağıda internet axtarışının nəticələri var. Onlardan YALNIZ açıq yazılmış qiymətləri götür, heç nə uydurma.
Məhsul: ${ident.replace(/\n/g, "; ")}
--- TÜRKİYƏ ---
${isG(tr) ? tr.text : "(axtarış alınmadı)"}
--- BAKI ---
${isG(az) ? az.text : "(axtarış alınmadı)"}
---
Qaydalar: qiymət aralığıdırsa (məs. 3000–4500 TL) ən aşağı konkret mağaza qiymətini götür; mağaza adı yoxdursa yazma. Eyni artikul/model "exact", oxşar "similar". Bakı üçün yalnız AZN qiymətləri, Türkiyə üçün yalnız TL.
YALNIZ JSON:
{"baku":[{"store":"","price":0,"currency":"AZN","url":"","match":"exact"}],"turkey":[{"store":"","price":0,"currency":"TRY","url":"","match":"exact"}],"note":"<1 qısa cümlə Azərbaycan dilində>"}`;
        const c = await geminiOnce(fx, [{ text: conv }], 700, false, "low");
        o = parseJSON(c.text) ?? {};
      }
    } else {
      out = await claudeOnce(M.claude?.search || "claude-haiku-5-5", prompt, 1200, [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }]);
      grounded = out.sources.length > 0;
      o = grounded ? (parseJSON(out.text) ?? {}) : {};
    }
    const clean = (arr: any, cur: string) => (Array.isArray(arr) ? arr : [])
      .map((x: any) => ({ store: String(x.store ?? "").slice(0, 60), price: Number(x.price), currency: cur, url: String(x.url ?? ""), match: x.match === "similar" ? "similar" : "exact" }))
      .filter((x: any) => x.price > 0 && x.price < 10_000_000)
      .map((x: any) => ({ ...x, url: resolveUrl(x, out.sources) }))
      .slice(0, 4);
    const result = { baku: clean(o.baku, "AZN"), turkey: clean(o.turkey, "TRY"), note: grounded ? String(o.note ?? "").slice(0, 300) : "İnternet axtarışı bu dəfə alınmadı — “🔄 Təzədən” bas.", sources: out.sources.slice(0, 8), grounded, queries: (out.queries ?? []).slice(0, 6), dbg: out.dbg, at: Date.now() };
    if (grounded) await sb.from("price_cache").upsert({ key, result, provider: prov, created_at: new Date().toISOString() });
    await logPrice(b, p, result);
    return json({ result, cached: false, provider: prov });
  } catch (e: any) { return json({ error: e.code ?? "upstream", detail: e.detail ? String(e.detail).slice(0, 300) : undefined }, e.status ?? 502); }
}
// Prefer a real source link from search results whose domain matches the offer.
function resolveUrl(offer: { url: string; store: string }, sources: { url: string; title: string }[]) {
  const dom = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const od = dom(offer.url);
  const sd = (s: { url: string; title: string }) => { const t = s.title.toLowerCase().replace(/^www\./, ""); return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(t) ? t : dom(s.url); };
  if (od && sources.some((s) => sd(s) === od || od.endsWith("." + sd(s)) || sd(s).endsWith("." + od))) {
    const s = sources.find((x) => sd(x) === od || od.endsWith("." + sd(x)) || sd(x).endsWith("." + od))!;
    return offer.url.startsWith("http") && !/\.(jpe?g|png|webp|gif)$/i.test(offer.url) ? offer.url : s.url;
  }
  if (od && sources.some((s) => dom(s.url) === od)) {
    const hit = sources.find((s) => dom(s.url) === od);
    return hit ? (offer.url.startsWith("http") ? offer.url : hit.url) : offer.url;
  }
  const st = offer.store.toLowerCase().replace(/^www\./, "");
  const byTitle = sources.find((s) => s.title && (s.title.toLowerCase().includes(st) || st.includes(s.title.toLowerCase().replace(/^www\./, ""))));
  if (byTitle) return byTitle.url;
  return offer.url.startsWith("http") ? offer.url : "";
}
async function logPrice(b: any, p: any, result: any) {
  const thumb = typeof b.thumb === "string" && b.thumb.startsWith("data:image/jpeg;base64,") && b.thumb.length < 60000 ? b.thumb : null;
  await sb.from("price_log").insert({ ts: Date.now(), who: String(b.who ?? "").slice(0, 20), brand: String(p.brand ?? "").slice(0, 60), name: String(p.name_az || p.model || "").slice(0, 100), code: String(p.code ?? "").slice(0, 60), vienna_eur: Number(p.vienna_eur) > 0 ? Number(p.vienna_eur) : null, result, thumb });
}

/* ------------------------------------------------------------------ errors */
async function upstreamErr(r: Response) {
  const t = await r.text().catch(() => "");
  const code = r.status === 429 || r.status === 529 ? "rate_limited" : r.status === 401 || r.status === 403 ? "bad_key" : /credit|billing|quota/i.test(t) ? "no_credit" : "upstream";
  return { code, status: r.status === 401 || r.status === 403 ? 503 : 502, detail: t.slice(0, 300) };
}
async function upstreamError(r: Response) { const e = await upstreamErr(r); return json({ error: e.code, detail: e.detail }, e.status); }
