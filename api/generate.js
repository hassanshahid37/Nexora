export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

  try {
    const {
      prompt = "",
      count = 24,
      category = "Instagram Post",
      style = "Dark Premium",
      notes = ""
    } = req.body || {};

    // Allow empty prompt by turning it into a useful default (so users can click once and get results)
    const safePrompt = (String(prompt).trim() || `Generate premium ${category} templates in ${style} style.`);

    const schemaHint = `Return STRICT JSON ONLY in this exact format:
{
  "templates":[
    {
      "id":"t1",
      "title":"Template title",
      "description":"One-line description for the tile",
      "category":"${category}",
      "style":"${style}",
      "canvas":{"w":980,"h":620},
      "elements":[
        {"type":"heading","x":80,"y":70,"w":820,"h":120,"title":"HEADLINE","sub":""},
        {"type":"text","x":80,"y":210,"w":620,"h":110,"title":"","sub":"Supporting line"},
        {"type":"cta","x":80,"y":350,"w":360,"h":110,"title":"CTA","sub":""},
        {"type":"image","x":520,"y":260,"w":380,"h":300,"title":"","sub":""}
      ]
    }
  ]
}`;

    const userMsg = `You are a premium template generator for a Canva-style editor.
Generate ${Math.min(Math.max(parseInt(count,10)||24,1),200)} DISTINCT templates for category: ${category}.
Style: ${style}.
User prompt: ${safePrompt}
Notes: ${notes}

Rules:
- Return ONLY valid JSON (no markdown, no comments).
- Make it look Canva-level: use strong hierarchy, spacing, and premium color palettes.
- Prefer using background gradients (template.bg or a full-canvas shape element).
- Use typography sizes (heading 48-84, subhead 20-34, text 14-20), and include color.
- Make templates DISTINCT (different layouts and element placements).
- Elements must fit within canvas 980x620.
- Use 3 to 7 elements per template.
- element fields must be: type,x,y,w,h,title,sub (all required).
- Allowed types: heading, subhead, text, badge, cta, image, shape, card.
- For better Canva-style results, you MAY add optional style fields per element:
  fontSize, fontWeight, color, align, radius, fill, background, opacity.
- You MAY also add template-level field: bg (CSS color/gradient) to represent the background.
- If you include any optional fields, keep them JSON-serializable and consistent.

${schemaHint}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "Respond ONLY with valid JSON. No extra text." },
          { role: "user", content: userMsg }
        ]
      })
    });

    const raw = await response.json();
    const content = raw.choices?.[0]?.message?.content || "";
    let data;
    try { data = JSON.parse(content); } catch { throw new Error("Invalid JSON from OpenAI"); }

    if (!Array.isArray(data.templates) || !data.templates.length) throw new Error("Templates array missing");

    // Normalize & validate
    const templates = data.templates.map((t, i) => ({
      id: t.id || `ai_${Date.now()}_${i+1}`,
      title: t.title || `${category} #${i+1}`,
      description: t.description || `${style} • AI layout`,
      category: t.category || category,
      style: t.style || style,
      canvas: { w: 980, h: 620 },
      elements: (Array.isArray(t.elements) ? t.elements : []).slice(0, 12).map((e) => ({
        x: Number(e.x), y: Number(e.y),
        w: Number(e.w), h: Number(e.h),
        type: String(e.type ?? "card"),
        title: String(e.title ?? "TEXT"),
        sub: String(e.sub ?? "")
      }))
    })).filter(t => t.elements.length >= 3);

    if (!templates.length) throw new Error("No usable templates returned");

    return res.status(200).json({ success: true, templates });
  } catch (err) {
    // Safe fallback: still return real, structured templates (no crashes)
    const {
      count: reqCount = 24,
      category: reqCategory = "Instagram Post",
      style: reqStyle = "Dark Premium"
    } = req.body || {};

    const count = Math.min(Math.max(parseInt(reqCount,10)||24,1),200);

    const patterns = [
      // Hero headline + image + cta
      (i)=>([
        { type:"shape", x: 40, y: 40, w: 900, h: 220, title:"", sub:"" },
        { type:"heading", x: 80, y: 70, w: 820, h: 90, title:"Luxury Launch", sub:"" },
        { type:"text", x: 80, y: 160, w: 560, h: 70, title:"", sub:"Designed to convert. Clean layout + bold typography." },
        { type:"image", x: 620, y: 140, w: 300, h: 260, title:"", sub:"" },
        { type:"cta", x: 80, y: 260, w: 280, h: 70, title:"Shop Now", sub:"" },
      ]),
      // Left text column, right hero image
      (i)=>([
        { type:"badge", x: 80, y: 70, w: 180, h: 56, title:"NEW", sub:"" },
        { type:"heading", x: 80, y: 140, w: 460, h: 110, title:"Minimal Modern", sub:"" },
        { type:"text", x: 80, y: 250, w: 460, h: 120, title:"", sub:"• Premium look\n• Strong hierarchy\n• Clean spacing" },
        { type:"image", x: 580, y: 90, w: 340, h: 400, title:"", sub:"" },
      ]),
      // Centered poster
      (i)=>([
        { type:"shape", x: 160, y: 60, w: 660, h: 520, title:"", sub:"" },
        { type:"badge", x: 390, y: 90, w: 200, h: 54, title:"LIMITED", sub:"" },
        { type:"heading", x: 230, y: 170, w: 520, h: 130, title:"Flash Sale", sub:"" },
        { type:"text", x: 250, y: 300, w: 480, h: 90, title:"", sub:"Up to 30% off selected items." },
        { type:"cta", x: 320, y: 420, w: 340, h: 80, title:"Get Offer", sub:"" },
      ]),
      // Three-card grid
      (i)=>([
        { type:"heading", x: 80, y: 70, w: 820, h: 90, title:"3 Reasons", sub:"" },
        { type:"card", x: 80, y: 180, w: 260, h: 250, title:"Fast", sub:"Quick results" },
        { type:"card", x: 360, y: 180, w: 260, h: 250, title:"Clean", sub:"Premium style" },
        { type:"card", x: 640, y: 180, w: 260, h: 250, title:"Smart", sub:"Clear hierarchy" },
        { type:"cta", x: 80, y: 460, w: 260, h: 80, title:"Learn More", sub:"" },
      ]),
      // Carousel-style split
      (i)=>([
        { type:"image", x: 80, y: 90, w: 420, h: 440, title:"", sub:"" },
        { type:"heading", x: 540, y: 130, w: 360, h: 120, title:"Brand Story", sub:"" },
        { type:"text", x: 540, y: 260, w: 360, h: 140, title:"", sub:"Tell a premium story with clean layouts." },
        { type:"cta", x: 540, y: 420, w: 300, h: 80, title:"Start Today", sub:"" },
      ]),
      // Event flyer
      (i)=>([
        { type:"badge", x: 80, y: 70, w: 220, h: 56, title:"LIVE EVENT", sub:"" },
        { type:"heading", x: 80, y: 140, w: 620, h: 120, title:"Creative Workshop", sub:"" },
        { type:"text", x: 80, y: 260, w: 520, h: 120, title:"", sub:"Sat • 7pm\nDowntown Studio\nLimited seats" },
        { type:"image", x: 640, y: 260, w: 260, h: 280, title:"", sub:"" },
        { type:"cta", x: 80, y: 420, w: 320, h: 80, title:"Book Now", sub:"" },
      ]),
    ];

    const templates = Array.from({ length: count }).map((_, i) => ({
      id: `fb_${Date.now()}_${i+1}`,
      title: `${reqCategory} #${i+1}`,
      description: `${reqStyle} • Structured layout`,
      category: reqCategory,
      style: reqStyle,
      canvas: { w: 980, h: 620 },
      elements: patterns[i % patterns.length](i+1)
    }));

    return res.status(200).json({
      success: true,
      warning: "AI failed — returned structured fallback templates",
      templates
    });
  }
}
