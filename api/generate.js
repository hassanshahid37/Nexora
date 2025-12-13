import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count, prompt } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Generate ${count} ${category} template ideas.
Style: ${style}
Prompt: ${prompt}

Return JSON array like:
[{ "title": "...", "description": "..." }]`,
    });

    // ✅ CORRECT way to read response
    const text = response.output_text;

    let templates;
    try {
      templates = JSON.parse(text);
    } catch {
      templates = [];
    }

    return res.status(200).json({ templates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI generation failed" });
  }
}
