
/**
 * Nexora P5.1 – CategorySpecV1
 * Single source of truth for category normalization.
 * ADDITIVE ONLY. Does not modify existing logic.
 *
 * UMD-style so it works in:
 * - Browser <script> (window.CategorySpecV1 / window.normalizeCategory)
 * - Node/CommonJS (require('./category-spec-v1.js'))
 * It does NOT require bundlers or "type=module".
 */
(function () {
  const root = (typeof window !== "undefined") ? window : globalThis;

  const CategorySpecV1 = {
    instagram_post: {
      id: "instagram_post",
      label: "Instagram Post",
      kind: "social",
      canvas: { w: 1080, h: 1080 },
      exportProfiles: ["instagram_post"],
      roles: { required: ["background"], optional: ["headline", "subhead", "image", "logo", "cta"] },
      defaults: { style: "Dark Premium", background: "solid" },
      constraints: { allowCTA: true }
    },

    youtube_thumbnail: {
      id: "youtube_thumbnail",
      label: "YouTube Thumbnail",
      kind: "video",
      canvas: { w: 1280, h: 720 },
      exportProfiles: ["youtube_thumbnail"],
      roles: { required: ["background", "headline"], optional: ["image", "badge"] },
      defaults: { style: "Dark Premium", background: "solid" },
      constraints: { allowCTA: false }
    },

    story: {
      id: "story",
      label: "Story",
      kind: "social",
      canvas: { w: 1080, h: 1920 },
      exportProfiles: ["story"],
      roles: { required: ["background"], optional: ["headline", "subhead", "image", "logo", "cta"] },
      defaults: { style: "Dark Premium", background: "solid" },
      constraints: { allowCTA: true }
    },

    flyer: {
      id: "flyer",
      label: "Flyer",
      kind: "print",
      canvas: { w: 1080, h: 1350 },
      exportProfiles: ["flyer"],
      roles: { required: ["background", "headline"], optional: ["subhead", "image", "cta", "logo"] },
      defaults: { style: "Dark Premium", background: "solid" },
      constraints: { allowCTA: true }
    },

    poster: {
      id: "poster",
      label: "Poster",
      kind: "print",
      canvas: { w: 1414, h: 2000 },
      exportProfiles: ["poster"],
      roles: { required: ["background", "headline"], optional: ["subhead", "image", "cta", "logo"] },
      defaults: { style: "Dark Premium", background: "solid" },
      constraints: { allowCTA: true }
    },

    business_card: {
      id: "business_card",
      label: "Business Card",
      kind: "print",
      canvas: { w: 1050, h: 600 },
      exportProfiles: ["business_card"],
      roles: { required: ["background", "logo"], optional: ["headline", "subhead"] },
      defaults: { style: "Corporate", background: "solid" },
      constraints: { allowCTA: false }
    },

    presentation_slide: {
      id: "presentation_slide",
      label: "Presentation Slide",
      kind: "deck",
      canvas: { w: 1920, h: 1080 },
      exportProfiles: ["presentation_slide"],
      roles: { required: ["background", "headline"], optional: ["subhead", "image", "logo"] },
      defaults: { style: "Corporate", background: "solid" },
      constraints: { allowCTA: false }
    },

    resume: {
      id: "resume",
      label: "Resume",
      kind: "doc",
      canvas: { w: 1240, h: 1754 },
      exportProfiles: ["resume"],
      roles: { required: ["background", "headline"], optional: ["subhead", "logo"] },
      defaults: { style: "Light Minimal", background: "solid" },
      constraints: { allowCTA: false }
    },

    // Logo is intentionally different: transparent-capable canvas, symbol/wordmark only.
    logo: {
      id: "logo",
      label: "Logo",
      kind: "logo",
      canvas: { w: 1000, h: 1000 },
      exportProfiles: ["logo"],
      roles: { required: ["image"], optional: ["tagline"], forbidden: ["headline", "subhead", "cta"] },
      defaults: { style: "Corporate", background: "transparent" },
      constraints: { allowCTA: false, allowPhoto: false }
    }
  };

  // Build alias map once (label -> spec, id -> spec, key -> spec)
  const __alias = Object.create(null);
  for (const k of Object.keys(CategorySpecV1)) {
    const spec = CategorySpecV1[k];
    __alias[String(k).toLowerCase()] = spec;
    if (spec && spec.id) __alias[String(spec.id).toLowerCase()] = spec;
    if (spec && spec.label) __alias[String(spec.label).toLowerCase()] = spec;
  }

  function normalizeCategory(input) {
    if (!input) return CategorySpecV1.instagram_post;

    // Accept passing a spec object
    if (typeof input === "object" && input && typeof input.label === "string") {
      const byLabel = __alias[String(input.label).toLowerCase()];
      if (byLabel) return byLabel;
    }

    const raw = String(input).trim();
    if (!raw) return CategorySpecV1.instagram_post;

    const lower = raw.toLowerCase();
    const key = lower.replace(/\s+/g, "_");
    return __alias[lower] || __alias[key] || CategorySpecV1.instagram_post;
  }

  // Browser globals (simple, non-spine)
  if (!root.CategorySpecV1) root.CategorySpecV1 = CategorySpecV1;
  if (!root.normalizeCategory) root.normalizeCategory = normalizeCategory;

  // Optional: also expose under NexoraSpine if present (merge-safe)
  if (root.NexoraSpine) {
    if (!root.NexoraSpine.CategorySpecV1) root.NexoraSpine.CategorySpecV1 = CategorySpecV1;
    if (!root.NexoraSpine.normalizeCategory) root.NexoraSpine.normalizeCategory = normalizeCategory;
  }

  // CommonJS export
  if (typeof module !== "undefined" && module.exports) {
    module.exports.CategorySpecV1 = CategorySpecV1;
    module.exports.normalizeCategory = normalizeCategory;
  }
})();
