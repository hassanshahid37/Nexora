// api/generate.js
module.exports = async (req, res) => {
  // CORS (safe for same-domain + future use)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY in Vercel Environment Variables."
      });
    }

    // Vercel sometimes gives req.body as object, sometimes string
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const category = body.category || "Instagram Post";
    const style = body.style || "Dark Premium";
    const prompt = body.prompt || "";
    const notes = body.notes || "";
    let count = parseInt(body.count || "12", 10);
    if (isNaN(count) || count < 1) count = 12;
    if (count > 200) count = 200;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const userMsg =
      `Generate ${count} template ideas.\n` +
      `Category: ${category}\n` +
      `Style: ${style}\n` +
      `User prompt: ${prompt}\n` +
      `Notes: ${notes}\n\n` +
      `Return ONLY valid JSON in this exact format:\n` +
      `{"templates":[{"title":"...","description":"..."}]}\n` +
      `No markdown. No extra text.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        messages: [
          { role: "system", content: "You are a strict JSON generator. Output only valid JSON." },
          { role: "user", content: userMsg }
        ]
      })
    });

    const raw = await openaiRes.text();

    if (!openaiRes.ok) {
      return res.status(500).json({
        error: "OpenAI API error",
        status: openaiRes.status,
        details: raw
      });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: "OpenAI returned non-JSON response", details: raw });
    }

    const content = data?.choices?.[0]?.message?.content || "";

    // Parse the JSON that the model returned
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON if model accidentally adds text
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        parsed = JSON.parse(content.slice(start, end + 1));
      } else {
        return res.status(500).json({ error: "Could not parse model JSON", details: content });
      }
    }

    const templates = Array.isArray(parsed?.templates) ? parsed.templates : [];

    // Hard fallback so UI never breaks
    const safeTemplates = templates.length ? templates : Array.from({ length: count }, (_, i) => ({
      title: `${category} #${i + 1}`,
      description: `${style} • AI generated layout`
    }));

    return res.status(200).json({ templates: safeTemplates });

  } catch (err) {
    return res.status(500).json({
      error: "Server crashed in /api/generate",
      message: err?.message || String(err)
    });
  }
};
