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
  const code = await cfg("trip_code");
  if (!b || !code || b.k !== code) return json({ error: "forbidden" }, 403);
  // personal link → identity (server decides who you are; admin can act as anyone for testing)
  let users: Record<string, string> = {};
  try { users = JSON.parse(await cfg("users", "{}")); } catch { /* */ }
  const uname = users[String(b.u ?? "")];
  if (!uname) return json({ error: "no_user" }, 403);
  const admin = uname === "admin";
  const who = admin ? (PEOPLE.includes(b.as) ? b.as : "") : uname;
  b.who = who; b.sbx = admin; // admin test link = sandbox: its writes are kept apart and never shown to the girls
  const k = keys();
  const aiStatus = { claude: !!k.claude, gemini: !!k.gemini };

  // usage stats for the end-of-trip report: only who · which function · when (never any content)
  const op = String(b.op ?? "");
  if (who && !admin && !["sync", "ping", "use", "push.sub", "kv.set"].includes(op) || (who && !admin && op === "kv.set" && b.key === "prog"))
    await sb.from("usage").insert({ who, ev: op === "kv.set" ? "op:prog" : "op:" + op.slice(0, 30) }).then(() => {}, () => {});
  try {
    switch (b.op) {
      case "use": {
        if (!who || admin) return json({ ok: true });
        const now = Date.now();
        const rows = (Array.isArray(b.ev) ? b.ev : []).slice(0, 60)
          .filter((x: any) => x && /^[a-z0-9:._-]{1,40}$/.test(String(x.e)))
          .map((x: any) => { const t = Number(x.t); return { who, ev: String(x.e), ts: new Date(t > now - 3 * 86400000 && t <= now + 60000 ? t : now).toISOString() }; });
        if (rows.length) await sb.from("usage").insert(rows);
        return json({ ok: true });
      }
      case "ping": return json({ ok: true, ai: aiStatus.claude || aiStatus.gemini, providers: aiStatus, who, admin });

      case "sync": {
        const [ex, kv, pl] = await Promise.all([
          admin ? sb.from("expenses").select("*").or("priv.eq.false,sbx.eq.true").order("ts", { ascending: false }).limit(1500)
            : sb.from("expenses").select("*").eq("sbx", false).or(`priv.eq.false,by.eq.${who || "-"}`).order("ts", { ascending: false }).limit(1500),
          sb.from("kv").select("key,value,updated_at"),
          sb.from("price_log").select("id", { count: "exact", head: true }),
        ]);
        if (ex.error) throw ex.error;
        if (kv.error) throw kv.error;
        const kvm: Record<string, unknown> = {};
        for (const r of kv.data ?? []) if (r.key !== "pushlog" && !r.key.startsWith("sbx:") && !r.key.startsWith("nudge")) kvm[r.key] = r.value;
        if (admin) for (const r of kv.data ?? []) if (r.key.startsWith("sbx:")) kvm[r.key.slice(4)] = r.value; // admin sees own test state on top
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
          priv: r.priv === true, cat: r.cat ? String(r.cat).slice(0, 30) : null, sbx: admin,
        };
        const { data, error } = await sb.from("expenses").insert(row).select().single();
        if (error) throw error;
        return json({ row: data });
      }
      case "exp.upd": {
        if (!who) return json({ error: "no_user" }, 403);
        const { data: old } = await sb.from("expenses").select("priv,by,sbx").eq("id", String(b.id)).maybeSingle();
        if (!old) return json({ error: "not_found" }, 404);
        if (old.sbx !== admin) return json({ error: admin ? "test_readonly" : "not_found" }, admin ? 403 : 404);
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
        const { error } = await sb.from("expenses").update({ tf: b.tf === true }).eq("id", String(b.id)).eq("sbx", admin);
        if (error) throw error;
        return json({ ok: true });
      }
      case "exp.del": {
        const { data: row } = await sb.from("expenses").select("priv,by").eq("id", String(b.id)).maybeSingle();
        if (row && row.priv && row.by !== who) return json({ error: "forbidden" }, 403);
        const { error } = await sb.from("expenses").delete().eq("id", String(b.id)).eq("sbx", admin);
        if (error) throw error;
        return json({ ok: true });
      }

      case "kv.set": {
        const key = String(b.key || ""), v = b.value;
        if (key === "hotel") {
          if (!(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        } else if (key === "prog") {
          // shared trip progress (arrived / left hotel / skipped stops) — small object, any of the three may update it
          if (!v || typeof v !== "object" || Array.isArray(v) || JSON.stringify(v).length > 30000) return json({ error: "invalid" }, 400);
        } else if (LOC_KEY.test(key)) {
          if (key !== "loc:" + who) return json({ error: "forbidden" }, 403);
          if (v !== null && !(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        } else return json({ error: "readonly" }, 400);
        if (v === null) { await sb.from("kv").delete().eq("key", admin ? "sbx:" + key : key); return json({ ok: true }); }
        const val = key === "prog" ? v : key === "hotel" ? { lat: v.lat, lng: v.lng, name: String(v.name ?? "").slice(0, 80), addr: String(v.addr ?? "").slice(0, 160), phone: String(v.phone ?? "").slice(0, 30), ci: String(v.ci ?? "").slice(0, 30), co: String(v.co ?? "").slice(0, 30), note: String(v.note ?? "").slice(0, 300) }
          : { lat: v.lat, lng: v.lng, acc: Number(v.acc) || 0, ts: Date.now() };
        const { error } = await sb.from("kv").upsert({ key: admin ? "sbx:" + key : key, value: val, updated_at: new Date().toISOString() });
        if (error) throw error;
        return json({ ok: true });
      }

      case "photo.add": {
        const t = String(b.thumb || "");
        if (!t.startsWith("data:image/jpeg;base64,") || t.length > 115000) return json({ error: "invalid" }, 400);
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("photos").insert({ ts: Number(b.ts) || Date.now(), who, name: String(b.name ?? "").slice(0, 100), poi: String(b.poi ?? "").slice(0, 40), thumb: t, priv: b.priv === true, sbx: admin });
        if (error) throw error;
        return json({ ok: true });
      }
      case "photos": {
        const { data, error } = await (admin ? sb.from("photos").select("id,ts,who,name,poi,thumb,priv").or("priv.eq.false,sbx.eq.true")
          : sb.from("photos").select("id,ts,who,name,poi,thumb,priv").eq("sbx", false).or(`priv.eq.false,who.eq.${who || "-"}`)).order("ts", { ascending: false }).limit(120);
        if (error) throw error;
        return json({ photos: data });
      }
      case "prices": {
        let pq = sb.from("price_log").select("id,ts,who,brand,name,code,vienna_eur,result,thumb"); if (!admin) pq = pq.eq("sbx", false);
        const { data, error } = await pq.order("ts", { ascending: false }).limit(100);
        if (error) throw error;
        return json({ prices: data });
      }

      // ---- private per-person lists (only the owner ever sees them) ----
      case "gifts": {
        if (!who) return json({ gifts: [] });
        const { data, error } = await sb.from("gifts").select("*").eq("by", who).eq("sbx", admin).order("ts", { ascending: true });
        if (error) throw error;
        return json({ gifts: data });
      }
      case "gift.add": {
        if (!who) return json({ error: "no_user" }, 403);
        const recipient = String(b.recipient ?? "").trim().slice(0, 40), item = String(b.item ?? "").trim().slice(0, 100);
        if (!recipient || !item) return json({ error: "invalid" }, 400);
        const budget = Number(b.budget) > 0 ? Math.round(Number(b.budget) * 100) / 100 : null;
        const { data, error } = await sb.from("gifts").insert({ by: who, recipient, item, budget, ts: Date.now(), sbx: admin }).select().single();
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
        const { data, error } = await sb.from("gifts").update(upd).eq("id", String(b.id)).eq("by", who).eq("sbx", admin).select().single();
        if (error) throw error;
        return json({ gift: data });
      }
      case "gift.del": {
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("gifts").delete().eq("id", String(b.id)).eq("by", who).eq("sbx", admin);
        if (error) throw error;
        return json({ ok: true });
      }
      case "notes": {
        if (!who) return json({ notes: [] });
        const { data, error } = await sb.from("notes").select("id,day,txt,ts").eq("by", who).eq("sbx", admin).order("ts", { ascending: true });
        if (error) throw error;
        return json({ notes: data });
      }
      case "note.add": {
        if (!who) return json({ error: "no_user" }, 403);
        const txt = String(b.txt ?? "").trim().slice(0, 2000), day = String(b.day ?? "").slice(0, 10);
        if (!txt || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: "invalid" }, 400);
        const { data, error } = await sb.from("notes").insert({ by: who, day, txt, ts: Date.now(), sbx: admin }).select("id,day,txt,ts").single();
        if (error) throw error;
        return json({ note: data });
      }
      case "note.del": {
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("notes").delete().eq("id", String(b.id)).eq("by", who).eq("sbx", admin);
        if (error) throw error;
        return json({ ok: true });
      }

      // ---- bookings / tickets (own + shared) and reminders ----
      case "bookings": {
        const { data, error } = await (admin ? sb.from("bookings").select("*").or("and(shared.eq.true,sbx.eq.false),sbx.eq.true")
          : sb.from("bookings").select("*").eq("sbx", false).or(`shared.eq.true,by.eq.${who || "-"}`)).order("at", { ascending: true });
        if (error) throw error;
        return json({ bookings: data, vapid: await cfg("vapid_pub") });
      }
      case "booking.add": case "booking.upd": {
        if (!who && !admin) return json({ error: "no_user" }, 403);
        const r = b.row ?? {};
        const at = new Date(String(r.at ?? ""));
        const title = String(r.title ?? "").trim().slice(0, 100);
        if (!title || isNaN(at.getTime())) return json({ error: "invalid" }, 400);
        const img = typeof r.img === "string" && r.img.startsWith("data:image/jpeg;base64,") && r.img.length < 600000 ? r.img : (r.img === null ? null : undefined);
        const row: Record<string, unknown> = { title, at: at.toISOString(), shared: r.shared === true, poi: r.poi ? String(r.poi).slice(0, 40) : null, place: String(r.place ?? "").slice(0, 120), note: String(r.note ?? "").slice(0, 500), lead_min: Math.max(0, Math.min(1440, Number(r.lead_min) || 60)), sent: false };
        if (img !== undefined) row.img = img;
        if (b.op === "booking.add") {
          const { data, error } = await sb.from("bookings").insert({ ...row, by: who || "Kənan", sbx: admin }).select().single();
          if (error) throw error;
          return json({ booking: data });
        }
        const { data, error } = await sb.from("bookings").update(row).eq("id", String(b.id)).eq("sbx", admin).eq("by", who || "Kənan").select().single();
        if (error) throw error;
        return json({ booking: data });
      }
      case "booking.del": {
        if (!who) return json({ error: "no_user" }, 403);
        const { error } = await sb.from("bookings").delete().eq("id", String(b.id)).eq("sbx", admin).eq("by", who || "Kənan");
        if (error) throw error;
        return json({ ok: true });
      }
      case "push.sub": {
        if (!who && !admin) return json({ error: "no_user" }, 403);
        const sub = b.sub;
        if (!sub || typeof sub.endpoint !== "string" || !sub.keys) return json({ error: "invalid" }, 400);
        const { error } = await sb.from("push_subs").upsert({ endpoint: sub.endpoint, who: admin ? "admin" : who, sub }); // the test phone gets its own slot (copies of what the girls receive)
        if (error) throw error;
        return json({ ok: true });
      }
      case "push.test": {
        if (!who && !admin) return json({ error: "no_user" }, 403);
        const n = await sendTo([admin ? "admin" : who], { title: "🔔 Wien Bələdçi", body: "Bildirişlər işləyir! Xatırlatmalar bura gələcək." });
        return json({ sent: n });
      }

      case "push.diag": {
        // admin only: send a test (or today's brief again) to chosen people and show what Apple/Google answered
        if (!admin) return json({ error: "forbidden" }, 403);
        const to = (Array.isArray(b.to) ? b.to : PEOPLE).filter((p: string) => PEOPLE.includes(p));
        const { data: subs } = await sb.from("push_subs").select("who").in("who", to);
        let msg: any = { title: "🔔 Wien Bələdçi", body: "Yoxlama bildirişi — bunu görürsənsə, bildirişlər işləyir ✓" };
        if (b.brief) { const m = await briefMsg(vParts(Date.now()).date); if (m) msg = m; }
        if (b.nudge) return json(await nudgeRun(Date.now(), { dry: !!b.dry, force: true, only: to }));
        const res = b.dry ? [] : await sendToR(to, msg);
        return json({ subscribed: (subs ?? []).map((x: any) => x.who), results: res });
      }
      case "tts": return await freeTts(b);
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
type PushRes = { who: string; ep: string; status: number; err?: string };
async function sendToR(people: string[], msg: { title: string; body: string; url?: string }): Promise<PushRes[]> {
  const pub = await cfg("vapid_pub"), priv = await cfg("vapid_priv");
  if (!pub || !priv) return [{ who: "-", ep: "", status: 0, err: "no_vapid" }];
  webpush.setVapidDetails("https://wien-beledci.onrender.com", pub, priv);
  const { data } = await sb.from("push_subs").select("endpoint,sub,who").in("who", people);
  const out: PushRes[] = [];
  for (const s of data ?? []) {
    const ep = String(s.endpoint).slice(0, 40);
    try { const r: any = await webpush.sendNotification(s.sub, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "high" }); out.push({ who: s.who, ep, status: r?.statusCode ?? 201 }); }
    catch (e: any) {
      out.push({ who: s.who, ep, status: e?.statusCode ?? -1, err: String(e?.body || e?.message || e).slice(0, 200) });
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
    }
  }
  // keep the last 30 delivery results so problems are visible
  try {
    const { data: old } = await sb.from("kv").select("value").eq("key", "pushlog").maybeSingle();
    const log = Array.isArray(old?.value) ? old!.value : [];
    const add = out.length ? out.map((r) => ({ ...r, t: new Date().toISOString(), title: msg.title.slice(0, 40) })) : [{ who: people.join(","), ep: "", status: 0, err: "no_subscription", t: new Date().toISOString(), title: msg.title.slice(0, 40) }];
    await sb.from("kv").upsert({ key: "pushlog", value: [...add, ...log].slice(0, 30), updated_at: new Date().toISOString() });
  } catch { /* logging must never block sending */ }
  return out;
}
async function sendTo(people: string[], msg: { title: string; body: string; url?: string }): Promise<number> {
  return (await sendToR(people, msg)).filter((r) => r.status >= 200 && r.status < 300).length;
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
  // that day's weather (weather[].day is like "17 noy"), else the first entry
  const dd = String(+date.slice(8, 10)) + " ";
  const wx = (live.weather ?? []).find((w: any) => String(w.day ?? "").startsWith(dd)) ?? (live.weather ?? [])[0];
  // everything special for that day (info too); trip-wide notes only when they are warnings
  const alerts = (live.alerts ?? []).filter((a: any) => a.date === date || (a.date === "all" && a.level === "warn"));
  const dayStart = new Date(`${date}T00:00:00+01:00`).toISOString(), dayEnd = new Date(`${date}T23:59:59+01:00`).toISOString();
  const { data: bks } = await sb.from("bookings").select("title,at,shared").eq("shared", true).gte("at", new Date(Math.max(Date.now(), Date.parse(dayStart))).toISOString()).lte("at", dayEnd).order("at"); // only what is still ahead
  const hm = (iso: string) => vParts(new Date(iso).getTime()).time;
  const lines = [
    wx ? `🌦 ${wx.t}${wx.s ? ", " + wx.s : ""}` : "",
    alerts.length ? `${alerts.some((a: any) => a.level === "warn") ? "⚠️" : "ℹ️"} ${alerts.map((a: any) => a.title).join("; ")}` : "✅ Yollarda problem yoxdur",
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
      if (m) { await sendTo(PEOPLE, m); await sendTo(["admin"], { ...m, title: "📋 Hamıya: " + m.title }); }
    }
  }
  try { await nudgeRun(now, {}); } catch { /* nudges must never block reminders */ }
  const { data } = await sb.from("bookings").select("*").eq("sent", false).lte("at", new Date(now + 1440 * 60000).toISOString()).gte("at", new Date(now - 3600000).toISOString());
  let sent = 0;
  for (const bk of data ?? []) {
    const due = new Date(bk.at).getTime() - (bk.lead_min ?? 60) * 60000;
    if (due > now) continue;
    const mins = Math.max(0, Math.round((new Date(bk.at).getTime() - now) / 60000));
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" }).format(new Date(bk.at));
    const people = bk.sbx ? ["admin"] : bk.shared ? PEOPLE : [bk.by];
    const rm = { title: `⏰ ${mins > 0 ? mins + " dəq sonra" : "İndi"}: ${bk.title}`, body: `${t}${bk.place ? " · " + bk.place : ""}${bk.note ? "\n" + bk.note : ""}` };
    sent += await sendTo(people, rm);
    if (!bk.sbx) await sendTo(["admin"], { ...rm, title: "📋 " + (bk.shared ? "Hamıya" : bk.by + "-a") + ": " + rm.title });
    await sb.from("bookings").update({ sent: true }).eq("id", bk.id);
  }
  return { ok: true, sent };
}

// 💌 friendly "try this" nudges: max 2–3 a day per girl, picked from what she has not used yet; a copy goes to Kənan's test phone
const NUDGE_SLOTS: Record<string, string[]> = { "2026-11-17": ["15:30", "18:45"], "2026-11-18": ["11:00", "15:00", "18:45"], "2026-11-19": ["11:00", "15:00", "18:45"], "2026-11-20": ["17:00"] };
const NUDGE_PLACES: Record<string, [string, string, string][]> = {
  "2026-11-17": [["14:45", "17:45", "Stephansdom"], ["18:15", "21:00", "Rathaus Milad bazarı"]],
  "2026-11-18": [["09:15", "11:30", "Schönbrunn sarayı"], ["11:30", "13:45", "Gloriette"]],
  "2026-11-19": [["09:15", "11:30", "Belvedere"], ["11:30", "13:00", "Hundertwasserhaus"], ["14:15", "17:30", "Prater"]],
};
type Nudge = { id: string; t: string; b: string; go: string; eve?: boolean; mid?: boolean; need?: (u: Record<string, number>) => boolean };
const KT = "Kənan bu gəzintidə tətbiqi test edir — ona kömək edin 😄";
const NUDGES: Nudge[] = [
  { id: "story", mid: true, t: "📖 {place} yanındasınız?", b: "Xəritədə yerə toxunun — hekayəsini danışım, istəsəniz səsli də 🔊 " + KT, go: "map" },
  { id: "cam", mid: true, t: "📷 Yeri tanıyım?", b: "Bir şəkil çəkin, tətbiq yeri özü tapsın və tarixini danışsın 🔍 Kənan üçün yoxlayın: düz tapacaq? 🙈", go: "cam", need: (u) => !u["op:ai"] },
  { id: "price", mid: true, t: "🛍 Bakıda neçəyədir?", b: "Mağazada bəyəndiyiniz şeyin etiketini çəkin — Bakı və Türkiyə qiymətini göstərim 💸 Kənan nəticəni maraqla gözləyir 🙈", go: "price", need: (u) => !u["op:price.search"] && !u.prices },
  { id: "tr", mid: true, t: "🗣 Almanca lazım oldu?", b: "Tərcümə bölməsi yazır və səsli oxuyur — telefon səssizdə olsa belə 🔊 " + KT, go: "tr", need: (u) => !u["view:tr"] && !u["op:gt"] },
  { id: "reco", mid: true, t: "✨ İndi hara gedək?", b: "Bilmirsinizsə, ana səhifədəki “İndi hara gedək?” düyməsini basın — yaxındakı ən yaxşı yeri deyim 😉 Kənan bu düyməni çox sevir", go: "reco" },
  { id: "exp", eve: true, t: "💶 Bu gün nəyə xərclədiniz?", b: "Xərclər bölməsinə yazın, çekin şəklini də çəkə bilərsiniz — hesab üçünüzə özü bölünür 🧮 " + KT, go: "exp", need: (u) => !u["op:exp.add"] },
  { id: "menu", eve: true, t: "🍽 Şam yeməyi vaxtı!", b: "Menyunun şəklini çəkin — azərbaycancaya tərcümə edim 📖 Kənan üçün yoxlayın, düz tərcümə edirmi? 😄", go: "menu" },
  { id: "alb", eve: true, t: "🖼 Günün ən gözəl şəkli?", b: "Bu günün şəkillərini albomə atın — trip sonunda hamısı bir yerdə olacaq 📸", go: "alb", need: (u) => !u.photosToday },
  { id: "mem", eve: true, t: "📔 Bu gün necə keçdi?", b: "Günün xatirəsini 1–2 cümlə ilə yazın — Kənan trip sonunda oxumaq istəyir 😊", go: "mem" },
];
const NUDGE_HOME: Nudge = { id: "home", t: "🏡 Evə xoş gəldiniz 💛", b: "Şəkilləri albomə əlavə edin və gəzintinin xatirəsini, davamını tətbiqdə yazın — Kənan oxumağa hazırdır 😊", go: "alb" };
async function nudgeRun(now: number, o: { dry?: boolean; force?: boolean; only?: string[] }) {
  const vp = vParts(now), slots = NUDGE_SLOTS[vp.date] ?? [];
  const slot = [...slots].reverse().find((x) => vp.time >= x);
  if (!o.force && (!slot || vp.time > addMin(slot, 40))) return { skipped: "no_slot" };
  const people = (o.only ?? PEOPLE).filter((p) => PEOPLE.includes(p));
  const { data: subs } = await sb.from("push_subs").select("who").in("who", people);
  const subbed = new Set((subs ?? []).map((x: any) => x.who));
  const { data: st } = await sb.from("kv").select("value").eq("key", "nudge:state").maybeSingle();
  const state: any = st?.value ?? {};
  // no nudge right next to a real reminder
  const { data: soon } = await sb.from("bookings").select("id").eq("sbx", false).gte("at", new Date(now - 15 * 60000).toISOString()).lte("at", new Date(now + 45 * 60000).toISOString());
  if (!o.force && (soon ?? []).length) return { skipped: "booking_nearby" };
  const since = "2026-11-16T00:00:00Z", dayStart = new Date(`${vp.date}T00:00:00+01:00`).toISOString();
  const place = (NUDGE_PLACES[vp.date] ?? []).find(([a, z]) => vp.time >= a && vp.time < z)?.[2];
  const plan: { who: string; n: Nudge }[] = [];
  for (const [i, who] of people.entries()) {
    const ps = state[who] ?? { slots: [], ids: [], last: 0 };
    if (!o.force && (ps.slots.includes(vp.date + " " + slot) || now - (ps.last ?? 0) < 150 * 60000)) continue;
    if (!subbed.has(who)) continue;
    let n: Nudge | undefined;
    if (vp.date === "2026-11-20") n = ps.ids.includes("home") ? undefined : NUDGE_HOME;
    else {
      const u: Record<string, number> = {};
      const { data: ev } = await sb.from("usage").select("ev").eq("who", who).gte("ts", since).limit(5000);
      for (const e of ev ?? []) u[e.ev] = (u[e.ev] ?? 0) + 1;
      const [{ count: pc }, { count: ph }] = await Promise.all([
        sb.from("price_log").select("id", { count: "exact", head: true }).eq("who", who).eq("sbx", false),
        sb.from("photos").select("id", { count: "exact", head: true }).eq("who", who).eq("sbx", false).gte("created_at", dayStart),
      ]);
      u.prices = pc ?? 0; u.photosToday = ph ?? 0;
      const eve = (slot ?? vp.time) >= "18:00";
      const pool = NUDGES.filter((x) => (eve ? x.eve : x.mid) && !ps.ids.includes(x.id) && (!x.need || x.need(u)) && (x.id !== "story" || !!place));
      n = pool.length ? pool[i % pool.length] : undefined; // the three get different suggestions when possible
    }
    if (n) plan.push({ who, n });
  }
  const out: any[] = [];
  for (const { who, n } of plan) {
    const msg = { title: n.t.replace("{place}", place ?? "Bu yerin"), body: n.b, url: "./?go=" + n.go };
    if (!o.dry) {
      const r = await sendToR([who], msg);
      await sendToR(["admin"], { ...msg, title: `📋 ${who}-a getdi: ${msg.title}` });
      const ps = state[who] ?? { slots: [], ids: [], last: 0 };
      state[who] = { slots: [...ps.slots, vp.date + " " + slot].slice(-20), ids: [...ps.ids, n.id], last: now };
      out.push({ who, id: n.id, status: r.map((x) => x.status) });
    } else out.push({ who, id: n.id, title: msg.title });
  }
  if (!o.dry && out.length) await sb.from("kv").upsert({ key: "nudge:state", value: state, updated_at: new Date().toISOString() });
  return { slot, place: place ?? null, sent: out, notSubscribed: people.filter((p) => !subbed.has(p)) };
}
const addMin = (hm: string, m: number) => { const [h, mm] = hm.split(":").map(Number); const t = h * 60 + mm + m; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

// free text-to-speech as an MP3 file: the app plays it like music, so it is heard even when the iPhone is on silent
async function freeTts(b: any): Promise<Response> {
  let tl = String(b.tl ?? "de"); if (!["de", "en", "tr", "az"].includes(tl)) tl = "de";
  let q = String(b.q ?? "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!q) return json({ error: "invalid" }, 400);
  if (tl === "az") { tl = "tr"; q = q.replace(/ə/g, "e").replace(/Ə/g, "E").replace(/x/g, "h").replace(/X/g, "H").replace(/q/g, "g").replace(/Q/g, "G"); } // Google has no Azerbaijani voice; Turkish reads it closely
  const chunks: string[] = [];
  for (const sent of q.match(/[^.!?;:]+[.!?;:]*/g) ?? [q]) {
    let s = sent.trim(); if (!s) continue;
    while (s.length > 190) { let cut = s.lastIndexOf(" ", 190); if (cut < 60) cut = 190; chunks.push(s.slice(0, cut)); s = s.slice(cut).trim(); }
    const last = chunks[chunks.length - 1];
    if (last && last.length + s.length + 1 <= 190) chunks[chunks.length - 1] = last + " " + s; else chunks.push(s);
  }
  try {
    const parts = await Promise.all(chunks.slice(0, 12).map(async (c, i) => {
      const r = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&total=${chunks.length}&idx=${i}&textlen=${c.length}&q=${encodeURIComponent(c)}`, { headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", referer: "https://translate.google.com/" } });
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("audio")) throw new Error("tts " + r.status);
      return new Uint8Array(await r.arrayBuffer());
    }));
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return new Response(out, { headers: { ...CORS, "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" } });
  } catch { return json({ error: "upstream" }, 502); }
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
  const key = "v2:" + norm(brand) + ":" + (norm(code) || norm(ean) || norm(model)); // v2 = verified results (older cached answers are simply not used any more)

  if (!b.fresh) {
    const { data } = await sb.from("price_cache").select("result,provider,created_at").eq("key", key).maybeSingle();
    if (data && Date.now() - new Date(data.created_at).getTime() < 12 * 3600_000) {
      await logPrice(b, p, data.result);
      return json({ result: data.result, cached: true, provider: data.provider });
    }
  }
  const prov = await pick("price");
  if (!prov) return json({ error: "no_key" }, 503);
  if (!(await allow("price.search", String(b.who ?? ""), prov, true))) return json({ error: "rate_limited" }, 429);

  const ident = [brand && `Marka: ${brand}`, model && `Model/ad: ${model}`, code && `Artikul/kod: ${code}`, ean && `Barkod (EAN): ${ean}`, cat && `Kateqoriya: ${cat}`].filter(Boolean).join("\n");
  const M = await models();
  try {
    // 1) several real Google searches in parallel — by article code and by model name, for Türkiye and for Baku
    const byCode = [brand, code].filter(Boolean).join(" ") || [brand, model].filter(Boolean).join(" ") || ean;
    const byName = [brand, model].filter(Boolean).join(" ");
    const sm = M.gemini?.search || "gemini-3.8-flash";
    const qs: { cc: "tr" | "az"; q: string }[] = [
      { cc: "tr", q: `${byCode} fiyat. Bu ürünü Türkiye'de satan mağazaları bul (markanın resmi Türkiye sitesi, Trendyol, Hepsiburada, Beymen, Vakko, Boyner, n11 vb.). Her biri için mağaza adı, TL fiyatı, ürün sayfası linki, stok durumu (stokta var / tükendi) ve sayfadaki ürün kodunu yaz. Sadece gerçekten gördüğün sayfaları yaz.` },
      { cc: "az", q: `${byCode} qiymət Bakı. Bu məhsulu Azərbaycanda (Bakı) satan mağazaları tap: markanın Bakı butiki və ya rəsmi saytı, Azərbaycan onlayn mağazaları (.az saytlar). Hər biri üçün mağaza adı, AZN qiyməti, məhsul səhifəsinin linki, stok vəziyyəti və səhifədəki artikul. Yalnız həqiqətən gördüyün səhifələri yaz.` },
    ];
    if (byName && byName !== byCode) {
      qs.push({ cc: "tr", q: `${byName} fiyat Türkiye. Bu modelin Türkiye'deki güncel satış fiyatları: mağaza, TL fiyat, ürün linki, stok durumu, ürün kodu.` });
      qs.push({ cc: "az", q: `${byName} price Baku Azerbaijan AZN (цена Баку). Stores in Azerbaijan selling this model: store, price in AZN, product link, stock, article code.` });
    }
    const runs = await Promise.all(qs.map((x) => geminiOnce(sm, [{ text: x.q }], 900, true, "low").then((r) => ({ ...x, r })).catch(() => null)));
    const ok = runs.filter((x): x is NonNullable<typeof x> => !!x && (x.r.sources.length > 0 || (x.r.queries ?? []).length > 0));
    const grounded = ok.length > 0;
    // 2) every grounding link is a Google redirect — resolve it to the real page address
    const rawSrc = ok.flatMap((x) => x.r.sources.map((s) => ({ ...s, cc: x.cc })));
    const seen = new Set<string>(); const srcs: { n: number; url: string; dom: string; cc: string; title: string }[] = [];
    await Promise.all(rawSrc.slice(0, 24).map(async (s) => { const real = await realUrl(s.url); (s as any).real = real; }));
    for (const s of rawSrc.slice(0, 24) as any[]) {
      const u = s.real || s.url; const dom = hostOf(u);
      if (!dom || seen.has(u)) continue; seen.add(u);
      srcs.push({ n: srcs.length + 1, url: u, dom, cc: s.cc, title: s.title });
    }
    let o: any = {};
    if (grounded && srcs.length) {
      // 3) structure: every offer must point to one of the numbered pages that the search really returned
      const fx = M.gemini?.fast || "gemini-3.1-flash-lite";
      const conv = `Aşağıda internet axtarışının nəticələri və həqiqətən tapılmış səhifələrin nömrələnmiş siyahısı var. YALNIZ bu mətnlərdə açıq yazılmış qiymətləri götür. Heç nə uydurma; mağaza siyahıda yoxdursa yazma.
Məhsul: ${ident.replace(/\n/g, "; ")}
--- AXTARIŞ MƏTNLƏRİ ---
${ok.map((x) => `[${x.cc.toUpperCase()}] ${x.r.text}`).join("\n\n").slice(0, 14000)}
--- TAPILMIŞ SƏHİFƏLƏR ---
${srcs.map((s) => `[${s.n}] ${s.dom} — ${s.url}`).join("\n")}
---
Qaydalar: hər təklif üçün "src" — yuxarıdakı səhifə nömrəsi (məcburi; uyğun səhifə yoxdursa təklifi yazma). "code_on_page" — səhifədə/mətndə görünən artikul (yoxdursa boş). "in_stock": true/false/null (mətndə "tükendi", "stokta yok", "sold out", "out of stock" varsa false). "match": artikul tam eynidirsə "exact", eyni model başqa rəng/ölçü/variant və ya kod fərqlidirsə "similar". Bakı üçün yalnız AZN, Türkiyə üçün yalnız TL qiymətlər. Qiymət aralığı varsa konkret mağaza qiymətini götür.
YALNIZ JSON:
{"baku":[{"store":"","price":0,"src":1,"code_on_page":"","in_stock":true,"match":"exact"}],"turkey":[{"store":"","price":0,"src":1,"code_on_page":"","in_stock":true,"match":"exact"}]}`;
      const c = await geminiOnce(fx, [{ text: conv }], 900, false, "low");
      o = parseJSON(c.text) ?? {};
    }
    // 4) keep only offers tied to a real page of the right country, then open each page and check price + stock
    const ncode = norm(code);
    const build = async (arr: any, cur: string, cc: "az" | "tr") => {
      const list = (Array.isArray(arr) ? arr : []).map((x: any) => {
        const s = srcs.find((y) => y.n === Number(x.src)); if (!s) return null;
        const price = Number(x.price); if (!(price > 0 && price < 10_000_000)) return null;
        if (!countryOk(s.url, cc)) return null;
        const cop = norm(x.code_on_page);
        let match: "exact" | "similar" = x.match === "similar" ? "similar" : "exact";
        if (ncode && cop && cop !== ncode && !cop.startsWith(ncode) && !ncode.startsWith(cop)) match = "similar";
        if (ncode && cop && cop.length > ncode.length + 1) match = "similar"; // e.g. 1EL07-1000 vs 1EL07 001
        return { store: String(x.store || s.dom).slice(0, 60), price, currency: cur, url: s.url, match, stock: x.in_stock === false ? "out" : "unknown", check: "none", code_on_page: String(x.code_on_page ?? "").slice(0, 40) };
      }).filter(Boolean) as any[];
      // de-duplicate the same page
      const uniq: any[] = []; for (const x of list) if (!uniq.find((y) => y.url === x.url && y.price === x.price)) uniq.push(x);
      await Promise.all(uniq.slice(0, 6).map((x) => verifyPage(x, ncode)));
      return uniq.slice(0, 6);
    };
    const [baku, turkey] = await Promise.all([build(o.baku, "AZN", "az"), build(o.turkey, "TRY", "tr")]);
    const sortOffers = (a: any[]) => a.sort((x, y) => (x.stock === "out" ? 1 : 0) - (y.stock === "out" ? 1 : 0) || x.price - y.price);
    sortOffers(baku); sortOffers(turkey);
    const live = (a: any[]) => a.filter((x) => x.stock !== "out" && x.check !== "price_missing");
    const note = !grounded ? "İnternet axtarışı bu dəfə alınmadı — “🔄 Təzədən” bas."
      : [live(baku).length ? "" : "Bakıda onlayn satış tapılmadı — markanın Bakı butikinə zəng edib soruşmaq olar.", live(turkey).length ? "" : "Türkiyədə satışda olan təklif tapılmadı."].filter(Boolean).join(" ");
    const result = { v: 2, baku, turkey, note, sources: srcs.slice(0, 10).map((s) => ({ url: s.url, title: s.dom })), grounded, queries: ok.flatMap((x) => x.r.queries ?? []).slice(0, 8), at: Date.now() };
    if (grounded) await sb.from("price_cache").upsert({ key, result, provider: prov, created_at: new Date().toISOString() });
    await logPrice(b, p, result);
    return json({ result, cached: false, provider: prov });
  } catch (e: any) { return json({ error: e.code ?? "upstream", detail: e.detail ? String(e.detail).slice(0, 300) : undefined }, e.status ?? 502); }
}
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
// Google grounding links are redirects (vertexaisearch.cloud.google.com/grounding-api-redirect/...): read where they point
async function realUrl(u: string): Promise<string> {
  if (!/vertexaisearch|google\.com\/url/.test(u)) return u;
  try {
    const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(4000) });
    const loc = r.headers.get("location"); await r.body?.cancel();
    return loc && /^https?:/.test(loc) ? loc : u;
  } catch { return u; }
}
// the shop must belong to the right country (a .com/us page is not a Baku price)
function countryOk(u: string, cc: "az" | "tr") {
  let h = "", seg = ""; try { const x = new URL(u); h = x.hostname.replace(/^www\./, ""); seg = (x.pathname.split("/")[1] || "").toLowerCase(); } catch { return false; }
  if (/vertexaisearch|google\./.test(h)) return false;
  if (new RegExp(`^(${cc}|[a-z]{2}[-_]${cc}|${cc}[-_][a-z]{2})$`).test(seg)) return true;
  if (h.startsWith(cc + ".")) return true;
  return cc === "az" ? /\.az$/.test(h) : /\.tr$/.test(h) || /(^|\.)(trendyol|hepsiburada|n11|beymen|vakko|gratis|boyner|morhipo|lcwaikiki|koton|defacto|mavi|network|ipekyol|sephora)\.com$/.test(h);
}
// open the shop page itself: is the price really there, is it sold out, is it the same article?
async function verifyPage(x: any, ncode: string) {
  try {
    const r = await fetch(x.url, { signal: AbortSignal.timeout(5500), redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "accept-language": "tr-TR,tr;q=0.9,az;q=0.8,en;q=0.7" } });
    if (!r.ok) { x.check = r.status === 404 || r.status === 410 ? "gone" : "blocked"; await r.body?.cancel(); if (x.check === "gone") x.stock = "out"; return; }
    const html = (await r.text()).slice(0, 900_000);
    const txt = html.replace(/<script[\s\S]*?<\/script>/gi, (m) => /ld\+json|__NEXT_DATA__|product/i.test(m) ? m : " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
    const low = txt.toLowerCase();
    // stock: schema.org says so, or the page shows a sold-out word and no add-to-basket button
    const soldWord = /(tükendi|tükenmiştir|stokta yok|stokta bulunmamaktadır|out of stock|sold out|outofstock|нет в наличии|stokda yoxdur|mövcud deyil|satışda yoxdur)/i.test(low);
    const buyWord = /(sepete ekle|add to (bag|cart|basket)|səbətə (at|əlavə)|в корзину|hemen al|instock)/i.test(low);
    if (/"availability"\s*:\s*"[^"]*outofstock/i.test(html) || (soldWord && !buyWord)) x.stock = "out";
    else if (/"availability"\s*:\s*"[^"]*instock/i.test(html) || buyWord) x.stock = "in";
    // price: the number must appear on the page (any common format)
    const n = Math.round(x.price), ip = String(n);
    const forms = [ip, ip.replace(/\B(?=(\d{3})+(?!\d))/g, "."), ip.replace(/\B(?=(\d{3})+(?!\d))/g, ","), ip.replace(/\B(?=(\d{3})+(?!\d))/g, " ")];
    const plain = txt.replace(/ | /g, " ");
    x.check = forms.some((f) => plain.includes(f)) ? "ok" : "price_missing";
    if (ncode) { const pc = norm(txt); if (pc.includes(ncode)) { if (x.match !== "similar" || !x.code_on_page) x.match = "exact"; } else if (x.match === "exact" && ncode.length >= 6 && !pc.includes(ncode.slice(0, 6))) x.match = "similar"; }
  } catch { x.check = "blocked"; }
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
  await sb.from("price_log").insert({ ts: Date.now(), who: String(b.who ?? "").slice(0, 20), brand: String(p.brand ?? "").slice(0, 60), name: String(p.name_az || p.model || "").slice(0, 100), code: String(p.code ?? "").slice(0, 60), vienna_eur: Number(p.vienna_eur) > 0 ? Number(p.vienna_eur) : null, result, thumb, sbx: b.sbx === true });
}

/* ------------------------------------------------------------------ errors */
async function upstreamErr(r: Response) {
  const t = await r.text().catch(() => "");
  const code = r.status === 429 || r.status === 529 ? "rate_limited" : r.status === 401 || r.status === 403 ? "bad_key" : /credit|billing|quota/i.test(t) ? "no_credit" : "upstream";
  return { code, status: r.status === 401 || r.status === 403 ? 503 : 502, detail: t.slice(0, 300) };
}
async function upstreamError(r: Response) { const e = await upstreamErr(r); return json({ error: e.code, detail: e.detail }, e.status); }
