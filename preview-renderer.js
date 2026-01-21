// preview-renderer.js — Nexora Preview Renderer v1
// Spine-correct, client-only, deterministic renderer
// Input: { contract, content, meta? }
// Output: DOM only

(function () {
  if (window.NexoraPreview) return;

  function noop() {}

  // ---------- Small, safe helpers ----------
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function validate(contract) {
    try {
      const ns = window.NexoraSpine || {};
      if (typeof ns.validateContract === "function") return !!ns.validateContract(contract);

      // Fallback validator (keeps preview working even if script order changes)
      if (!contract || typeof contract !== "object") return false;
      if (contract.version && String(contract.version) !== "v1") return false;
      if (!contract.templateId) return false;
      if (!contract.category) return false;
      const w = Number(contract?.canvas?.width ?? contract?.canvas?.w);
      const h = Number(contract?.canvas?.height ?? contract?.canvas?.h);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
      if (!Array.isArray(contract.layers)) return false;
      return true;
    } catch {
      return false;
    }
  }

  function normalizeCanvas(contract, meta) {
    // 1) Prefer Spine's normalizer if present
    try {
      if (window.NexoraSpine && typeof window.NexoraSpine.normalizeCanvas === "function") {
        const v = window.NexoraSpine.normalizeCanvas(contract?.canvas);
        if (v && v.width && v.height) return v;
      }
    } catch (_) {}

    // 2) Use contract.canvas if valid
    const w = Number(contract?.canvas?.width ?? contract?.canvas?.w);
    const h = Number(contract?.canvas?.height ?? contract?.canvas?.h);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: Math.round(w), height: Math.round(h) };
    }

    // 3) P5.1 fallback: derive canvas from CategorySpecV1 using category
    try {
      const cat = (meta && meta.category) ? meta.category : (contract?.category || null);
      if (cat && window.normalizeCategory && window.CategorySpecV1) {
        const norm = window.normalizeCategory(cat);
        const spec = (norm && typeof norm === "object") ? norm : (window.CategorySpecV1[String(norm || "")] || null);
        if (spec && spec.canvas && spec.canvas.w && spec.canvas.h) {
          return { width: Math.round(spec.canvas.w), height: Math.round(spec.canvas.h) };
        }
      }
    } catch (_) {}

    return null;
  }

  function normalizeContent(raw) {
    // Keep it dead simple: preview must never crash on missing keys.
    const c = (raw && typeof raw === "object") ? raw : {};
    return {
      headline: (c.headline == null) ? "" : String(c.headline),
      subhead: (c.subhead == null) ? "" : String(c.subhead),
      cta: (c.cta == null) ? "" : String(c.cta),
      badge: (c.badge == null) ? "" : String(c.badge),
      body: (c.body == null) ? "" : String(c.body),
    };
  }

  function applyStyles(node, style) {
    if (!style) return;
    if (style.fontSize) node.style.fontSize = style.fontSize + "px";
    if (style.fontWeight) node.style.fontWeight = style.fontWeight;
    if (style.casing === "uppercase") node.style.textTransform = "uppercase";
    if (style.casing === "capitalize") node.style.textTransform = "capitalize";
    if (style.stroke) node.style.webkitTextStroke = style.stroke.width + "px " + style.stroke.color;
  }

  // ---------- Layer renderer (visual only; geometry handled by ZoneExecutor) ----------
  function renderLayer(layer, content, meta) {
    const role = layer.role;
    const wrap = el("div", "nr-layer nr-" + role);

    // Default styling (ZoneExecutor may override position/size)
    wrap.style.position = "relative";
    wrap.style.margin = "12px";
    wrap.style.zIndex = "1";

    const applyStyle = window.applyStyle || noop;
    const style = applyStyle({
      category: meta.category,
      archetype: meta.archetype || meta.style,
      elementType: role
    });

    if (role === "background") {
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
      wrap.style.margin = "0";
      wrap.style.zIndex = "0";
      wrap.style.pointerEvents = "none";
      wrap.style.background = meta.palette?.bg || "#111";
      return wrap;
    }

    if (role === "image") {
      const img = el("div", "nr-image");
      img.style.width = "100%";
      img.style.height = "220px";
      img.style.background = "#222";
      img.style.borderRadius = "16px";
      wrap.appendChild(img);
      return wrap;
    }

    if (role === "headline") {
      const h = el("div", "nr-headline");
      h.textContent = content.headline || "";
      applyStyles(h, style);
      wrap.appendChild(h);
      return wrap;
    }

    if (role === "subhead") {
      const p = el("div", "nr-subhead");
      p.textContent = content.subhead || "";
      applyStyles(p, style);
      wrap.appendChild(p);
      return wrap;
    }

    if (role === "cta") {
      const b = el("button", "nr-cta");
      b.type = "button";
      b.textContent = content.cta || "CTA";
      applyStyles(b, style);
      wrap.appendChild(b);
      return wrap;
    }

    if (role === "badge") {
      const s = el("span", "nr-badge");
      s.textContent = content.badge || "";
      applyStyles(s, style);
      wrap.appendChild(s);
      return wrap;
    }

    if (role === "body") {
      const t = el("div", "nr-body");
      t.textContent = content.body || "";
      applyStyles(t, style);
      wrap.appendChild(t);
      return wrap;
    }

    return wrap;
  }

  // ---------- Zone bridge: ZoneRegistry pixel rects -> ZoneExecutor fractional zones ----------
  function getZonesFracFromRegistry(zoneRegistry, familyCanon, cv) {
    try {
      if (!zoneRegistry || !cv?.width || !cv?.height) return null;

      // Preferred: P8 registry contract
      if (typeof zoneRegistry.getZoneRects === "function") {
        const rects = (zoneRegistry.getZoneRects.length >= 3)
          ? zoneRegistry.getZoneRects(familyCanon, cv.width, cv.height)
          : zoneRegistry.getZoneRects({ family: familyCanon, canvas: { w: cv.width, h: cv.height } });
        if (!rects || typeof rects !== "object") return null;

        const frac = Object.create(null);
        for (const k of Object.keys(rects)) {
          const r = rects[k];
          const x = Number(r?.x), y = Number(r?.y), w = Number(r?.w), h = Number(r?.h);
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;
          frac[k] = { x: x / cv.width, y: y / cv.height, w: w / cv.width, h: h / cv.height };
        }
        return Object.keys(frac).length ? frac : null;
      }

      // Fallback: older API returning fractional zones directly
      if (typeof zoneRegistry.getZones === "function") {
        const z = zoneRegistry.getZones(familyCanon);
        return (z && typeof z === "object") ? z : null;
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  // ---------- Render entry ----------
  function renderInto(root, payload) {
    try {
      const contract = payload?.contract;
      const metaIn = payload?.meta || {};
      const content = normalizeContent(payload?.content);

      if (!root) return false;
      if (!validate(contract)) return false;

      clear(root);

      // Ensure abs-position children are scoped to this root
      try { root.style.position = root.style.position || "relative"; } catch (_) {}
      try { root.style.overflow = root.style.overflow || "hidden"; } catch (_) {}

      const cv = normalizeCanvas(contract, metaIn);
      if (cv?.width && cv?.height) root.style.aspectRatio = cv.width + " / " + cv.height;

      const meta = {
        category: metaIn.category || contract.category,
        style: metaIn.style || contract.style || contract.archetype || null,
        archetype: metaIn.archetype || contract.archetype || null,
        palette: metaIn.palette || contract.palette || {}
      };

      const baseLayers = Array.isArray(contract.layers) ? contract.layers : [];

      // P7: render order is spine-authoritative.
      // If a layout family exists and a registry is present, honor its hierarchy to avoid preview drift.
      const ordered = (function () {
        try {
          const famId = contract && contract.layoutFamily ? String(contract.layoutFamily) : "";
          const reg = window.NexoraLayoutRegistry;
          if (!famId || !reg) return baseLayers;

          const fam =
            (typeof reg.getLayoutFamily === "function") ? reg.getLayoutFamily(famId) :
            (reg.REGISTRY && reg.REGISTRY[famId]) ? reg.REGISTRY[famId] :
            (typeof reg.get === "function") ? reg.get(famId) :
            (reg[famId] || null);

          const hierarchy = Array.isArray(fam?.hierarchy) ? fam.hierarchy : null;
          if (!hierarchy || !hierarchy.length) return baseLayers;

          const idx = new Map(hierarchy.map((r, i) => [String(r), i]));
          return baseLayers.slice().sort((a, b) => {
            const ra = String(a?.role || "");
            const rb = String(b?.role || "");
            if (ra === "background" && rb !== "background") return -1;
            if (rb === "background" && ra !== "background") return 1;
            const ia = idx.has(ra) ? idx.get(ra) : 1e9;
            const ib = idx.has(rb) ? idx.get(rb) : 1e9;
            if (ia !== ib) return ia - ib;
            return 0;
          });
        } catch (_) {
          return baseLayers;
        }
      })();

      // P8 Phase-3: Single authority placements
      const zoneRegistry = (window.NexoraZoneRegistry || window.NexoraZones) || null;
      const zoneExec = (window.NexoraZoneExecutor && typeof window.NexoraZoneExecutor.computePlacements === "function")
        ? window.NexoraZoneExecutor
        : null;

      // placements: Map<idx, {rect:{x,y,w,h}}>
      let placements = null;

      // Helper: apply absolute placement
      function applyPlacementStyle(node, rect){
        if(!node || !rect) return;
        try{
          node.style.position = "absolute";
          node.style.margin = "0";
          node.style.left = Math.round(rect.x) + "px";
          node.style.top = Math.round(rect.y) + "px";
          node.style.width = Math.round(rect.w) + "px";
          node.style.height = Math.round(rect.h) + "px";
        }catch(_){ }
      }

      // 1) Preferred: use ZoneExecutor if it supports computePlacements + applyPlacementStyle
      try {
        if (zoneExec && zoneRegistry && cv?.width && cv?.height) {
          const famCanon = (typeof zoneExec.canonFamilyId === "function") ? zoneExec.canonFamilyId(contract) : "text-first";
          const zonesFrac = getZonesFracFromRegistry(zoneRegistry, famCanon, cv);
          if (zonesFrac) {
            const computed = zoneExec.computePlacements({
              contract,
              orderedLayers: ordered,
              getZones: () => zonesFrac
            });
            placements = computed?.placements || null;
          }
        }
      } catch (_) {
        placements = null;
      }

      // 2) Fallback: compute placements directly from ZoneRegistry pixel rects
      try{
        if(!placements && zoneRegistry && cv?.width && cv?.height && typeof zoneRegistry.getZoneRects === "function"){
          const famCanon = String(contract?.layoutFamilyCanonical || contract?.layoutFamily || "text-first");
          const rects = (zoneRegistry.getZoneRects.length >= 3)
            ? zoneRegistry.getZoneRects(famCanon, cv.width, cv.height)
            : zoneRegistry.getZoneRects({ family: famCanon, canvas: { w: cv.width, h: cv.height } });

          if(rects && typeof rects === "object"){
            const getRoleToZone = (typeof zoneRegistry.getRoleToZone === "function")
              ? (role) => zoneRegistry.getRoleToZone(famCanon, role)
              : (role) => role;

            const map = new Map();
            ordered.forEach((layer, idx) => {
              const role = String(layer?.role || "");
              if(!role || role === "background") return;
              const zoneName = String(getRoleToZone(role) || role);
              const r = rects[zoneName] || rects[role] || null;
              if(r && Number.isFinite(Number(r.x)) && Number.isFinite(Number(r.y)) && Number.isFinite(Number(r.w)) && Number.isFinite(Number(r.h))){
                map.set(idx, { rect: { x:Number(r.x), y:Number(r.y), w:Number(r.w), h:Number(r.h) } });
              }
            });
            placements = map.size ? map : null;
          }
        }
      }catch(_){ placements = placements; }

      // Render
      ordered.forEach((layer, idx) => {
        const node = renderLayer(layer, content, meta);
        if (!node) return;

        // Background stays full-bleed
        if (layer && layer.role === "background") {
          root.appendChild(node);
          return;
        }

        // Apply zone placement if available
        try {
          if (placements) {
            const p = placements.get(idx);
            if (p && p.rect) {
              if (zoneExec && typeof zoneExec.applyPlacementStyle === "function") zoneExec.applyPlacementStyle(node, p.rect);
              else applyPlacementStyle(node, p.rect);
            }
          }
        } catch (_) {}

        root.appendChild(node);
      });

      return true;
    } catch (_) {
      return false;
    }
  }

  window.NexoraPreview = {
    // Render into the homepage editor canvas (back-compat)
    render(payload) {
      const root = document.getElementById("canvas");
      return renderInto(root, payload);
    },

    // Render into any container (thumb tiles)
    renderTo(target, payload) {
      return renderInto(target, payload);
    }
  };
})();
