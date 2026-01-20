
/* P7→P8 wiring: resolve layout family via selector */
function resolveLayoutFamily(input){
  try{
    if(typeof require==="function"){
      const sel = require("./layout-family-selector.js");
      if(sel && typeof sel.selectLayoutFamily==="function"){
        return sel.selectLayoutFamily(input);
      }
    }
    if(typeof window!=="undefined" && typeof window.selectLayoutFamily==="function"){
      return window.selectLayoutFamily(input);
    }
  }catch(_){}
  return null;
}

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




// Layout Family selector is optional at runtime (P7).
// Loaded lazily so this CommonJS handler never crashes if the file is missing.
let __selectLayoutFamily = null;
let __selectLayoutFamilyTried = false;
function getSelectLayoutFamily(){
  try{
    if (typeof __selectLayoutFamily === "function") return __selectLayoutFamily;
    if (__selectLayoutFamilyTried) return null;
    __selectLayoutFamilyTried = true;

    try{
      // Vercel serverless: /api/generate.js -> ../layout-family-selector.js
      // eslint-disable-next-line global-require
      const mod = require("../layout-family-selector.js");
      __selectLayoutFamily = (mod && typeof mod.selectLayoutFamily === "function") ? mod.selectLayoutFamily : null;
      if (typeof __selectLayoutFamily === "function") return __selectLayoutFamily;
    }catch(_){ }

    try{
      // Local/dev alt path
      // eslint-disable-next-line global-require
      const mod = require("./layout-family-selector.js");
      __selectLayoutFamily = (mod && typeof mod.selectLayoutFamily === "function") ? mod.selectLayoutFamily : null;
      if (typeof __selectLayoutFamily === "function") return __selectLayoutFamily;
    }catch(_){ }

    return null;
  }catch(_){
    return null;
  }
}
// CategorySpecV1 normalizer is optional at runtime.
// We load it lazily so this CommonJS handler never crashes if the file is missing.
let __normalizeCategory = null;
let __normalizeCategoryTried = false;
async function getNormalizeCategory() {
  try {
    if (typeof __normalizeCategory === "function") return __normalizeCategory;
    if (__normalizeCategoryTried) return null;
    __normalizeCategoryTried = true;

    // Prefer CommonJS require when available (fast, works with UMD build)
    try {
      // eslint-disable-next-line global-require
      const mod = require("../category-spec-v1.js");
      __normalizeCategory = (mod && typeof mod.normalizeCategory === "function") ? mod.normalizeCategory : null;
      if (typeof __normalizeCategory === "function") return __normalizeCategory;
    } catch (_) {}

    try {
      // eslint-disable-next-line global-require
      const mod = require("./category-spec-v1.js");
      __normalizeCategory = (mod && typeof mod.normalizeCategory === "function") ? mod.normalizeCategory : null;
      if (typeof __normalizeCategory === "function") return __normalizeCategory;
    } catch (_) {}

    // Fallback: dynamic import (handles ESM if repo is configured as modules)
    try {
      const mod = await import("../category-spec-v1.js");
      __normalizeCategory = (mod && typeof mod.normalizeCategory === "function") ? mod.normalizeCategory : null;
      if (typeof __normalizeCategory === "function") return __normalizeCategory;
    } catch (_) {}
    try {
      const mod = await import("./category-spec-v1.js");
      __normalizeCategory = (mod && typeof mod.normalizeCategory === "function") ? mod.normalizeCategory : null;
      if (typeof __normalizeCategory === "function") return __normalizeCategory;
    } catch (_) {}

    return null;
  } catch (_) {
    return null;
  }
}

// Purpose: ALWAYS return REAL templates (canvas + elements) compatible with index.html preview.
// Notes:
// - CommonJS handler for Vercel/Netlify-style /api directory.
// - Deterministic (no external AI calls), never throws: always 200 JSON.

