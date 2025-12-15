import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    const safePrompt =
      String(prompt).trim() ||
      `Generate premium ${category} templates in ${style} style.`;

    const n = Math.min(Math.max(parseInt(count, 10) || 24, 1), 200);

    const systemPrompt =
      "You are a professional graphic designer. Respond ONLY with valid JSON.";

    const userPrompt = `
Generate ${n} DISTINCT Canva-style templates.

Category: ${category}
Style: ${style}
Prompt: ${safePrompt}
Notes: ${notes}

Rules:
- Return ONLY JSON
- Each template must have canvas {w:980,h:620}
- 3–7 elements per template
- element fields: x,y,w,h,title,sub
- Layouts must be visually different
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    let data;
    try {
      data = JSON.parse(content);
    } catch {
      throw new Error("Invalid JSON from OpenAI");
    }

    if (!Array.isArray(data.templates) || !data.templates.length) {
      throw new Error("Templates array missing");
    }

    const templates = data.templates.map((t, i) => ({
      id: t.id || `ai_${Date.now()}_${i + 1}`,
      title: t.title || `${category} #${i + 1}`,
      description: t.description || `${style} • AI layout`,
      category,
      style,
      canvas: { w: 980, h: 620 },
      elements: (t.elements || []).map(e => ({
        x: Number(e.x),
        y: Number(e.y),
        w: Number(e.w),
        h: Number(e.h),
        title: String(e.title || "TEXT"),
        sub: String(e.sub || "")
      }))
    })).filter(t => t.elements.length >= 3);

    if (!templates.length) {
      throw new Error("No usable templates generated");
    }

    return res.status(200).json({ success: true, templates });

  } catch (err) {
    // GUARANTEED SAFE FALLBACK (never crashes UI)
    const patterns = [
      [
        { x: 80, y: 70, w: 820, h: 120, title: "HEADLINE", sub: "Bold offer" },
        { x: 80, y: 220, w: 620, h: 110, title: "SUBHEAD", sub: "Key benefit" },
        { x: 80, y: 360, w: 360, h: 110, title: "CTA", sub: "Call to action" },
        { x: 520, y: 360, w: 380, h: 210, title: "IMAGE", sub: "Image placeholder" }
      ],
      [
        { x: 70, y: 90, w: 420, h: 160, title: "TITLE", sub: "Clean headline" },
        { x: 70, y: 270, w: 420, h: 160, title: "DETAILS", sub: "Supporting text" },
        { x: 520, y: 90, w: 390, h: 360, title: "IMAGE", sub: "Hero visual" }
      ]
    ];

    const templates = Array.from({ length: 24 }).map((_, i) => ({
      id: `fb_${Date.now()}_${i + 1}`,
      title: `Template #${i + 1}`,
      description: "Dark Premium • Structured layout",
      category: "General",
      style: "Dark Premium",
      canvas: { w: 980, h: 620 },
      elements: patterns[i % patterns.length]
    }));

    return res.status(200).json({
      success: true,
      warning: String(err.message),
      templates
    });
  }
}
