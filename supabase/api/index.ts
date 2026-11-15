// Wien Bələdçi API — trip-code protected gateway for shared data + Claude.
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
const KV_WRITABLE = new Set(["hotel"]);
const MODELS: Record<string, string> = { fast: "claude-haiku-5-5", vision: "claude-sonnet-5-5", search: "claude-sonnet-5-5" };

const cfgCache: Record<string, { v: string; t: number }> = {};
async function cfg(key: string): Promise<string> {
  const c = cfgCache[key];
  if (c && Date.now() - c.t < 60_000) return c.v;
  const { data } = await sb.from("config").select("value").eq("key", key).maybeSingle();
  const v = data?.value ?? "";
  cfgCache[key] = { v, t: Date.now() };
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const code = await cfg("trip_code");
  if (!b || !code || b.k !== code) return json({ error: "forbidden" }, 403);

  try {
    switch (b.op) {
      case "ping":
        return json({ ok: true, ai: !!Deno.env.get("ANTHROPIC_API_KEY") });

      case "sync": { // everything the app needs in one call
        const [ex, kv] = await Promise.all([
          sb.from("expenses").select("*").order("ts", { ascending: false }).limit(1000),
          sb.from("kv").select("key,value,updated_at"),
        ]);
        if (ex.error) throw ex.error;
        if (kv.error) throw kv.error;
        const kvm: Record<string, unknown> = {};
        for (const r of kv.data ?? []) kvm[r.key] = r.value;
        return json({ expenses: ex.data, kv: kvm, ai: !!Deno.env.get("ANTHROPIC_API_KEY") });
      }

      case "exp.add": {
        const r = b.row ?? {};
        const eur = Number(r.eur);
        const parts = Array.isArray(r.parts) ? r.parts.filter((p: string) => PEOPLE.includes(p)) : [];
        if (!(eur > 0 && eur < 100000) || !PEOPLE.includes(r.payer) || !parts.length) return json({ error: "invalid" }, 400);
        const row = {
          d: String(r.d ?? "Xərc").slice(0, 80),
          eur: Math.round(eur * 100) / 100,
          orig: r.orig != null ? Math.round(Number(r.orig) * 100) / 100 : null,
          cur: r.cur === "AZN" ? "AZN" : "EUR",
          payer: r.payer, parts,
          by: String(r.by ?? "").slice(0, 20),
          ts: Number(r.ts) || Date.now(),
        };
        const { data, error } = await sb.from("expenses").insert(row).select().single();
        if (error) throw error;
        return json({ row: data });
      }

      case "exp.del": {
        const { error } = await sb.from("expenses").delete().eq("id", String(b.id));
        if (error) throw error;
        return json({ ok: true });
      }

      case "kv.set": {
        if (!KV_WRITABLE.has(b.key)) return json({ error: "readonly" }, 400);
        const v = b.value;
        if (b.key === "hotel" && !(v && typeof v.lat === "number" && typeof v.lng === "number")) return json({ error: "invalid" }, 400);
        const { error } = await sb.from("kv").upsert({ key: b.key, value: v, updated_at: new Date().toISOString() });
        if (error) throw error;
        return json({ ok: true });
      }

      case "ai":
        return await ai(b);

      default:
        return json({ error: "unknown_op" }, 400);
    }
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

async function ai(b: any): Promise<Response> {
  const KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!KEY) return json({ error: "no_key" }, 503);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("ai_log").select("id", { count: "exact", head: true }).gte("created_at", since);
  const limit = Number(await cfg("ai_daily_limit")) || 600;
  if ((count ?? 0) >= limit) return json({ error: "rate_limited" }, 429);
  await sb.from("ai_log").insert({ mode: String(b.mode ?? "").slice(0, 20), who: String(b.who ?? "").slice(0, 20) });

  const tier = MODELS[b.tier] ? b.tier : "fast";
  let messages = Array.isArray(b.messages) ? b.messages.slice(-12) : [];
  messages = messages
    .filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 12000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "invalid" }, 400);
  if (typeof b.image === "string" && b.image.length < 3_000_000) {
    const last = messages[messages.length - 1];
    last.content = [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.image } },
      { type: "text", text: last.content },
    ];
  }
  const payload: any = {
    model: MODELS[tier],
    max_tokens: Math.min(Number(b.max_tokens) || 900, 1600),
    messages,
  };
  if (typeof b.system === "string") payload.system = b.system.slice(0, 6000);

  const headers = { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" };

  // Web search (prices / live info): non-streaming, follow pause_turn.
  if (b.search) {
    payload.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: Math.min(Number(b.max_searches) || 4, 6) }];
    let content: any[] = [];
    let msgs = payload.messages;
    for (let i = 0; i < 3; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify({ ...payload, messages: msgs }) });
      if (!r.ok) return upstreamError(r);
      const j = await r.json();
      content = content.concat(j.content ?? []);
      if (j.stop_reason !== "pause_turn") break;
      msgs = [...payload.messages, { role: "assistant", content: j.content }];
    }
    const text = content.filter((c) => c.type === "text").map((c) => c.text).join("");
    const sources: { url: string; title: string }[] = [];
    for (const c of content) for (const ci of c.citations ?? []) if (ci.url && !sources.find((s) => s.url === ci.url)) sources.push({ url: ci.url, title: ci.title ?? ci.url });
    return json({ text, sources });
  }

  // Streaming text: forward only text deltas.
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify({ ...payload, stream: true }) });
  if (!r.ok || !r.body) return upstreamError(r);
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader = r.body!.getReader();
      let buf = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(line.slice(5));
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") ctrl.enqueue(enc.encode(ev.delta.text));
            } catch { /* ignore */ }
          }
        }
      } finally { ctrl.close(); }
    },
  });
  return new Response(stream, { headers: { ...CORS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" } });
}

async function upstreamError(r: Response): Promise<Response> {
  const t = await r.text().catch(() => "");
  const code = r.status === 429 || r.status === 529 ? "rate_limited" : r.status === 401 ? "bad_key" : r.status === 400 && /credit/i.test(t) ? "no_credit" : "upstream";
  return json({ error: code, status: r.status, detail: t.slice(0, 300) }, r.status === 401 ? 503 : 502);
}
