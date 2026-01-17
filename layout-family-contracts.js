/**
 * layout-family-contract.js — Nexora P7 LayoutFamilyContract (v1)
 *
 * Data-only structural authority for layout families.
 * Backwards-compatible: accepts legacy "hierarchy" arrays (role order) and normalizes to weights map.
 *
 * Exports (Node): { VERSION, createFamily, normalizeHierarchy, validateFamily }
 * Globals (Browser): window.LayoutFamilyContract
 */

(function (root) {
  const VERSION = "v1";

  function str(x) { return String(x == null ? "" : x); }

  function normalizeHierarchy(h) {
    try {
      // Legacy: ["headline","subhead",...]
      if (Array.isArray(h)) {
        const out = Object.create(null);
        for (let i = 0; i < h.length; i++) {
          const role = str(h[i]).toLowerCase();
          if (!role) continue;
          // smaller number = higher priority (1 is highest)
          if (!(role in out)) out[role] = i + 1;
        }
        return out;
      }
      // Modern: { headline: 1, subhead: 2, ... }
      if (h && typeof h === "object") {
        const out = Object.create(null);
        for (const k of Object.keys(h)) {
          const role = str(k).toLowerCase();
          const v = Number(h[k]);
          if (!role) continue;
          if (Number.isFinite(v) && v > 0) out[role] = Math.round(v);
        }
        return out;
      }
      return Object.create(null);
    } catch {
      return Object.create(null);
    }
  }

  function validateFamily(fam) {
    try {
      if (!fam || typeof fam !== "object") return false;
      if (fam.version !== VERSION) return false;
      if (!fam.id || typeof fam.id !== "string") return false;

      // zones can be empty (v1 allows gradual adoption), but must be array if present
      if (fam.zones != null && !Array.isArray(fam.zones)) return false;

      // hierarchy must be an object map
      if (fam.hierarchy && typeof fam.hierarchy !== "object") return false;

      if (fam.lockedRoles != null && !Array.isArray(fam.lockedRoles)) return false;
      if (fam.flexibleRoles != null && !Array.isArray(fam.flexibleRoles)) return false;

      return true;
    } catch {
      return false;
    }
  }

  function createFamily(def) {
    try {
      if (!def || typeof def !== "object") return null;

      const id = str(def.id);
      if (!id) return null;

      const fam = {
        version: VERSION,
        id,
        label: def.label != null ? str(def.label) : id,
        category: def.category != null ? str(def.category) : "any",

        // v1 fields
        zones: Array.isArray(def.zones) ? def.zones.slice() : [],
        hierarchy: normalizeHierarchy(def.hierarchy),
        lockedRoles: Array.isArray(def.lockedRoles) ? def.lockedRoles.slice() : [],
        flexibleRoles: Array.isArray(def.flexibleRoles) ? def.flexibleRoles.slice() : [],
        constraints: (def.constraints && typeof def.constraints === "object") ? def.constraints : {}
      };

      return validateFamily(fam) ? fam : null;
    } catch {
      return null;
    }
  }

  const api = { VERSION, createFamily, normalizeHierarchy, validateFamily };

  try {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
  } catch (_) {}

  try {
    root.LayoutFamilyContract = root.LayoutFamilyContract || api;
  } catch (_) {}
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : global));
