export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY missing" });
  }

  try {
    const {
      category = "Instagram Post",
      mode = "layout", // "layout" | "style"
      prompt = "",
      notes = "",
      canvas = { w: 1080, h: 1080 }
    } = req.body || {};

    /* ---------- DESIGN RULES (QUALITY CONTROL) ---------- */

    const systemPrompt = `
You are a senior graphic designer creating premium Canva-style templates.

CRITICAL RULES:
- Output ONLY valid JSON
- No text outside JSON
- No markdown
- No explanations

CANVAS:
- Width: ${canvas.w}
- Height: ${canvas.h}
- All elements MUST stay fully inside the canvas
- No overlapping elements

ELEMENT RULES:
- Use between 3 and 8 elements
- Each element must have:
  x, y, w, h, title, sub
- Larger elements = more important text
- Maintain clear visual hierarchy
- Balanced spacing and margins
- Professional, premium layout

DESIGN MODE:
${mode === "layout"
  ? "- Create a completely NEW layout from scratch."
  : "- Create a completely NEW design on the SAME canvas size."}

CATEGORY:
${category}

USER PROMPT:
${prompt || "Create a high-end premium design."}

NOTES:
${notes || "None"}

OUTPUT FORMAT (STRICT):
{
  "canvas": { "w": number, "h": number },
  "elements": [
    {
      "x": number,
      "y": number,
      "w": number,
      "h": number,
      "title": string,
      "sub": string
    }
  ]
}
`;

    /* ---------- OPENAI CALL ---------- */

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
          { role: "system", content: systemPrompt }
        ]
      })
    });

    const raw = await response.json();
    const content = raw?.choices?.[0]?.message?.content || "";

    let design;
    try {
      design = JSON.parse(content);
    } catch {
      throw new Error("Invalid JSON returned by AI");
    }

    /* ---------- VALIDATION (SAFETY NET) ---------- */

    if (
      !design ||
      !design.canvas ||
      !Array.isArray(design.elements)
    ) {
      throw new Error("Design structure invalid");
    }

    if (design.elements.length < 3 || design.elements.length > 8) {
      throw new Error("Invalid element count");
    }

    return res.status(200).json({
      success: true,
      design
    });

  } catch (err) {
    console.error("DESIGN API ERROR:", err.message);

    /* ---------- SAFE FAIL (NO DATA LOSS) ---------- */
    return res.status(200).json({
      success: false,
      warning: "AI failed to generate design",
      design: null
    });
  }
}
