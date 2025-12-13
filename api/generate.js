import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, count = 6 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate clean, modern design template descriptions."
        },
        {
          role: "user",
          content: `Generate ${count} premium design templates for: ${prompt}`
        }
      ],
      temperature: 0.8
    });

    const text = completion.choices[0].message.content;

    // Convert text into array (simple safe split)
    const templates = text
      .split("\n")
      .filter(line => line.trim().length > 0)
      .slice(0, count)
      .map((t, i) => ({
        id: i + 1,
        title: t.trim()
      }));

    return res.status(200).json({ templates });

  } catch (err) {
    console.error("API ERROR:", err);

    return res.status(500).json({
      error: "AI generation failed",
      details: err.message || "Unknown error"
    });
  }
}
