// layout-zone-registry.js
// P8 Phase-3: Layout Family -> Zones -> Rects (single authority)
//
// Goals:
// - Stable, data-driven zone definitions per layout family
// - Deterministic rects that scale across different canvas sizes
// - Backwards compatible export surface (window + module.exports)
//
// This module is geometry-only: it describes zones and calculates rectangles.
// It must remain deterministic and must not generate content.

(() => {
  function clamp(n, min, max) {
    const v = Number(n);
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function round(n) {
    const v = Number(n);
    return Number.isFinite(v) ? Math.round(v) : 0;
  }

  function normalizeFamily(family) {
    const raw = (family ?? '').toString().trim();
    if (!raw) return 'text-first';
    return raw
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  const warnOnce = (() => {
    let warned = false;
    return (msg) => {
      if (warned) return;
      warned = true;
      try {
        // eslint-disable-next-line no-console
        console.warn(msg);
      } catch (_) {}
    };
  })();

  function resolveCanvasDims(canvas) {
    // Supported shapes:
    // - { w, h }
    // - { width, height }
    // - HTMLCanvasElement { width, height }
    // - Any object with nested { canvas: { w,h } }
    const obj = canvas ?? {};

    const w =
      obj.w ??
      obj.width ??
      obj.canvas?.w ??
      obj.canvas?.width ??
      obj.size?.w ??
      obj.size?.width;

    const h =
      obj.h ??
      obj.height ??
      obj.canvas?.h ??
      obj.canvas?.height ??
      obj.size?.h ??
      obj.size?.height;

    const W = Number(w);
    const H = Number(h);

    if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
      warnOnce(
        '[Nexora] LayoutZoneRegistry: invalid canvas dims. Falling back to 1080x1080 to avoid NaN rects.'
      );
      return { w: 1080, h: 1080 };
    }

    return { w: W, h: H };
  }

  const FAMILY_DEFS = {
    'text-first': {
      zones: ['headline', 'subhead', 'body', 'cta'],
    },
    'image-dominant': {
      zones: ['image', 'headline', 'subhead', 'body'],
    },
    'split-balanced': {
      zones: ['image', 'headline', 'subhead', 'body'],
    },
    'top-bottom': {
      zones: ['image', 'headline', 'subhead', 'body', 'cta'],
    },
    'bottom-top': {
      zones: ['headline', 'subhead', 'body', 'image', 'cta'],
    },
    'dominance-left': {
      zones: ['image', 'headline', 'subhead', 'body', 'cta'],
    },
    'dominance-right': {
      zones: ['image', 'headline', 'subhead', 'body', 'cta'],
    },
    'center-stack': {
      zones: ['headline', 'subhead', 'body', 'cta'],
    },
    // Optional special-case family for Logo-like compositions.
    'logo-only': {
      zones: ['logo'],
    },
  };

  function computeRectsForFamily({ w, h, family }) {
    const fam = normalizeFamily(family);

    const minSide = Math.max(1, Math.min(w, h));
    const pad = clamp(round(minSide * 0.05), 16, 64);
    const gap = clamp(round(minSide * 0.02), 8, 24);

    const innerW = Math.max(0, w - pad * 2);
    const innerH = Math.max(0, h - pad * 2);

    const rects = {};

    if (fam === 'logo-only') {
      const size = clamp(round(minSide * 0.60), 64, minSide);
      rects.logo = {
        x: round((w - size) / 2),
        y: round((h - size) / 2),
        w: size,
        h: size,
      };
      return rects;
    }

    if (fam === 'text-first') {
      const headlineH = clamp(round(h * 0.14), 48, Math.max(0, round(innerH * 0.32)));
      const subheadH = clamp(round(h * 0.09), 36, Math.max(0, round(innerH * 0.24)));
      const ctaH = clamp(round(h * 0.08), 32, Math.max(0, round(innerH * 0.18)));

      let y = pad;
      rects.headline = { x: pad, y, w: innerW, h: headlineH };
      y += headlineH + gap;

      rects.subhead = { x: pad, y, w: innerW, h: subheadH };
      y += subheadH + gap;

      const ctaY = h - pad - ctaH;
      const ctaW = clamp(round(innerW * 0.52), Math.min(innerW, 120), innerW);
      rects.cta = { x: pad, y: ctaY, w: ctaW, h: ctaH };

      const bodyH = Math.max(0, ctaY - gap - y);
      rects.body = { x: pad, y, w: innerW, h: bodyH };

      return rects;
    }

    if (fam === 'image-dominant') {
      const imageH = clamp(round(innerH * 0.58), 0, innerH);

      let y = pad;
      rects.image = { x: pad, y, w: innerW, h: imageH };
      y += imageH + gap;

      const remaining = Math.max(0, h - pad - y);
      const headlineH = clamp(round(remaining * 0.38), 0, remaining);
      const subheadH = clamp(round(remaining * 0.22), 0, Math.max(0, remaining - headlineH));

      rects.headline = { x: pad, y, w: innerW, h: headlineH };
      y += headlineH + gap;

      rects.subhead = { x: pad, y, w: innerW, h: subheadH };
      y += subheadH + gap;

      rects.body = { x: pad, y, w: innerW, h: Math.max(0, h - pad - y) };

      return rects;
    }

    if (fam === 'split-balanced') {
      const leftW = clamp(round(innerW * 0.52), 0, innerW);
      const gapX = gap;
      const rightX = pad + leftW + gapX;
      const rightW = Math.max(0, w - pad - rightX);

      rects.image = { x: pad, y: pad, w: leftW, h: innerH };

      const headlineH = clamp(round(innerH * 0.18), 0, innerH);
      const subheadH = clamp(round(innerH * 0.10), 0, Math.max(0, innerH - headlineH - gap));

      let y = pad;
      rects.headline = { x: rightX, y, w: rightW, h: headlineH };
      y += headlineH + gap;

      rects.subhead = { x: rightX, y, w: rightW, h: subheadH };
      y += subheadH + gap;

      rects.body = { x: rightX, y, w: rightW, h: Math.max(0, h - pad - y) };

      return rects;
    }

    if (fam === 'top-bottom') {
      // Image dominates top; text stack below
      const imageH = clamp(round(innerH * 0.58), 0, innerH);
      const textY = pad + imageH + gap;
      const textH = Math.max(0, h - pad - textY);

      rects.image = { x: pad, y: pad, w: innerW, h: imageH };

      const headlineH = clamp(round(textH * 0.34), 0, textH);
      const subheadH = clamp(round(textH * 0.18), 0, Math.max(0, textH - headlineH));
      const ctaH = clamp(round(textH * 0.18), 0, Math.max(0, textH - headlineH - subheadH));

      let y = textY;
      rects.headline = { x: pad, y, w: innerW, h: headlineH };
      y += headlineH + gap;
      rects.subhead = { x: pad, y, w: innerW, h: subheadH };
      y += subheadH + gap;

      const ctaY = h - pad - ctaH;
      const ctaW = clamp(round(innerW * 0.52), Math.min(innerW, 120), innerW);
      rects.cta = { x: pad, y: ctaY, w: ctaW, h: ctaH };

      rects.body = { x: pad, y, w: innerW, h: Math.max(0, ctaY - gap - y) };
      return rects;
    }

    if (fam === 'bottom-top') {
      // Text stack top; image dominates bottom
      const imageH = clamp(round(innerH * 0.52), 0, innerH);
      const imageY = h - pad - imageH;
      rects.image = { x: pad, y: imageY, w: innerW, h: imageH };

      const textH = Math.max(0, imageY - gap - pad);
      const headlineH = clamp(round(textH * 0.34), 0, textH);
      const subheadH = clamp(round(textH * 0.18), 0, Math.max(0, textH - headlineH));
      const ctaH = clamp(round(textH * 0.16), 0, Math.max(0, textH - headlineH - subheadH));

      let y = pad;
      rects.headline = { x: pad, y, w: innerW, h: headlineH };
      y += headlineH + gap;
      rects.subhead = { x: pad, y, w: innerW, h: subheadH };
      y += subheadH + gap;

      const ctaY = pad + textH - ctaH;
      const ctaW = clamp(round(innerW * 0.52), Math.min(innerW, 120), innerW);
      rects.cta = { x: pad, y: ctaY, w: ctaW, h: ctaH };

      rects.body = { x: pad, y, w: innerW, h: Math.max(0, ctaY - gap - y) };
      return rects;
    }

    if (fam === 'dominance-left' || fam === 'dominance-right') {
      // Strong visual dominance; one side is large media, other is text.
      const leftDominant = (fam === 'dominance-left');
      const domW = clamp(round(innerW * 0.62), 0, innerW);
      const textW = Math.max(0, innerW - domW - gap);

      const imgX = leftDominant ? pad : (pad + textW + gap);
      const textX = leftDominant ? (pad + domW + gap) : pad;

      rects.image = { x: imgX, y: pad, w: domW, h: innerH };

      const headlineH = clamp(round(innerH * 0.22), 0, innerH);
      const subheadH = clamp(round(innerH * 0.12), 0, Math.max(0, innerH - headlineH));
      const ctaH = clamp(round(innerH * 0.10), 0, Math.max(0, innerH - headlineH - subheadH));

      let y = pad;
      rects.headline = { x: textX, y, w: textW, h: headlineH };
      y += headlineH + gap;
      rects.subhead = { x: textX, y, w: textW, h: subheadH };
      y += subheadH + gap;

      const ctaY = h - pad - ctaH;
      const ctaW = clamp(round(textW * 0.72), Math.min(textW, 120), textW);
      rects.cta = { x: textX, y: ctaY, w: ctaW, h: ctaH };

      rects.body = { x: textX, y, w: textW, h: Math.max(0, ctaY - gap - y) };
      return rects;
    }

    // center-stack (default fallback)
    {
      const contentW = clamp(round(innerW * 0.78), 0, innerW);
      const x = pad + round((innerW - contentW) / 2);

      const headlineH = clamp(round(innerH * 0.16), 0, innerH);
      const subheadH = clamp(round(innerH * 0.10), 0, innerH);
      const ctaH = clamp(round(innerH * 0.10), 0, innerH);

      let y = pad + round(innerH * 0.10);

      rects.headline = { x, y, w: contentW, h: headlineH };
      y += headlineH + gap;

      rects.subhead = { x, y, w: contentW, h: subheadH };
      y += subheadH + gap;

      const ctaY = h - pad - ctaH;
      const bodyMaxH = Math.max(0, ctaY - gap - y);
      const bodyH = clamp(round(innerH * 0.28), 0, bodyMaxH);

      rects.body = { x, y, w: contentW, h: bodyH };

      const ctaW = clamp(round(contentW * 0.55), 0, contentW);
      rects.cta = { x, y: ctaY, w: ctaW, h: ctaH };

      return rects;
    }
  }

  function sanitizeRects(rects, w, h) {
    // Clamp and round all rects to valid pixel bounds (avoid NaN/negative).
    const out = {};
    for (const [k, r] of Object.entries(rects || {})) {
      if (!r) continue;
      const x = clamp(round(r.x), 0, w);
      const y = clamp(round(r.y), 0, h);
      const rw = clamp(round(r.w), 0, Math.max(0, w - x));
      const rh = clamp(round(r.h), 0, Math.max(0, h - y));
      out[k] = { x, y, w: rw, h: rh };
    }
    return out;
  }

  const ZoneRegistry = {
    normalizeFamily,

    getFamilyIds() {
      return Object.keys(FAMILY_DEFS);
    },

    getZones(params = {}) {
      const family = normalizeFamily(params.family ?? params.layoutFamily);
      return (FAMILY_DEFS[family] || FAMILY_DEFS['text-first']).zones.slice();
    },

    getZoneRects(params = {}) {
      const family = normalizeFamily(params.family ?? params.layoutFamily);
      const { w, h } = resolveCanvasDims(params.canvas);

      const rects = computeRectsForFamily({ w, h, family });
      const clean = sanitizeRects(rects, w, h);

      // Ensure rect list aligns with zones list (no missing keys).
      const zones = (FAMILY_DEFS[family] || FAMILY_DEFS['text-first']).zones;
      const out = {};
      for (const z of zones) {
        out[z] = clean[z] || { x: 0, y: 0, w: 0, h: 0 };
      }
      return out;
    },

    // Compatibility helper: some code paths may ask for role rects.
    // For now, role==zone mapping (roles are resolved elsewhere).
    getRoleRects(params = {}) {
      return this.getZoneRects(params);
    },
  };

  // Global export (browser)
  if (typeof window !== 'undefined') {
    window.NexoraZoneRegistry = ZoneRegistry;
    // Back-compat alias seen in older wiring.
    if (!window.NexoraZones) window.NexoraZones = ZoneRegistry;
    if (!window.LayoutZoneRegistry) window.LayoutZoneRegistry = ZoneRegistry;
  }

  // CommonJS export (node)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZoneRegistry;
  }
})();
