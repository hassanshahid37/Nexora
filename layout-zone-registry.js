/*
  Nexora Layout Zone Registry (P8 Phase-3)

  Goal
  - Provide a stable, data-driven zone system used by both generation and preview.
  - Keep zoning as structural authority outside generate.js.

  Public API (global)
    globalThis.NexoraZoneRegistry = {
      getZones(family): returns normalized zones (0..1)
      getZoneRects({ family, canvas, padding }): returns pixel rects keyed by ROLE
    }

  Notes
  - Zones are defined in normalized coordinates.
  - getZoneRects returns ROLE-keyed rectangles because both generator and preview
    reason in terms of TemplateContract roles (headline, body, cta, image, ...).
*/

(function initNexoraZoneRegistry() {
  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

  // Normalized zones per layout family (0..1)
  const ZONES = {
    // Classic stacked layout
    "text-first": {
      header: { x: 0.08, y: 0.08, w: 0.84, h: 0.22 },
      body: { x: 0.08, y: 0.32, w: 0.84, h: 0.46 },
      footer: { x: 0.08, y: 0.80, w: 0.84, h: 0.12 },
    },

    // Image dominates, supporting text panel
    "image-led": {
      hero: { x: 0.06, y: 0.08, w: 0.88, h: 0.58 },
      support: { x: 0.06, y: 0.68, w: 0.88, h: 0.18 },
      footer: { x: 0.06, y: 0.87, w: 0.88, h: 0.09 },
    },

    // Split canvas: visual left, content right
    "split-hero": {
      left: { x: 0.06, y: 0.10, w: 0.46, h: 0.80 },
      rightHeader: { x: 0.54, y: 0.10, w: 0.40, h: 0.26 },
      rightBody: { x: 0.54, y: 0.38, w: 0.40, h: 0.36 },
      rightFooter: { x: 0.54, y: 0.76, w: 0.40, h: 0.14 },
    },

    // Minimal poster-like focus
    "minimal": {
      focus: { x: 0.10, y: 0.18, w: 0.80, h: 0.56 },
      footer: { x: 0.10, y: 0.76, w: 0.80, h: 0.14 },
    },

    // More slots for dense layouts
    "dense": {
      header: { x: 0.06, y: 0.06, w: 0.88, h: 0.18 },
      grid: { x: 0.06, y: 0.26, w: 0.88, h: 0.58 },
      footer: { x: 0.06, y: 0.86, w: 0.88, h: 0.10 },
    },
  };

  const DEFAULT_FAMILY = "text-first";

  function getZones(family) {
    const key = String(family || "").trim();
    return ZONES[key] || ZONES[DEFAULT_FAMILY];
  }

  function toPxRect(zone, canvasW, canvasH) {
    const x = clamp01(zone.x) * canvasW;
    const y = clamp01(zone.y) * canvasH;
    const w = clamp01(zone.w) * canvasW;
    const h = clamp01(zone.h) * canvasH;
    return { x, y, w, h };
  }

  function insetRect(r, insetPx) {
    const i = Math.max(0, Number(insetPx) || 0);
    return {
      x: r.x + i,
      y: r.y + i,
      w: Math.max(1, r.w - i * 2),
      h: Math.max(1, r.h - i * 2),
    };
  }

  function canvasToWH(canvas) {
    if (!canvas) return { w: 1080, h: 1080 };
    const w = Number(canvas.w ?? canvas.width ?? 1080) || 1080;
    const h = Number(canvas.h ?? canvas.height ?? 1080) || 1080;
    return { w, h };
  }

  // Returns ROLE-keyed pixel rectangles used by generator + preview.
  function getZoneRects(arg1, arg2, arg3) {
    // Support both old call style (family, canvas, padding) and new ({...}).
    const opts =
      typeof arg1 === "object" && arg1 !== null
        ? arg1
        : { family: arg1, canvas: arg2, padding: arg3 };

    const family = String(opts.family || "").trim() || DEFAULT_FAMILY;
    const { w: canvasW, h: canvasH } = canvasToWH(opts.canvas);
    const zones = getZones(family);

    // Padding is interpreted as a fraction of the *short* side.
    const paddingFrac = Math.max(0, Number(opts.padding ?? 0.05) || 0.05);
    const insetPx = Math.round(Math.min(canvasW, canvasH) * paddingFrac);

    // Base full canvas rect
    const full = insetRect({ x: 0, y: 0, w: canvasW, h: canvasH }, 0);

    // Helper for pixel zone rect with internal padding
    const px = (z) => insetRect(toPxRect(z, canvasW, canvasH), insetPx);

    // Map TemplateContract roles -> zoning strategy
    // Roles seen in the system: background, headline, subhead, body, cta, image, badge, logo
    const roleRects = {
      background: full,
      // defaults (will be overridden below by family-specific mapping)
      headline: insetRect(full, insetPx),
      subhead: insetRect(full, insetPx),
      body: insetRect(full, insetPx),
      cta: insetRect(full, insetPx),
      image: insetRect(full, insetPx),
      badge: insetRect(full, insetPx),
      logo: insetRect(full, insetPx),
    };

    if (family === "text-first") {
      roleRects.headline = zones.header ? px(zones.header) : insetRect(full, insetPx);
      roleRects.subhead = zones.body ? px(zones.body) : insetRect(full, insetPx);
      roleRects.body = zones.body ? px(zones.body) : insetRect(full, insetPx);
      roleRects.cta = zones.footer ? px(zones.footer) : insetRect(full, insetPx);
      // If an image role exists, treat it as an accent in the body zone.
      roleRects.image = zones.body ? px(zones.body) : insetRect(full, insetPx);
      roleRects.badge = zones.header ? px(zones.header) : insetRect(full, insetPx);
      roleRects.logo = zones.header ? px(zones.header) : insetRect(full, insetPx);
    } else if (family === "image-led") {
      roleRects.image = zones.hero ? px(zones.hero) : insetRect(full, insetPx);
      roleRects.headline = zones.support ? px(zones.support) : insetRect(full, insetPx);
      roleRects.subhead = zones.support ? px(zones.support) : insetRect(full, insetPx);
      roleRects.body = zones.support ? px(zones.support) : insetRect(full, insetPx);
      roleRects.cta = zones.footer ? px(zones.footer) : insetRect(full, insetPx);
      roleRects.badge = zones.hero ? px(zones.hero) : insetRect(full, insetPx);
      roleRects.logo = zones.hero ? px(zones.hero) : insetRect(full, insetPx);
    } else if (family === "split-hero") {
      roleRects.image = zones.left ? px(zones.left) : insetRect(full, insetPx);
      roleRects.headline = zones.rightHeader ? px(zones.rightHeader) : insetRect(full, insetPx);
      roleRects.subhead = zones.rightBody ? px(zones.rightBody) : insetRect(full, insetPx);
      roleRects.body = zones.rightBody ? px(zones.rightBody) : insetRect(full, insetPx);
      roleRects.cta = zones.rightFooter ? px(zones.rightFooter) : insetRect(full, insetPx);
      roleRects.badge = zones.rightHeader ? px(zones.rightHeader) : insetRect(full, insetPx);
      roleRects.logo = zones.rightHeader ? px(zones.rightHeader) : insetRect(full, insetPx);
    } else if (family === "minimal") {
      roleRects.headline = zones.focus ? px(zones.focus) : insetRect(full, insetPx);
      roleRects.subhead = zones.focus ? px(zones.focus) : insetRect(full, insetPx);
      roleRects.body = zones.focus ? px(zones.focus) : insetRect(full, insetPx);
      roleRects.cta = zones.footer ? px(zones.footer) : insetRect(full, insetPx);
      roleRects.image = zones.focus ? px(zones.focus) : insetRect(full, insetPx);
      roleRects.badge = zones.footer ? px(zones.footer) : insetRect(full, insetPx);
      roleRects.logo = zones.footer ? px(zones.footer) : insetRect(full, insetPx);
    } else if (family === "dense") {
      roleRects.headline = zones.header ? px(zones.header) : insetRect(full, insetPx);
      roleRects.subhead = zones.header ? px(zones.header) : insetRect(full, insetPx);
      roleRects.body = zones.grid ? px(zones.grid) : insetRect(full, insetPx);
      roleRects.image = zones.grid ? px(zones.grid) : insetRect(full, insetPx);
      roleRects.cta = zones.footer ? px(zones.footer) : insetRect(full, insetPx);
      roleRects.badge = zones.header ? px(zones.header) : insetRect(full, insetPx);
      roleRects.logo = zones.header ? px(zones.header) : insetRect(full, insetPx);
    } else {
      // Unknown family: fall back to default zoning.
      const fallback = getZones(DEFAULT_FAMILY);
      roleRects.headline = fallback.header ? px(fallback.header) : insetRect(full, insetPx);
      roleRects.body = fallback.body ? px(fallback.body) : insetRect(full, insetPx);
      roleRects.cta = fallback.footer ? px(fallback.footer) : insetRect(full, insetPx);
    }

    return roleRects;
  }

  globalThis.NexoraZoneRegistry = {
    getZones,
    getZoneRects,
  };
})();
