import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, count = 12 } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Prompt missing" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate short design template titles only. Return JSON array."
        },
        {
          role: "user",
          content: `Generate ${count} premium design templates for: ${prompt}`
        }
      ],
      temperature: 0.8
    });

    let text = completion.choices[0].message.content;

    // SAFETY: extract JSON array even if AI adds text
    const match = text.match(/\[.*\]/s);
    const templates = match ? JSON.parse(match[0]) : [];

    return res.status(200).json({ templates });
  } catch (err) {
    console.error("AI ERROR:", err.message);

    // 🔒 SAFE FALLBACK (APP NEVER BREAKS)
    return res.status(200).json({
      templates: Array.from({ length: 12 }).map(
        (_, i) => `Premium Template ${i + 1}`
      ),
      source: "fallback"
    });
  }
}
