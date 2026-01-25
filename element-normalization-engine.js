/**
 * P9.1 — Element Normalization Engine (FULL)
 * Render-safety only. No layout/geometry changes.
 * - Deterministic IDs
 * - Role→Type resolution
 * - Content normalization for layer/content-driven renderers (preview/editor)
 * - Placeholder image support (data URL)
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

function normalizeElement(el, index, seed){
  if (!el) return null;
  const geomMissing = !hasGeometry(el);
  const type = resolveType(el);
  if (!type) return null;
  const c = normalizeContent(el, type);
  if (!c) return null;

  // Role canonicalization (render-safety). Keeps old generators compatible.
  const roleRaw = (el && el.role != null) ? String(el.role) : null;
  const roleCanon = roleRaw && roleRaw.toLowerCase() === "hero" ? "image" : roleRaw;

  return {
    id: String(el.id || stableElementId({ ...el, type }, index, seed)),
    type,
    role: roleCanon || null,
    content: c.content,
    geometry: { x: geomMissing ? 0 : el.x, y: geomMissing ? 0 : el.y, w: geomMissing ? 1 : el.w, h: geomMissing ? 1 : el.h },
    needsGeometry: geomMissing ? true : undefined,

    // Legacy field retention (NON-BREAKING): keep the original preview/editor renderers working.
    // P9.1 is render-safety only; we mirror essential legacy fields without changing geometry.
    x: geomMissing ? 0 : el.x, y: geomMissing ? 0 : el.y, w: geomMissing ? 1 : el.w, h: geomMissing ? 1 : el.h,

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

    size: (el && el.size != null) ? el.size : (el && el.fontSize != null ? el.fontSize : undefined),
    weight: (el && el.weight != null) ? el.weight : (el && el.fontWeight != null ? el.fontWeight : undefined),
    font: (el && el.font != null) ? el.font : (el && el.fontFamily != null ? el.fontFamily : undefined),
    fontFamily: el && el.fontFamily != null ? el.fontFamily : undefined,
    align: el && el.align != null ? el.align : undefined,
    textAlign: el && el.textAlign != null ? el.textAlign : undefined,
    letterSpacing: el && el.letterSpacing != null ? el.letterSpacing : undefined,
    lineHeight: el && el.lineHeight != null ? el.lineHeight : undefined,
    uppercase: el && el.uppercase === true ? true : undefined,

    src: el && el.src != null ? el.src : undefined,
    url: el && el.url != null ? el.url : undefined,
    fit: el && el.fit != null ? el.fit : undefined,
    objectFit: el && el.objectFit != null ? el.objectFit : undefined,

    typography: Object.assign({}, DEFAULTS.typography, el.typography || {}),
    alignment: Object.assign({}, DEFAULTS.alignment, el.alignment || {}),
    spacing: Object.assign({}, DEFAULTS.spacing, el.spacing || {}),
    background: Object.assign({}, DEFAULTS.background, el.background || {}),
    visibility: Object.assign({}, DEFAULTS.visibility, el.visibility || {})
  };
}

function normalizeElements(elements, opts){
  const o = (opts && typeof opts === "object") ? opts : {};
  const seed = String(o.seed || o.templateId || "");
  const out = [];
  let i = 0;
  for (const el of (elements||[])){
    const n = normalizeElement(el, i, seed);
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



// Instead, mark them so template-materializer can assign deterministic geometry.
function markMissingGeometry(elements){
  if(!Array.isArray(elements)) return elements;
  return elements.map(el=>{
    if(!el || typeof el!=="object") return el;
    const hasBox = Number.isFinite(el.x)&&Number.isFinite(el.y)&&Number.isFinite(el.w)&&Number.isFinite(el.h);
    if(!hasBox){
      el.needsGeometry = true;
    }
    return el;
  });
}
