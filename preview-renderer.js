/**
 * preview-renderer.js
 *
 * INTENTIONALLY DUMB RENDERER (Preview Authority)
 * - Accepts PreviewTemplateContract ONLY (pv1).
 * - No inference. No clamping. No density logic. No layout intelligence.
 * - Renders exactly what contract provides, scaled into the tile.
 *
 * Public APIs:
 * - window.NexoraPreviewRenderer.renderPreview(container, previewContract)
 * - window.NexoraPreview.renderTo(targetNode, previewContract)
 */

(function () {
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  function safeNum(x, d) {
    const n = Number(x);
    return Number.isFinite(n) ? n : d;
  }

  function pickText(el) {
    return String(
      el.text ??
      el.title ??
      el.label ??
      el.subtitle ??
      ""
    ).trim();
  }

  function applyCommonBoxStyles(node, el) {
    const st = (el && typeof el.style === "object") ? el.style : null;
    if (!st) return;

    // Visual-only keys. Geometry is already handled by x/y/w/h.
    if (st.borderRadius != null) node.style.borderRadius = safeNum(st.borderRadius, 0) + "px";
    if (st.radius != null && st.borderRadius == null) node.style.borderRadius = safeNum(st.radius, 0) + "px";
    if (st.opacity != null) node.style.opacity = String(st.opacity);

    // Border / stroke
    if (st.border) node.style.border = String(st.border);
    else if (st.stroke && typeof st.stroke === "object") {
      const sw = safeNum(st.stroke.width, 1);
      const sc = String(st.stroke.color || "rgba(255,255,255,.18)");
      node.style.border = sw + "px solid " + sc;
    }

    // Shadow
    if (st.boxShadow) node.style.boxShadow = String(st.boxShadow);
    else if (st.shadow && typeof st.shadow === "object") {
      const sx = safeNum(st.shadow.x, 0);
      const sy = safeNum(st.shadow.y, 0);
      const sb = safeNum(st.shadow.blur, 0);
      const sc = String(st.shadow.color || "rgba(0,0,0,.25)");
      node.style.boxShadow = `${sx}px ${sy}px ${sb}px ${sc}`;
    }
  }

  function createNode(el) {
    const role = String(el?.role || el?.type || "unknown").toLowerCase();

    const node = document.createElement("div");
    node.style.position = "absolute";
    node.style.left = safeNum(el.x, 0) + "px";
    node.style.top = safeNum(el.y, 0) + "px";
    node.style.width = Math.max(1, safeNum(el.w, 1)) + "px";
    node.style.height = Math.max(1, safeNum(el.h, 1)) + "px";
    node.style.boxSizing = "border-box";
    node.style.overflow = "hidden";

    // Background
    if (role === "background") {
      const bg =
        el.style?.background ||
        el.style?.backgroundColor ||
        "#0b1020";
      node.style.background = String(bg);
      return node;
    }

    // Image / logo
    if (role === "image" || role === "logo") {
      const bg =
        el.style?.background ||
        el.style?.backgroundColor ||
        "rgba(255,255,255,.06)";
      node.style.background = String(bg);
      node.style.border = node.style.border || "1px solid rgba(255,255,255,.14)";
      applyCommonBoxStyles(node, el);

      const src = el.src || el.url || el.style?.src || el.style?.url;
      if (src) {
        const img = document.createElement("img");
        img.src = String(src);
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.display = "block";
        img.style.objectFit = String(el.style?.objectFit || el.style?.fit || "cover");
        img.style.objectPosition = String(el.style?.objectPosition || "center");
        node.style.background = "transparent";
        node.appendChild(img);
      } else {
        // Placeholder label if src missing (still deterministic, still visible)
        const label = document.createElement("div");
        label.textContent = role === "logo" ? "LOGO" : "IMAGE";
        label.style.position = "absolute";
        label.style.left = "10px";
        label.style.bottom = "8px";
        label.style.fontFamily = "Inter, sans-serif";
        label.style.fontWeight = "800";
        label.style.fontSize = "18px";
        label.style.color = "rgba(255,255,255,.85)";
        node.appendChild(label);
      }
      return node;
    }

    // Shape
    if (role === "shape") {
      node.style.background = String(el.style?.backgroundColor || el.style?.background || "rgba(255,255,255,.10)");
      node.style.border = node.style.border || "1px solid rgba(255,255,255,.14)";
      applyCommonBoxStyles(node, el);
      return node;
    }

    // Badge
    if (role === "badge") {
      node.textContent = pickText(el) || "BADGE";
      node.style.display = "flex";
      node.style.alignItems = "center";
      node.style.justifyContent = "center";
      node.style.borderRadius = "999px";
      node.style.fontFamily = String(el.style?.fontFamily || "Inter, sans-serif");
      node.style.fontWeight = String(el.style?.fontWeight || 800);
      node.style.fontSize = safeNum(el.style?.fontSize, 22) + "px";
      node.style.color = String(el.style?.color || "#ffffff");
      node.style.background = String(el.style?.backgroundColor || el.style?.background || "rgba(255,255,255,.12)");
      node.style.border = node.style.border || "1px solid rgba(255,255,255,.18)";
      applyCommonBoxStyles(node, el);
      return node;
    }

    // CTA / button
    if (role === "cta") {
      node.textContent = pickText(el) || "Get Started";
      node.style.display = "flex";
      node.style.alignItems = "center";
      node.style.justifyContent = "center";
      node.style.fontFamily = String(el.style?.fontFamily || "Inter, sans-serif");
      node.style.fontWeight = String(el.style?.fontWeight || 800);
      node.style.fontSize = safeNum(el.style?.fontSize, 34) + "px";
      node.style.color = String(el.style?.color || "#ffffff");
      node.style.background = String(el.style?.backgroundColor || el.style?.background || "#7c3aed");
      node.style.borderRadius = safeNum(el.style?.borderRadius, 14) + "px";
      applyCommonBoxStyles(node, el);
      return node;
    }

    // Text roles: headline/subhead/body/meta (renderer does not clamp)
    if (role === "headline" || role === "subhead" || role === "body" || role === "meta") {
      node.textContent = pickText(el) || (role === "headline" ? "Title" : "Text");
      node.style.display = "flex";
      node.style.alignItems = "center";
      node.style.fontFamily = String(el.style?.fontFamily || "Poppins, sans-serif");
      node.style.fontWeight = String(el.style?.fontWeight || (role === "headline" ? 900 : 600));
      const fallbackSize = role === "headline" ? 84 : (role === "subhead" ? 44 : (role === "meta" ? 24 : 32));
      node.style.fontSize = safeNum(el.style?.fontSize, fallbackSize) + "px";
      node.style.lineHeight = String(el.style?.lineHeight || "1.08");
      node.style.color = String(el.style?.color || "#ffffff");
      // Respect overflow rules in contract style if provided; default keeps it contained.
      node.style.whiteSpace = String(el.style?.whiteSpace || "nowrap");
      node.style.textOverflow = String(el.style?.textOverflow || "ellipsis");
      node.style.overflow = String(el.style?.overflow || "hidden");
      applyCommonBoxStyles(node, el);
      return node;
    }

    // Unknown: still render deterministically
    node.textContent = pickText(el);
    applyCommonBoxStyles(node, el);
    return node;
  }

  function renderContract(container, previewContract) {
    if (!isBrowser || !container || !previewContract) return;

    const canvas = previewContract.canvas || {};
    const cw = safeNum(canvas.w ?? canvas.width, 1080);
    const ch = safeNum(canvas.h ?? canvas.height, 1080);

    // Do not touch outer sizing: controlled by CSS/layout.
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.overflow = "hidden";

    // Inner wrapper sized to preview canvas and scaled to fit container box.
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.left = "0";
    wrap.style.top = "0";
    wrap.style.width = cw + "px";
    wrap.style.height = ch + "px";

    const thumbW = container.clientWidth || 300;
    const thumbH = container.clientHeight || 220;
    const scale = Math.min(thumbW / cw, thumbH / ch);

    wrap.style.transform = "scale(" + scale + ")";
    wrap.style.transformOrigin = "top left";

    const els = Array.isArray(previewContract.elements) ? previewContract.elements : [];
    const sorted = [...els].sort((a, b) => {
      const ra = String(a?.role || a?.type || "").toLowerCase();
      const rb = String(b?.role || b?.type || "").toLowerCase();
      if (ra === "background" && rb !== "background") return -1;
      if (rb === "background" && ra !== "background") return 1;
      return 0;
    });

    sorted.forEach((el) => wrap.appendChild(createNode(el)));

    container.appendChild(wrap);
  }

  function renderPreview(container, previewContract) {
    renderContract(container, previewContract);
  }

  // Preview Authority signature: (targetNode, previewContract)
  function renderTo(targetNode, previewContract) {
    renderContract(targetNode, previewContract);
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
