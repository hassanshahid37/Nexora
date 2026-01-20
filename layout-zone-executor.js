
/**
 * layout-zone-executor.js — P8 Phase-3 Zone Execution Authority
 *
 * Purpose:
 * - Centralize LayoutFamily -> Zones -> deterministic placement computation.
 * - Preview uses this to place contract layers into zone rects.
 * - NO silent fallbacks: missing zone returns null placement (caller may warn/skip).
 *
 * This module is UMD-safe:
 * - Node: module.exports
 * - Browser: window.NexoraZoneExecutor
 */

function canonFamilyId(contract){
  try{
    const c = contract || {};
    const raw = String(c.layoutFamilyCanonical || c.layoutFamily || c.layoutFamilyId || "").trim();
    if(!raw) return "text-first";
    // Canonical aliases (keep backwards compatibility)
    if(raw === "promo-badge") return "image-led";
    if(raw === "minimal-quote") return "minimal";
    if(raw === "feature-grid") return "dense";
    if(raw === "generic") return "split-hero";
    return raw;
  }catch(_){
    return "text-first";
  }
}

function roleToZone(family, role){
  const r = String(role||"");
  if(r === "background") return null;

  if(family === "text-first"){
    if(r === "headline" || r === "badge") return "header";
    if(r === "subhead" || r === "body" || r === "image") return "body";
    if(r === "cta") return "footer";
    return "body";
  }

  if(family === "image-led"){
    if(r === "image") return "hero";
    if(r === "badge") return "hero";
    if(r === "headline" || r === "subhead" || r === "body") return "support";
    if(r === "cta") return "footer";
    return "support";
  }

  if(family === "split-hero"){
    if(r === "image") return "left";
    return "right";
  }

  if(family === "minimal"){
    return "focus";
  }

  if(family === "dense"){
    if(r === "headline") return "header";
    if(r === "cta") return "footer";
    return "grid";
  }

  return null;
}

/**
 * Compute placements for ordered layers, using fractional zones.
 * Returns { familyCanon, zonesFrac, placements }
 * placements: Map(index -> { zoneKey, slotIndex, slotCount, rect:{x,y,w,h} })
 */
function computePlacements({ contract, orderedLayers, getZones }){
  try{
    const familyCanon = canonFamilyId(contract);
    const zonesFrac = (typeof getZones === "function") ? getZones(familyCanon) : null;
    if(!zonesFrac) return { familyCanon, zonesFrac: null, placements: null };

    // bucket indices per zone
    const buckets = Object.create(null);
    (orderedLayers || []).forEach((layer, idx)=>{
      const zk = roleToZone(familyCanon, layer && layer.role);
      if(!zk) return;
      (buckets[zk] = buckets[zk] || []).push(idx);
    });

    const cursor = Object.create(null);
    const placements = new Map();

    (orderedLayers || []).forEach((layer, idx)=>{
      const zk = roleToZone(familyCanon, layer && layer.role);
      if(!zk) return;
      const z = zonesFrac[zk];
      if(!z) return;

      const bucket = buckets[zk] || [];
      const n = Math.max(1, bucket.length);
      const slot = cursor[zk] || 0;
      cursor[zk] = slot + 1;

      const x = (z.x != null) ? z.x : 0;
      const y = (z.y != null) ? z.y : 0;
      const w = (z.w != null) ? z.w : 1;
      const h = (z.h != null) ? z.h : 1;

      const slotH = h / n;
      const slotY = y + (slotH * slot);

      placements.set(idx, {
        zoneKey: zk,
        slotIndex: slot,
        slotCount: n,
        rect: { x, y: slotY, w, h: slotH }
      });
    });

    return { familyCanon, zonesFrac, placements };
  }catch(_){
    return { familyCanon: "text-first", zonesFrac: null, placements: null };
  }
}

/**
 * Apply rect placement (fractional) to a DOM node within a positioned root.
 */
function applyPlacementStyle(node, rect){
  try{
    if(!node || !rect) return;
    node.style.position = "absolute";
    node.style.left = (rect.x * 100) + "%";
    node.style.top = (rect.y * 100) + "%";
    node.style.width = (rect.w * 100) + "%";
    node.style.height = (rect.h * 100) + "%";
    node.style.boxSizing = "border-box";
    node.style.padding = node.style.padding || "10%";
    node.style.display = "flex";
    node.style.alignItems = "center";
    node.style.justifyContent = "center";
    node.style.textAlign = node.style.textAlign || "center";
  }catch(_){}
}

const api = { canonFamilyId, roleToZone, computePlacements, applyPlacementStyle };

try{
  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }
}catch(_){}

try{
  if(typeof window !== "undefined"){
    window.NexoraZoneExecutor = api;
  }
}catch(_){}
