export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY missing" });
  }

  try {
    const { prompt, count = 24 } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt missing" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "You are a design generator. Respond ONLY with valid JSON. No text outside JSON.",
          },
          {
            role: "user",
            content: `
Generate ${count} premium design templates.
Return STRICT JSON ONLY in this format:

{
  "templates": [
    {
      "title": "Instagram Post #1",
      "subtitle": "Dark Premium",
      "category": "Instagram"
    }
  ]
}
            `,
          },
        ],
      }),
    });

    const raw = await response.json();
    const content = raw.choices?.[0]?.message?.content || "";

    let data;
    try {
      data = JSON.parse(content);
    } catch {
      throw new Error("Invalid JSON from OpenAI");
    }

    if (!Array.isArray(data.templates)) {
      throw new Error("Templates array missing");
    }

    return res.status(200).json({
      success: true,
      templates: data.templates,
    });
  } catch (err) {
    console.error("API ERROR:", err.message);

    // SAFE FALLBACK (NO CRASH, NO 500 LOOP)
    return res.status(200).json({
      success: true,
      warning: "AI failed, returned safe fallback templates",
      templates: Array.from({ length: 24 }).map((_, i) => ({
        title: `Template #${i + 1}`,
        subtitle: "Dark Premium",
        category: "General",
      })),
    });
  }
}
