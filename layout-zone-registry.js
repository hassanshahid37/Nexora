/**
 * layout-zone-registry.js — Nexora P8 Phase-3
 * Zone definitions per canonical layout family (NOT per archetype).
 *
 * Contract:
 *   NexoraZoneRegistry.getZones(familyId) -> zoneMap
 *   NexoraZoneRegistry.getZoneRects(familyId, canvasW, canvasH) -> pixel rects
 *
 * - Pure data + helpers, no DOM side effects.
 * - Uses NexoraLayoutFamilyRegistry.normalizeFamily when available.
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;
  const fam = root.NexoraLayoutFamilyRegistry;

  // Fractions are 0..1 relative to canvas {w,h}
  const ZONES = {
    "text-first": {
      id: "text-first",
      zones: {
        hero:   { x:0.08, y:0.10, w:0.84, h:0.34 },
        body:   { x:0.08, y:0.46, w:0.60, h:0.30 },
        side:   { x:0.70, y:0.46, w:0.22, h:0.30 },
        footer: { x:0.08, y:0.80, w:0.84, h:0.14 }
      },
      roleToZone: {
        headline:"hero", subhead:"body", cta:"footer", badge:"side", image:"side", background:"background"
      }
    },
    "image-led": {
      id: "image-led",
      zones: {
        image:  { x:0.06, y:0.08, w:0.88, h:0.56 },
        badge:  { x:0.08, y:0.10, w:0.32, h:0.10 },
        text:   { x:0.08, y:0.66, w:0.60, h:0.22 },
        cta:    { x:0.70, y:0.70, w:0.22, h:0.14 }
      },
      roleToZone: {
        image:"image", headline:"text", subhead:"text", badge:"badge", cta:"cta", background:"background"
      }
    },
    "split": {
      id: "split",
      zones: {
        left:   { x:0.06, y:0.10, w:0.44, h:0.80 },
        right:  { x:0.52, y:0.10, w:0.42, h:0.80 },
        badge:  { x:0.08, y:0.12, w:0.28, h:0.10 }
      },
      roleToZone: {
        image:"right", headline:"left", subhead:"left", cta:"left", badge:"badge", background:"background"
      }
    },
    "stacked": {
      id: "stacked",
      zones: {
        top:    { x:0.06, y:0.08, w:0.88, h:0.46 },
        bottom: { x:0.06, y:0.56, w:0.88, h:0.36 },
        badge:  { x:0.08, y:0.10, w:0.28, h:0.10 }
      },
      roleToZone: {
        image:"top", headline:"bottom", subhead:"bottom", cta:"bottom", badge:"badge", background:"background"
      }
    },
    "minimal": {
      id: "minimal",
      zones: {
        center: { x:0.12, y:0.22, w:0.76, h:0.56 },
        badge:  { x:0.12, y:0.12, w:0.30, h:0.10 }
      },
      roleToZone: {
        headline:"center", subhead:"center", cta:"center", badge:"badge", image:"center", background:"background"
      }
    },
    "dense": {
      id: "dense",
      zones: {
        header: { x:0.06, y:0.08, w:0.88, h:0.18 },
        grid:   { x:0.06, y:0.30, w:0.88, h:0.56 },
        badge:  { x:0.70, y:0.10, w:0.24, h:0.10 }
      },
      roleToZone: {
        headline:"header", subhead:"header", badge:"badge", cta:"header", image:"grid", background:"background"
      }
    }
  };

  function canonFamily(family){
    const f = String(family || "").trim();
    return fam && typeof fam.normalizeFamily === "function" ? fam.normalizeFamily(f) : (f || "text-first");
  }

  function getZones(family){
    const canon = canonFamily(family);
    return (ZONES[canon] && ZONES[canon].zones) ? ZONES[canon].zones : null;
  }

  function getRoleToZone(family){
    const canon = canonFamily(family);
    return (ZONES[canon] && ZONES[canon].roleToZone) ? ZONES[canon].roleToZone : null;
  }

  function getZoneRects(family, W, H){
    const zones = getZones(family);
    if(!zones) return null;
    const out = {};
    for(const k in zones){
      const z = zones[k];
      out[k] = {
        x: Math.round(z.x * W),
        y: Math.round(z.y * H),
        w: Math.round(z.w * W),
        h: Math.round(z.h * H)
      };
    }
    return out;
  }

  root.NexoraZoneRegistry = {
    getZones,
    getRoleToZone,
    getZoneRects,
    __ZONES: ZONES
  };
})();
