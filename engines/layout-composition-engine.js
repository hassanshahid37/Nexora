/**
 * engines/layout-composition-engine.js
 * FINAL WORKING FIX (Zones-driven, role-normalized)
 *
 * - Exports ONE callable function (CommonJS)
 * - Consumes zones by role (case-insensitive)
 * - Always assigns concrete x,y,w,h
 * - Hard-fails on invalid input / non-finite geometry
 */

module.exports = function layoutCompositionEngine(input) {
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

  // Build a role->zone map (case-insensitive)
  const zoneByRole = {};
  for (const z of zones) {
    if (!z || typeof z !== "object") continue;
    const roleKey = String(z.role || "").toLowerCase().trim();
    if (!roleKey) continue;
    if (!Number.isFinite(z.w) || !Number.isFinite(z.h)) continue;
    zoneByRole[roleKey] = z;
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

  const positioned = elements.map((el) => {
    const role = String(el?.role || "").toLowerCase().trim();
    const zone = (role && zoneByRole[role]) ? zoneByRole[role] : root;

    const x = Number.isFinite(zone.x) ? zone.x : rootX;
    const y = Number.isFinite(zone.y) ? zone.y : rootY;
    const w = Number.isFinite(zone.w) ? zone.w : root.w;
    const h = Number.isFinite(zone.h) ? zone.h : root.h;

    if (![x, y, w, h].every(Number.isFinite)) {
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
};
