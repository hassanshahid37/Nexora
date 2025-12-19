export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

  // --- helpers ---
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const safeInt = (v, d) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };

  function extractJson(text) {
    if (!text || typeof text !== "string") return null;
    try { return JSON.parse(text); } catch {}
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }

  // --- design systems ---
  const PALETTES = [
    { name: "Blue Violet", bg: "linear-gradient(135deg,#0b5fff,#7b5cff)", primary:"#0b5fff", accent:"#7b5cff", ink:"#ffffff", soft:"rgba(255,255,255,.10)" },
    { name: "Midnight Cyan", bg: "linear-gradient(135deg,#0b1020,#00d1ff)", primary:"#00d1ff", accent:"#0b5fff", ink:"#ffffff", soft:"rgba(255,255,255,.10)" },
    { name: "Sunset Premium", bg: "linear-gradient(135deg,#ff4d6d,#7b5cff)", primary:"#ff4d6d", accent:"#7b5cff", ink:"#ffffff", soft:"rgba(255,255,255,.10)" },
    { name: "Emerald Noir", bg: "linear-gradient(135deg,#07130f,#00c389)", primary:"#00c389", accent:"#0b5fff", ink:"#ffffff", soft:"rgba(255,255,255,.10)" },
    { name: "Gold Luxe", bg: "linear-gradient(135deg,#0b1020,#ffcc66)", primary:"#ffcc66", accent:"#7b5cff", ink:"#ffffff", soft:"rgba(255,255,255,.10)" },
    { name: "Clean Light", bg: "linear-gradient(135deg,#ffffff,#e9efff)", primary:"#0b5fff", accent:"#7b5cff", ink:"#0b1020", soft:"rgba(10,20,60,.08)" },
  ];

  const ARCHETYPES = [
    { name: "Hero + CTA" },
    { name: "Split Card" },
    { name: "Badge Overlay" },
    { name: "Editorial" },
    { name: "Promo Poster" },
    { name: "Minimal Product" },
  ];

  function makeFallbackTemplates({ count, category, style }) {
    const now = Date.now();
    const W = 980, H = 620;
    const list = [];
    for (let i = 0; i < count; i++) {
      const p = PALETTES[i % PALETTES.length];
      const a = ARCHETYPES[i % ARCHETYPES.length];

      const headline = [
        "Grow Your Brand",
        "New Collection Drop",
        "Limited Time Offer",
        "Upgrade Your Look",
        "Launch Day Special",
        "Premium Minimal Design"
      ][i % 6];

      const sub = [
        "Modern premium aesthetic • built for conversions",
        "Clean typography • bold hierarchy • strong spacing",
        "High-impact layout • ready for social",
        "Luxury vibes • sharp contrast • crisp grid",
        "Designed to look like Canva premium packs",
        "Elegant, minimal, and highly usable"
      ][i % 6];

      const elements = [];

      elements.push({
        type: "background",
        x: 0, y: 0, w: W, h: H,
        title: "BG", sub: "",
        fill: p.bg
      });

      elements.push({
        type: "shape",
        x: 60, y: 70, w: 860, h: 480,
        title: "CARD", sub: "",
        background: p.soft,
        radius: 24
      });

      elements.push({
        type: "badge",
        x: 90, y: 100, w: 220, h: 54,
        title: "LIMITED", sub: "",
        background: "rgba(255,255,255,.14)",
        radius: 999,
        color: p.ink,
        fontSize: 16,
        fontWeight: 700
      });

      elements.push({
        type: "heading",
        x: 90, y: 170, w: 740, h: 120,
        title: headline,
        sub: "",
        color: p.ink,
        fontSize: 64,
        fontWeight: 800
      });

      elements.push({
        type: "text",
        x: 90, y: 290, w: 640, h: 80,
        title: sub,
        sub: "",
        color: "rgba(255,255,255,.85)",
        fontSize: 20,
        fontWeight: 500
      });

      elements.push({
        type: "image",
        x: 650, y: 260, w: 250, h: 220,
        title: "IMAGE",
        sub: "Photo / product",
        background: "linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.06))",
        radius: 22
      });

      elements.push({
        type: "cta",
        x: 90, y: 400, w: 260, h: 64,
        title: "Get Started",
        sub: "",
        background: `linear-gradient(135deg, ${p.primary}, ${p.accent})`,
        radius: 18,
        color: "#ffffff",
        fontSize: 18,
        fontWeight: 700
      });

      list.push({
        id: `fb_${now}_${i+1}`,
        title: `${category} #${i+1}`,
        description: `${style} • ${p.name} • ${a.name}`,
        category,
        style,
        bg: p.bg,
        canvas: { w: W, h: H },
        elements
      });
    }
    return list;
  }

  function normalizeTemplates(rawTemplates, { count, category, style }) {
    const W = 980, H = 620;

    const templates = (Array.isArray(rawTemplates) ? rawTemplates : []).slice(0, count).map((t, i) => {
      const bg = t?.bg || t?.background || null;

      const elements = (Array.isArray(t?.elements) ? t.elements : []).slice(0, 14).map((e) => {
        const type = String(e.type ?? "card");
        const x = clamp(Number(e.x ?? 80), 0, W);
        const y = clamp(Number(e.y ?? 80), 0, H);
        const w = clamp(Number(e.w ?? e.width ?? 320), 20, W);
        const h = clamp(Number(e.h ?? e.height ?? 120), 20, H);

        const title = String(e.title ?? e.text ?? (type === "image" ? "IMAGE" : "TEXT"));
        const sub = String(e.sub ?? e.caption ?? "");

        return {
          id: e.id || (globalThis.crypto?.randomUUID?.() || (`${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`)),
          type,
          x, y, w, h,
          title, sub,
          fontSize: e.fontSize ?? null,
          fontWeight: e.fontWeight ?? null,
          color: e.color ?? null,
          align: e.align ?? null,
          radius: e.radius ?? null,
          fill: e.fill ?? null,
          background: e.background ?? null,
          opacity: e.opacity ?? null
        };
      });

      return {
        id: t?.id || `ai_${Date.now()}_${i+1}`,
        title: t?.title || `${category} #${i+1}`,
        description: t?.description || t?.subtitle || `${style} • Canva-style`,
        category: t?.category || category,
        style: t?.style || style,
        bg,
        canvas: { w: W, h: H },
        elements
      };
    }).filter(t => t.elements.length >= 3);

    return templates;
  }

  try {
    const {
      prompt = "",
      count = 24,
      category = "Instagram Post",
      style = "Dark Premium",
      notes = ""
    } = req.body || {};

    const safeCount = clamp(safeInt(count, 24), 1, 200);
    const safePrompt = (String(prompt).trim() || `Generate premium ${category} templates in ${style} style.`);

    const paletteNames = PALETTES.map(p => p.name).join(", ");
    const archetypeNames = ARCHETYPES.map(a => a.name).join(", ");

    const schemaHint = `Return STRICT JSON ONLY in this exact format:
IMPORTANT RULES:
- Each template MUST include 4–10 elements (no empty templates)
- Elements MUST be positioned with x,y,w,h for a 980x620 canvas
- Use these element types only: heading, text, badge, button, image, shape
- Make layouts premium and readable at thumbnail size (one dominant hero)

{
  "templates":[
    {
      "id":"t1",
      "title":"Template title",
      "description":"One-line description for the tile",
      "category":"${category}",
      "style":"${style}",
      "bg":"CSS gradient or color (recommended)",
      "canvas":{"w":980,"h":620},
      "elements":[
        {
          "type":"background",
          "x":0,"y":0,"w":980,"h":620,
          "title":"BG","sub":"",
          "fill":"linear-gradient(135deg,#0b5fff,#7b5cff)"
        },
        {
          "type":"heading",
          "x":80,"y":90,"w":820,"h":120,
          "title":"Headline text","sub":"",
          "fontSize":72,
          "fontWeight":800,
          "color":"#ffffff",
          "align":"left"
        },
        {
          "type":"cta",
          "x":80,"y":380,"w":260,"h":64,
          "title":"Button label","sub":"",
          "background":"linear-gradient(135deg,#0b5fff,#7b5cff)",
          "radius":18,
          "color":"#ffffff",
          "fontSize":18,
          "fontWeight":700
        },
        {
          "type":"image",
          "x":650,"y":250,"w":250,"h":230,
          "title":"IMAGE","sub":"photo placeholder",
          "background":"linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.06))",
          "radius":22
        }
      ]
    }
  ]
}`;

    const userMsg = `You are a premium Canva-style design template generator.
Generate ${safeCount} DISTINCT templates for category: ${category}.
Style: ${style}.
User prompt: ${safePrompt}
Notes: ${notes}

Hard requirements:
- Return ONLY valid JSON (no markdown, no comments).
- Must look Canva-level: hierarchy, spacing, intentional composition.
- Use premium palettes (choose and vary): ${paletteNames}
- Use and vary archetypes: ${archetypeNames}
- Prefer using bg (template.bg) and a background element.
- Elements must fit within canvas 980x620.
- Use 5 to 10 elements per template.
- Allowed types: background, heading, subhead, text, badge, cta, image, shape, card.
- If you add style fields, only these: fontSize, fontWeight, color, align, radius, fill, background, opacity.

${schemaHint}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          { role: "system", content: "Respond ONLY with valid JSON. No extra text." },
          { role: "user", content: userMsg }
        ]
      })
    });

    const raw = await response.json();
    const content = raw?.choices?.[0]?.message?.content || "";
    const data = extractJson(content);

    const normalized = normalizeTemplates(data?.templates, { count: safeCount, category, style });

    if (!normalized.length) {
      const fb = makeFallbackTemplates({ count: safeCount, category, style });
      return res.status(200).json({
        success: true,
        warning: "AI returned unusable templates — fallback used",
        templates: fb
      });
    }

    return res.status(200).json({ success: true, templates: normalized });

  } catch (err) {
    const fb = makeFallbackTemplates({ count: 24, category: "Instagram Post", style: "Dark Premium" });

    return res.status(200).json({
      success: true,
      warning: "AI failed — fallback used",
      templates: fb
    });
  }
}
