import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count, prompt } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate design template titles.",
        },
        {
          role: "user",
          content: `Generate ${count} ${category} templates in ${style} style. ${prompt || ""}`,
        },
      ],
    });

    const text = completion.choices[0].message.content;

    const templates = text
      .split("\n")
      .filter(Boolean)
      .map((t, i) => ({
        title: `${category} #${i + 1}`,
        description: t.replace(/^\d+[\).\s]*/, ""),
      }));

    return res.status(200).json({ templates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI generation failed" });
  }
}
