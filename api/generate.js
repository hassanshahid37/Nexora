import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, count = 24 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate clean, short design template descriptions for Canva-style social media templates.",
        },
        {
          role: "user",
          content: `Generate ${count} unique design templates for: ${prompt}. Return each as a short title.`,
        },
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;

    const templates = text
      .split("\n")
      .map(t => t.replace(/^[0-9\-\.\)]*/, "").trim())
      .filter(Boolean)
      .slice(0, count);

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "AI generation failed",
    });
  }
}
