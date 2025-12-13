import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, count = 12 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt missing" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate clean, professional design template titles and short descriptions.",
        },
        {
          role: "user",
          content: `Generate ${count} premium design templates for: ${prompt}. 
Return ONLY a JSON array like:
[
  { "title": "Instagram Post #1", "subtitle": "Dark premium layout" }
]`,
        },
      ],
      temperature: 0.7,
    });

    let text = completion.choices[0].message.content.trim();

    // Remove accidental markdown
    if (text.startsWith("```")) {
      text = text.replace(/```json|```/g, "").trim();
    }

    const templates = JSON.parse(text);

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "AI generation failed",
    });
  }
}
