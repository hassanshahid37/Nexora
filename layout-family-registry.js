
/**
 * layout-family-registry.js — Nexora P7 (v1)
 * Data-only registry of layout families.
 *
 * Goals:
 * - Structural authority lives here (data), not in generate.js.
 * - Additive-only: no side effects, safe in Node + Browser.
 * - No category duplication: category-specific rules should come from CategorySpecV1;
 *   registry only describes layout archetypes and their constraints.
 */

(function (root) {
  const REGISTRY = {
    // ---- SAFETY DEFAULT ----
    "generic": {
      id: "generic",
      label: "Generic Safe",
      description: "Safe default family when intent is unclear.",
      layoutHints: ["split-hero", "clean"],
      zones: ["background", "headline", "image", "subhead", "cta", "badge", "logo"],
      hierarchy: ["headline", "image", "subhead", "cta", "badge", "logo"],
      weights: { headline: 1.0, image: 0.8, subhead: 0.6, cta: 0.5, badge: 0.4, logo: 0.2 },
      constraints: { imageOptional: true, badgeMax: 1, textMaxLinesHeadline: 2, textMaxLinesSubhead: 3 }
    },

    // ---- TEXT-LED ----
    "text-first": {
      id: "text-first",
      label: "Text First",
      description: "Headline/subhead driven. Works well for quotes, announcements, education.",
      layoutHints: ["minimal-quote", "feature-grid"],
      zones: ["background", "headline", "subhead", "cta", "badge", "logo"],
      hierarchy: ["headline", "subhead", "cta", "badge", "logo"],
      weights: { headline: 1.0, subhead: 0.85, cta: 0.55, badge: 0.35, logo: 0.2, image: 0.15 },
      constraints: { imageOptional: true, badgeMax: 1, textMaxLinesHeadline: 3, textMaxLinesSubhead: 4 }
    },

    // ---- IMAGE-LED ----
    "image-led": {
      id: "image-led",
      label: "Image Led",
      description: "Image is dominant. Best for product, lifestyle, portfolio.",
      layoutHints: ["photo-card"],
      zones: ["background", "image", "headline", "subhead", "cta", "badge", "logo"],
      hierarchy: ["image", "headline", "cta", "badge", "subhead", "logo"],
      weights: { image: 1.0, headline: 0.75, cta: 0.55, badge: 0.45, subhead: 0.35, logo: 0.25 },
      constraints: { imageRequired: true, badgeMax: 1, textMaxLinesHeadline: 2, textMaxLinesSubhead: 2 }
    },

    // ---- PROMO / SALE ----
    "promo-badge": {
      id: "promo-badge",
      label: "Promo Badge",
      description: "Sale/promo layout with strong badge. Best for discounts/offers.",
      layoutHints: ["badge-promo"],
      zones: ["background", "headline", "subhead", "image", "cta", "badge", "logo"],
      hierarchy: ["badge", "headline", "image", "cta", "subhead", "logo"],
      weights: { badge: 1.0, headline: 0.85, image: 0.75, cta: 0.7, subhead: 0.45, logo: 0.25 },
      constraints: { imageOptional: true, badgeMax: 1, textMaxLinesHeadline: 2, textMaxLinesSubhead: 2 }
    },

    // ---- SPLIT HERO ----
    "split-hero": {
      id: "split-hero",
      label: "Split Hero",
      description: "Split composition: text block + image block. Strong for YouTube/ads/hero announcements.",
      layoutHints: ["split-hero"],
      zones: ["background", "headline", "subhead", "image", "cta", "badge", "logo"],
      hierarchy: ["headline", "image", "cta", "subhead", "badge", "logo"],
      weights: { headline: 1.0, image: 0.9, cta: 0.7, subhead: 0.6, badge: 0.4, logo: 0.25 },
      constraints: { imageOptional: true, badgeMax: 1, textMaxLinesHeadline: 2, textMaxLinesSubhead: 3 }
    },

    // ---- FEATURE GRID ----
    "feature-grid": {
      id: "feature-grid",
      label: "Feature Grid",
      description: "Grid/feature list layout for informational posts, slides, and explainers.",
      layoutHints: ["feature-grid"],
      zones: ["background", "headline", "subhead", "cta", "badge", "logo"],
      hierarchy: ["headline", "subhead", "cta", "badge", "logo"],
      weights: { headline: 1.0, subhead: 0.8, cta: 0.55, badge: 0.35, logo: 0.25, image: 0.2 },
      constraints: { imageOptional: true, badgeMax: 1, textMaxLinesHeadline: 2, textMaxLinesSubhead: 4 }
    },

    // ---- MINIMAL QUOTE ----
    "minimal-quote": {
      id: "minimal-quote",
      label: "Minimal Quote",
      description: "Minimal typography-first quote layout. Great for stories, posts, thought leadership.",
      layoutHints: ["minimal-quote"],
      zones: ["background", "headline", "subhead", "cta", "logo"],
      hierarchy: ["headline", "subhead", "cta", "logo"],
      weights: { headline: 1.0, subhead: 0.75, cta: 0.45, logo: 0.25, image: 0.0, badge: 0.0 },
      constraints: { imageOptional: true, badgeMax: 0, textMaxLinesHeadline: 4, textMaxLinesSubhead: 4 }
    }
  };

  function getLayoutFamily(id) {
    return REGISTRY[id] || REGISTRY["generic"];
  }

  function listLayoutFamilies() {
    return Object.keys(REGISTRY).map((k) => REGISTRY[k]);
  }

  // UMD-ish export
  try {
    if (typeof module !== "undefined" && module.exports) module.exports = { REGISTRY, getLayoutFamily, listLayoutFamilies };
  } catch (_) {}
  try {
    if (typeof root !== "undefined") root.NexoraLayoutRegistry = root.NexoraLayoutRegistry || { REGISTRY, getLayoutFamily, listLayoutFamilies };
  } catch (_) {}
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : global));
