export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

  try {
    const { category="Instagram Post", style="Dark Premium", prompt="", notes="", count=24 } = req.body || {};
    const n = Math.min(200, Math.max(1, parseInt(count || 24, 10)));

    const system = "You are a world-class design system that generates Canva-level templates. Output STRICT JSON only.";
    const user = `
Generate ${n} PREMIUM templates.

Category: ${category}
Style: ${style}
User prompt: ${prompt}
Notes: ${notes}

Return STRICT JSON ONLY in this schema:

{
  "templates":[
    {
      "name":"Template name",
      "canvas":{"w":980,"h":620},
      "elements":[
        {"type":"text","role":"headline","x":120,"y":110,"w":740,"h":90,"font":"Poppins","size":56,"weight":700,"color":"#ffffff","text":"Headline"},
        {"type":"text","role":"body","x":120,"y":210,"w":620,"h":120,"font":"Poppins","size":24,"weight":400,"color":"#d1d5db","text":"Body text"},
        {"type":"shape","shape":"rect","x":0,"y":520,"w":980,"h":100,"color":"#0b5fff"}
      ]
    }
  ]
}

Rules:
- x,y,w,h must fit within 980x620
- Use 3–6 elements per template
- High contrast, premium hierarchy
- JSON only
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
    if (s === -1 || e === -1) throw new Error("Invalid JSON");

    const data = JSON.parse(content.slice(s, e + 1));
    if (!Array.isArray(data.templates)) throw new Error("Missing templates");

    res.status(200).json({ success: true, templates: data.templates });
  } catch (err) {
    console.error(err);
    // Safe fallback (layout-aware)
    res.status(200).json({
      success: true,
      templates: Array.from({ length: 12 }).map((_, i) => ({
        name: `Premium Template ${i+1}`,
        canvas: { w: 980, h: 620 },
        elements: [
          { type:"text", role:"headline", x:120, y:110, w:740, h:90, font:"Poppins", size:56, weight:700, color:"#ffffff", text:"Luxury Design" },
          { type:"text", role:"body", x:120, y:210, w:620, h:120, font:"Poppins", size:24, weight:400, color:"#d1d5db", text:"Edit this template in the editor." },
          { type:"shape", shape:"rect", x:0, y:520, w:980, h:100, color:"#0b5fff" }
        ]
      }))
    });
  }
}
