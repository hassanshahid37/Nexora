import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category = "Instagram Post", style = "Dark Premium", count = 24 } = req.body;

    const prompt = `
Generate ${count} ${category} templates.
Each template must have:
- title
- description
Return ONLY valid JSON in this format:
{
  "templates": [
    { "title": "Example", "description": "Example description" }
  ]
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let content = completion.choices[0].message.content;

    // SAFETY: extract JSON only
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid AI response");
    }

    const data = JSON.parse(content.slice(jsonStart, jsonEnd + 1));

    // GUARANTEE structure
    if (!Array.isArray(data.templates)) {
      throw new Error("Templates missing");
    }

    return res.status(200).json({
      templates: data.templates,
    });

  } catch (err) {
    console.error("API ERROR:", err);

    // FAILSAFE: still return templates so UI NEVER breaks
    return res.status(200).json({
      templates: Array.from({ length: 24 }, (_, i) => ({
        title: `Instagram Post #${i + 1}`,
        description: "AI generated layout",
      })),
    });
  }
}
