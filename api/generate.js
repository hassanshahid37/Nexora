

// api/generate.js
// Nexora / Templify – Serverless API: /api/generate
// Style engine is optional at runtime (dev/prod paths differ). If it can't be
// loaded, we fall back to a no-op so generation never crashes.
let applyStyle = () => ({});
try {
  // Vercel serverless: this file lives in /api so style-engine is one level up.
  // eslint-disable-next-line global-require
  applyStyle = require('../style-engine.js').applyStyle || applyStyle;
} catch (_) {
  try {
    // Local/dev or different repo structure.
    // eslint-disable-next-line global-require
    applyStyle = require('./style-engine.js').applyStyle || applyStyle;
  } catch (_) {
    // leave no-op
  }
}
// Purpose: ALWAYS return REAL templates (canvas + elements) compatible with index.html preview.
// Notes:
// - CommonJS handler for Vercel/Netlify-style /api directory.
// - Deterministic (no external AI calls), never throws: always 200 JSON.

async function handler(req, res) {
  try {
    // Basic CORS / preflight safety
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") return res.end();
    if (req.method !== "POST") return res.end(JSON.stringify({ success: true, templates: [] }));

    // Parse body safely (platforms may give object or string)
    let body = {};
    try {
      body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    } catch {
      body = {};
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const category = typeof body.category === "string" ? body.category : "Instagram Post";
    const style = typeof body.style === "string" ? body.style : "Dark Premium";

    // Count
    let count = Number(body.count);
    if (!Number.isFinite(count)) count = 4;
    count = Math.max(1, Math.min(200, Math.floor(count)));

    // Accept divergence/fork metadata but NEVER require it
    const divergenceIndexRaw = body.divergenceIndex ?? body.forkIndex ?? body.variantIndex ?? body.i;
    let divergenceIndex = Number(divergenceIndexRaw);
    if (!Number.isFinite(divergenceIndex)) divergenceIndex = -1;

    
    const withContracts = templates.map(t => {
      const size = CATEGORIES[category] || { w: 1080, h: 1080 };
      const content = {
        headline: (t.elements||[]).find(e=>e.type==="text")?.text || "",
        subhead: (t.elements||[]).filter(e=>e.type==="text")[1]?.text || "",
        cta: (t.elements||[]).find(e=>e.type==="pill"||e.type==="chip")?.text || ""
      };
      const layers = (t.elements||[]).map(e => ({
        role:
          e.type==="bg" ? "background" :
          e.type==="photo" ? "image" :
          e.type==="pill" || e.type==="chip" ? "cta" :
          "headline"
      }));
      return Object.assign({}, t, {
        contract: {
          version: 1,
          category,
          canvas: { width: size.w, height: size.h },
          layers
        },
        content
      });
    });
    return res.end(JSON.stringify({ success: true, templates: withContracts }));
    
  } catch (err) {
    // Hard-safe: NEVER return 500
    try {
      const templates = makeTemplates({
        prompt: "",
        category: "Instagram Post",
        style: "Dark Premium",
        count: 4,
        divergenceIndex: -1
});
      return res.end(
        JSON.stringify({
          success: true,
          templates,
          error: String(err && err.message ? err.message : err)
})
      );
    } catch {
      return res.end(JSON.stringify({ success: true, templates: [] }));
    }
  }
};

/* ===========================
   Deterministic Composition Engine
   - Produces element layouts compatible with index.html "design.js-like" preview adapter.
   - Uses element types: bg, shape, text, pill, chip, badge, photo
=========================== */

const CATEGORIES = {
  "Instagram Post": { w: 1080, h: 1080 },
  Story: { w: 1080, h: 1920 },
  "YouTube Thumbnail": { w: 1280, h: 720 },
  Flyer: { w: 1080, h: 1350 },
  "Business Card": { w: 1050, h: 600 },
  Logo: { w: 1000, h: 1000 },
  "Presentation Slide": { w: 1920, h: 1080 },
  Resume: { w: 1240, h: 1754 },
  Poster: { w: 1414, h: 2000 }
};

const PALETTES = [
  {
    name: "Cobalt Night",
    bg: "#0b1020",
    bg2: "#0a2a5a",
    ink: "#f7f9ff",
    muted: "#b9c3d6",
    accent: "#2f7bff",
    accent2: "#9b5cff"
},
  {
    name: "Emerald Studio",
    bg: "#071613",
    bg2: "#0b3a2b",
    ink: "#f4fffb",
    muted: "#b9d7cc",
    accent: "#2dd4bf",
    accent2: "#84cc16"
},
  {
    name: "Sunset Premium",
    bg: "#140a12",
    bg2: "#3b0f2b",
    ink: "#fff6fb",
    muted: "#f3cfe0",
    accent: "#fb7185",
    accent2: "#f59e0b"
},
  {
    name: "Mono Luxe",
    bg: "#0b0c10",
    bg2: "#1a1d29",
    ink: "#f6f7fb",
    muted: "#b4bbcb",
    accent: "#e5e7eb",
    accent2: "#60a5fa"
},
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function pick(arr, seed) {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

function hash32(str) {
  str = String(str || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function titleCase(s) {
  return (s || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function paletteForStyle(style, seed) {
  const base = pick(PALETTES, seed);
  const s = String(style || "Dark Premium").toLowerCase();
  const pal = { ...base };

  if (s.includes("light")) {
    pal.bg = "#f8fafc";
    pal.bg2 = "#e8eef8";
    pal.ink = "#0b1220";
    pal.muted = "#334155";
    pal.accent = base.accent2 || "#2563eb";
    pal.accent2 = base.accent || "#0ea5e9";
  } else if (s.includes("corporate")) {
    pal.bg = "#071423";
    pal.bg2 = "#0b2a4a";
    pal.ink = "#f3f7ff";
    pal.muted = "#b8c7dd";
    pal.accent = "#38bdf8";
    pal.accent2 = "#a78bfa";
  } else if (s.includes("neon")) {
    pal.bg = "#05040a";
    pal.bg2 = "#130a2a";
    pal.ink = "#ffffff";
    pal.muted = "#c7c3ff";
    pal.accent = "#22d3ee";
    pal.accent2 = "#fb7185";
  } else if (s.includes("glass")) {
    // keep base but hint translucency via lighter overlays
    pal.__glass = true;
  }
  return pal;
}

function escapeXML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function smartPhotoSrc(seed, pal, label) {
  const a = (pal && pal.accent) || "#4f8cff";
  const b = (pal && pal.accent2) || "#22c55e";
  const bg = (pal && (pal.bg2 || pal.bg)) || "#0b1220";
  const txt = (label || "Nexora").toString().slice(0, 18);

  const r1 = 120 + (seed % 140);
  const r2 = 90 + ((seed >> 3) % 160);
  const x1 = 260 + ((seed >> 5) % 420);
  const y1 = 240 + ((seed >> 7) % 420);
  const x2 = 620 + ((seed >> 9) % 360);
  const y2 = 520 + ((seed >> 11) % 360);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${b}" stop-opacity="0.90"/>
    </linearGradient>
    <radialGradient id="rg" cx="0.25" cy="0.2" r="0.95">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="1200" height="800" fill="${bg}"/>
  <rect width="1200" height="800" fill="url(#rg)"/>

  <circle cx="${x1}" cy="${y1}" r="${r1}" fill="url(#g)" filter="url(#blur)" opacity="0.9"/>
  <circle cx="${x2}" cy="${y2}" r="${r2}" fill="url(#g)" filter="url(#blur)" opacity="0.85"/>

  <path d="M0,640 C240,560 360,740 600,670 C820,608 920,520 1200,590 L1200,800 L0,800 Z"
        fill="#000000" opacity="0.14"/>

  <text x="64" y="116" font-family="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="64" font-weight="800"
        fill="#ffffff" opacity="0.92">${escapeXML(txt)}</text>
  <text x="64" y="170" font-family="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="26" font-weight="600"
        fill="#ffffff" opacity="0.60">Auto image • AC-V1</text>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function splitWords(prompt) {
  return String(prompt || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function brandFromPrompt(prompt) {
  const words = splitWords(prompt);
  if (!words.length) return { brand: "Nexora", tagline: "Premium templates, fast." };
  const brand = words.slice(0, 3).join(" ");
  const tagline = words.slice(3, 11).join(" ") || "Designed for your next post.";
  return { brand, tagline };
}

function pickCTA(vibe, seed) {
  const choices = {
    Branding: ["Learn More", "Discover", "Explore", "Get Started"],
    Urgency: ["Shop Now", "Limited Offer", "Buy Now", "Get 30% Off"],
    Info: ["See Details", "Learn More", "Read More", "Get Info"],
    CTA: ["Get Started", "Join Now", "Try Now", "Sign Up"]
};
  const list = choices[vibe] || choices.CTA;
  return pick(list, seed);
}

function layoutFromHint(hint, seed) {
  const h = String(hint || "").toLowerCase();
  if (h.includes("split")) return "splitHero";
  if (h.includes("badge")) return "badgePromo";
  if (h.includes("feature")) return "featureGrid";
  if (h.includes("quote")) return "minimalQuote";
  if (h.includes("photo")) return "photoCard";
  // fallback deterministic rotation
  const rot = ["splitHero", "badgePromo", "featureGrid", "minimalQuote", "photoCard"];
  return pick(rot, seed);
}

function buildElements(layout, spec) {
  const { w, h, pal, headline, subhead, cta, brand, seed } = spec;
  const els = [];
  const add = (e) => (els.push(e), e);

  // background
  add({ type: "bg", x: 0, y: 0, w, h, fill: pal.bg, fill2: pal.bg2, style: "radial" });

  // common sizes
  const pad = Math.round(Math.min(w, h) * 0.07);
  const H1 = clamp(Math.round(h * 0.07), 40, 110);
  const H2 = clamp(Math.round(h * 0.04), 22, 64);

  if (layout === "splitHero") {
    add({ type: "shape", x: 0, y: 0, w: Math.round(w * 0.58), h, r: 48, fill: pal.bg2, opacity: 0.85 });
    add({
      type: "shape",
      x: Math.round(w * 0.54),
      y: Math.round(h * 0.12),
      w: Math.round(w * 0.40),
      h: Math.round(h * 0.56),
      r: 44,
      fill: "rgba(255,255,255,0.06)",
      stroke: "rgba(255,255,255,0.14)"
});

    add({ type: "text", x: pad, y: pad, text: brand.toUpperCase(), size: clamp(Math.round(H2 * 0.9), 18, 44), weight: 800, color: pal.muted, letter: 2 });
    add({ type: "text", x: pad, y: pad + Math.round(H2 * 1.3), text: headline, size: H1, weight: 900, color: pal.ink, letter: -0.5 });
    add({ type: "text", x: pad, y: pad + Math.round(H2 * 1.3) + Math.round(H1 * 1.25), text: subhead, size: H2, weight: 600, color: pal.muted });

    add({
      type: "pill",
      x: pad,
      y: h - pad - Math.round(H2 * 2.0),
      w: Math.round(w * 0.30),
      h: Math.round(H2 * 2.0),
      r: 999,
      fill: pal.accent,
      text: cta,
      tcolor: "#0b1020",
      tsize: clamp(Math.round(H2 * 0.95), 14, 36),
      tweight: 800
});

    add({
      type: "photo",
      src: smartPhotoSrc(seed + 11, pal, brand),
      x: Math.round(w * 0.585),
      y: Math.round(h * 0.16),
      w: Math.round(w * 0.32),
      h: Math.round(h * 0.40),
      r: 36,
      stroke: "rgba(255,255,255,0.18)"
});
  }

  if (layout === "badgePromo") {
    add({
      type: "shape",
      x: pad,
      y: pad,
      w: w - pad * 2,
      h: Math.round(h * 0.64),
      r: 52,
      fill: "rgba(255,255,255,0.06)",
      stroke: "rgba(255,255,255,0.14)"
});
    add({
      type: "badge",
      x: w - pad - Math.round(w * 0.18),
      y: pad - Math.round(h * 0.01),
      w: Math.round(w * 0.18),
      h: Math.round(w * 0.18),
      r: 999,
      fill: pal.accent2,
      text: "SALE",
      tcolor: "#0b1020",
      tsize: clamp(Math.round(H2 * 0.95), 14, 40),
      tweight: 900
});

    add({ type: "text", x: pad + 8, y: pad + 14, text: headline, size: clamp(Math.round(H1 * 1.05), 44, 128), weight: 900, color: pal.ink });
    add({ type: "text", x: pad + 10, y: pad + Math.round(h * 0.20), text: subhead, size: H2, weight: 650, color: pal.muted });

    // product/photo strip
    add({
      type: "photo",
      src: smartPhotoSrc(seed + 33, pal, "Premium"),
      x: pad + 10,
      y: Math.round(h * 0.46),
      w: Math.round(w * 0.52),
      h: Math.round(h * 0.22),
      r: 26,
      stroke: "rgba(255,255,255,0.14)"
});

    add({
      type: "pill",
      x: pad,
      y: h - pad - Math.round(H2 * 2.1),
      w: Math.round(w * 0.38),
      h: Math.round(H2 * 2.1),
      r: 999,
      fill: pal.accent,
      text: cta,
      tcolor: "#0b1020",
      tsize: clamp(Math.round(H2 * 0.95), 14, 36),
      tweight: 900
});
    add({ type: "chip", x: pad + Math.round(w * 0.42), y: h - pad - Math.round(H2 * 1.7), text: brand, size: clamp(Math.round(H2 * 0.85), 12, 30), color: pal.muted });
  }

  if (layout === "minimalQuote") {
    add({ type: "shape", x: pad, y: pad, w: w - pad * 2, h: h - pad * 2, r: 52, fill: "rgba(255,255,255,0.04)", stroke: "rgba(255,255,255,0.10)" });
    add({ type: "text", x: pad + 20, y: Math.round(h * 0.20), text: "\u201C" + headline + "\u201D", size: clamp(Math.round(H1 * 1.05), 44, 140), weight: 900, color: pal.ink, letter: -0.6 });
    add({ type: "text", x: pad + 24, y: Math.round(h * 0.58), text: subhead, size: clamp(Math.round(H2 * 1.05), 22, 62), weight: 600, color: pal.muted });
    add({
      type: "pill",
      x: pad + 18,
      y: h - pad - Math.round(H2 * 2.1),
      w: Math.round(w * 0.34),
      h: Math.round(H2 * 2.1),
      r: 999,
      fill: pal.accent2,
      text: cta,
      tcolor: "#0b1020",
      tsize: clamp(Math.round(H2 * 0.95), 14, 36),
      tweight: 800
});
    add({ type: "chip", x: w - pad - Math.round(w * 0.22), y: h - pad - Math.round(H2 * 1.6), text: brand, size: clamp(Math.round(H2 * 0.8), 12, 30), color: pal.muted });
  }

  if (layout === "featureGrid") {
    add({ type: "shape", x: pad, y: pad, w: w - pad * 2, h: Math.round(h * 0.30), r: 46, fill: "rgba(255,255,255,0.06)", stroke: "rgba(255,255,255,0.12)" });
    add({ type: "text", x: pad + 16, y: pad + 16, text: headline, size: clamp(Math.round(H1 * 0.98), 40, 120), weight: 900, color: pal.ink });
    add({ type: "text", x: pad + 18, y: pad + 16 + Math.round(H1 * 1.1), text: subhead, size: H2, weight: 650, color: pal.muted });

    const cardW = Math.round((w - pad * 2 - 24) / 3);
    const top = Math.round(h * 0.38);
    for (let k = 0; k < 3; k++) {
      add({ type: "shape", x: pad + k * (cardW + 12), y: top, w: cardW, h: Math.round(h * 0.26), r: 26, fill: "rgba(255,255,255,0.05)", stroke: "rgba(255,255,255,0.10)" });
      add({ type: "shape", x: pad + k * (cardW + 12) + 14, y: top + 14, w: Math.round(cardW * 0.34), h: Math.round(cardW * 0.34), r: 18, fill: k === 0 ? pal.accent : k === 1 ? pal.accent2 : pal.bg2, opacity: 0.9 });
      add({ type: "text", x: pad + k * (cardW + 12) + 14, y: top + Math.round(cardW * 0.42) + 18, text: ["Fast", "Clean", "Ready"][k], size: clamp(Math.round(H2 * 0.95), 16, 46), weight: 900, color: pal.ink });
    }

    add({
      type: "pill",
      x: pad,
      y: h - pad - Math.round(H2 * 2.1),
      w: Math.round(w * 0.32),
      h: Math.round(H2 * 2.1),
      r: 999,
      fill: pal.accent,
      text: cta,
      tcolor: "#0b1020",
      tsize: clamp(Math.round(H2 * 0.95), 14, 36),
      tweight: 900
});
    add({ type: "photo", src: smartPhotoSrc(seed + 77, pal, brand), x: Math.round(w * 0.62), y: h - pad - Math.round(h * 0.30), w: Math.round(w * 0.30), h: Math.round(h * 0.24), r: 24, stroke: "rgba(255,255,255,0.14)" });
  }

  if (layout === "photoCard") {
    add({ type: "photo", src: smartPhotoSrc(seed + 19, pal, brand), x: pad, y: pad, w: w - pad * 2, h: Math.round(h * 0.62), r: 46, stroke: "rgba(255,255,255,0.16)" });
    add({
      type: "shape",
      x: pad,
      y: Math.round(h * 0.62) - 8,
      w: w - pad * 2,
      h: h - Math.round(h * 0.62) - pad + 8,
      r: 46,
      fill: pal.__glass ? "rgba(15,18,32,0.55)" : "rgba(0,0,0,0.38)",
      stroke: "rgba(255,255,255,0.12)"
});
    add({ type: "text", x: pad + 18, y: Math.round(h * 0.66), text: headline, size: clamp(Math.round(H1 * 0.92), 38, 110), weight: 900, color: pal.ink });
    add({ type: "text", x: pad + 18, y: Math.round(h * 0.66) + Math.round(H1 * 1.05), text: subhead, size: H2, weight: 650, color: pal.muted });
    add({
      type: "pill",
      x: pad + 18,
      y: h - pad - Math.round(H2 * 2.1),
      w: Math.round(w * 0.34),
      h: Math.round(H2 * 2.1),
      r: 999,
      fill: pal.accent2,
      text: cta,
      tcolor: "#0b1020",
      tsize: clamp(Math.round(H2 * 0.95), 14, 36),
      tweight: 900
});
  }

  return els;
}

function materializeTemplate({ prompt, category, style, i, vibe, layoutHint, headline, subhead, cta }) {
  const baseSeed = hash32(`${prompt}|${category}|${style}|${i}|${vibe}|${layoutHint}`);
  const size = CATEGORIES[category] || CATEGORIES["Instagram Post"];
  const pal = paletteForStyle(style, baseSeed);
  const brand = brandFromPrompt(prompt).brand;

  const layout = layoutFromHint(layoutHint, baseSeed ^ 0xa5a5);
  const elements = buildElements(layout, {
    w: size.w,
    h: size.h,
    pal,
    headline,
    subhead,
    cta,
    brand,
    seed: baseSeed
});

  return {
    canvas: { w: size.w, h: size.h },
    elements,
    _layout: layout,
    _palette: pal,
    _seed: baseSeed
};
}


// ===========================
// YouTube Archetypes → Template Adapter
// - Uses inlined NexoraArchetypes (1–20)
// - Produces templates compatible with index.html preview + invisible-editor handoff
// ===========================
function makeYouTubeArchetypeTemplates({ prompt, category, style, count, divergenceIndex }) {
  const cat = category || "YouTube Thumbnail";
  const canvas = NexoraArchetypes.resolveCanvas("youtube");
  const seedBase = hash32(String(prompt || "") + "|" + String(style || "") + "|" + String(cat || ""));
  const palBase = paletteForStyle(style, seedBase);

  const all = NexoraArchetypes.buildAllArchetypes();
  const ids = all.map(a => a.id);

  // Stable copy defaults (strong hooks for YouTube)
  const raw = String(prompt || "").trim();
  const cleaned = raw
    .replace(/^[\s\-–—:]+/g, "")
    .replace(/^(why|how|what|when|where|the truth about|truth about)\s+/i, "")
    .replace(/\?+$/, "")
    .trim();

  function ytHeadline(seed){
    let head = cleaned || "WATCH THIS";
    let words = head.split(/\s+/).filter(Boolean);
    if(words.length > 7) head = words.slice(0,7).join(" ");
    if(head.length > 34) head = head.slice(0,34).trim();
    return head.toUpperCase();
  }

  function ytSubhead(seed){
    const micro = ["WATCH NOW", "DON'T MISS", "FULL STORY", "NEW VIDEO", "IN 5 MINUTES"];
    return pick(micro, seed ^ 0x7171);
  }

  // Deterministic archetype selection per variant
  const basePick = (divergenceIndex != null && Number.isFinite(Number(divergenceIndex)) && Number(divergenceIndex) >= 0)
    ? (Number(divergenceIndex) | 0)
    : 0;

  const out = [];
  for (let i = 0; i < count; i++) {
    const seed = (seedBase ^ ((i + 1) * 2654435761) ^ (basePick * 97531)) >>> 0;
    const pal = paletteForStyle(style, seed);

    const headline = ytHeadline(seed);
    const subhead = ytSubhead(seed);

    const archetypeId = ids[(seed % ids.length + ids.length) % ids.length];
    const ctx = { headline, subhead, imageProvided: true, faceDetected: false };

    let compiled;
    try {
      const chosen = NexoraArchetypes.selectArchetype(all, archetypeId, headline, subhead);
      compiled = chosen.compile(canvas, ctx);
    } catch (e) {
      // fallback: deterministic next archetype
      const chosen = NexoraArchetypes.selectArchetype(all, null, headline, subhead);
      const fallback = NexoraArchetypes.nextArchetype(all, chosen.id);
      compiled = fallback.compile(canvas, ctx);
    }

    const elements = blocksToElements(compiled.blocks || [], canvas, pal, seed, headline);
    const id = "yt_" + String(seedBase) + "_" + String(i + 1);

    out.push({
      id,
      category: cat,
      style: style || "Dark Premium",
      title: "YouTube Thumbnail • " + (compiled.archetype || archetypeId || "ARCHETYPE"),
      description: "Archetype: " + String(compiled.archetype || archetypeId || "YT"),
      canvas: { w: canvas.w, h: canvas.h },
      palette: pal,
      archetype: compiled.archetype || archetypeId,
      elements,
      contract: buildContractV1(id, cat, canvas, elements)
    });
  }
  return out;
}

function blocksToElements(blocks, canvas, pal, seed, labelText) {
  const els = [];
  // Always add a bg for renderer robustness
  els.push({ type:"bg", role:"background", x:0,y:0,w:canvas.w,h:canvas.h, fill: pal.bg, fill2: pal.bg2, style:"radial" });

  const brandLabel = String(labelText || "Nexora").split(/\s+/).slice(0,2).join(" ").slice(0,18) || "Nexora";
  const photoSrc = smartPhotoSrc(seed, pal, brandLabel);

  const sorted = (Array.isArray(blocks) ? blocks : []).slice().sort((a,b)=> (a?.z||0)-(b?.z||0));
  for (const b of sorted) {
    if (!b || !b.zone) continue;
    const z = b.zone;
    const role = String(b.role || "").toLowerCase() || "badge";
    const t = String(b.type || "").toLowerCase();

    if (t === "image") {
      els.push({
        type: "photo",
        role: role || "image",
        x: z.x, y: z.y, w: z.w, h: z.h,
        src: photoSrc,
        radius: Number(b?.style?.radius ?? b?.style?.r ?? 24),
        opacity: Number(b?.style?.opacity ?? 1)
      });
      continue;
    }

    if (t === "background") {
      // background block is already covered by bg; ignore unless it has a special fill
      if (b?.style?.fill || b?.style?.color) {
        els.push({
          type: "shape",
          role: "background",
          x: z.x, y: z.y, w: z.w, h: z.h,
          fill: b.style.fill || b.style.color,
          opacity: Number(b?.style?.opacity ?? 1),
          radius: Number(b?.style?.radius ?? 24)
        });
      }
      continue;
    }

    if (t === "overlay") {
      els.push({
        type: "shape",
        role: role || "badge",
        x: z.x, y: z.y, w: z.w, h: z.h,
        fill: b?.style?.fill || b?.style?.color || "rgba(0,0,0,0.45)",
        opacity: Number(b?.style?.opacity ?? 1),
        radius: Number(b?.style?.radius ?? b?.style?.r ?? 24),
        stroke: b?.style?.stroke || null
      });
      continue;
    }

    if (t === "badge") {
      els.push({
        type: "pill",
        role: role || "badge",
        x: z.x, y: z.y, w: z.w, h: z.h,
        text: String(b?.value ?? b?.text ?? "NEW"),
        fill: b?.style?.fill || pal.accent,
        color: b?.style?.color || pal.ink,
        size: Number(b?.style?.fontSize ?? 24),
        weight: Number(b?.style?.weight ?? 800),
        radius: Number(b?.style?.radius ?? 999),
        align: b?.style?.align || "center",
        opacity: Number(b?.style?.opacity ?? 1)
      });
      continue;
    }

    if (t === "text") {
      els.push({
        type: "text",
        role: role || "headline",
        x: z.x, y: z.y, w: z.w, h: z.h,
        text: String(b?.value ?? ""),
        size: Number(b?.style?.fontSize ?? 56),
        weight: Number(b?.style?.weight ?? 900),
        color: b?.style?.color || pal.ink,
        align: b?.style?.align || "left",
        lineHeight: Number(b?.style?.lineHeight ?? 1.05),
        letterSpacing: Number(b?.style?.letterSpacing ?? 0),
        opacity: Number(b?.style?.opacity ?? 1),
	        shadow: b?.style?.shadow || null,
      });
      continue;
    }

    // unknown block: ignore safely
  }

  return els;
}

function buildContractV1(templateId, category, canvas, elements){
  try{
    const layers = (elements||[]).filter(Boolean).map((e, i)=>({
      id: String(e.id || ("l_"+i)),
      role: String(e.role || (e.type==="photo" ? "image" : (e.type==="bg" ? "background" : "badge"))),
      locked: false
    }));
    return {
      version: "v1",
      templateId: String(templateId),
      category: String(category || "Unknown"),
      canvas: { w: canvas.w, h: canvas.h },
      exportProfiles: [{ id:"default", label:String(category||"Export"), w: canvas.w, h: canvas.h, format:"png" }],
      layers,
      constraints: {},
      roles: { required: ["headline"], optional: ["subhead","cta","badge","image","background"] }
    };
  }catch(_){
    return null;
  }
}

function makeTemplates({ prompt, category, style, count, divergenceIndex }) {
  // YouTube Thumbnails: REAL archetypes (1–20) only
  if (String(category || "").toLowerCase().includes("youtube")) {
    return makeYouTubeArchetypeTemplates({ prompt, category, style, count, divergenceIndex });
  }

  const words = splitWords(prompt);
  const base = prompt ? titleCase(prompt) : "New Collection";

  // Archetype set with layout hints (deterministic variety)
  const archetypes = [
    { vibe: "Branding", layoutHint: "clean", cta: "Learn More" },
    { vibe: "Urgency", layoutHint: "badge-promo", cta: "Shop Now" },
    { vibe: "Info", layoutHint: "feature-grid", cta: "See Details" },
    { vibe: "CTA", layoutHint: "split-hero", cta: "Get Started" },
    { vibe: "Branding", layoutHint: "photo-card", cta: "Discover" },
    { vibe: "Info", layoutHint: "minimal-quote", cta: "Explore" },
  ];

  let start = 0;
  if (Number.isFinite(divergenceIndex) && divergenceIndex >= 0) {
    start = Math.floor(divergenceIndex) % archetypes.length;
  }

  const templates = [];
  for (let i = 0; i < count; i++) {
    const a = archetypes[(start + i) % archetypes.length];

    // deterministic copy (varies, but stays premium)
    const maxH = 42;
    const headline = (base.length > maxH ? base.slice(0, maxH) : base) || "New Collection";
    const subhead =
      a.vibe === "Info"
        ? words.length
          ? "Clear details • Simple structure"
          : "Clear details • Simple structure"
        : a.vibe === "Urgency"
        ? "Limited time • Act fast"
        : a.vibe === "Branding"
        ? "Premium quality • Trusted"
        : "Tap to begin • Instant results";

    const seed = hash32(`${prompt}|${category}|${style}|${i}`);
    const cta = pickCTA(a.vibe, seed);

    const composed = materializeTemplate({
      prompt,
      category,
      style,
      i,
      vibe: a.vibe,
      layoutHint: a.layoutHint,
      headline,
      subhead,
      cta
});

    // Attach semantic roles + stable-ish ids (non-breaking)
    const elements = Array.isArray(composed.elements) ? composed.elements.map((e) => ({ ...e })) : [];
    let textSeen = 0;
    for (const el of elements) {
      const t = String(el && el.type ? el.type : "").toLowerCase();
      if (t === "bg") {
        el.role = "background";
        el.id = el.id || "bg";
        continue;
      }
      if (t === "photo" || t === "image") {
        el.role = "image";
        el.id = el.id || "media";
        continue;
      }
      if (t === "pill") {
        const txt = String((el && (el.text || el.title)) || "").trim();
        if (txt && String(cta || "").trim() && txt === String(cta).trim()) {
          el.role = "cta";
          el.id = el.id || "cta";
        } else {
          el.role = "badge";
          el.id = el.id || "badge";
        }
        continue;
      }
      if (t === "badge" || t === "chip") {
        el.role = "badge";
        el.id = el.id || (t === "badge" ? "badge" : "chip");
        continue;
      }
      if (t === "text") {
        textSeen += 1;
        el.role = textSeen === 1 ? "headline" : "subhead";
        el.id = el.id || (textSeen === 1 ? "headline" : textSeen === 2 ? "subhead" : `text_${textSeen}`);
        continue;
      }
      el.role = el.role || "badge";
      el.id = el.id || `el_${seed.toString(16)}_${i}_${Math.random().toString(16).slice(2)}`;
    }

    // TemplateContract (pure JSON)
    const canvasN = {
      width: Math.round(Number(composed && composed.canvas ? composed.canvas.w : 0)),
      height: Math.round(Number(composed && composed.canvas ? composed.canvas.h : 0))
};
    const templateId = `tpl_${seed.toString(16)}_${i + 1}`;
    const pal = composed && composed._palette ? composed._palette : null;
    const contract = {
      version: "v1",
      templateId,
      category,
      canvas: canvasN,
      palette: pal ? { bg: pal.bg || null, accent: pal.accent || pal.accent2 || null, ink: pal.ink || null } : null,
      layers: elements.map((e) => ({ id: String(e.id || "layer"), role: String(e.role || "badge"), locked: true })),
      exportProfiles: [String(category).replace(/\s+/g, "_").toLowerCase()],
      createdAt: Date.now()
};

    templates.push({
      id: templateId,
      contract,
      title: `${category} #${i + 1}`,
      subtitle: `${style} • ${a.vibe}`,
      category,
      style,
      headline,
      subhead,
      cta,
      vibe: a.vibe,
      layoutHint: a.layoutHint,
      canvas: composed.canvas,
      elements,
      _layout: composed._layout,
      _palette: composed._palette && composed._palette.name ? composed._palette.name : null,
      _seed: composed._seed
});
  }
  return templates;
}


/* ===========================
   Archetype Engine (1–20)
   - Wrapped to avoid polluting existing generate.js symbols.
   - Not wired into makeTemplates yet; safe merge-only.
=========================== */

const NexoraArchetypes = (() => {
// Nexora — Archetype Compilation (1–20)
// Purpose: single file containing ONLY archetype factories + zones + shared helpers.
// This file intentionally does NOT export a Next.js handler.
// Later you can merge these factories into your original generate.js safely.
//
// Archetype IDs included:
// 1 AGGRESSIVE_POWER
// 2 MINIMAL_CLEAN
// 3 CURIOSITY_MYSTERY
// 4 PRODUCT_FOCUS
// 5 TRUST_FRIENDLY
// 6 NEWS_URGENT
// 7 CINEMATIC_DARK
// 8 SPORTS_ACTION
// 9 MUSIC_ARTISTIC
// 10 COMPARISON_VS
// 11 BOLD_CLAIM
// 12 FACE_CLOSEUP
// 13 EDUCATIONAL_EXPLAINER
// 14 KIDS_PLAYFUL
// 15 LUXURY_PREMIUM
// 16 AUTHORITY_EXPERT
// 17 TECH_FUTURISTIC
// 18 RELIGION_CALM
// 19 FUN_PLAYFUL
// 20 EMOTIONAL_STORY
const ARCHETYPE_FACTORY_FNS = [
  AggressivePower,
  MinimalClean,
  CuriosityMystery,
  ProductFocus,
  TrustFriendly,
  NewsUrgent,
  CinematicDark,
  SportsAction,
  MusicArtistic,
  ComparisonVS,
  BoldClaim,
  FaceCloseup,
  EducationalExplainer,
  KidsPlayful,
  LuxuryPremium,
  AuthorityExpert,
  TechFuturistic,
  ReligionCalm,
  FunPlayful,
  EmotionalStory
];

// Convenience: build ready-to-use compilers (objects with {id, compile}).
function buildAllArchetypes() {
  return ARCHETYPE_FACTORY_FNS.map(fn => fn());
}

// Convenience: shared canvas resolver (union of categories seen across batches).
function resolveCanvas(category) {
  const CANVAS = {
    youtube: { w: 1280, h: 720, safe: 48 },
    instagram: { w: 1080, h: 1080, safe: 48 },
    story: { w: 1080, h: 1920, safe: 64 },
    flyer: { w: 1080, h: 1350, safe: 64 },
    poster: { w: 1080, h: 1620, safe: 64 },
    slide: { w: 1280, h: 720, safe: 48 },
    resume: { w: 1240, h: 1754, safe: 64 },
    businesscard: { w: 1050, h: 600, safe: 32 },
    logo: { w: 1080, h: 1080, safe: 48 }
  };
  return CANVAS[category] || CANVAS.youtube;
}

// Convenience: deterministic selection helpers (same semantics as batches).
function selectArchetype(list, requestedId, headline, subhead) {
  if (requestedId) {
    const hit = list.find(a => a.id === requestedId);
    if (hit) return hit;
  }
  const h = stableHash(`${headline || ""}||${subhead || ""}`);
  return list[h % list.length];
}
function nextArchetype(list, id) {
  const i = Math.max(0, list.findIndex(a => a.id === id));
  return list[(i + 1) % list.length];
}

// ======================================================
// ARCHETYPES + ZONES (verbatim bodies from your batches)
// ======================================================

function AggressivePower() {
  return {
    id: "AGGRESSIVE_POWER",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesAggressive(canvas, ctx.faceDetected);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 5, casing: "UPPER" });

      // Typography starts big, then auto-fits down deterministically.
      const textStyle = {
        family: "condensed",
        weight: 900,
        casing: "UPPER",
        letterSpacing: -1.5,
        fill: "#FFFFFF",
        stroke: { width: scale(canvas, 6), color: "rgba(0,0,0,0.85)" },
        shadow: { x: 0, y: scale(canvas, 6), blur: scale(canvas, 22), color: "rgba(0,0,0,0.65)" },
        maxLines: 2
      };

      const fitted = fitTextToZone(headline, z.text, {
        baseFontSize: scale(canvas, 98),
        minFontSize: scale(canvas, 54),
        lineHeight: 0.95,
        maxLines: textStyle.maxLines,
        letterSpacing: textStyle.letterSpacing
      });

      const blocks = [
        image("hero", z.image, { cropBias: ctx.faceDetected ? "eyes-center" : "center" }, 10),
        overlay("contrast", z.image, {
          type: "gradient",
          direction: "to-left",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.65)" },
            { at: 0.5, color: "rgba(0,0,0,0.25)" },
            { at: 1.0, color: "rgba(0,0,0,0.00)" }
          ]
        }, 20),
        // Optional bottom kicker band for extra readability on tall canvases
        overlay("kickerBand", z.kicker, {
          type: "solid",
          color: "rgba(0,0,0,0.45)",
          radius: scale(canvas, 14)
        }, 25),
        text("headline", z.text, fitted.text, {
          ...textStyle,
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          padding: scale(canvas, 16)
        }, 30)
      ];

      validateNoOverlap(blocks, ["headline"], ["hero"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function MinimalClean() {
  return {
    id: "MINIMAL_CLEAN",
    compile(canvas, ctx) {
      const z = zonesMinimal(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 10, casing: "SENTENCE" });

      const style = {
        family: "sans",
        weight: 400,
        casing: "SENTENCE",
        letterSpacing: 0,
        fill: "#111111",
        maxLines: 2
      };

      const fitted = fitTextToZone(headline, z.title, {
        baseFontSize: scale(canvas, 64),
        minFontSize: scale(canvas, 36),
        lineHeight: 1.22,
        maxLines: style.maxLines,
        letterSpacing: style.letterSpacing
      });

      const blocks = [
        background("paper", z.full, { color: "#FFFFFF" }, 0),
        // subtle divider to make it feel designed, still minimal
        line("divider", z.divider, { color: "rgba(17,17,17,0.12)", thickness: Math.max(1, scale(canvas, 2)) }, 5),
        text("headline", z.title, fitted.text, {
          ...style,
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "left",
          padding: 0
        }, 10),
        // optional tiny subhead if provided
        ...(ctx.subhead ? [text("subhead", z.sub, normalizeHeadline(ctx.subhead, { maxWords: 18, casing: "SENTENCE" }), {
          family: "sans",
          weight: 300,
          casing: "SENTENCE",
          letterSpacing: 0,
          fill: "rgba(17,17,17,0.72)",
          fontSize: scale(canvas, 28),
          lineHeight: 1.25,
          align: "left",
          maxLines: 3,
          padding: 0
        }, 12)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "line", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function CuriosityMystery() {
  return {
    id: "CURIOSITY_MYSTERY",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesMystery(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 6, casing: "TITLE" });

      const style = {
        family: "sans",
        weight: 750,
        casing: "TITLE",
        letterSpacing: -0.5,
        fill: "#FFFFFF",
        shadow: { x: 0, y: scale(canvas, 4), blur: scale(canvas, 14), color: "rgba(0,0,0,0.55)" },
        maxLines: 2
      };

      const fitted = fitTextToZone(headline, z.text, {
        baseFontSize: scale(canvas, 72),
        minFontSize: scale(canvas, 44),
        lineHeight: 1.04,
        maxLines: style.maxLines,
        letterSpacing: style.letterSpacing
      });

      const blocks = [
        image("hero", z.image, { cropBias: "eyes-center", zoom: 1.12 }, 10),
        overlay("fade", z.fade, {
          type: "gradient",
          direction: "to-top",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.78)" },
            { at: 0.55, color: "rgba(0,0,0,0.18)" },
            { at: 1.0, color: "rgba(0,0,0,0.00)" }
          ]
        }, 20),
        text("headline", z.text, fitted.text, {
          ...style,
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          padding: scale(canvas, 16)
        }, 30),
        // tiny hint badge to increase curiosity (still subtle)
        badge("hint", z.badge, {
          label: "?",
          fill: "rgba(255,255,255,0.92)",
          textColor: "rgba(0,0,0,0.85)",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 26),
          weight: 800,
          paddingX: scale(canvas, 14),
          paddingY: scale(canvas, 8)
        }, 35)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text", "badge"]);
      validateNoOverlap(blocks, ["headline"], ["hint"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function ProductFocus() {
  return {
    id: "PRODUCT_FOCUS",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesProduct(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 4, casing: "UPPER" });

      const fitted = fitTextToZone(headline, z.caption, {
        baseFontSize: scale(canvas, 42),
        minFontSize: scale(canvas, 26),
        lineHeight: 1.0,
        maxLines: 1,
        letterSpacing: -0.5
      });

      const blocks = [
        background("paper", z.full, { color: "#FFFFFF" }, 0),
        image("product", z.image, { cropBias: "center", zoom: 1.08 }, 10),
        text("caption", z.caption, fitted.text, {
          family: "sans",
          weight: 700,
          casing: "UPPER",
          fill: "#111111",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -0.5,
          align: "center"
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function TrustFriendly() {
  return {
    id: "TRUST_FRIENDLY",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesTrust(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 8, casing: "SENTENCE" });
      const sub = normalizeHeadline(ctx.subhead || "", { maxWords: 14, casing: "SENTENCE" });

      const hFit = fitTextToZone(headline, z.title, {
        baseFontSize: scale(canvas, 52),
        minFontSize: scale(canvas, 34),
        lineHeight: 1.18,
        maxLines: 2,
        letterSpacing: 0
      });

      const blocks = [
        background("soft", z.full, { color: "#F4F7F8" }, 0),
        image("portrait", z.image, { cropBias: "eyes-center", zoom: 1.04 }, 10),
        text("headline", z.title, hFit.text, {
          family: "sans",
          weight: 500,
          casing: "SENTENCE",
          fill: "#1A1A1A",
          fontSize: hFit.fontSize,
          lineHeight: hFit.lineHeight,
          align: "left"
        }, 20),
        ...(sub ? [text("subhead", z.sub, sub, {
          family: "sans",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(26,26,26,0.75)",
          fontSize: scale(canvas, 28),
          lineHeight: 1.25,
          align: "left"
        }, 22)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function NewsUrgent() {
  return {
    id: "NEWS_URGENT",
    compile(canvas, ctx) {
      const z = zonesNews(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 6, casing: "UPPER" });

      const fitted = fitTextToZone(headline, z.banner, {
        baseFontSize: scale(canvas, 58),
        minFontSize: scale(canvas, 38),
        lineHeight: 1.05,
        maxLines: 2,
        letterSpacing: -0.8
      });

      const blocks = [
        background("alert", z.banner, { color: "#C62828" }, 0),
        text("headline", z.banner, fitted.text, {
          family: "condensed",
          weight: 900,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center"
        }, 10),
        line("rule", z.rule, { color: "#C62828", thickness: Math.max(2, scale(canvas, 3)) }, 12)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "text", "line"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function CinematicDark() {
  return {
    id: "CINEMATIC_DARK",
    compile(canvas, ctx) {
      requireImage(ctx);
      const z = zonesCinematic(canvas);

      const title = normalize(ctx.headline, 5).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 64),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -1
      });

      const blocks = [
        image("hero", z.image, { cropBias: "center" }, 10),
        overlay("vignette", z.image, {
          type: "radial",
          inner: "rgba(0,0,0,0.0)",
          outer: "rgba(0,0,0,0.7)"
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 800,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -1,
          shadow: { x: 0, y: 4, blur: 16, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function SportsAction() {
  return {
    id: "SPORTS_ACTION",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesSports(canvas);

      const title = normalize(ctx.headline, 4).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 72),
        minFontSize: scale(canvas, 44),
        maxLines: 1,
        lineHeight: 0.95,
        letterSpacing: -1.2
      });

      const blocks = [
        image("action", z.image, { cropBias: "eyes-center", zoom: 1.12 }, 10),
        overlay("motion", z.motion, {
          type: "diagonal",
          color: "rgba(255,255,255,0.15)"
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 900,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -1.2,
          stroke: { width: scale(canvas, 4), color: "rgba(0,0,0,0.9)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function MusicArtistic() {
  return {
    id: "MUSIC_ARTISTIC",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesMusic(canvas);

      const title = normalize(ctx.headline, 6);

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 56),
        minFontSize: scale(canvas, 36),
        maxLines: 2,
        lineHeight: 1.15,
        letterSpacing: -0.3
      });

      const blocks = [
        image("art", z.image, { cropBias: "center" }, 10),
        overlay("tint", z.image, {
          type: "solid",
          color: "rgba(0,0,0,0.25)"
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "serif",
          weight: 600,
          casing: "SENTENCE",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -0.3,
          shadow: { x: 0, y: 2, blur: 10, color: "rgba(0,0,0,0.4)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function ComparisonVS() {
  return {
    id: "COMPARISON_VS",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesVS(canvas);
      const title = normalize(ctx.headline, 5).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 52),
        minFontSize: scale(canvas, 34),
        maxLines: 2,
        lineHeight: 1.05,
        letterSpacing: -0.8
      });

      const blocks = [
        image("left", z.left, { cropBias: "center" }, 10),
        image("right", z.right, { cropBias: "center" }, 10),
        badge("vs", z.badge, {
          label: "VS",
          fill: "#FFFFFF",
          textColor: "#111111",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 32),
          weight: 900,
          paddingX: scale(canvas, 20),
          paddingY: scale(canvas, 12)
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 800,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          shadow: { x: 0, y: 3, blur: 12, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "badge", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function BoldClaim() {
  return {
    id: "BOLD_CLAIM",
    compile(canvas, ctx) {
      const z = zonesBold(canvas);
      const title = normalize(ctx.headline, 4).toUpperCase();

      const fitted = fitTextToZone(title, z.center, {
        baseFontSize: scale(canvas, 88),
        minFontSize: scale(canvas, 52),
        maxLines: 2,
        lineHeight: 0.95,
        letterSpacing: -1.5
      });

      const blocks = [
        background("solid", z.full, { color: "#000000" }, 0),
        text("headline", z.center, fitted.text, {
          family: "condensed",
          weight: 900,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          letterSpacing: -1.5
        }, 10)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function FaceCloseup() {
  return {
    id: "FACE_CLOSEUP",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesFace(canvas);
      const title = normalize(ctx.headline, 5).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 60),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -1
      });

      const blocks = [
        image("face", z.image, { cropBias: "eyes-center", zoom: 1.18 }, 10),
        overlay("shade", z.image, {
          type: "gradient",
          direction: "to-bottom",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.0)" },
            { at: 1.0, color: "rgba(0,0,0,0.65)" }
          ]
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 800,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          shadow: { x: 0, y: 3, blur: 14, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function EducationalExplainer() {
  return {
    id: "EDUCATIONAL_EXPLAINER",
    compile(canvas, ctx) {
      const z = zonesEdu(canvas);

      const title = normalize(ctx.headline, 8);
      const subtitle = normalize(ctx.subhead, 14);

      const titleFit = fitTextToZone(title, z.title, {
        baseFontSize: scale(canvas, 48),
        minFontSize: scale(canvas, 32),
        maxLines: 2,
        lineHeight: 1.2,
        letterSpacing: 0
      });

      const blocks = [
        background("paper", z.full, { color: "#FAFAFA" }, 0),
        ...(ctx.imageProvided ? [image("illustration", z.image, { cropBias: "center" }, 10)] : []),
        text("headline", z.title, titleFit.text, {
          family: "sans",
          weight: 600,
          casing: "SENTENCE",
          fill: "#111111",
          fontSize: titleFit.fontSize,
          lineHeight: titleFit.lineHeight,
          align: "left"
        }, 20),
        ...(subtitle ? [text("subhead", z.sub, subtitle, {
          family: "sans",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(17,17,17,0.75)",
          fontSize: scale(canvas, 28),
          lineHeight: 1.3,
          align: "left"
        }, 22)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function KidsPlayful() {
  return {
    id: "KIDS_PLAYFUL",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesKids(canvas);
      const title = normalize(ctx.headline, 4).toUpperCase();

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 64),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -0.5
      });

      const blocks = [
        background("fun", z.full, { color: "#FFEB3B" }, 0),
        image("kid", z.image, { cropBias: "eyes-center", zoom: 1.1 }, 10),
        badge("sticker", z.sticker, {
          label: "FUN",
          fill: "#FF5722",
          textColor: "#FFFFFF",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 26),
          weight: 900,
          paddingX: scale(canvas, 18),
          paddingY: scale(canvas, 10)
        }, 15),
        text("headline", z.text, fit.text, {
          family: "rounded",
          weight: 900,
          casing: "UPPER",
          fill: "#111111",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center"
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "badge", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function LuxuryPremium() {
  return {
    id: "LUXURY_PREMIUM",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesLuxury(canvas);
      const title = normalize(ctx.headline, 6);

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 46),
        minFontSize: scale(canvas, 30),
        maxLines: 2,
        lineHeight: 1.25,
        letterSpacing: 0.2
      });

      const blocks = [
        image("hero", z.image, { cropBias: "center" }, 10),
        overlay("fade", z.image, {
          type: "gradient",
          direction: "to-top",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.65)" },
            { at: 1.0, color: "rgba(0,0,0,0.0)" }
          ]
        }, 20),
        text("headline", z.text, fit.text, {
          family: "serif",
          weight: 500,
          casing: "SENTENCE",
          fill: "#FFFFFF",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center",
          letterSpacing: 0.2
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function AuthorityExpert() {
  return {
    id: "AUTHORITY_EXPERT",
    compile(canvas, ctx) {
      const z = zonesAuthority(canvas);

      const title = normalize(ctx.headline, 8);
      const sub = normalize(ctx.subhead, 12);

      const titleFit = fitTextToZone(title, z.title, {
        baseFontSize: scale(canvas, 54),
        minFontSize: scale(canvas, 34),
        maxLines: 2,
        lineHeight: 1.2,
        letterSpacing: 0
      });

      const blocks = [
        background("paper", z.full, { color: "#FFFFFF" }, 0),
        ...(ctx.imageProvided ? [image("expert", z.image, { cropBias: ctx.faceDetected ? "eyes-center" : "center" }, 10)] : []),
        text("headline", z.title, titleFit.text, {
          family: "serif",
          weight: 600,
          casing: "SENTENCE",
          fill: "#111111",
          fontSize: titleFit.fontSize,
          lineHeight: titleFit.lineHeight,
          align: "left"
        }, 20),
        ...(sub ? [text("subhead", z.sub, sub, {
          family: "serif",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(17,17,17,0.75)",
          fontSize: scale(canvas, 26),
          lineHeight: 1.3,
          align: "left"
        }, 22)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function TechFuturistic() {
  return {
    id: "TECH_FUTURISTIC",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesTech(canvas);
      const title = normalize(ctx.headline, 6).toUpperCase();

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 56),
        minFontSize: scale(canvas, 36),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -0.8
      });

      const blocks = [
        image("tech", z.image, { cropBias: "center" }, 10),
        overlay("grid", z.image, {
          type: "pattern",
          opacity: 0.25
        }, 15),
        overlay("glow", z.text, {
          type: "glow",
          color: "#00E5FF",
          blur: scale(canvas, 20)
        }, 18),
        text("headline", z.text, fit.text, {
          family: "mono",
          weight: 700,
          casing: "UPPER",
          fill: "#00E5FF",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          letterSpacing: -0.8,
          shadow: { x: 0, y: 0, blur: scale(canvas, 12), color: "rgba(0,229,255,0.8)" }
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function ReligionCalm() {
  return {
    id: "RELIGION_CALM",
    compile(canvas, ctx) {
      const z = zonesReligion(canvas);

      const title = normalize(ctx.headline, 10);
      const sub = normalize(ctx.subhead, 16);

      const titleFit = fitTextToZone(title, z.title, {
        baseFontSize: scale(canvas, 48),
        minFontSize: scale(canvas, 32),
        maxLines: 2,
        lineHeight: 1.3,
        letterSpacing: 0
      });

      const blocks = [
        background("calm", z.full, { color: "#F8F8F5" }, 0),
        text("headline", z.title, titleFit.text, {
          family: "serif",
          weight: 500,
          casing: "SENTENCE",
          fill: "#333333",
          fontSize: titleFit.fontSize,
          lineHeight: titleFit.lineHeight,
          align: "center"
        }, 10),
        ...(sub ? [text("subhead", z.sub, sub, {
          family: "serif",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(51,51,51,0.7)",
          fontSize: scale(canvas, 26),
          lineHeight: 1.4,
          align: "center"
        }, 12)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function FunPlayful() {
  return {
    id: "FUN_PLAYFUL",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesFun(canvas);
      const title = normalize(ctx.headline, 4).toUpperCase();

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 60),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -0.5
      });

      const blocks = [
        background("play", z.full, { color: "#FFCDD2" }, 0),
        image("face", z.image, { cropBias: "eyes-center", zoom: 1.12 }, 10),
        badge("emoji", z.emoji, {
          label: "😊",
          fill: "#FFFFFF",
          textColor: "#111111",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 28),
          weight: 800,
          paddingX: scale(canvas, 14),
          paddingY: scale(canvas, 8)
        }, 15),
        text("headline", z.text, fit.text, {
          family: "rounded",
          weight: 900,
          casing: "UPPER",
          fill: "#111111",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center"
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "badge", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function EmotionalStory() {
  return {
    id: "EMOTIONAL_STORY",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesEmotion(canvas);
      const title = normalize(ctx.headline, 6);

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 58),
        minFontSize: scale(canvas, 36),
        maxLines: 2,
        lineHeight: 1.1,
        letterSpacing: -0.3
      });

      const blocks = [
        image("hero", z.image, { cropBias: "eyes-center" }, 10),
        overlay("fade", z.fade, {
          type: "gradient",
          direction: "to-top",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.75)" },
            { at: 1.0, color: "rgba(0,0,0,0.0)" }
          ]
        }, 20),
        text("headline", z.text, fit.text, {
          family: "serif",
          weight: 600,
          casing: "SENTENCE",
          fill: "#FFFFFF",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center",
          shadow: { x: 0, y: 4, blur: 14, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function zonesAggressive(c, faceDetected) {
  const s = c.safe;
  const W = c.w - s * 2;
  const H = c.h - s * 2;

  // If face detected, bias image to left and text to right (avoid face overlap).
  // If no face, allow more centered image and bottom text.
  const image = faceDetected
    ? { x: s, y: s, w: W * 0.72, h: H }
    : { x: s, y: s, w: W, h: H };

  const text = faceDetected
    ? { x: s + W * 0.72, y: s, w: W * 0.28, h: H }
    : { x: s + W * 0.10, y: s + H * 0.68, w: W * 0.80, h: H * 0.26 };

  const kicker = faceDetected
    ? { x: text.x, y: text.y + text.h * 0.58, w: text.w, h: text.h * 0.42 }
    : { x: text.x, y: text.y, w: text.w, h: text.h };

  return { image, text, kicker };
}

function zonesAuthority(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s,y:s,w:W*0.4,h:H},
    title:{x:s+W*0.45,y:s+H*0.25,w:W*0.5,h:H*0.25},
    sub:{x:s+W*0.45,y:s+H*0.55,w:W*0.5,h:H*0.3}
  };
}

function zonesBold(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    center:{x:s+W*0.1,y:s+H*0.3,w:W*0.8,h:H*0.4}
  };
}

function zonesCinematic(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.7,w:W*0.7,h:H*0.25}
  };
}

function zonesEdu(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s,y:s,w:W*0.45,h:H},
    title:{x:s+W*0.5,y:s+H*0.2,w:W*0.45,h:H*0.25},
    sub:{x:s+W*0.5,y:s+H*0.5,w:W*0.45,h:H*0.3}
  };
}

function zonesEmotion(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    fade:{x:s,y:s+H*0.55,w:W,h:H*0.45},
    text:{x:s+W*0.15,y:s+H*0.65,w:W*0.7,h:H*0.25}
  };
}

function zonesFace(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.7,w:W*0.7,h:H*0.22}
  };
}

function zonesFun(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s+W*0.15,y:s+H*0.1,w:W*0.7,h:H*0.55},
    text:{x:s+W*0.2,y:s+H*0.7,w:W*0.6,h:H*0.2},
    emoji:{x:s+W*0.05,y:s+H*0.05,w:W*0.15,h:H*0.15}
  };
}

function zonesKids(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s+W*0.1,y:s+H*0.1,w:W*0.8,h:H*0.55},
    text:{x:s+W*0.15,y:s+H*0.7,w:W*0.7,h:H*0.2},
    sticker:{x:s+W*0.05,y:s+H*0.05,w:W*0.2,h:H*0.15}
  };
}

function zonesLuxury(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.65,w:W*0.7,h:H*0.25}
  };
}

function zonesMinimal(c) {
  const s = c.safe;
  const W = c.w - s * 2;
  const H = c.h - s * 2;

  return {
    full: { x: s, y: s, w: W, h: H },
    title: { x: s, y: s + H * 0.30, w: W, h: H * 0.22 },
    divider: { x: s, y: s + H * 0.56, w: W * 0.42, h: 0 },
    sub: { x: s, y: s + H * 0.60, w: W * 0.72, h: H * 0.25 }
  };
}

function zonesMusic(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.2,y:s+H*0.35,w:W*0.6,h:H*0.3}
  };
}

function zonesMystery(c) {
  const s = c.safe;
  const W = c.w - s * 2;
  const H = c.h - s * 2;

  return {
    image: { x: s, y: s, w: W, h: H },
    fade: { x: s, y: s + H * 0.55, w: W, h: H * 0.45 },
    text: { x: s + W * 0.08, y: s + H * 0.66, w: W * 0.84, h: H * 0.22 },
    badge: { x: s + W * 0.88, y: s + H * 0.58, w: W * 0.08, h: H * 0.08 }
  };
}

function zonesNews(c) {
  const s = c.safe, W = c.w - s * 2, H = c.h - s * 2;
  return {
    banner: { x: s, y: s + H * 0.35, w: W, h: H * 0.3 },
    rule: { x: s, y: s + H * 0.67, w: W, h: 0 }
  };
}

function zonesProduct(c) {
  const s = c.safe, W = c.w - s * 2, H = c.h - s * 2;
  return {
    full: { x: s, y: s, w: W, h: H },
    image: { x: s + W * 0.1, y: s + H * 0.08, w: W * 0.8, h: H * 0.7 },
    caption: { x: s, y: s + H * 0.82, w: W, h: H * 0.16 }
  };
}

function zonesReligion(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    title:{x:s+W*0.1,y:s+H*0.35,w:W*0.8,h:H*0.2},
    sub:{x:s+W*0.1,y:s+H*0.58,w:W*0.8,h:H*0.25}
  };
}

function zonesSports(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    motion:{x:s,y:s+H*0.15,w:W,h:H*0.2},
    text:{x:s+W*0.1,y:s+H*0.05,w:W*0.8,h:H*0.2}
  };
}

function zonesTech(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.4,w:W*0.7,h:H*0.25}
  };
}

function zonesTrust(c) {
  const s = c.safe, W = c.w - s * 2, H = c.h - s * 2;
  return {
    full: { x: s, y: s, w: W, h: H },
    image: { x: s, y: s, w: W * 0.45, h: H },
    title: { x: s + W * 0.5, y: s + H * 0.25, w: W * 0.45, h: H * 0.25 },
    sub: { x: s + W * 0.5, y: s + H * 0.52, w: W * 0.45, h: H * 0.28 }
  };
}

function zonesVS(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    left:{x:s,y:s,w:W*0.45,h:H},
    right:{x:s+W*0.55,y:s,w:W*0.45,h:H},
    badge:{x:s+W*0.45,y:s+H*0.42,w:W*0.10,h:H*0.16},
    text:{x:s+W*0.15,y:s+H*0.82,w:W*0.7,h:H*0.15}
  };
}


// ======================================================
// SHARED HELPERS (single canonical copy; supports all archetypes)
// ======================================================

function template(canvas, archetypeId, blocks) {
  return {
    canvas,
    archetypeId,
    blocks
  };
}

// Stable 32-bit hash (FNV-1a) — deterministic selection + ids.
function stableHash(s) {
  let h = 2166136261;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

// Scale typography/metrics based on YouTube base width (1280).
function scale(canvas, v) {
  const baseW = 1280;
  const w = (canvas && canvas.w) ? canvas.w : baseW;
  const k = w / baseW;
  return Math.round(v * k);
}

// Round zone geometry to integers (pixel-aligned).
function roundZone(z) {
  if (!z) return z;
  return {
    x: Math.round(z.x || 0),
    y: Math.round(z.y || 0),
    w: Math.round(z.w || 0),
    h: Math.round(z.h || 0)
  };
}
// Some batches call round(), others roundZone().
function round(z) { return roundZone(z); }

// Block builders (some archetypes expect ids; some don't — we include ids safely).
function uid(seed) {
  return `${seed}-${Math.abs(stableHash(seed)).toString(16).slice(0, 6)}`;
}

function image(role, zone, style, z) {
  return { id: uid(role), type: "image", role, zone: roundZone(zone), style: style || {}, z };
}
function text(role, zone, value, style, z) {
  return { id: uid(role), type: "text", role, zone: roundZone(zone), value, style: style || {}, z };
}
function overlay(role, zone, style, z) {
  return { id: uid(role), type: "overlay", role, zone: roundZone(zone), style: style || {}, z };
}
function background(role, zone, style, z) {
  return { id: uid(role), type: "background", role, zone: roundZone(zone), style: style || {}, z };
}
function badge(role, zone, style, z) {
  return { id: uid(role), type: "badge", role, zone: roundZone(zone), style: style || {}, z };
}
function line(role, zone, style, z) {
  return { id: uid(role), type: "line", role, zone: roundZone(zone), style: style || {}, z };
}

// Validation helpers
function requireImage(ctx) {
  if (!ctx || !ctx.imageProvided) throw new Error("Image required");
}
function requireFace(ctx) {
  if (!ctx || !ctx.faceDetected) throw new Error("Face required");
}

function validateOnlyAllowedBlocks(blocks, allowedTypes) {
  for (const b of blocks || []) {
    if (!allowedTypes.includes(b.type)) throw new Error(`Disallowed block type: ${b.type}`);
  }
}

function validateNoOverlap(blocks, textRoles, otherRoles) {
  const byRole = new Map((blocks || []).map(b => [b.role, b]));
  for (const tr of (textRoles || [])) {
    const t = byRole.get(tr);
    if (!t) continue;
    for (const or of (otherRoles || [])) {
      const o = byRole.get(or);
      if (!o) continue;
      if (rectsOverlap(t.zone, o.zone)) throw new Error("Block overlap");
    }
  }
}

function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

// Text normalization helpers used by different batches
function sentenceCase(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// normalize() exists in several batches with a simple "first N words" behavior.
function normalize(t, maxWords) {
  return String(t || "").trim().split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

// normalizeHeadline() supports casing controls used in archetypes 1–6.
function normalizeHeadline(headline, opts) {
  const maxWords = opts?.maxWords ?? 8;
  const casing = opts?.casing ?? "SENTENCE";
  let t = normalize(headline, maxWords);

  if (casing === "UPPER") t = t.toUpperCase();
  else if (casing === "TITLE") t = titleCase(t);
  else if (casing === "SENTENCE") t = sentenceCase(t);

  return t;
}

// Fit text deterministically by shrinking font size until it fits constraints.
// Uses a simple width heuristic (good enough for compile-time layout spec).
function fitTextToZone(textValue, zone, opts) {
  let fontSize = opts.baseFontSize;
  const min = opts.minFontSize;
  const maxLines = opts.maxLines;
  const lineHeight = opts.lineHeight;

  const clean = String(textValue || "").trim();
  if (!clean) return { text: "", fontSize, lineHeight };

  while (fontSize >= min) {
    const lines = estimateLines(clean, zone.w, fontSize, opts.letterSpacing);
    if (lines <= maxLines) return { text: clean, fontSize, lineHeight };
    fontSize = Math.max(min, Math.floor(fontSize * 0.92));
    if (fontSize === min) break;
  }

  const finalLines = estimateLines(clean, zone.w, min, opts.letterSpacing);
  if (finalLines > maxLines) throw new Error("Text cannot fit");
  return { text: clean, fontSize: min, lineHeight };
}

function estimateLines(text, widthPx, fontSizePx, letterSpacing) {
  // Approx average character width:
  // - condensed fonts are narrower, serif slightly wider; we don't know family here,
  //   so we use a stable heuristic and let fitTextToZone shrink if needed.
  const ls = Number.isFinite(letterSpacing) ? letterSpacing : 0;
  const avgCharW = Math.max(1, (fontSizePx * 0.55) + (ls * 0.25));
  const charsPerLine = Math.max(1, Math.floor(widthPx / avgCharW));
  return Math.ceil(text.length / charsPerLine);
}

  return {
    ARCHETYPE_FACTORY_FNS,
    buildAllArchetypes,
    resolveCanvas,
    selectArchetype,
    nextArchetype,
  };
})();

// ---------------------------------------------------------------------------
// Public API for reuse by wrappers (e.g., /api/generate.js thin handler) 
// ---------------------------------------------------------------------------
async function generateTemplates(payload) {
  let body = payload;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  }
  body = body || {};
  const normalized = {
    prompt: body.prompt || '',
    category: body.category || 'Instagram Post',
    style: body.style || 'Dark Premium',
    count: Number.isFinite(Number(body.count)) ? Number(body.count) : 3,
    divergenceIndex: Number.isFinite(Number(body.divergenceIndex)) ? Number(body.divergenceIndex) : 0,
  };
  return makeTemplates(normalized);
}

module.exports = handler;
module.exports.generateTemplates = generateTemplates;
module.exports.default = handler;
