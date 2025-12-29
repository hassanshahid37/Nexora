/* template-contract.js — Nexora TemplateContract v1 (System Spine)
   Purpose: Shared contract builder + validator for templates.
   - Works in plain <script> environments (no bundler).
   - Does NOT touch UI.
   - Safe: never throws; returns null/false on invalid.

   Exposes: window.NexoraSpine
     - createContract({ templateId, category, canvas:{w,h}|{width,height}, palette, layers })
     - validateContract(contract)
     - normalizeCanvas(obj) -> { width, height }
     - stableId(prefix)
*/

(function () {
  if (window.NexoraSpine) return;

  const VERSION = "v1";
  const ROLE_SET = new Set(["background", "headline", "subhead", "image", "cta", "badge"]);

  // Layout Families v1 (Instagram) — explicit structural archetypes.
  // Non-breaking: optional fields only; validator ignores unknown keys.
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
      return (globalThis.crypto?.randomUUID?.() || (String(prefix || "id") + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16)));
    } catch {
      return (String(prefix || "id") + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16));
    }
  }

  function normalizeCanvas(c) {
    const w = Number(c?.width ?? c?.w);
    const h = Number(c?.height ?? c?.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    return { width: Math.round(w), height: Math.round(h) };
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

      const safePalette = palette && typeof palette === "object" ? {
        bg: palette.bg ?? palette.bg2 ?? null,
        accent: palette.accent ?? palette.accent2 ?? null,
        ink: palette.ink ?? null
      } : null;

      const ls = Array.isArray(layers) ? layers : [];
      const normalizedLayers = ls
        .filter(Boolean)
        .map((l) => ({
          id: String(l.id || stableId("layer")),
          role: ROLE_SET.has(String(l.role || "")) ? String(l.role) : "badge",
          locked: true
        }));

      if (!normalizedLayers.length) return null;

      const contract = {
        version: VERSION,
        templateId: tid,
        category: cat,
        canvas: cv,
        palette: safePalette,
        layers: normalizedLayers,
        exportProfiles: [cat.replace(/\s+/g, "_").toLowerCase()],
        layoutFamily: lc.layoutFamily,
        layoutVariant: lc.layoutVariant,
        createdAt: Date.now()
      };

      return validateContract(contract) ? contract : null;
    } catch {
      return null;
    }
  }

  window.NexoraSpine = {
    VERSION,
    ROLE_SET,
    LAYOUT_FAMILIES,
    stableId,
    normalizeCanvas,
    validateContract,
    createContract
  };
})();
