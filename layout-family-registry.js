/**
 * layout-family-registry.js — Nexora P7 (v1) + P8 Canonical Bridge (SAFE)
 *
 * Purpose (P7): data-driven family registry used by selector + preview ordering.
 * Added (P8): canonical family normalization and canonical->legacy bridge so:
 *   - Zone system (canonical families) works
 *   - Preview ordering/hierarchy (legacy families) stays stable
 *
 * Exports (Node): { getLayoutFamily, listLayoutFamilies, REGISTRY, normalizeFamily, CANONICAL_FAMILIES, CANONICAL_TO_LEGACY }
 * Globals (Browser): window.NexoraLayoutRegistry, window.NexoraLayoutFamilyRegistry
 *
 * IMPORTANT:
 * - Side-effect free besides exports/globals.
 * - Does NOT contain editor handoff patch.
 */
(function(root){
  "use strict";

  // -----------------------------
  // P7 Layout Family Registry (LEGACY IDs used by existing Nexora wiring)
  // -----------------------------
  const REGISTRY = {
    generic: {
      id: "generic",
      label: "Generic",
      hierarchy: ["headline", "subhead", "cta", "badge", "image"]
    },
    "split-hero": {
      id: "split-hero",
      label: "Split Hero",
      hierarchy: ["headline", "subhead", "badge", "cta", "image"]
    },
    "promo-badge": {
      id: "promo-badge",
      label: "Promo Badge",
      hierarchy: ["badge", "headline", "subhead", "cta", "image"]
    },
    "feature-grid": {
      id: "feature-grid",
      label: "Feature Grid",
      hierarchy: ["headline", "subhead", "image", "badge", "cta"]
    },
    "image-led": {
      id: "image-led",
      label: "Image Led",
      hierarchy: ["image", "headline", "subhead", "badge", "cta"]
    },
    "text-first": {
      id: "text-first",
      label: "Text First",
      hierarchy: ["headline", "subhead", "badge", "cta", "image"]
    },
    "minimal-quote": {
      id: "minimal-quote",
      label: "Minimal Quote",
      hierarchy: ["headline", "subhead", "badge", "cta", "image"]
    }
  };

  // -----------------------------
  // Canonical Layout Families (P8+)
  // These are the ONLY families used by Zone Registry/Executor.
  // -----------------------------
  const CANONICAL_FAMILIES = {
    "text-first": ["text-first","headline-first","copy-led","generic"],
    "image-led": ["image-led","image-dominant","visual-first","promo-badge","photo-card","photo","image"],
    "split": ["split","split-balanced","split-hero","dominance-left","dominance-right","two-column","two-col"],
    "stacked": ["stacked","top-bottom","bottom-top","center-stack","vertical-stack"],
    "minimal": ["minimal","minimal-quote","clean","editorial","quote"],
    "dense": ["dense","information-heavy","feature-grid","grid","features"]
  };

  function normalizeFamily(id){
    if(!id) return "text-first";
    const raw = String(id).trim().toLowerCase();
    const key = raw.replace(/\s+/g,"-").replace(/_+/g,"-").replace(/-+/g,"-");
    for(const canon in CANONICAL_FAMILIES){
      const list = CANONICAL_FAMILIES[canon];
      if(Array.isArray(list) && list.indexOf(key) !== -1) return canon;
    }
    return key || "text-first";
  }

  // -----------------------------
  // Canonical -> Legacy Bridge (P8)
  // Preview ordering expects a family object with a hierarchy.
  // We map canonical families onto the closest legacy family definition.
  // -----------------------------
  const CANONICAL_TO_LEGACY = {
    "text-first": "text-first",
    "image-led": "image-led",
    "split": "split-hero",
    "stacked": "generic",
    "minimal": "minimal-quote",
    "dense": "feature-grid"
  };

  function getLayoutFamily(id){
    const canon = normalizeFamily(String(id || ""));
    const legacyKey = CANONICAL_TO_LEGACY[canon] || canon;
    return REGISTRY[legacyKey] || REGISTRY.generic;
  }

  function listLayoutFamilies(){
    return Object.values(REGISTRY);
  }

  // Node / serverless export
  try{
    if(typeof module === "object" && module.exports){
      module.exports = { getLayoutFamily, listLayoutFamilies, REGISTRY, normalizeFamily, CANONICAL_FAMILIES, CANONICAL_TO_LEGACY };
    }
  }catch(_){}

  // Browser globals
  try{
    root.NexoraLayoutRegistry = root.NexoraLayoutRegistry || { getLayoutFamily, listLayoutFamilies, REGISTRY, normalizeFamily, CANONICAL_FAMILIES, CANONICAL_TO_LEGACY };
    root.NexoraLayoutFamilyRegistry = root.NexoraLayoutFamilyRegistry || { normalizeFamily, CANONICAL_FAMILIES };
  }catch(_){}

})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : global));
