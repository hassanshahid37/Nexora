import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, count = 24 } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid prompt" });
    }

    const systemPrompt = `
You are a professional design template generator.
Return ONLY valid JSON.
No explanations.
No markdown.
No extra text.

JSON format:
{
  "templates": [
    {
      "title": "string",
      "category": "string",
      "description": "string"
    }
  ]
}

Rules:
- Exactly ${count} templates
- Short, clean titles
- Premium design wording
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse failed. Raw response:", raw);
      return res.json({
        success: true,
        warning: "AI returned invalid JSON. Using fallback.",
        templates: fallbackTemplates(count),
        source: "fallback"
      });
    }

    if (!parsed.templates || !Array.isArray(parsed.templates)) {
      return res.json({
        success: true,
        warning: "AI returned empty templates. Using fallback.",
        templates: fallbackTemplates(count),
        source: "fallback"
      });
    }

    return res.json({
      success: true,
      templates: parsed.templates,
      source: "ai"
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
}

/* ---------- FALLBACK (NEVER FAILS) ---------- */

function fallbackTemplates(count) {
  const items = [];
  for (let i = 1; i <= count; i++) {
    items.push({
      title: `Premium Template ${i}`,
      category: "Social Media",
      description: "Dark premium AI-generated layout"
    });
  }
  return items;
}
