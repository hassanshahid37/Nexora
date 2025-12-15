export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY missing" });
  }

  try {
    const {
      prompt = "",
      count = 24,
      category = "Instagram Post",
      style = "Dark Premium",
      notes = ""
    } = req.body || {};

    const n = Math.min(Math.max(parseInt(count, 10) || 24, 1), 200);

    const safePrompt =
      String(prompt).trim() ||
      `Generate premium ${category} templates in ${style} style.`;

    const userPrompt = `
You are a professional graphic designer.

Generate ${n} DISTINCT Canva-style templates.

Category: ${category}
Style: ${style}
Prompt: ${safePrompt}
Notes: ${notes}

Rules:
- Return ONLY valid JSON
- Structure:
{
  "templates": [
    {
      "title": "Template title",
      "description": "Short description",
      "elements": [
        { "x":80,"y":70,"w":820,"h":120,"title":"HEADLINE","sub":"Text" }
      ]
    }
  ]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "Respond ONLY with valid JSON." },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.templates)) {
      throw new Error("Templates missing");
    }

    return res.status(200).json({
      success: true,
      templates: parsed.templates
    });

  } catch (err) {
    // Safe fallback (NEVER breaks UI)
    return res.status(200).json({
      success: true,
      warning: err.message,
      templates: [
        {
          title: "Fallback Template",
          description: "Structured fallback layout",
          elements: [
            { x:80,y:70,w:820,h:120,title:"HEADLINE",sub:"Fallback headline" },
            { x:80,y:220,w:620,h:110,title:"SUBHEAD",sub:"Fallback text" },
            { x:80,y:360,w:360,h:110,title:"CTA",sub:"Call to action" }
          ]
        }
      ]
    });
  }
}
