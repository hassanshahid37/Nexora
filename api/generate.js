
// api/generate.js
// Nexora / Templify – Serverless API: /api/generate
// Purpose: ALWAYS return REAL templates (canvas + elements) compatible with index.html preview.
// Notes:
// - CommonJS handler for Vercel/Netlify-style /api directory.
// - Deterministic (no external AI calls), never throws: always 200 JSON.

module.exports = async function handler(req, res) {
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

    const templates = makeTemplates({ prompt, category, style, count, divergenceIndex });
    return res.end(JSON.stringify({ success: true, templates }));
  } catch (err) {
    // Hard-safe: NEVER return 500
    try {
      const templates = makeTemplates({
        prompt: "",
        category: "Instagram Post",
        style: "Dark Premium",
        count: 4,
        divergenceIndex: -1,
      });
      return res.end(
        JSON.stringify({
          success: true,
          templates,
          error: String(err && err.message ? err.message : err),
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
  Poster: { w: 1414, h: 2000 },
};

const PALETTES = [
  {
    name: "Cobalt Night",
    bg: "#0b1020",
    bg2: "#0a2a5a",
    ink: "#f7f9ff",
    muted: "#b9c3d6",
    accent: "#2f7bff",
    accent2: "#9b5cff",
  },
  {
    name: "Emerald Studio",
    bg: "#071613",
    bg2: "#0b3a2b",
    ink: "#f4fffb",
    muted: "#b9d7cc",
    accent: "#2dd4bf",
    accent2: "#84cc16",
  },
  {
    name: "Sunset Premium",
    bg: "#140a12",
    bg2: "#3b0f2b",
    ink: "#fff6fb",
    muted: "#f3cfe0",
    accent: "#fb7185",
    accent2: "#f59e0b",
  },
  {
    name: "Mono Luxe",
    bg: "#0b0c10",
    bg2: "#1a1d29",
    ink: "#f6f7fb",
    muted: "#b4bbcb",
    accent: "#e5e7eb",
    accent2: "#60a5fa",
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
    CTA: ["Get Started", "Join Now", "Try Now", "Sign Up"],
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
      stroke: "rgba(255,255,255,0.14)",
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
      tweight: 800,
    });

    add({
      type: "photo",
      src: smartPhotoSrc(seed + 11, pal, brand),
      x: Math.round(w * 0.585),
      y: Math.round(h * 0.16),
      w: Math.round(w * 0.32),
      h: Math.round(h * 0.40),
      r: 36,
      stroke: "rgba(255,255,255,0.18)",
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
      stroke: "rgba(255,255,255,0.14)",
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
      tweight: 900,
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
      stroke: "rgba(255,255,255,0.14)",
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
      tweight: 900,
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
      tweight: 800,
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
      tweight: 900,
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
      stroke: "rgba(255,255,255,0.12)",
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
      tweight: 900,
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
    seed: baseSeed,
  });

  return {
    canvas: { w: size.w, h: size.h },
    elements,
    _layout: layout,
    _palette: pal,
    _seed: baseSeed,
  };
}

function makeTemplates({ prompt, category, style, count, divergenceIndex }) {
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
      cta,
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
      height: Math.round(Number(composed && composed.canvas ? composed.canvas.h : 0)),
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
      createdAt: Date.now(),
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
      _seed: composed._seed,
    });
  }
  return templates;
}
