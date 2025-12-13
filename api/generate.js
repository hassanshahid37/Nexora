// /api/generate.js
export default async function handler(req, res) {
  // Basic CORS (safe for your static frontend)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Use POST" });
  }

  try {
    // Vercel may already parse JSON, but sometimes it's a string
    const body =
      typeof req.body === "string" ? safeJsonParse(req.body) : (req.body || {});

    const promptRaw = (body.prompt ?? body.text ?? body.idea ?? "").toString().trim();
    const countRaw = Number(body.count ?? body.n ?? 24);
    const count = Number.isFinite(countRaw) ? Math.min(Math.max(countRaw, 1), 200) : 24;

    // If user sends empty prompt, still return something (no 500)
    const prompt = promptRaw.length ? promptRaw : "Create modern premium social templates";

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_API;
    if (!apiKey) {
      // Never hard-fail the UI: return fallback templates
      return res.status(200).json({
        success: true,
        templates: fallbackTemplates(prompt, count),
        warning: "Missing OPENAI_API_KEY in Vercel Environment Variables.",
      });
    }

    // ---- OpenAI call (Responses API) ----
    const system = [
      "You are a template generator for a Canva-style app.",
      "Return ONLY valid JSON. No markdown. No backticks.",
      "Schema: {\"templates\":[{\"title\":\"\",\"subtitle\":\"\",\"tags\":[\"\"],\"style\":\"\",\"size\":\"\",\"palette\":[\"#000000\"],\"layout\":\"\"}]}",
      "Make titles short & punchy. Keep subtitle under 60 chars.",
      "Use premium modern design language.",
    ].join(" ");

    const user = `Generate ${count} templates for: "${prompt}"`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_output_tokens: 1200,
      }),
    });

    const data = await response.json().catch(() => ({}));

    // If OpenAI responds with an error, don't 500 your app
    if (!response.ok) {
      const msg =
        data?.error?.message ||
        `OpenAI request failed (status ${response.status}).`;
      return res.status(200).json({
        success: true,
        templates: fallbackTemplates(prompt, count),
        warning: msg,
        openai_status: response.status,
        openai_code: data?.error?.code || null,
      });
    }

    // Responses API usually returns text in output[0].content[0].text
    const text = extractTextFromResponsesAPI(data);
    const parsed = safeJsonParse(text);

    const templates = Array.isArray(parsed?.templates) ? parsed.templates : null;

    // If model returned weird format, still don’t break UI
    if (!templates || templates.length === 0) {
      return res.status(200).json({
        success: true,
        templates: fallbackTemplates(prompt, count),
        warning: "AI returned non-JSON or empty templates. Used fallback.",
        raw: text?.slice?.(0, 4000) || null,
      });
    }

    // Normalize + cap
    const normalized = templates.slice(0, 200).map((t, i) => ({
      title: String(t?.title ?? `Template #${i + 1}`),
      subtitle: String(t?.subtitle ?? ""),
      tags: Array.isArray(t?.tags) ? t.tags.map(String).slice(0, 8) : [],
      style: String(t?.style ?? "Dark Premium"),
      size: String(t?.size ?? "1080x1080"),
      palette: Array.isArray(t?.palette) ? t.palette.map(String).slice(0, 6) : [],
      layout: String(t?.layout ?? "Clean layout"),
    }));

    return res.status(200).json({ success: true, templates: normalized });
  } catch (err) {
    // Absolute last safety net: never return 500 to frontend
    return res.status(200).json({
      success: true,
      templates: fallbackTemplates("Premium templates", 24),
      warning: `Server exception: ${err?.message || "unknown error"}`,
    });
  }
}

function safeJsonParse(s) {
  try {
    if (typeof s !== "string") return s;
    return JSON.parse(s);
  } catch {
    // Try to locate JSON block inside text
    try {
      const start = s.indexOf("{");
      const end = s.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(s.slice(start, end + 1));
      }
    } catch {}
    return null;
  }
}

function extractTextFromResponsesAPI(data) {
  // Most common shape:
  // data.output[0].content[0].text
  const out = data?.output;
  if (Array.isArray(out) && out[0]?.content && Array.isArray(out[0].content)) {
    const first = out[0].content.find((c) => typeof c?.text === "string");
    if (first?.text) return first.text;
  }
  // Sometimes:
  if (typeof data?.output_text === "string") return data.output_text;
  return "";
}

function fallbackTemplates(prompt, count) {
  const ideas = [
    "Instagram Post",
    "Instagram Story",
    "YouTube Thumbnail",
    "LinkedIn Banner",
    "Facebook Ad",
    "Poster",
    "Flyer",
    "Product Promo",
    "Quote Card",
    "Sale Announcement",
  ];
  const base = (prompt || "Premium").slice(0, 40);
  const arr = [];
  for (let i = 0; i < count; i++) {
    const kind = ideas[i % ideas.length];
    arr.push({
      title: `${kind} #${i + 1}`,
      subtitle: `${base} • AI generated layout • Click to edit`,
      tags: ["premium", "modern", "clean"],
      style: "Dark Premium",
      size: kind.includes("Story") ? "1080x1920" : "1080x1080",
      palette: ["#0b5fff", "#050712", "#ffffff"],
      layout: "Clean layout",
    });
  }
  return arr;
}
