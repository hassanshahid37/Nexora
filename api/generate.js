// api/generate.js
// Robust Vercel Serverless Function (Node 18+)

const DEFAULT_COUNT = 24;

function pick(n, min, max) {
  n = Number(n);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function fallbackTemplates(topic = "Template", count = DEFAULT_COUNT) {
  const safeTopic = String(topic || "Template").slice(0, 60);
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push({
      id: `fallback-${Date.now()}-${i}`,
      title: `${safeTopic} #${i}`,
      category: "Dark Premium",
      subtitle: "AI generated layout • Click to edit",
      palette: ["#0b5fff", "#111318", "#f6f7fb", "#aab0bd"],
      layout: "clean",
    });
  }
  return out;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function extractJsonBlock(text) {
  if (!text) return null;
  // Try to find the first JSON object/array in the text
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let start = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) start = firstBracket;
  else start = firstBrace;

  if (start === -1) return null;

  const candidate = text.slice(start).trim();

  // If it starts with [, try parse as array directly
  if (candidate.startsWith("[")) return safeJsonParse(candidate);

  // If it starts with {, try parse object
  return safeJsonParse(candidate);
}

module.exports = async (req, res) => {
  // CORS (keeps browser happy)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Parse body safely (Vercel usually parses JSON, but we handle both)
  let body = req.body;
  if (typeof body === "string") body = safeJsonParse(body) || {};

  const prompt = (body && body.prompt) ? String(body.prompt) : "";
  const count = pick(body && body.count, 1, 200);

  if (!prompt.trim()) {
    return res.status(400).json({ error: "Missing prompt." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Don’t crash: return fallback so UI still works
    return res.status(200).json({
      success: true,
      warning: "OPENAI_API_KEY missing on server. Returned fallback templates.",
      templates: fallbackTemplates(prompt, count),
      source: "fallback",
    });
  }

  // Build instruction: MUST return strict JSON
  const system = `
You generate design template ideas for a Canva-style app.
Return ONLY valid JSON with this exact shape:
{
  "templates": [
    {
      "id": "string",
      "title": "string",
      "category": "string",
      "subtitle": "string",
      "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB"],
      "layout": "clean|modern|bold|minimal"
    }
  ]
}
No markdown. No extra text.
`.trim();

  const user = `
Create ${count} templates for this request:
"${prompt}"

Rules:
- Make titles short and useful.
- category should match the prompt (e.g. "Instagram Post", "YouTube Thumbnail", etc.)
- subtitle should be short like "Dark Premium • Click to edit"
- palette must be 4 hex colors
- layout must be one of: clean, modern, bold, minimal
`.trim();

  try {
    // Use Chat Completions for broad compatibility
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1800,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg =
        (data && data.error && data.error.message) ||
        `OpenAI error (status ${resp.status})`;
      // Don’t crash → fallback response
      return res.status(200).json({
        success: true,
        warning: msg,
        templates: fallbackTemplates(prompt, count),
        source: "fallback",
      });
    }

    const text =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "";

    const parsed = safeJsonParse(text) || extractJsonBlock(text);

    const templates =
      parsed && Array.isArray(parsed.templates)
        ? parsed.templates
        : null;

    if (!templates || templates.length === 0) {
      return res.status(200).json({
        success: true,
        warning: "AI returned empty/invalid JSON. Returned fallback templates.",
        templates: fallbackTemplates(prompt, count),
        source: "fallback",
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      templates,
      source: "openai",
    });
  } catch (err) {
    // Absolute last safety net: never 500
    return res.status(200).json({
      success: true,
      warning: `Server exception: ${err && err.message ? err.message : "Unknown error"}`,
      templates: fallbackTemplates(prompt, count),
      source: "fallback",
    });
  }
};
