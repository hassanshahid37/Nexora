/**
 * P9.1 — Element Normalization Engine (FULL)
 * Render-safety only. No layout/geometry changes.
 * - Deterministic IDs
 * - Role→Type resolution
 * - Content normalization for layer/content-driven renderers (preview/editor)
 * - Placeholder image support (data URL)
 *
 * FIX (visual-only): Deterministic numeric font size
 * - Converts typography.fontSize: "auto" (or invalid) -> numeric pixel size
 * - Mirrors into legacy `size` / `fontSize` fields so existing renderers never draw tiny text
 * - Uses canvas width + role-based scaling (no geometry/structure/preset changes)
 */

const ROLE_TYPE_MAP = {
  headline: "text",
  subhead: "text",
  body: "text",
  cta: "text",
  badge: "text",
  image: "image",
  hero: "image",
  logo: "image",
  background: "shape"
};

const ALLOWED_TYPES = new Set(["text","image","shape"]);

// Accept common legacy synonyms without changing geometry/structure.
const TYPE_SYNONYMS = {
  bg: "shape",
  background: "shape",
  photo: "image",
  picture: "image",
  img: "image"
};

const DEFAULTS = {
  typography: { fontFamily: "Inter", fontWeight: 400, fontSize: "auto", lineHeight: 1.2 },
  alignment: { horizontal: "center", vertical: "center", textAlign: "center" },
  spacing: { padding: 8, margin: 0 },
  background: { fill: null, radius: 0 },
  visibility: { visible: true, opacity: 1 }
};

function fnv1a32(str){
  let h = 0x811c9dc5;
  const s = String(str ?? "");
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = (h + ((h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24))) >>> 0;
  }
  return h >>> 0;
}

function stableElementId(el, index, seed){
  try{
    const role = String(el && el.role || "");
    const type = String(el && el.type || "");
    const g = [el?.x, el?.y, el?.w, el?.h].map(v => (typeof v === "number" ? v.toFixed(4) : "na")).join(",");
    const base = [seed || "", role, type, String(index ?? 0), g].join("|");
    return "el_" + fnv1a32(base).toString(16);
  }catch(_){
    return "el_" + fnv1a32(String(index ?? 0)).toString(16);
  }
}

function resolveType(el){
  if (el && el.type) {
    const raw = String(el.type).toLowerCase();
    const mapped = TYPE_SYNONYMS[raw] || raw;
    if (ALLOWED_TYPES.has(mapped)) return mapped;
  }
  if (el && el.role) {
    const r = String(el.role).toLowerCase();
    if (ROLE_TYPE_MAP[r]) return ROLE_TYPE_MAP[r];
  }
  return null;
}

function normalizeContent(el, type){
  if (type === "text"){
    const text = (el?.text ?? el?.content ?? "").toString().trim();
    if (!text) return null;
    return { content: text };
  }
  if (type === "image"){
    const src = el?.src || el?.content || el?.image || null;
    if (!src) return { content: "__PLACEHOLDER_IMAGE__" };
    return { content: src };
  }
  if (type === "shape") return { content: null };
  return null;
}

function hasGeometry(el){
  return typeof el?.x==="number" && typeof el?.y==="number" && typeof el?.w==="number" && typeof el?.h==="number";
}

function _canvasWidthFromOpts(opts){
  try{
    const o = (opts && typeof opts === "object") ? opts : {};
    const c = (o && typeof o.canvas === "object") ? o.canvas : null;
    const w = Number(c?.w ?? c?.width ?? 1080);
    return (Number.isFinite(w) && w > 0) ? w : 1080;
  }catch(_){
    return 1080;
  }
}

function _roleKey(role){
  return String(role || "").trim().toLowerCase().replace(/[_\s-]+/g,"");
}

function _computeAutoFontSize(role, canvasW){
  const r = _roleKey(role);
  const W = (Number.isFinite(canvasW) && canvasW > 0) ? canvasW : 1080;
  const scale = W / 1080;

  let px;
  if (r.includes("headline")) px = 86;
  else if (r.includes("subhead") || r.includes("subtitle")) px = 54;
  else if (r.includes("cta") || r.includes("button")) px = 40;
  else if (r.includes("badge") || r.includes("kicker") || r.includes("tag")) px = 34;
  else if (r.includes("body") || r.includes("desc") || r.includes("support")) px = 30;
  else px = 32;

  px = Math.round(px * scale);

  if (r.includes("headline")) return Math.max(28, Math.min(140, px));
  if (r.includes("subhead") || r.includes("subtitle")) return Math.max(18, Math.min(90, px));
  if (r.includes("cta") || r.includes("button")) return Math.max(16, Math.min(72, px));
  if (r.includes("badge") || r.includes("kicker") || r.includes("tag")) return Math.max(14, Math.min(60, px));
  if (r.includes("body") || r.includes("desc") || r.includes("support")) return Math.max(12, Math.min(54, px));
  return Math.max(12, Math.min(60, px));
}

