// Wien Bələdçi API v2 — trip-code protected gateway: shared data + AI (Claude or Gemini, whichever key exists).
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  const code = await cfg("trip_code");
  if (!b || !code || b.k !== code) return json({ error: "forbidden" }, 403);
  const k = keys();
  const aiStatus = { claude: !!k.claude, gemini: !!k.gemini };

  try {
    switch (b.op) {
      case "ping": return json({ ok: true, ai: aiStatus.claude || aiStatus.gemini, providers: aiStatus });

      case "sync": {
        const [ex, kv, pl] = await Promise.all([
          sb.from("expenses").select("*").order("ts", { ascending: false }).limit(1000),
          sb.from("kv").select("key,value,updated_at"),
          sb.from("price_log").select("id", { count: "exact", head: true }),
        ]);
        if (ex.error) throw ex.error;
        if (kv.error) throw kv.error;
        const kvm: Record<string, unknown> = {};
        for (const r of kv.data ?? []) kvm[r.key] = r.value;
        return json({ expenses: ex.data, kv: kvm, ai: aiStatus.claude || aiStatus.gemini, providers: aiStatus, priceCount: pl.count ?? 0 });
      }

      case "exp.add": {
        const r = b.row ?? {};
        const eur = Number(r.eur);
        const parts = Array.isArray(r.parts) ? r.parts.filter((p: string) => PEOPLE.includes(p)) : [];
        if (!(eur > 0 && eur < 100000) || !PEOPLE.includes(r.payer) || !parts.length) return json({ error: "invalid" }, 400);
        const row = {
          d: String(r.d ?? "Xərc").slice(0, 80), eur: Math.round(eur * 100) / 100,
          orig: r.orig != null ? Math.round(Number(r.orig) * 100) / 100 : null,
          cur: r.cur === "AZN" ? "AZN" : "EUR", payer: r.payer, parts,
          by: String(r.by ?? "").slice(0, 20), ts: Number(r.ts) || Date.now(), tf: r.tf === true,
        };
        const { data, error } = await sb.from("expenses").insert(row).select().single();
        if (error) throw error;
        return json({ row: data });
      }
      case "exp.tf": {
        const { error } = await sb.from("expenses").update({ tf: b.tf === true }).eq("id", String(b.id));
        if (error) throw error;
        return json({ ok: true });
      }
      case "exp.del": {
        const { error } = await sb.from("expenses").delete().eq("id", String(b.id));
        if (error) throw error;
        return json({ ok: true });
      }

      case "kv.set": {
        const key = String(b.key || ""), v = b.value;
        if (key === "hotel") {
          if (!(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        } else if (LOC_KEY.test(key)) {
          if (v !== null && !(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        } else return json({ error: "readonly" }, 400);
        if (v === null) { await sb.from("kv").delete().eq("key", key); return json({ ok: true }); }
        const val = key === "hotel" ? { lat: v.lat, lng: v.lng, name: String(v.name ?? "").slice(0, 80), addr: String(v.addr ?? "").slice(0, 160) }
          : { lat: v.lat, lng: v.lng, acc: Number(v.acc) || 0, ts: Date.now() };
        const { error } = await sb.from("kv").upsert({ key, value: val, updated_at: new Date().toISOString() });
        if (error) throw error;
        return json({ ok: true });
      }

      case "photo.add": {
        const t = String(b.thumb || "");
        if (!t.startsWith("data:image/jpeg;base64,") || t.length > 115000) return json({ error: "invalid" }, 400);
        const { error } = await sb.from("photos").insert({ ts: Number(b.ts) || Date.now(), who: String(b.who ?? "").slice(0, 20), name: String(b.name ?? "").slice(0, 100), poi: String(b.poi ?? "").slice(0, 40), thumb: t });
        if (error) throw error;
        return json({ ok: true });
      }
      case "photos": {
        const { data, error } = await sb.from("photos").select("id,ts,who,name,poi,thumb").order("ts", { ascending: false }).limit(80);
        if (error) throw error;
        return json({ photos: data });
      }
      case "prices": {
        const { data, error } = await sb.from("price_log").select("id,ts,who,brand,name,code,vienna_eur,result,thumb").order("ts", { ascending: false }).limit(100);
        if (error) throw error;
        return json({ prices: data });
      }

      case "ai": return await aiText(b);
      case "price.extract": return await priceExtract(b);
      case "price.search": return await priceSearch(b);
      default: return json({ error: "unknown_op" }, 400);
    }
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

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
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: "POST", headers: { "x-goog-api-key": keys().gemini, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) return upstreamError(r);
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
  const body: any = { contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens: maxTok + 2500, thinkingConfig: { thinkingLevel: thinking } } };
  if (search) body.tools = [{ google_search: {} }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": keys().gemini, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw await upstreamErr(r);
  const j = await r.json();
  const cand = j.candidates?.[0] ?? {};
  const text = (cand.content?.parts ?? []).filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join("");
  const sources = (cand.groundingMetadata?.groundingChunks ?? []).filter((c: any) => c.web?.uri).map((c: any) => ({ url: c.web.uri, title: c.web.title ?? "" }));
  return { text, sources, queries: cand.groundingMetadata?.webSearchQueries ?? [] };
}
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
      : await geminiOnce(M.gemini?.vision || "gemini-3.8-flash", [{ inline_data: { mime_type: "image/jpeg", data: b.image } }, { text: prompt }], 400, false);
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
    if (data && Date.now() - new Date(data.created_at).getTime() < 12 * 3600_000) {
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
Axtarışda artikul kodunu və ya model adını istifadə et. Hər ölkədə ən çox 3 təklif.
QAYDALAR: Yalnız axtarış nəticələrində həqiqətən GÖRDÜYÜN qiymətləri yaz. Təxmin etmə. Eyni artikul/model isə "match":"exact", oxşar məhsuldursa "match":"similar". Tapmasan, siyahını boş qoy.
Sonda YALNIZ bu JSON-u yaz:
{"baku":[{"store":"","price":0,"currency":"AZN","url":"","match":"exact"}],"turkey":[{"store":"","price":0,"currency":"TRY","url":"","match":"exact"}],"note":"<1 qısa cümlə Azərbaycan dilində>"}`;

  const M = await models();
  try {
    let out: { text: string; sources: { url: string; title: string }[] };
    if (prov === "gemini") out = await geminiOnce(M.gemini?.search || "gemini-3.8-flash", [{ text: prompt }], 1200, true, "medium");
    else out = await claudeOnce(M.claude?.search || "claude-haiku-5-5", prompt, 1200, [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }]);
    const o = parseJSON(out.text) ?? {};
    const clean = (arr: any, cur: string) => (Array.isArray(arr) ? arr : [])
      .map((x: any) => ({ store: String(x.store ?? "").slice(0, 60), price: Number(x.price), currency: cur, url: String(x.url ?? ""), match: x.match === "similar" ? "similar" : "exact" }))
      .filter((x: any) => x.price > 0 && x.price < 10_000_000)
      .map((x: any) => ({ ...x, url: resolveUrl(x, out.sources) }))
      .slice(0, 4);
    const result = { baku: clean(o.baku, "AZN"), turkey: clean(o.turkey, "TRY"), note: String(o.note ?? "").slice(0, 300), sources: out.sources.slice(0, 8), at: Date.now() };
    await sb.from("price_cache").upsert({ key, result, provider: prov, created_at: new Date().toISOString() });
    await logPrice(b, p, result);
    return json({ result, cached: false, provider: prov });
  } catch (e: any) { return json({ error: e.code ?? "upstream" }, e.status ?? 502); }
}
// Prefer a real source link from search results whose domain matches the offer.
function resolveUrl(offer: { url: string; store: string }, sources: { url: string; title: string }[]) {
  const dom = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const od = dom(offer.url);
  if (od && sources.some((s) => dom(s.url) === od || s.title.replace(/^www\./, "") === od)) {
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
