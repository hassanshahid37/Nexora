




/**
 * preview-renderer.js — Nexora Preview Renderer v1
 * Spine-correct, client-only, deterministic renderer
 * Input: { contract, content }
 * Output: DOM only
 */

(function () {
  if (window.NexoraPreview) return;

  function noop() {}

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

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function applyStyles(node, style) {
    if (!style) return;
    if (style.fontSize) node.style.fontSize = style.fontSize + "px";
    if (style.fontWeight) node.style.fontWeight = style.fontWeight;
    if (style.casing === "uppercase") node.style.textTransform = "uppercase";
    if (style.casing === "capitalize") node.style.textTransform = "capitalize";
    if (style.stroke) {
      node.style.webkitTextStroke = style.stroke.width + "px " + style.stroke.color;
    }
  }

  function renderLayer(layer, content, meta) {
    const role = layer.role;
    const wrap = el("div", "nr-layer nr-" + role);

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

    return wrap;
  }
  function normalizeCanvas(contract, meta){
    // 1) Prefer Spine's normalizer if present
    try{
      if(window.NexoraSpine && typeof window.NexoraSpine.normalizeCanvas === "function"){
        const v = window.NexoraSpine.normalizeCanvas(contract?.canvas);
        if(v && v.width && v.height) return v;
      }
    }catch(_){ }

    // 2) Use contract.canvas if valid
    const w = Number(contract?.canvas?.width ?? contract?.canvas?.w);
    const h = Number(contract?.canvas?.height ?? contract?.canvas?.h);
    if(Number.isFinite(w) && Number.isFinite(h) && w>0 && h>0){
      return { width: Math.round(w), height: Math.round(h) };
    }

    // 3) P5.1 fallback: derive canvas from CategorySpecV1 using category
    try{
      const cat = (meta && meta.category) ? meta.category : (contract?.category || null);
      if(cat && window.normalizeCategory && window.CategorySpecV1){
        const norm = window.normalizeCategory(cat);
        const spec = (norm && typeof norm === "object") ? norm : (window.CategorySpecV1[String(norm || "")] || null);
        if(spec && spec.canvas && spec.canvas.w && spec.canvas.h){
          return { width: Math.round(spec.canvas.w), height: Math.round(spec.canvas.h) };
        }
      }
    }catch(_){ }

    return null;
  }

  
  // ---------- P7.1: Layout Family → Visual Binding (Preview Only) ----------
  function applyLayoutFamilyOrder(layers, family){
    try{
      if(!family || !Array.isArray(layers)) return layers;

      const H = {
        "text-first": ["headline","subhead","badge","cta","image"],
        "image-led": ["image","headline","subhead","badge","cta"],
        "split-hero": ["image","headline","subhead","badge","cta"]
      };
      const order = H[family];
      if(!order) return layers;

      const rank = Object.create(null);
      order.forEach((r,i)=>rank[r]=i);

      return layers.slice().sort((a,b)=>{
        const ra = rank[a.role] ?? 99;
        const rb = rank[b.role] ?? 99;
        return ra - rb;
      });
    }catch(_){
      return layers;
    }
  }


  function renderInto(root, payload){
    try{
      const contract = payload?.contract;
       const family = payload?.doc?.layout?.family || payload?.layout?.family || null;
      const content  = payload?.content || {};
      const metaIn   = payload?.meta || {};

      if (!root) return false;
      if (!validate(contract)) return false;

      clear(root);

      // Ensure absolute layers (e.g., background) are scoped to this root
      try{ root.style.position = root.style.position || "relative"; }catch(_){ }
      try{ root.style.overflow = root.style.overflow || "hidden"; }catch(_){ }

      const cv = normalizeCanvas(contract, metaIn);
      if (cv?.width && cv?.height) {
        root.style.aspectRatio = cv.width + " / " + cv.height;
      }

      const meta = {
        category: metaIn.category || contract.category,
        style: metaIn.style || contract.style || contract.archetype || null,
        palette: metaIn.palette || contract.palette || {}
      };

      // P7: render order is spine-authoritative.
      // If a layout family exists and a registry is present, honor its hierarchy to avoid preview drift.
      const baseLayers = Array.isArray(contract.layers) ? contract.layers : [];
      const ordered = (function(){
        try{
          const famId = contract && contract.layoutFamily ? String(contract.layoutFamily) : "";
          const reg = window.NexoraLayoutRegistry;
          if(!famId || !reg) return baseLayers;

          // Registry API is contract: getLayoutFamily(id) (preferred)
          // Fallbacks are kept to avoid regressions if registry shape changes.
          const fam =
            (typeof reg.getLayoutFamily === "function") ? reg.getLayoutFamily(famId) :
            (reg.REGISTRY && reg.REGISTRY[famId]) ? reg.REGISTRY[famId] :
            (typeof reg.get === "function") ? reg.get(famId) :
            (reg[famId] || null);
          const hierarchy = Array.isArray(fam?.hierarchy) ? fam.hierarchy : null;
          if(!hierarchy || !hierarchy.length) return baseLayers;
          const idx = new Map(hierarchy.map((r,i)=>[String(r), i]));
          // Stable sort: background first, then hierarchy order, then anything else.
          return baseLayers.slice().sort((a,b)=>{
            const ra = String(a?.role||"");
            const rb = String(b?.role||"");
            if(ra === "background" && rb !== "background") return -1;
            if(rb === "background" && ra !== "background") return 1;
            const ia = idx.has(ra) ? idx.get(ra) : 1e9;
            const ib = idx.has(rb) ? idx.get(rb) : 1e9;
            if(ia != ib) return ia - ib;
            return 0;
          });
        }catch(_){
          return baseLayers;
        }
      })();

      ordered.forEach(layer => {
        const node = renderLayer(layer, content, meta);
        if (node) root.appendChild(node);
      });

      return true;
    }catch(_){
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
