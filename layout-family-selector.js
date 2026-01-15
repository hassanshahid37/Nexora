
/**
 * layout-family-selector.js — Nexora P7 (v1)
 * Deterministic selector for layout families.
 *
 * Contract:
 * - selectLayoutFamily({ category, prompt }) -> string familyId
 *
 * Notes:
 * - No mutation. No side effects.
 * - Avoids category duplication: does not embed canvas tables; uses category label only.
 */

(function (root) {
  function str(x) { return String(x == null ? "" : x); }

  function stableHash(s) {
    s = str(s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function tokenize(prompt) {
    return str(prompt).toLowerCase().replace(/[^\w\s%$-]+/g, " ").split(/\s+/).filter(Boolean);
  }

  function includesAny(tokens, words) {
    for (const w of words) if (tokens.includes(w)) return true;
    return false;
  }

  // Very small keyword sets (keep it stable; expand later)
  const KW_PROMO = ["sale", "discount", "offer", "deal", "limited", "off", "%", "save", "coupon", "promo", "blackfriday", "flash"];
  const KW_QUOTE = ["quote", "thought", "saying", "motivation", "inspire", "mindset"];
  const KW_IMAGE = ["photo", "image", "portrait", "product", "lifestyle", "showcase", "gallery"];
  const KW_GRID  = ["features", "steps", "howto", "how-to", "guide", "tips", "checklist", "comparison", "vs"];
  const KW_HERO  = ["launch", "announcement", "new", "update", "webinar", "podcast", "episode", "interview"];

  function loadRegistry() {
    try {
      // Node / serverless
      const mod = require("./layout-family-registry.js");
      return mod && mod.getLayoutFamily ? mod : null;
    } catch (_) {}
    try {
      // Browser global
      return (root && root.NexoraLayoutRegistry) ? root.NexoraLayoutRegistry : null;
    } catch (_) {}
    return null;
  }

  function selectLayoutFamily(input) {
    const category = str(input && input.category);
    const prompt = str(input && input.prompt);
    const tokens = tokenize(prompt);

    // 1) Strong intent signals
    if (includesAny(tokens, KW_PROMO)) return "promo-badge";
    if (includesAny(tokens, KW_QUOTE)) return "minimal-quote";
    if (includesAny(tokens, KW_GRID)) return "feature-grid";
    if (includesAny(tokens, KW_IMAGE)) return "image-led";
    if (includesAny(tokens, KW_HERO)) return "split-hero";

    // 2) Category heuristics (light-touch; no canvas duplication)
    const c = category.toLowerCase();
    if (c.includes("thumbnail")) return "split-hero";      // YouTube default
    if (c.includes("resume")) return "text-first";         // documents
    if (c.includes("slide")) return "feature-grid";        // presentations often grid/explainer

    // 3) Deterministic fallback rotation to avoid sameness
    const rot = ["generic", "split-hero", "promo-badge", "feature-grid", "image-led", "text-first"];
    const h = stableHash(category + "|" + prompt);
    return rot[h % rot.length] || "generic";
  }

  // Optional helper: returns family object (if registry available)
  function selectLayoutFamilyResolved(input) {
    const id = selectLayoutFamily(input);
    const reg = loadRegistry();
    return reg && typeof reg.getLayoutFamily === "function" ? reg.getLayoutFamily(id) : { id };
  }

  try {
    if (typeof module !== "undefined" && module.exports) module.exports = { selectLayoutFamily, selectLayoutFamilyResolved };
  } catch (_) {}
  try {
    if (typeof root !== "undefined") root.selectLayoutFamily = root.selectLayoutFamily || selectLayoutFamily;
  } catch (_) {}
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : global));
