/*
 * layout-zone-registry.js (P8 Phase-3)
 * Layout Family -> Canvas Zones (geometry authority)
 *
 * Deterministic, pure math, spine-safe.
 *
 * Exports:
 *   - getZones(family): normalized zone schema (ratios)
 *   - getZoneRects({ family, canvas, variant, index }): pixel rects {x,y,w,h}
 */
(function(){
  "use strict";

  function str(x){ return String(x == null ? "" : x); }
  function num(x, d){ const n = Number(x); return Number.isFinite(n) ? n : d; }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function canvasWH(c){
    const w = num(c && (c.w ?? c.width), NaN);
    const h = num(c && (c.h ?? c.height), NaN);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w<=0 || h<=0) return { w:1080, h:1080 };
    return { w: Math.round(w), h: Math.round(h) };
  }

  // Base normalized schemas. split-hero is derived dynamically based on canvas ratio.
  const BASE = {
    "text-first": {
      header: { x:0.0, y:0.00, w:1.0, h:0.32 },
      body:   { x:0.0, y:0.32, w:1.0, h:0.48 },
      footer: { x:0.0, y:0.80, w:1.0, h:0.20 }
    },
    "image-led": {
      hero:    { x:0.0, y:0.00, w:1.0, h:0.62 },
      support: { x:0.0, y:0.62, w:1.0, h:0.22 },
      footer:  { x:0.0, y:0.84, w:1.0, h:0.16 }
    },
    "minimal": {
      focus:  { x:0.0, y:0.18, w:1.0, h:0.54 },
      footer: { x:0.0, y:0.76, w:1.0, h:0.24 }
    },
    "dense": {
      header: { x:0.0, y:0.00, w:1.0, h:0.26 },
      grid:   { x:0.0, y:0.26, w:1.0, h:0.56 },
      footer: { x:0.0, y:0.82, w:1.0, h:0.18 }
    }
  };

  function deriveSplitHero(canvas){
    const { w, h } = canvasWH(canvas);
    const portrait = (h / w) > 1.12;
    if(portrait){
      // Top/bottom: image dominates top.
      return {
        primary:   { x:0.0, y:0.00, w:1.0, h:0.58 },
        secondary: { x:0.0, y:0.58, w:1.0, h:0.42 }
      };
    }
    // Left/right: image dominates right by default.
    return {
      primary:   { x:0.00, y:0.00, w:0.56, h:1.00 },
      secondary: { x:0.56, y:0.00, w:0.44, h:1.00 }
    };
  }

  // Role -> zone mapping (normalized). Some roles are mapped to the same zone.
  const ROLE_TO_ZONE = {
    "text-first": {
      headline: "header",
      subhead: "body",
      body: "body",
      cta: "footer",
      image: "body",
      badge: "header"
    },
    "image-led": {
      image: "hero",
      badge: "hero",
      headline: "support",
      subhead: "support",
      body: "support",
      cta: "footer"
    },
    "split-hero": {
      image: "primary",
      headline: "secondary",
      subhead: "secondary",
      body: "secondary",
      cta: "secondary",
      badge: "primary"
    },
    "minimal": {
      image: "focus",
      headline: "focus",
      subhead: "focus",
      body: "focus",
      cta: "footer",
      badge: "focus"
    },
    "dense": {
      headline: "header",
      subhead: "grid",
      body: "grid",
      image: "grid",
      badge: "grid",
      cta: "footer"
    }
  };

  function getZones(family){
    const f = str(family).trim() || "text-first";
    if(f === "split-hero") return deriveSplitHero({ w:1080, h:1080 });
    return BASE[f] || BASE["text-first"];
  }

  function zoneRectPx(zone, canvas, inset){
    const { w, h } = canvas;
    const x = Math.round(w * num(zone.x, 0));
    const y = Math.round(h * num(zone.y, 0));
    const ww = Math.round(w * num(zone.w, 1));
    const hh = Math.round(h * num(zone.h, 1));
    const pad = Math.max(0, Math.round(num(inset, 0)));
    const rx = x + pad;
    const ry = y + pad;
    const rw = Math.max(1, ww - pad*2);
    const rh = Math.max(1, hh - pad*2);
    return { x: rx, y: ry, w: rw, h: rh };
  }

  function makeRects(input){
    const family = str(input && input.family).trim() || "text-first";
    const canvas = canvasWH(input && input.canvas);
    const index = Number.isFinite(Number(input && input.index)) ? Number(input.index) : 0;

    const schema = (family === "split-hero") ? deriveSplitHero(canvas) : (BASE[family] || BASE["text-first"]);
    const roleMap = ROLE_TO_ZONE[family] || ROLE_TO_ZONE["text-first"];

    // Split-hero: optionally flip dominance every other index for visible variation.
    if(family === "split-hero" && (index % 2) === 1){
      const a = schema.primary;
      schema.primary = schema.secondary;
      schema.secondary = a;
    }

    const safe = Math.round(Math.min(canvas.w, canvas.h) * 0.06);

    // Insets per role type.
    function insetForRole(role){
      role = str(role);
      if(role === "badge") return Math.round(safe*0.3);
      if(role === "cta") return Math.round(safe*0.6);
      if(role === "image") return Math.round(safe*0.2);
      return Math.round(safe*0.55);
    }

    const out = {
      __family: family,
      __index: index,
      background: { x:0, y:0, w:canvas.w, h:canvas.h }
    };

    for(const role in roleMap){
      const zoneKey = roleMap[role];
      const z = schema[zoneKey];
      if(!z) continue;
      out[role] = zoneRectPx(z, canvas, insetForRole(role));
    }

    // Badge: constrain to small pill/circle inside its zone.
    if(out.badge){
      const b = out.badge;
      const s = Math.round(Math.min(b.w, b.h) * 0.45);
      out.badge = { x: b.x, y: b.y, w: Math.max(28, s), h: Math.max(28, s) };
    }

    // CTA: make a consistent bar size.
    if(out.cta){
      const b = out.cta;
      const ch = clamp(Math.round(canvas.h * 0.085), 44, 120);
      const cw = clamp(Math.round(b.w * 0.55), 200, Math.round(canvas.w * 0.6));
      out.cta = { x: b.x, y: Math.round(b.y + (b.h - ch)), w: cw, h: ch };
    }

    // Image: make it a strong block.
    if(out.image){
      const b = out.image;
      const ih = clamp(Math.round(b.h * 0.92), Math.round(canvas.h * 0.22), Math.round(canvas.h * 0.72));
      out.image = { x: b.x, y: b.y, w: b.w, h: ih };
    }

    return out;
  }

  // Public API
  const api = {
    getZones: function(family){
      const f = str(family).trim() || "text-first";
      if(f === "split-hero") return deriveSplitHero({ w:1080, h:1080 });
      return BASE[f] || BASE["text-first"];
    },
    getZoneRects: function(input){
      return makeRects(input || {});
    }
  };

  try{
    if(typeof module !== "undefined" && module.exports){
      module.exports = api;
    }
    if(typeof window !== "undefined"){
      window.NexoraZones = api;
    }
    if(typeof globalThis !== "undefined"){
      globalThis.NexoraZones = globalThis.NexoraZones || api;
    }
  }catch(_){ }
})();
