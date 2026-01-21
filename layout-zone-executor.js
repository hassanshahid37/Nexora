/**
 * layout-zone-executor.js — Nexora P8 Phase-3 (Zone Execution Authority)
 *
 * Takes a template's elements + layoutFamily and applies canonical zone-based placement.
 * No generation logic; only geometry placement (x,y,w,h) + light alignment hints.
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;

  function num(v, d){ v = Number(v); return Number.isFinite(v) ? v : d; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function canonFamilyId(familyId){
    const fam = root.NexoraLayoutFamilyRegistry;
    if(fam && typeof fam.normalizeFamily === "function") return fam.normalizeFamily(familyId);
    // fallback: minimal normalization
    return String(familyId || "text-first").toLowerCase().replace(/\s+/g,"-").replace(/_+/g,"-");
  }

  function getCanvas(tpl){
    const cv = (tpl && (tpl.canvas || (tpl.contract && tpl.contract.canvas))) || {};
    const w = num(cv.w ?? cv.width, 1080);
    const h = num(cv.h ?? cv.height, 1080);
    return { w, h };
  }

  function getRole(el){
    const r = (el && el.role) ? String(el.role).toLowerCase() : "";
    if(r) return r;
    const t = String(el && el.type || "").toLowerCase();
    if(t === "bg" || t === "background") return "background";
    if(t === "image" || t === "photo") return "image";
    if(t === "cta" || t === "button") return "cta";
    if(t === "badge" || t === "pill" || t === "chip") return "badge";
    if(t === "headline" || t === "title") return "headline";
    return "subhead";
  }

  function placeInRect(el, rect, opts){
    opts = opts || {};
    const pad = clamp(num(opts.pad, 18), 0, 80);
    const minW = clamp(num(opts.minW, 80), 0, rect.w);
    const minH = clamp(num(opts.minH, 40), 0, rect.h);
    const maxW = rect.w - pad*2;
    const maxH = rect.h - pad*2;

    const w = clamp(num(el.w, maxW), minW, maxW);
    const h = clamp(num(el.h, maxH), minH, maxH);

    let x = rect.x + pad;
    let y = rect.y + pad;

    const ax = String(opts.alignX || "left");
    const ay = String(opts.alignY || "top");

    if(ax === "center") x = rect.x + Math.round((rect.w - w)/2);
    if(ax === "right")  x = rect.x + rect.w - pad - w;
    if(ay === "middle") y = rect.y + Math.round((rect.h - h)/2);
    if(ay === "bottom") y = rect.y + rect.h - pad - h;

    el.x = x; el.y = y; el.w = w; el.h = h;
    return el;
  }

  function applyZonePlacement(template){
    const tpl = template || {};
    const elements = Array.isArray(tpl.elements) ? tpl.elements : [];
    if(!elements.length) return tpl;

    const familyRaw =
      (tpl.contract && (tpl.contract.layoutFamilyCanonical || tpl.contract.layoutFamily)) ||
      tpl.layoutFamily ||
      tpl.layoutHint ||
      "text-first";

    const family = canonFamilyId(familyRaw);
    const cv = getCanvas(tpl);

    const zr = root.NexoraZoneRegistry;
    if(!zr || typeof zr.getZoneRects !== "function" || typeof zr.getRoleToZone !== "function") return tpl;

    const rects = zr.getZoneRects(family, cv.w, cv.h) || {};
    const roleToZone = zr.getRoleToZone(family) || {};

    for(const el of elements){
      if(!el) continue;
      const role = getRole(el);
      if(role === "background") continue;

      const zoneKey = roleToZone[role] || roleToZone.subhead || "center";
      const rect = rects[zoneKey] || rects.center || rects.text || rects.left || rects.bottom || null;
      if(!rect) continue;

      // Basic alignment heuristics per role
      let alignX = "left", alignY = "top", pad = 18;
      if(role === "image") { alignX = "center"; alignY = "middle"; pad = 14; }
      if(role === "cta")   { alignX = "center"; alignY = "middle"; pad = 16; }
      if(role === "badge") { alignX = "left";   alignY = "top";    pad = 14; }
      if(role === "headline"){ alignX = "left"; alignY = "top";    pad = 18; }

      placeInRect(el, rect, { alignX, alignY, pad });
    }

    // Persist canonical on template for downstream (non-destructive)
    tpl.layoutFamilyCanonical = family;
    if(tpl.contract && typeof tpl.contract === "object"){
      tpl.contract.layoutFamilyCanonical = tpl.contract.layoutFamilyCanonical || family;
      tpl.contract.layoutFamily = tpl.contract.layoutFamily || familyRaw;
    }
    return tpl;
  }

  root.NexoraZoneExecutor = { applyZonePlacement, canonFamilyId };
})();
