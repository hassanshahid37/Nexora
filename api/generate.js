import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count } = req.body;

    const prompt = `
Generate ${count} ${category} design templates.
Style: ${style}.
Return a JSON array.
Each item must have:
- title
- description
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional design template generator." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const text = response.choices[0].message.content;

    let templates;
    try {
      templates = JSON.parse(text);
    } catch {
      templates = Array.from({ length: count }, (_, i) => ({
        title: `${category} Template ${i + 1}`,
        description: style
      }));
    }

    res.status(200).json({ templates });
  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({
      error: "Generation failed",
      details: error.message
    });
  }
}
