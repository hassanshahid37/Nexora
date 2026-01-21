

/* template-contract.js — Nexora TemplateContract v1 (System Spine)
   Purpose: Shared contract builder + validator for templates.
   - Works in plain <script> environments (no bundler).
   - Does NOT touch UI.
   - Safe: never throws; returns null/false on invalid.

   Exposes (MERGE-SAFE): window.NexoraSpine.*
     - createContract({ templateId, category, canvas:{w,h}|{width,height}, palette, layers, layoutFamily, layoutVariant })
     - validateContract(contract)
     - normalizeCanvas(obj) -> { width, height } | null
     - stableId(prefix)
     - VERSION
     - ROLE_SET (Set)
*/

(function () {
  const root = window.NexoraSpine = window.NexoraSpine || {};

  const VERSION = "v1";
  const ROLE_SET = new Set(["background", "headline", "subhead", "image", "cta", "badge", "logo"]);

  // Layout Families v1 (Instagram) — optional metadata only (validator ignores unknown keys)
  const LAYOUT_FAMILIES = {
    instagram: [
      { family: "text-first", variants: ["quote", "announcement"] },
      { family: "image-led", variants: ["product", "lifestyle"] },
      { family: "split", variants: ["text-left", "text-right"] },
      { family: "cards", variants: ["stack", "tiles"] },
      { family: "minimal-grid", variants: ["editorial", "clean"] }
    ]
  };

  function normalizeLayoutChoice(category, layoutFamily, layoutVariant) {
    try {
      const cat = String(category || "").toLowerCase();
      const groups = cat.includes("instagram") ? LAYOUT_FAMILIES.instagram : null;
      if (!groups) return { layoutFamily: null, layoutVariant: null };

      const fam = layoutFamily ? String(layoutFamily) : null;
      const varr = layoutVariant ? String(layoutVariant) : null;

      if (!fam) return { layoutFamily: null, layoutVariant: null };

      const found = groups.find((g) => g.family === fam);
      if (!found) return { layoutFamily: null, layoutVariant: null };

      const okVariant = varr && Array.isArray(found.variants) && found.variants.includes(varr) ? varr : null;
      return { layoutFamily: fam, layoutVariant: okVariant };
    } catch {
      return { layoutFamily: null, layoutVariant: null };
    }
  }

  function stableId(prefix) {
    try {
      return (
        globalThis.crypto?.randomUUID?.() ||
        (String(prefix || "id") + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16))
      );
    } catch {
      return String(prefix || "id") + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    }
  }

  function normalizeCanvas(c) {
    const w = Number(c?.width ?? c?.w);
    const h = Number(c?.height ?? c?.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const W = Math.round(w);
    const H = Math.round(h);
    // Provide both shapes for cross-module compatibility (some modules read .w/.h)
    return { width: W, height: H, w: W, h: H };
  }

  


// =========================
// Option C: STRICT MODE
// =========================
const STRICT_CONTRACT = true;
// --- P5.2: Template Shape Normalization (Category-Safe) ---
// Additive + optional: only runs when CategorySpecV1 + normalizeCategory are present.
// Guarantees: required roles exist, forbidden roles removed, duplicates capped (badge may repeat).
function normalizeLayersForCategory(layers, category) {
  try {
    const norm = globalThis.normalizeCategory;
    if (typeof norm !== "function") return layers;

    const spec = norm(category);
    if (!spec || !spec.roles) return layers;

    const required = Array.isArray(spec.roles.required) ? spec.roles.required : [];
    const optional = Array.isArray(spec.roles.optional) ? spec.roles.optional : [];
    const allowed = new Set([].concat(required, optional).filter((r) => ROLE_SET.has(String(r))));

    if (!allowed.size) return layers;

    const maxPerRole = { badge: 3 }; // allow a few badges; everything else 1
    const countByRole = Object.create(null);
    const out = [];

    for (const l of Array.isArray(layers) ? layers : []) {
      if (!l) continue;
      const role = String(l.role || "");
      if (!allowed.has(role)) continue;

      const max = maxPerRole[role] || 1;
      const cur = countByRole[role] || 0;
      if (cur >= max) continue;

      countByRole[role] = cur + 1;
      out.push(l);
    }

    // Ensure required roles exist (only those supported by ROLE_SET)
    for (const r of required) {
      const role = String(r || "");
      if (!ROLE_SET.has(role)) continue;
      if (!allowed.has(role)) continue;
      if ((countByRole[role] || 0) > 0) continue;

      const layer = { id: String(stableId("auto_" + role)), role, locked: true };
      if (role === "background") out.unshift(layer);
      else out.push(layer);
      countByRole[role] = 1;
    }

    return out.length ? out : layers;
  } catch {
    return layers;
  }
}
function validateContract(contract) {
    try {
      if (!contract || typeof contract !== "object") return false;
      if (contract.version !== VERSION) return false;
      if (!contract.templateId) return false;
      if (!contract.category || typeof contract.category !== "string") return false;

      const cv = normalizeCanvas(contract.canvas);
      if (!cv) return false;

      if (!Array.isArray(contract.layers) || contract.layers.length < 1) return false;
      for (const l of contract.layers) {
        if (!l || typeof l !== "object") return false;
        if (!l.id || typeof l.id !== "string") return false;
        if (!ROLE_SET.has(String(l.role || ""))) return false;
        if (typeof l.locked !== "boolean") return false;
      }

      if (!Array.isArray(contract.exportProfiles)) return false;
      return true;
    } catch {
      return false;
    }
  }

  function createContract({ templateId, category, canvas, palette, layers, layoutFamily, layoutVariant }) {
    try {
      const cv = normalizeCanvas(canvas);
      if (!cv) return null;

      const tid = String(templateId || stableId("tpl"));
      const cat = String(category || "Unknown");

      const lc = normalizeLayoutChoice(cat, layoutFamily, layoutVariant);

      const safePalette =
        palette && typeof palette === "object"
          ? {
              bg: palette.bg ?? palette.bg2 ?? null,
              accent: palette.accent ?? palette.accent2 ?? null,
              ink: palette.ink ?? null
            }
          : null;

      const ls = Array.isArray(layers) ? layers : [];
      const normalizedLayers = ls
        .filter(Boolean)
        .map((l) => ({
          id: String(l.id || stableId("layer")),
          role: ROLE_SET.has(String(l.role || "")) ? String(l.role) : null,
          locked: l.locked
        }))
        .filter(l => typeof l.role === 'string' && typeof l.locked === 'boolean');

      if (!normalizedLayers.length) return null;

      // P5.2: enforce category-safe template shape (optional)
      // STRICT_CONTRACT=true means we MUST normalize/shape layers for the category.
      const shapedLayers = (STRICT_CONTRACT ? normalizeLayersForCategory(normalizedLayers, cat) : normalizedLayers);

      const contract = {
        version: VERSION,
        templateId: tid,
        category: cat,
        canvas: cv,
        palette: safePalette,
        layers: shapedLayers || normalizedLayers,
        exportProfiles: [{ id: "default", label: cat, w: cv.width, h: cv.height, format: "png" }],
        layoutFamily: lc.layoutFamily,
        layoutVariant: lc.layoutVariant,
        createdAt: Date.now()
      };

      return validateContract(contract) ? contract : null;
    } catch {
      return null;
    }
  }

  // MERGE-SAFE export (never overwrites existing spine keys)
  const api = { VERSION, ROLE_SET, stableId, normalizeCanvas, validateContract, createContract };
  Object.keys(api).forEach((k) => {
    if (!(k in root)) root[k] = api[k];
  });
})();
