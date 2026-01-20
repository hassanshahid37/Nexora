(function(){
  "use strict";

  // Nexora Archetype Engine (CJS + Browser safe)
  // - Loads archetypes_1-20_compiled.js which MUST be UMD/CJS compatible.
  // - Never throws: if archetype library is missing/misconfigured, functions return null/[]

  let _cache = null;

  function _loadLib(){
    if(_cache) return _cache;
    try{
      // Prefer CommonJS require (Vercel/server)
      if(typeof require === "function"){
        // eslint-disable-next-line global-require
        const lib = require("./archetypes_1-20_compiled.js");
        const buildAll = lib && lib.buildAllArchetypes;
        const select = lib && lib.selectArchetype;
        const resolveCanvas = lib && lib.resolveCanvas;
        if(typeof buildAll !== "function" || typeof select !== "function" || typeof resolveCanvas !== "function"){
          throw new Error("Invalid archetype lib exports (expected buildAllArchetypes/selectArchetype/resolveCanvas)");
        }
        const ALL = buildAll();
        _cache = { ALL, select, resolveCanvas };
        return _cache;
      }
    }catch(e){
      try{ console.warn("[Nexora] Archetype engine disabled:", e && e.message ? e.message : e); }catch(_){}
      _cache = null;
      return null;
    }

    // Browser fallback: window global (if script tag loaded)
    try{
      if(typeof window !== "undefined"){
        const lib = window.NexoraArchetypesLib || window.NexoraArchetypes;
        if(lib && typeof lib.buildAllArchetypes === "function" && typeof lib.selectArchetype === "function" && typeof lib.resolveCanvas === "function"){
          const ALL = lib.buildAllArchetypes();
          _cache = { ALL, select: lib.selectArchetype, resolveCanvas: lib.resolveCanvas };
          return _cache;
        }
      }
    }catch(_){ }

    _cache = null;
    return null;
  }

  function compileArchetype(input){
    try{
      const L = _loadLib();
      if(!L) return null;
      const archetypeId = input && input.archetypeId;
      const canvas = (input && input.canvas) ? input.canvas : L.resolveCanvas("youtube");
      const ctx = (input && input.ctx) ? input.ctx : {};

      const archetype = L.select(L.ALL, archetypeId, ctx && ctx.headline, ctx && ctx.subhead);
      if(!archetype || typeof archetype.compile !== "function") return null;
      const compiled = archetype.compile(canvas, ctx);
      if(!compiled) return null;

      return {
        archetypeId: compiled.archetype || archetype.id || archetypeId || null,
        canvas,
        blocks: Array.isArray(compiled.blocks) ? compiled.blocks : []
      };
    }catch(_){
      return null;
    }
  }

  function listArchetypes(){
    const L = _loadLib();
    if(!L) return [];
    return (L.ALL || []).map(a => a && a.id).filter(Boolean);
  }

  function _zoneToRect(zone){
    const z = zone || {};
    return {
      x: Number(z.x || 0),
      y: Number(z.y || 0),
      w: Number(z.w || 0),
      h: Number(z.h || 0)
    };
  }

  function _placeholderImage(label){
    const txt = String(label || "Nexora").slice(0, 18);
    const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fb7185" stop-opacity="0.90"/>
    </linearGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="1200" height="800" fill="#0b1020"/>
  <circle cx="360" cy="280" r="180" fill="url(#g)" filter="url(#blur)" opacity="0.9"/>
  <circle cx="820" cy="520" r="140" fill="url(#g)" filter="url(#blur)" opacity="0.85"/>
  <text x="64" y="120" font-family="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="64" font-weight="800" fill="#ffffff" opacity="0.92">${txt}</text>
  <text x="64" y="172" font-family="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="26" font-weight="600" fill="#ffffff" opacity="0.60">Auto image</text>
</svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function _blockToElement(block, ctx){
    try{
      if(!block || !block.type) return null;
      const r = _zoneToRect(block.zone);
      const style = block.style || {};
      const role = block.role || null;

      if(block.type === "background"){
        return { type:"bg", role: role || "background", x:r.x, y:r.y, w:r.w, h:r.h, fill: style.color || style.fill || "#0b1020", fill2: style.fill2 || null, style: style.style || null };
      }

      if(block.type === "image"){
        const src = (ctx && (ctx.imageSrc || ctx.photoSrc || ctx.image)) || _placeholderImage((ctx && (ctx.brand || ctx.headline)) || "Nexora");
        return { type:"photo", role: role || "image", x:r.x, y:r.y, w:r.w, h:r.h, src, radius: Number(style.radius ?? style.r ?? 24), opacity: Number(style.opacity ?? 1) };
      }

      if(block.type === "overlay"){
        const fill = style.color || style.fill || "rgba(0,0,0,0.35)";
        return { type:"shape", role: role || "badge", x:r.x, y:r.y, w:r.w, h:r.h, fill, opacity: Number(style.opacity ?? 1), radius: Number(style.radius ?? style.r ?? 24), stroke: style.stroke || null };
      }

      if(block.type === "text"){
        const text = String(block.value || block.text || "");
        return { type:"text", role: role || "headline", x:r.x, y:r.y, text, size: Number(style.fontSize ?? style.size ?? 64), weight: Number(style.weight ?? 800), color: style.fill || style.color || "#ffffff", align: style.align || "left", letter: style.letter ?? style.tracking ?? undefined };
      }

      if(block.type === "badge"){
        const text = String(style.label || style.text || block.value || "");
        return { type:"badge", role: role || "badge", x:r.x, y:r.y, w:r.w, h:r.h, r: Number(style.radius ?? 999), fill: style.fill || style.color || "#ffffff", text, tcolor: style.textColor || "#0b1020", tsize: Number(style.fontSize ?? 24), tweight: Number(style.weight ?? 900) };
      }

      if(block.type === "line"){
        return { type:"shape", role: role || "badge", x:r.x, y:r.y, w:r.w, h: Math.max(1, r.h), fill: style.color || style.fill || "#ffffff", opacity: Number(style.opacity ?? 1) };
      }

      return null;
    }catch(_){
      return null;
    }
  }

  async function compileArchetypeToElements(input){
    const compiled = compileArchetype(input);
    if(!compiled) return null;
    const ctx = input && input.ctx;
    const blocks = Array.isArray(compiled.blocks) ? compiled.blocks : [];
    const elements = [];
    for(const b of blocks){
      const el = _blockToElement(b, ctx);
      if(el) elements.push(el);
    }
    return {
      canvas: compiled.canvas,
      archetypeId: compiled.archetypeId,
      elements,
      blocks
    };
  }

  const api = { compileArchetype, compileArchetypeToElements, listArchetypes };

  try{ if(typeof module !== "undefined" && module.exports){ module.exports = api; } }catch(_){ }
  try{ if(typeof window !== "undefined"){ window.NexoraArchetypeEngine = api; } }catch(_){ }
})();
