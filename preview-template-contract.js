/* preview-template-contract.js — Nexora PreviewTemplateContract v1
   Purpose: A preview-safe, deterministic contract that the homepage can render WITHOUT any layout intelligence.
   - PreviewContract is NOT the real template.
   - Safe: never throws; returns null/false on invalid.
   - Works in plain <script> environments (no bundler).

   Exposes (MERGE-SAFE): window.NexoraPreviewContract.*
     - createContract({ sourceTemplateId, category, canvas:{w,h}|{width,height}, elements, meta })
     - validateContract(contract)
     - normalizeCanvas(obj) -> { width, height, w, h } | null
     - stableId(prefix)
     - VERSION
     - ROLE_SET (Set)
*/

(function () {
  const root = (typeof window !== "undefined" ? window : globalThis);
  const apiRoot = root.NexoraPreviewContract = root.NexoraPreviewContract || {};

  const VERSION = "pv1";
  const ROLE_SET = new Set([
    "background",
    "image",
    "headline",
    "subhead",
    "body",
    "cta",
    "badge",
    "logo",
    "shape",
    "meta"
  ]);

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
    try {
      const w = Number(c?.width ?? c?.w);
      const h = Number(c?.height ?? c?.h);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
      const W = Math.round(w);
      const H = Math.round(h);
      return { width: W, height: H, w: W, h: H };
    } catch {
      return null;
    }
  }

  function isPlainObject(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }

  function validateElement(el) {
    try {
      if (!isPlainObject(el)) return false;

      // Required minimal identity
      if (!el.id || typeof el.id !== "string") return false;

      // Role/type normalization (renderer may infer from type too)
      const role = String(el.role || "").toLowerCase().trim();
      if (role && !ROLE_SET.has(role)) return false;

      // Geometry is required for preview safety (no guessing in renderer).
      const x = Number(el.x), y = Number(el.y), w = Number(el.w), h = Number(el.h);
      if (![x,y,w,h].every(Number.isFinite)) return false;
      if (w <= 0 || h <= 0) return false;

      // Style is optional but must be object if present
      if (el.style != null && typeof el.style !== "object") return false;

      return true;
    } catch {
      return false;
    }
  }

  function validateContract(contract) {
    try {
      if (!isPlainObject(contract)) return false;
      if (contract.version !== VERSION) return false;

      const cv = normalizeCanvas(contract.canvas);
      if (!cv) return false;

      // Minimum: must include background + at least one non-background element
      const els = Array.isArray(contract.elements) ? contract.elements : null;
      if (!els || els.length < 1) return false;

      let hasBg = false;
      let hasNonBg = false;

      for (const el of els) {
        if (!validateElement(el)) return false;
        const role = String(el.role || "").toLowerCase();
        if (role === "background") hasBg = true;
        else hasNonBg = true;
      }

      if (!hasBg) return false;
      if (!hasNonBg) return false;

      // Minimal identity fields
      if (!contract.previewId || typeof contract.previewId !== "string") return false;
      if (!contract.category || typeof contract.category !== "string") return false;

      return true;
    } catch {
      return false;
    }
  }

  function createContract({ sourceTemplateId, category, canvas, elements, meta, previewId }) {
    try {
      const cv = normalizeCanvas(canvas);
      if (!cv) return null;

      const cat = String(category || "Unknown");
            const previewIdFinal = (typeof previewId === "string" && previewId.trim()) ? previewId.trim() : stableId("preview");

      const els = Array.isArray(elements) ? elements : [];
      const normalized = els
        .filter(Boolean)
        .map((e) => {
          const role = String(e.role || "").toLowerCase().trim() || "";
          return {
            id: String(e.id || stableId("el")),
            type: e.type != null ? String(e.type) : undefined,
            role: role || undefined,
            x: Number(e.x),
            y: Number(e.y),
            w: Number(e.w),
            h: Number(e.h),
            text: e.text != null ? String(e.text) : undefined,
            title: e.title != null ? String(e.title) : undefined,
            subtitle: e.subtitle != null ? String(e.subtitle) : undefined,
            src: e.src != null ? String(e.src) : undefined,
            url: e.url != null ? String(e.url) : undefined,
            style: (e.style && typeof e.style === "object") ? e.style : undefined
          };
        });

      const contract = {
        version: VERSION,
        previewId: previewIdFinal,
        sourceTemplateId: sourceTemplateId ? String(sourceTemplateId) : null,
        category: cat,
        canvas: cv,
        elements: normalized,
        meta: (meta && typeof meta === "object") ? meta : {},
        createdAt: Date.now()
      };

      return validateContract(contract) ? contract : null;
    } catch {
      return null;
    }
  }

  // MERGE-SAFE export
  const exportApi = { VERSION, ROLE_SET, stableId, normalizeCanvas, validateContract, createContract };
  Object.keys(exportApi).forEach((k) => {
    if (!(k in apiRoot)) apiRoot[k] = exportApi[k];
  });
})();
