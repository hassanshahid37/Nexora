export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { category, prompt, count = 12 } = req.body;

    if (!category || !prompt) {
      return res.status(400).json({ error: "Missing input" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 1,
        messages: [
          {
            role: "system",
            content: `
You are a template generator.

RULES:
- ALWAYS return a JSON ARRAY
- MINIMUM 5 items
- NEVER return []
- NO explanations
- NO markdown

FORMAT:
[
  {
    "title": "Instagram Post #1",
    "style": "Dark Premium",
    "description": "Short design description"
  }
]
`
          },
          {
            role: "user",
            content: `Generate ${count} ${category} templates. Prompt: ${prompt}`
          }
        ]
      })
    });

    const raw = await response.json();

    let text =
      raw?.choices?.[0]?.message?.content ||
      raw?.choices?.[0]?.text ||
      "";

    let templates = [];

    try {
      templates = JSON.parse(text);
    } catch {
      templates = [];
    }

    // 🔒 HARD FALLBACK (IMPORTANT)
    if (!Array.isArray(templates) || templates.length === 0) {
      templates = Array.from({ length: Math.max(5, count) }).map((_, i) => ({
        title: `${category} Template #${i + 1}`,
        style: "Premium",
        description: prompt
      }));
    }

    return res.status(200).json(templates);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
