import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count, prompt, notes } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate design template ideas as JSON."
        },
        {
          role: "user",
          content: `
Generate ${count} ${category} templates.
Style: ${style}
Prompt: ${prompt}
Notes: ${notes}

Return ONLY valid JSON like this:
{
  "templates": [
    { "title": "Template 1", "description": "Short description" }
  ]
}
`
        }
      ],
      temperature: 0.7
    });

    const text = completion.choices[0].message.content;
    const data = JSON.parse(text);

    return res.status(200).json(data);
  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