function _pickExistingTextSize(el){
  const candidates = [el?.size, el?.fontSize, el?.typography?.fontSize, el?.style?.fontSize];
  for (const v of candidates){
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function normalizeElement(el, index, seed, opts){
  if (!el || !hasGeometry(el)) return null;
  const type = resolveType(el);
  if (!type) return null;
  const c = normalizeContent(el, type);
  if (!c) return null;

  // Role canonicalization (render-safety). Keeps old generators compatible.
  const roleRaw = (el && el.role != null) ? String(el.role) : null;
  const roleCanon = roleRaw && roleRaw.toLowerCase() === "hero" ? "image" : roleRaw;

  const typography = Object.assign({}, DEFAULTS.typography, el.typography || {});
  const alignment = Object.assign({}, DEFAULTS.alignment, el.alignment || {});
  const spacing = Object.assign({}, DEFAULTS.spacing, el.spacing || {});
  const background = Object.assign({}, DEFAULTS.background, el.background || {});
  const visibility = Object.assign({}, DEFAULTS.visibility, el.visibility || {});

  // Legacy fields (kept non-breaking)
  let size = (el && el.size != null) ? el.size : (el && el.fontSize != null ? el.fontSize : undefined);
  let fontSize = (el && el.fontSize != null) ? el.fontSize : undefined;

  // Legacy lineHeight fields (renderer expects pixels in some paths)
  let lineHeight = undefined;
  let lineHeightPx = undefined;

  // Visual-only fix for text sizing
  if (type === "text") {
    const canvasW = _canvasWidthFromOpts(opts);
    const existing = _pickExistingTextSize(el);
    const resolved = (existing != null) ? existing : _computeAutoFontSize(roleCanon || "text", canvasW);

    const tfs = Number(typography.fontSize);
    typography.fontSize = (Number.isFinite(tfs) && tfs > 0) ? tfs : resolved;

    const s = Number(size);
    size = (Number.isFinite(s) && s > 0) ? s : resolved;

    const fs = Number(fontSize);
    fontSize = (Number.isFinite(fs) && fs > 0) ? fs : size;
  }

// Line-height normalization for legacy canvas renderers (visual-only):
// Some render paths treat `el.lineHeight` as pixels (not a multiplier). If we pass 1.1–1.4 here,
// lines overlap in previews. Compute a safe pixel lineHeight and expose it via legacy `lineHeight`.
const lhRaw = (el && el.lineHeight != null) ? el.lineHeight : (typography && typography.lineHeight != null ? typography.lineHeight : undefined);
const lhNum = Number(lhRaw);
if (Number.isFinite(lhNum) && lhNum > 0) {
  lineHeightPx = (lhNum <= 4) ? Math.round(typography.fontSize * lhNum) : Math.round(lhNum);
} else {
  lineHeightPx = Math.round(typography.fontSize * 1.2);
}
typography.lineHeightPx = lineHeightPx;
lineHeight = lineHeightPx;

  // Role canonicalization (render-safety). Keeps old generators compatible.
  const roleRaw2 = (el && el.role != null) ? String(el.role) : null;
  const roleCanon2 = roleRaw2 && roleRaw2.toLowerCase() === "hero" ? "image" : roleRaw2;

  return {
    id: String(el.id || stableElementId({ ...el, type }, index, seed)),
    type,
    role: roleCanon2 || null,
    content: c.content,
    geometry: { x: el.x, y: el.y, w: el.w, h: el.h },

    // Legacy field retention (NON-BREAKING): keep the original preview/editor renderers working.
    x: el.x, y: el.y, w: el.w, h: el.h,

    // Common text/image/style fields used by existing renderers (index.html drawThumb, TemplateOutputController, editor).
    text: (el && el.text != null) ? el.text : (type === "text" ? c.content : undefined),
    title: (el && el.title != null) ? el.title : (type === "text" ? c.content : undefined),
    subtitle: el && el.subtitle != null ? el.subtitle : undefined,
    sub: el && el.sub != null ? el.sub : undefined,

    fill: el && el.fill != null ? el.fill : undefined,
    bg: el && el.bg != null ? el.bg : undefined,
    color: el && el.color != null ? el.color : undefined,
    stroke: el && el.stroke != null ? el.stroke : undefined,
    strokeW: el && el.strokeW != null ? el.strokeW : undefined,
    shadow: el && el.shadow != null ? el.shadow : undefined,
    opacity: el && el.opacity != null ? el.opacity : undefined,
    radius: el && el.radius != null ? el.radius : (el && el.r != null ? el.r : undefined),
    r: el && el.r != null ? el.r : undefined,

    size,
    fontSize,
    weight: (el && el.weight != null) ? el.weight : (el && el.fontWeight != null ? el.fontWeight : undefined),
    font: (el && el.font != null) ? el.font : (el && el.fontFamily != null ? el.fontFamily : undefined),
    fontFamily: el && el.fontFamily != null ? el.fontFamily : undefined,
    align: el && el.align != null ? el.align : undefined,
    textAlign: el && el.textAlign != null ? el.textAlign : undefined,
    letterSpacing: el && el.letterSpacing != null ? el.letterSpacing : undefined,
    lineHeight: (typeof lineHeight === "number" ? lineHeight : (el && el.lineHeight != null ? el.lineHeight : undefined)),
    uppercase: el && el.uppercase === true ? true : undefined,

    src: el && el.src != null ? el.src : undefined,
    url: el && el.url != null ? el.url : undefined,
    fit: el && el.fit != null ? el.fit : undefined,
    objectFit: el && el.objectFit != null ? el.objectFit : undefined,

    typography,
    alignment,
    spacing,
    background,
    visibility
  };
}

function normalizeElements(elements, opts){
  const o = (opts && typeof opts === "object") ? opts : {};
  const seed = String(o.seed || o.templateId || "");
  const out = [];
  let i = 0;
  for (const el of (elements||[])){
    const n = normalizeElement(el, i, seed, o);
    if (n) out.push(n);
    else console.warn("[P9.1] Dropped invalid element:", el);
    i++;
  }
  return out;
}

// Content normalization for layer/content-driven renderers.
function normalizeContentForPreview(content, layers, opts){
  try{
    const c0 = (content && typeof content === "object") ? content : {};
    const c = Object.assign({}, c0);

    const layerArr = Array.isArray(layers) ? layers : [];
    const roles = new Set(layerArr.map(l => String(l && l.role || "")));

    const prefer = (opts && typeof opts === "object") ? opts : {};
    const title = String(prefer.title || prefer.headline || "Your Headline").trim();
    const sub = String(prefer.subhead || "Supporting text goes here").trim();
    const body = String(prefer.body || "A short description that fits the layout.").trim();
    const cta = String(prefer.cta || "Learn More").trim();
    const badge = String(prefer.badge || "NEW").trim();

    if (roles.has("headline")) {
      const v = String(c.headline || c.title || "").trim();
      c.headline = v || title;
    }
    if (roles.has("subhead")) {
      const v = String(c.subhead || c.subtitle || "").trim();
      c.subhead = v || sub;
    }
    if (roles.has("body")) {
      const v = String(c.body || c.description || "").trim();
      c.body = v || body;
    }
    if (roles.has("cta")) {
      const v = String(c.cta || c.button || "").trim();
      c.cta = v || cta;
    }
    if (roles.has("badge")) {
      const v = String(c.badge || c.tag || "").trim();
      c.badge = v || badge;
    }

    const img = c.imageSrc || c.image || c.src || c.photo || c.thumbnail || c.imageUrl || null;
    if (roles.has("image")) {
      c.imageSrc = (typeof img === "string" && img.trim()) ? img.trim() : "__PLACEHOLDER_IMAGE__";
    }

    const logo = c.logoSrc || c.logo || null;
    if (roles.has("logo")) {
      c.logoSrc = (typeof logo === "string" && logo.trim()) ? logo.trim() : "__PLACEHOLDER_IMAGE__";
    }

    return c;
  }catch(_){
    return (content && typeof content === "object") ? content : {};
  }
}

// Deterministic placeholder image (inline SVG data URL)
function placeholderDataUrl(label){
  try{
    const safe = String(label || "IMAGE").toUpperCase().slice(0, 10).replace(/[^A-Z0-9 ]/g, "");
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#2b2b2b"/><stop offset="1" stop-color="#111"/>' +
      '</linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
      'font-family="Inter,Arial" font-size="64" fill="#ffffff" opacity="0.55" letter-spacing="10">' +
      safe +
      '</text></svg>';
    const enc = encodeURIComponent(svg).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
    return "data:image/svg+xml;charset=utf-8," + enc;
  }catch(_){
    return null;
  }
}

const API = {
  normalizeElements,
  normalizeContentForPreview,
  placeholderDataUrl,
  stableElementId,
  ROLE_TYPE_MAP,
  DEFAULTS
};

try{ if(typeof module!=="undefined" && module.exports){ module.exports = API; } }catch(_){ }
try{ if(typeof window!=="undefined"){ window.NexoraElementNormalizer = API; } }catch(_){ }
