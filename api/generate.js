// Nexora / Templify – Serverless template intent generator
// HARD SAFE VERSION: never calls OpenAI, never throws, never returns 500.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ success: true, templates: [] });
  }

  let body = {};
  try {
    body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch {
    body = {};
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const category = typeof body.category === "string" ? body.category : "Instagram Post";
  const style = typeof body.style === "string" ? body.style : "Dark Premium";
  const count = clampInt(body.count, 4, 1, 200);

  const templates = makeFallbackTemplates({ prompt, category, style, count });

  return res.status(200).json({
    success: true,
    templates
  });
}

function clampInt(v, def, min, max) {
  const n = typeof v === "number" ? v : parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function titleCase(s) {
  return (s || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function makeFallbackTemplates({ prompt, category, style, count }) {
  const base = prompt ? titleCase(prompt) : "New Collection";

  const vibes = [
    "Bold Announcement",
    "Minimal Quote",
    "Split Hero",
    "Photo Card",
    "Feature Grid",
    "Editorial",
  ];

  const ctas = ["Shop Now", "Learn More", "Join Now", "Apply Today"];

  const templates = [];
  for (let i = 0; i < count; i++) {
    templates.push({
      title: `${category} #${i + 1}`,
      subtitle: `${style} • ${vibes[i % vibes.length]}`,
      category,
      style,
      headline: base,
      subhead: "Premium layout generated instantly.",
      cta: ctas[i % ctas.length],
      vibe: vibes[i % vibes.length],
      layoutHint: vibes[i % vibes.length].toLowerCase().replace(/\s+/g, "-"),
    });
  }
  return templates;
}
// AD-4 hook
// applyDominance is called during layout finalize step
