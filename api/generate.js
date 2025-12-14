export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // No key -> tell frontend to fallback to engine
    return res.status(500).json({ error: "OPENAI_API_KEY missing" });
  }

  try {
    const { cat="Instagram Post", style="Dark Premium", prompt="", notes="", count=24 } = req.body || {};
    const n = Math.min(200, Math.max(1, parseInt(count || 24, 10)));

    const system = "Return STRICT JSON only. No markdown. No extra text.";
    const user = `
Generate ${n} Canva-level templates for a 980x620 canvas.

Category: ${cat}
Style: ${style}
Prompt: ${prompt}
Notes: ${notes}

Return JSON EXACTLY like:

{
  "templates":[
    {
      "title":"Instagram Post #1",
      "description":"Dark Premium • Modern",
      "canvas":{"w":980,"h":620},
      "elements":[
        {"type":"text","x":60,"y":60,"w":620,"h":160,"title":"Headline","sub":"Support line"},
        {"type":"image","x":710,"y":60,"w":210,"h":460,"title":"Image","sub":"Drop image here"},
        {"type":"text","x":60,"y":260,"w":560,"h":140,"title":"Benefit","sub":"Short benefit"},
        {"type":"text","x":60,"y":430,"w":560,"h":120,"title":"CTA","sub":"Shop Now"}
      ]
    }
  ]
}

Rules:
- 3 to 6 elements per template
- Use type "text" or "image"
- Coordinates must fit inside 980x620
- Keep text short and premium
`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    const raw = await r.json();
    const content = raw?.choices?.[0]?.message?.content || "";
    const s = content.indexOf("{");
    const e = content.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("AI returned non-JSON");

    const data = JSON.parse(content.slice(s, e + 1));
    if (!Array.isArray(data.templates)) throw new Error("templates missing");

    return res.status(200).json({ success: true, templates: data.templates });
  } catch (err) {
    console.error("API ERROR:", err);
    // Fail gracefully; frontend will fallback to engine
    return res.status(500).json({ error: "AI generation failed" });
  }
}