async function handler(req, res) {
  let count = 1; // default if missing/invalid; UI should pass 1–200
  try {
    // Basic CORS / preflight safety
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") return res.end();
    if (req.method !== "POST") return res.end(JSON.stringify({ success: true, templates: [] }));

    // Parse body safely (Vercel/Node may not populate req.body)
    let body = {};
    try {
      if (req.body && typeof req.body === "object") {
        body = req.body;
      } else if (typeof req.body === "string" && req.body.trim().length) {
        body = JSON.parse(req.body);
      } else {
        const chunks = [];
        await new Promise((resolve) => {
          req.on("data", (c) => chunks.push(c));
          req.on("end", resolve);
          req.on("error", resolve);
        });
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        body = raw ? JSON.parse(raw) : {};
      }
    } catch {
      body = {};
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const rawCategory = typeof body.category === "string" ? body.category : "Instagram Post";
let category = rawCategory;

// P5.1: normalize category through CategorySpecV1 when available (label stays backwards-compatible)
try {
  const norm = await getNormalizeCategory();
  if (typeof norm === "function") {
    __normalizeCategory = norm;
    const spec = norm(rawCategory);
    if (spec && typeof spec.label === "string" && spec.label.trim()) category = spec.label.trim();
  }
} catch (_) {
  // leave raw category
}
    const style = typeof body.style === "string" ? body.style : "Dark Premium";

    // Count (authoritative; 1–200)
    {
      const raw = body && (body.count ?? body.c);
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) count = parsed;
      // If invalid/missing, keep default count (1).
      count = Math.max(1, Math.min(200, count));
    }
// Accept divergence/fork metadata but NEVER require it
    const divergenceIndexRaw = body.divergenceIndex ?? body.forkIndex ?? body.variantIndex ?? body.i;
    let divergenceIndex = Number(divergenceIndexRaw);
    if (!Number.isFinite(divergenceIndex)) divergenceIndex = -1;

    
    const variationCount = count;
    const baseCount = 1;
    const templates = makeTemplates({ prompt, category, style, count: baseCount, divergenceIndex });

    const withContracts = templates.map((t, i) => {
      let size = { w: 1080, h: 1080 };
try{
  if(typeof __normalizeCategory === "function"){
    const spec = __normalizeCategory(category);
    if(spec && spec.canvas && spec.canvas.w && spec.canvas.h){
      size = { w: spec.canvas.w, h: spec.canvas.h };
    }
  }
}catch(_){}
size = size || CATEGORIES[category] || { w:1080, h:1080 };
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
            let contract = (t && t.contract) ? t.contract : buildContractV1(String(t?.id || ('tpl_'+String(i+1))), category, { w: size.w, h: size.h }, (t.elements||[]));
      // P5.2: Template Shape Normalization (category-safe layers)
      try{
        if(typeof __normalizeCategory === "function"){
          const spec = __normalizeCategory(category);
          if(spec) contract = normalizeContractToSpec(contract, spec);
        }
      }catch(_){}
      return Object.assign({}, t, { contract, content });
    });
    
// ---- P8 Phase-2: Real structural templates (P7-authoritative family) ----
const expanded = [];
const base = withContracts[0] || null;
if (!base) return res.end(JSON.stringify({ success: true, templates: [] }));

// Resolve layout family via P7 selector (mechanical wiring)
// IMPORTANT: this file typically runs as /api/generate.js on Vercel.
// So we must resolve selector paths robustly (../ + ./) and NEVER crash.
let familyId = null;
try{
  const selFn = getSelectLayoutFamily();
  if (typeof selFn === "function") {
    familyId = selFn({ category, prompt });
  }
  if(!familyId && typeof globalThis !== "undefined" && typeof globalThis.selectLayoutFamily === "function"){
    familyId = globalThis.selectLayoutFamily({ category, prompt });
  }
}catch(_){}

// Load P8 factory (pure logic)
let factory = null;
try{
  if(typeof require === "function"){
    // Vercel: /api/generate.js -> ../template-structure-factory.js
    try{ factory = require("../template-structure-factory.js"); }catch(_){ }
    // Local/dev: same folder
    if(!factory){ try{ factory = require("./template-structure-factory.js"); }catch(_){ } }
  }
  if(!factory && typeof globalThis !== "undefined") factory = globalThis.NexoraTemplateFactory;
}catch(_){}

// Helper: filter elements[] to match contract roles (non-destructive, safe fallback)
function applyContractToElements(template, contract){
  try{
    if(!template || !contract || !Array.isArray(template.elements) || !Array.isArray(contract.layers)) return template;

    const els = template.elements.map(e => Object.assign({}, e));
    const keep = [];
    let textIdx = 0;

    function takeText(){
      const texts = els.filter(e => e && e.type === "text");
      const t = texts[textIdx] || null;
      textIdx++;
      return t;
    }

    for(const layer of contract.layers){
      const role = String(layer && layer.role || "");
      if(role === "background"){
        const bg = els.find(e => e && e.type === "bg") || null;
        if(bg) keep.push(bg);
      } else if(role === "image"){
        const ph = els.find(e => e && e.type === "photo") || null;
        if(ph) keep.push(ph);
      } else if(role === "cta"){
        const cta = els.find(e => e && (e.type === "pill" || e.type === "chip")) || null;
        if(cta) keep.push(cta);
      } else if(role === "badge"){
        const badge = els.find(e => e && (e.type === "badge" || e.type === "chip")) || null;
        if(badge) keep.push(badge);
      } else if(role === "headline" || role === "subhead" || role === "body"){
        const t = takeText();
        if(t) keep.push(t);
      } else {
        // Unknown role: ignore safely
      }
    }

    // If contract filtering would empty template, keep original elements
    template.elements = keep.length ? keep : template.elements;
    return template;
  }catch(_){
    return template;
  }
}

for (let i = 0; i < variationCount; i++) {
  const p = VARIATION_PROFILES[i % VARIATION_PROFILES.length];

  // Start from base template, then inject a structurally different contract
  let t = JSON.parse(JSON.stringify(base));

  // Build a new contract using P7 familyId as authority
  try{
    if(factory && typeof factory.createTemplateContract === "function"){
      const baseContract = (t && t.contract) ? t.contract : null;
      const c = factory.createTemplateContract(baseContract || {}, i, { familyId });
      t.contract = c;
      // Align ids with contract
      t.id = c.templateId;
      t.templateId = c.templateId;
      // Apply contract roles to element selection
      t = applyContractToElements(t, c);
    }
  }catch(_){}

  // Then apply P6 variation routing / density adjustments
  expanded.push(applyVariation(t, p, i));
}
return res.end(JSON.stringify({ success: true, templates: expanded }));
} catch (err) {
    // Hard-safe: NEVER return 500
    try {
      const templates = makeTemplates({
        prompt: "",
        category: "Instagram Post",
        style: "Dark Premium",
        count: Number.isFinite(count) ? count : 1,
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
   AUTO_VARIATION_P6 (Additive)
   - Deterministic variations within SAME template shape
   - No layout / role / canvas changes
=========================== */

const VARIATION_PROFILES = [
  { id: "HEADLINE_FOCUS", weight: { headline: 1.0, image: 0.3, badge: 0.6 }, density: "tight" },
  { id: "IMAGE_FOCUS",    weight: { headline: 0.4, image: 1.0, badge: 0.5 }, density: "tight" },
  { id: "BALANCED",       weight: { headline: 0.8, image: 0.8, badge: 0.5 }, density: "normal" },
  { id: "MINIMAL",        weight: { headline: 0.7, image: 0.0, badge: 0.0 }, density: "short" },
  { id: "URGENT",         weight: { headline: 0.9, image: 0.6, badge: 1.0 }, density: "punch" }
];

function applyVariation(base, profile, idx){
  try{
    const t = JSON.parse(JSON.stringify(base || {}));

    // Unique ids to avoid UI/editor collisions
    const baseId = String((t && (t.id || t.templateId)) || "tpl");
    const vid = `__v${idx+1}_${String(profile && profile.id || "VAR")}`;
    t.id = baseId + vid;
    t.templateId = t.id;

    // Meta for debugging
    t.meta = t.meta || {};
    t.meta.variationId = String(profile && profile.id || "VAR");
    t.meta.variationIndex = idx;

    // Content density adjustments (NO role changes)
    const headline = (t.content && t.content.headline) ? String(t.content.headline) : "";
    const subhead  = (t.content && t.content.subhead) ? String(t.content.subhead) : "";
    let newHeadline = headline;
    let newSubhead  = subhead;

    const words = headline.split(/\s+/).filter(Boolean);

    if(profile && profile.id === "MINIMAL"){
      newHeadline = words.slice(0, 4).join(" ");
      newSubhead = "";
    } else if(profile && profile.id === "URGENT"){
      newHeadline = (words.slice(0, 2).join(" ").toUpperCase()) || headline.toUpperCase();
      newSubhead = (subhead ? subhead : "DON'T MISS").toUpperCase();
    } else if(profile && profile.id === "IMAGE_FOCUS"){
      newHeadline = words.slice(0, 5).join(" ");
    } else if(profile && profile.id === "HEADLINE_FOCUS"){
      newHeadline = (headline ? headline : "NEW").toUpperCase();
    } else {
      newHeadline = words.slice(0, 7).join(" ") || headline;
    }

    t.content = t.content || {};
    t.content.headline = newHeadline;
    t.content.subhead = newSubhead;

    // Apply visible text into elements[] (so previews actually change)
    if(Array.isArray(t.elements)){
      let textSeen = 0;
      for(const el of t.elements){
        if(el && el.type === "text"){
          if(textSeen === 0) el.text = newHeadline;
          else if(textSeen === 1) el.text = newSubhead;
          textSeen++;
        }
      }
    }

    // Keep contract aligned with id
    if(t.contract && typeof t.contract === "object"){
      t.contract.templateId = t.id;
      t.contract.meta = t.contract.meta || {};
      t.contract.meta.variationId = t.meta.variationId;
      t.contract.meta.variationIndex = t.meta.variationIndex;
    }

    // Emphasis flags (safe to ignore)
    t.emphasis = {
      headline: profile && profile.weight ? profile.weight.headline : 0.8,
      image: profile && profile.weight ? profile.weight.image : 0.8,
      badge: profile && profile.weight ? profile.weight.badge : 0.5
    };

    return t;
  }catch(_){
    return base;
  }
}


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

  // P5.1: normalize category label via CategorySpecV1 when available
  try {
    const norm = await getNormalizeCategory();
    if (typeof norm === "function") {
      const spec = norm(normalized.category);
      if (spec && typeof spec.label === "string" && spec.label.trim()) normalized.category = spec.label.trim();
    }
  } catch (_) {}

  return makeTemplates(normalized);
}

module.exports = handler;
module.exports.generateTemplates = generateTemplates;
module.exports.default = handler;

// --- GENERATION OUTPUT ---


/* P8: Real Template Generation (additive) */
try{
  const factory = (typeof require==="function")
    ? require("./template-structure-factory.js")
    : window.NexoraTemplateFactory;

  if(factory && typeof factory.createTemplateContract==="function"){
    const baseContract = output?.contract;
    const resolvedFamily = resolveLayoutFamily({ category: baseContract?.category, prompt: input?.prompt || "" });
    if(baseContract && resolvedFamily){ baseContract.layoutFamily = resolvedFamily; }
    const count = Number(input?.count||1);
    if(baseContract && count>1){
      const templates = [];
      for(let i=0;i<count;i++){
        templates.push(factory.createTemplateContract(baseContract,i));
      }
      output.templates = templates;
    }
  }
}catch(_){}


/**
 * Optional Archetype Path (externalized)
 * - Archetypes live in archetypes_1-20_compiled.js
 * - Runtime wrapper lives in archetype-engine.js
 * This file must remain orchestration-only.
 */
function tryCompileArchetypeTemplate(opts){
  try{
    if(typeof require==="function"){
      const eng = require("./archetype-engine.js");
      if(eng && typeof eng.compileArchetypeTemplate==="function"){
        return eng.compileArchetypeTemplate(opts);
      }
    }
  }catch(e){ /* hard-safe */ }
  return null;
}

