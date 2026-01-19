(function(){
  // Layout Zone Registry v1
  // Provides:
  //  - getZones(layoutFamily): normalized zones (0..1)
  //  - getZoneRects(layoutFamily, canvas): pixel rects for Preview Renderer v1
  // Backward compatible: keeps getZones API.

  const ZONES = {
    "text-first": {
      header: { x: 0, y: 0.00, w: 1, h: 0.32 },
      body:   { x: 0, y: 0.32, w: 1, h: 0.43 },
      footer: { x: 0, y: 0.75, w: 1, h: 0.25 }
    },
    "image-led": {
      hero:    { x: 0, y: 0.00, w: 1, h: 0.65 },
      support: { x: 0, y: 0.65, w: 1, h: 0.20 },
      footer:  { x: 0, y: 0.85, w: 1, h: 0.15 }
    },
    "split-hero": {
      left:  { x: 0.00, y: 0, w: 0.50, h: 1 },
      right: { x: 0.50, y: 0, w: 0.50, h: 1 }
    },
    "minimal": {
      focus: { x: 0, y: 0.15, w: 1, h: 0.70 }
    },
    "dense": {
      header: { x: 0, y: 0.00, w: 1, h: 0.20 },
      grid:   { x: 0, y: 0.20, w: 1, h: 0.60 },
      footer: { x: 0, y: 0.80, w: 1, h: 0.20 }
    }
  };

  function getZones(family){
    return ZONES[String(family||"")] || ZONES["text-first"];
  }

  function clamp01(n){
    if(!Number.isFinite(n)) return 0;
    if(n < 0) return 0;
    if(n > 1) return 1;
    return n;
  }

  function getZoneRects(family, canvas){
    const w = Math.max(1, Number(canvas?.w || canvas?.width || 1));
    const h = Math.max(1, Number(canvas?.h || canvas?.height || 1));

    const zones = getZones(family);
    const rects = {};

    for(const [key, z] of Object.entries(zones)){
      const nx = clamp01(z.x ?? 0);
      const ny = clamp01(z.y ?? 0);
      const nw = clamp01(z.w ?? 1);
      const nh = clamp01(z.h ?? 1);

      // Ensure non-negative and within canvas.
      const px = Math.round(nx * w);
      const py = Math.round(ny * h);
      const pw = Math.max(1, Math.round(nw * w));
      const ph = Math.max(1, Math.round(nh * h));

      rects[key] = { x: px, y: py, w: pw, h: ph, nx, ny, nw, nh };
    }

    return rects;
  }

  try {
    if(typeof module !== "undefined"){
      module.exports = { getZones, getZoneRects };
    }
    if(typeof window !== "undefined"){
      window.NexoraZones = Object.assign({}, window.NexoraZones||{}, { getZones, getZoneRects });
    }
  } catch(_){ /* no-op */ }
})();
