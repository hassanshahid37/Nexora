/**
 * engines/layout-composition-engine.js
 * LAB-SAFE FIX (NO OTHER FILE CHANGES REQUIRED)
 *
 * - Exports ONE callable function (CommonJS)
 * - Also exposes backward-compatible aliases:
 *     fn.applyLayoutComposition
 *     fn.default
 * - Deterministically converts zones -> concrete geometry
 * - Hard-fails on invalid input (no silent stop)
 */

function layoutCompositionEngine(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Layout composition failed: invalid input");
  }

  const zones = input.zones || input.contract?.meta?.zones;
  const elements = Array.isArray(input.elements) ? input.elements : [];

  if (!Array.isArray(zones) || zones.length === 0) {
    throw new Error("Layout composition failed: zones missing");
  }
  if (elements.length === 0) {
    throw new Error("Layout composition failed: elements missing");
  }

  // Build role->zone map (case-insensitive)
  const zoneByRole = {};
  for (const z of zones) {
    if (!z || typeof z !== "object") continue;
    const role = String(z.role || "").toLowerCase().trim();
    if (!role) continue;
    if (!Number.isFinite(z.w) || !Number.isFinite(z.h)) continue;
    zoneByRole[role] = z;
  }

  const root =
    zoneByRole.root ||
    zones.find(z => String(z?.role || "").toLowerCase() === "root") ||
    zones[0];

  if (!root || !Number.isFinite(root.w) || !Number.isFinite(root.h)) {
    throw new Error("Layout composition failed: invalid root zone");
  }

  const rootX = Number.isFinite(root.x) ? root.x : 0;
  const rootY = Number.isFinite(root.y) ? root.y : 0;

  const positioned = elements.map(el => {
    const role = String(el?.role || "").toLowerCase().trim();
    const zone = zoneByRole[role] || root;

    const x = Number.isFinite(zone.x) ? zone.x : rootX;
    const y = Number.isFinite(zone.y) ? zone.y : rootY;
    const w = Number.isFinite(zone.w) ? zone.w : root.w;
    const h = Number.isFinite(zone.h) ? zone.h : root.h;

    if (![x,y,w,h].every(Number.isFinite)) {
      throw new Error("Layout composition failed: non-finite geometry");
    }
    if (w <= 0 || h <= 0) {
      throw new Error("Layout composition failed: non-positive geometry");
    }

    return { ...el, x, y, w, h };
  });

  return {
    ...input,
    elements: positioned,
    meta: {
      ...(input.meta || {}),
      layoutComposed: true
    }
  };
}

// --- EXPORTS (LAB SAFE) ---
module.exports = layoutCompositionEngine;
module.exports.applyLayoutComposition = layoutCompositionEngine;
module.exports.default = layoutCompositionEngine;
