
/**
 * P9.1 — 
 * Render-safety only. No layout/geometry changes.
 */
const ROLE_TYPE_MAP = {
  headline: "text",
  subhead: "text",
  body: "text",
  cta: "text",
  image: "image",
  logo: "image",
  background: "shape"
};

const DEFAULTS = {
  typography: { fontFamily: "Inter", fontWeight: 400, fontSize: "auto", lineHeight: 1.2 },
  alignment: { horizontal: "center", vertical: "center", textAlign: "center" },
  spacing: { padding: 8, margin: 0 },
  background: { fill: null, radius: 0 },
  visibility: { visible: true, opacity: 1 }
};

function resolveType(el){
  if (el.type) return el.type;
  if (el.role && ROLE_TYPE_MAP[el.role]) return ROLE_TYPE_MAP[el.role];
  return null;
}

function normalizeContent(el, type){
  if (type === "text"){
    const text = (el.text ?? el.content ?? "").toString().trim();
    if (!text) return null;
    return { content: text };
  }
  if (type === "image"){
    const src = el.src || el.content || el.image || null;
    if (!src) return { content: "__PLACEHOLDER_IMAGE__" };
    return { content: src };
  }
  if (type === "shape") return { content: null };
  return null;
}

function hasGeometry(el){
  return typeof el.x==="number" && typeof el.y==="number" && typeof el.w==="number" && typeof el.h==="number";
}

function normalizeElement(el){
  if (!el || !hasGeometry(el)) return null;
  const type = resolveType(el);
  if (!type) return null;
  const c = normalizeContent(el, type);
  if (!c) return null;
  return {
    id: el.id || `${type}_${Math.random().toString(36).slice(2,9)}`,
    type,
    role: el.role || null,
    content: c.content,
    geometry: { x: el.x, y: el.y, w: el.w, h: el.h },
    typography: Object.assign({}, DEFAULTS.typography, el.typography || {}),
    alignment: Object.assign({}, DEFAULTS.alignment, el.alignment || {}),
    spacing: Object.assign({}, DEFAULTS.spacing, el.spacing || {}),
    background: Object.assign({}, DEFAULTS.background, el.background || {}),
    visibility: Object.assign({}, DEFAULTS.visibility, el.visibility || {})
  };
}

function normalizeElements(elements){
  const out = [];
  for (const el of (elements||[])){
    const n = normalizeElement(el);
    if (n) out.push(n);
    else console.warn("[P9.1] Dropped invalid element:", el);
  }
  return out;
}


function normalizeContentForPreview(content, layers){
  try{
    const c = Object.assign({}, content || {});
    const roles = new Set((layers||[]).map(l => String(l && l.role || "")));
    // Ensure text fields exist if roles present
    if(roles.has("headline") && !String(c.headline||"").trim()) c.headline = "Your Headline";
    if(roles.has("subhead") && !String(c.subhead||"").trim()) c.subhead = "Supporting text goes here";
    if(roles.has("cta") && !String(c.cta||"").trim()) c.cta = "Learn more";
    if(roles.has("badge") && !String(c.badge||"").trim()) c.badge = "NEW";
    // Image: allow any of these keys; create placeholder token if missing
    const img = c.imageSrc || c.image || c.src || c.photo || null;
    if(roles.has("image") && !img) c.imageSrc = "__PLACEHOLDER_IMAGE__";
    else if(img) c.imageSrc = img;
    return c;
  }catch(_){
    return content || {};
  }
}


// UMD
try{ if(typeof module!=="undefined" && module.exports){ module.exports={ normalizeElements, normalizeContentForPreview }; } }catch(_){}
try{ if(typeof window!=="undefined"){ window.NexoraElementNormalizer={ normalizeElements, normalizeContentForPreview }; } }catch(_){}
