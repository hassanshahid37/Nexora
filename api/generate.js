export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, count, prompt, notes } = req.body;

    if (!category || !count || !prompt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not found" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Generate ${count} premium ${category} template ideas.

Prompt: ${prompt}
Notes: ${notes || "None"}

Return ONLY a valid JSON array.
No explanation.
No markdown.
No text outside JSON.

Each item must look like:
{
  "title": "Template name",
  "style": "Short style description"
}`,
      }),
    });

    const data = await response.json();

    // ✅ CORRECT NEW OPENAI RESPONSE HANDLING
    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "[]";

    let templates;
    try {
      templates = JSON.parse(text);
    } catch {
      return res
        .status(500)
        .json({ error: "AI returned invalid JSON", raw: text });
    }

    return res.status(200).json(templates);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
