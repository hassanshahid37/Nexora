import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count, prompt, notes } = req.body;

    const finalPrompt = `
Create ${count} ${category} templates.
Style: ${style}
User prompt: ${prompt || "N/A"}
Notes: ${notes || "N/A"}

Return ONLY JSON like this:
{
  "templates": [
    { "title": "...", "description": "..." }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;
    const data = JSON.parse(text);

    return res.status(200).json(data);
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: "AI generation failed" });
  }
}
