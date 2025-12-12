export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { category, style, count, prompt, notes } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OpenAI API Key" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
Generate ${count} premium template ideas.

Category: ${category}
Style: ${style}
Prompt: ${prompt}
Notes: ${notes || ""}

Return ONLY a valid JSON array.
`
      })
    });

   const data = await response.json();

if (!response.ok) {
  console.error("OpenAI error:", data);
  return res.status(500).json({ error: "OpenAI request failed" });
}

let text =
  data.output_text ||
  data.output?.[0]?.content?.[0]?.text ||
  data.choices?.[0]?.message?.content;

if (!text) {
  console.error("Invalid AI response:", data);
  return res.status(500).json({ error: "Invalid AI response" });
}

let json;
try {
  json = JSON.parse(text);
} catch (e) {
  console.error("JSON parse error:", text);
  return res.status(500).json({ error: "AI did not return valid JSON" });
}

return res.status(200).json(json);

  } catch (err) {
    return res.status(500).json({
      error: "Backend failed",
      details: err.message
    });
  }
}

