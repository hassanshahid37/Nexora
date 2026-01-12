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
      return !!(window.NexoraSpine &&
        typeof window.NexoraSpine.validateContract === "function" &&
        window.NexoraSpine.validateContract(contract));
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

    const applyStyle = window.applyStyle || noop;
    const style = applyStyle({
      category: meta.category,
      archetype: meta.style,
      elementType: role
    });

    if (role === "background") {
      wrap.style.position = "absolute";
      wrap.style.inset = "0";
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

  
  function normalizeCanvas(contract){
    try{
      if(window.NexoraSpine && typeof window.NexoraSpine.normalizeCanvas === "function"){
        return window.NexoraSpine.normalizeCanvas(contract?.canvas) || null;
      }
    }catch(_){}
    const w = Number(contract?.canvas?.width ?? contract?.canvas?.w);
    const h = Number(contract?.canvas?.height ?? contract?.canvas?.h);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w<=0 || h<=0) return null;
    return { width: Math.round(w), height: Math.round(h) };
  }

  function renderInto(root, payload){
    try{
      const contract = payload?.contract;
      const content  = payload?.content || {};
      const metaIn   = payload?.meta || {};

      if (!root) return false;
      if (!validate(contract)) return false;

      clear(root);

      const cv = normalizeCanvas(contract);
      if (cv?.width && cv?.height) {
        root.style.aspectRatio = cv.width + " / " + cv.height;
      }

      const meta = {
        category: metaIn.category || contract.category,
        style: metaIn.style || contract.style || contract.archetype || null,
        palette: metaIn.palette || contract.palette || {}
      };

      const layers = Array.isArray(contract.layers) ? contract.layers : [];
      layers.forEach(layer => {
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
