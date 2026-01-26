/**
 * preview-renderer.js
 * Renderer authority for Nexora homepage tiles.
 *
 * Fixes in this version:
 * - Adds window.NexoraPreview.renderTo(targetNode, payload) (required by index.html)
 * - Supports Nexora element schemas from generator/editor:
 *     type: bg/photo/image/shape/text/heading/headline/subhead/pill/badge/chip/button/cta
 * - Works even when elements have no x/y/w/h (derives a simple stacked layout)
 * - Browser-safe AND Node-safe (no document access unless available)
 */

(function () {
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  function norm(s) { return String(s || "").toLowerCase(); }

  function inferRole(el) {
    const r = norm(el.role);
    if (r) return r;
    const t = norm(el.type);
    if (t === "bg" || t === "background") return "background";
    if (t === "photo" || t === "image") return "image";
    if (t === "pill" || t === "badge" || t === "chip") return "badge";
    if (t === "button" || t === "cta") return "cta";
    if (t === "headline" || t === "heading" || t === "h1" || t === "title") return "headline";
    if (t === "subhead" || t === "subheadline" || t === "h2") return "subhead";
    if (t === "text") {
      const size = Number(el.size || el.style?.fontSize || 0);
      const weight = Number(el.weight || el.style?.fontWeight || 0);
      if (weight >= 800 || size >= 46) return "headline";
      return "body";
    }
    if (t === "shape") return "shape";
    return "unknown";
  }

  function pickText(el) {
    return String(
      el.text ??
      el.title ??
      el.label ??
      el.sub ??
      el.subtitle ??
      el.content ??
      ""
    ).trim();
  }

  function safeNum(x, d) {
    const n = Number(x);
    return Number.isFinite(n) ? n : d;
  }

  function ensureGeom(el, canvasW, canvasH, slotIndex, role) {
    // If any geom exists, trust it.
    const hasAny = ["x","y","w","h"].some(k => el[k] !== undefined && el[k] !== null);
    if (hasAny) {
      return {
        x: safeNum(el.x, 0),
        y: safeNum(el.y, 0),
        w: safeNum(el.w, canvasW),
        h: safeNum(el.h, canvasH),
      };
    }

    // Otherwise derive a simple stacked layout (Canva-ish preview)
    const pad = Math.round(canvasW * 0.08);
    if (role === "background") return { x: 0, y: 0, w: canvasW, h: canvasH };
    if (role === "badge") return { x: pad, y: pad, w: Math.round(canvasW * 0.35), h: Math.round(canvasH * 0.08) };
    if (role === "headline") return { x: pad, y: Math.round(canvasH * 0.22), w: canvasW - pad*2, h: Math.round(canvasH * 0.25) };
    if (role === "subhead" || role === "body") return { x: pad, y: Math.round(canvasH * 0.48), w: canvasW - pad*2, h: Math.round(canvasH * 0.18) };
    if (role === "cta") return { x: pad, y: Math.round(canvasH * 0.74), w: Math.round(canvasW * 0.42), h: Math.round(canvasH * 0.10) };
    if (role === "image") return { x: Math.round(canvasW * 0.58), y: Math.round(canvasH * 0.18), w: Math.round(canvasW * 0.34), h: Math.round(canvasH * 0.42) };
    if (role === "shape") return { x: pad, y: Math.round(canvasH * 0.64), w: Math.round(canvasW * 0.18), h: Math.round(canvasH * 0.12) };

    // fallback slot boxes
    const y = pad + slotIndex * Math.round(canvasH * 0.12);
    return { x: pad, y, w: canvasW - pad*2, h: Math.round(canvasH * 0.10) };
  }

  function createNode(el, canvasW, canvasH, slotIndex) {
    const role = inferRole(el);
    const geom = ensureGeom(el, canvasW, canvasH, slotIndex, role);

    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = geom.x + "px";
    div.style.top = geom.y + "px";
    div.style.width = geom.w + "px";
    div.style.height = geom.h + "px";
    div.style.boxSizing = "border-box";

    if (role === "background") {
      div.style.background =
        el.style?.background ||
        el.style?.backgroundColor ||
        "linear-gradient(135deg,#0b1020,#1b2340)";
      return div;
    }

    if (role === "image") {
      // Lightweight image placeholder (no external fetch)
      div.style.borderRadius = "14px";
      div.style.background =
        "radial-gradient(160px 80px at 20% 20%, rgba(11,95,255,.24), transparent 60%)," +
        "radial-gradient(140px 90px at 90% 35%, rgba(136,71,255,.18), transparent 60%)," +
        "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03))";
      div.style.border = "1px solid rgba(255,255,255,.14)";
      const label = document.createElement("div");
      label.textContent = "IMAGE";
      label.style.position = "absolute";
      label.style.left = "10px";
      label.style.bottom = "8px";
      label.style.fontFamily = "Inter, sans-serif";
      label.style.fontWeight = "800";
      label.style.fontSize = "18px";
      label.style.color = "rgba(255,255,255,.85)";
      div.appendChild(label);
      return div;
    }

    if (role === "badge") {
      div.textContent = pickText(el) || "BADGE";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.borderRadius = "999px";
      div.style.fontFamily = el.style?.fontFamily || "Inter, sans-serif";
      div.style.fontWeight = el.style?.fontWeight || 800;
      div.style.fontSize = (safeNum(el.style?.fontSize, 22)) + "px";
      div.style.color = el.style?.color || "#ffffff";
      div.style.background = el.style?.backgroundColor || "rgba(255,255,255,.12)";
      div.style.border = "1px solid rgba(255,255,255,.18)";
      return div;
    }

    if (role === "headline" || role === "subhead" || role === "body") {
      div.textContent = pickText(el) || (role === "headline" ? "Title" : "Subtitle");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.fontFamily = el.style?.fontFamily || "Poppins, sans-serif";
      div.style.fontWeight = el.style?.fontWeight || (role === "headline" ? 900 : 600);
      const fallbackSize = role === "headline" ? 84 : (role === "subhead" ? 44 : 32);
      div.style.fontSize = (safeNum(el.style?.fontSize ?? el.size, fallbackSize)) + "px";
      div.style.lineHeight = "1.08";
      div.style.color = el.style?.color || "#ffffff";
      return div;
    }

    if (role === "cta") {
      div.textContent = pickText(el) || "Get Started";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.fontFamily = el.style?.fontFamily || "Inter, sans-serif";
      div.style.fontWeight = el.style?.fontWeight || 800;
      div.style.fontSize = (safeNum(el.style?.fontSize ?? el.size, 34)) + "px";
      div.style.color = el.style?.color || "#ffffff";
      div.style.background = el.style?.backgroundColor || "#7c3aed";
      div.style.borderRadius = (safeNum(el.style?.borderRadius, 14)) + "px";
      return div;
    }

    if (role === "shape") {
      div.style.borderRadius = "16px";
      div.style.background = el.style?.backgroundColor || "rgba(255,255,255,.10)";
      div.style.border = "1px solid rgba(255,255,255,.14)";
      return div;
    }

    return div;
  }

  function renderContract(container, contract) {
    if (!isBrowser || !container || !contract) return;

    container.innerHTML = "";
    container.style.position = "relative";
    container.style.overflow = "hidden";

    const cw = safeNum(contract.canvas?.w || contract.canvas?.width, 1080);
    const ch = safeNum(contract.canvas?.h || contract.canvas?.height, 1080);

    container.style.width = cw + "px";
    container.style.height = ch + "px";
    // Tile scale (keeps nice thumbnail footprint)
    container.style.transform = "scale(0.22)";
    container.style.transformOrigin = "top left";

    const elements = Array.isArray(contract.elements) ? contract.elements : [];

    // Ensure background first for visual sanity.
    const sorted = [...elements].sort((a,b)=>{
      const ra = inferRole(a);
      const rb = inferRole(b);
      if (ra === "background") return -1;
      if (rb === "background") return 1;
      return 0;
    });

    sorted.forEach((el, idx)=>{
      const node = createNode(el, cw, ch, idx);
      container.appendChild(node);
    });
  }

  // Backward compat API
  function renderPreview(container, contract) {
    renderContract(container, contract);
  }

  // Missing API expected by index.html + TemplateOutputController
  function renderTo(targetNode, payload) {
    if (!isBrowser || !targetNode || !payload) return;

    const hasSpine = !!payload.contract;
    const canvas =
      (hasSpine && payload.contract?.canvas) ||
      payload.canvas ||
      payload.contract?.canvas ||
      { w: 1080, h: 1080 };

    const elements =
      payload.content?.elements ||
      payload.contract?.elements ||
      payload.elements ||
      [];

    const contract = {
      canvas: canvas.canvas || canvas, // tolerate {canvas:{w,h}} and {w,h}
      elements: Array.isArray(elements) ? elements : []
    };

    renderContract(targetNode, contract);
  }

  try {
    if (typeof window !== "undefined") {
      window.NexoraPreviewRenderer = { renderPreview };
      window.NexoraPreview = { renderTo };
    }
    if (typeof module !== "undefined") {
      module.exports = { renderPreview, renderTo };
    }
  } catch (_) {}
})();
