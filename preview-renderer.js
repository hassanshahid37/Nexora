
/**
 * preview-renderer.js
 * PROPER FIX (Renderer Truth)
 *
 * Goals:
 * - Preserve existing API (backward compatible)
 * - Render REAL elements[] when in browser
 * - Be SAFE in Node/Vercel (no document access)
 * - If preview tiles call this file, visuals WILL change
 */

(function () {
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  function renderElements(container, contract) {
    if (!isBrowser || !container || !contract) return;

    container.innerHTML = "";
    container.style.position = "relative";
    container.style.overflow = "hidden";

    const cw = contract.canvas?.w || contract.canvas?.width || 300;
    const ch = contract.canvas?.h || contract.canvas?.height || 300;

    container.style.width = cw + "px";
    container.style.height = ch + "px";
    container.style.transform = "scale(0.22)";
    container.style.transformOrigin = "top left";

    const elements = Array.isArray(contract.elements) ? contract.elements : [];

    for (const el of elements) {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = (el.x || 0) + "px";
      div.style.top = (el.y || 0) + "px";
      div.style.width = (el.w || 0) + "px";
      div.style.height = (el.h || 0) + "px";
      div.style.boxSizing = "border-box";

      if (el.role === "background") {
        div.style.background =
          el.style?.background ||
          el.style?.backgroundColor ||
          "linear-gradient(135deg,#0b1020,#1b2340)";
      }

      if (el.role === "headline" || el.role === "subhead") {
        div.textContent = el.text || el.content || "Good Life";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.fontFamily = el.style?.fontFamily || "Poppins, sans-serif";
        div.style.fontWeight = el.style?.fontWeight || 800;
        div.style.fontSize = ((el.style?.fontSize || 72)) + "px";
        div.style.lineHeight = "1.1";
        div.style.color = el.style?.color || "#ffffff";
      }

      if (el.role === "cta") {
        div.textContent = el.text || "Get Started";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.fontFamily = el.style?.fontFamily || "Inter, sans-serif";
        div.style.fontWeight = 700;
        div.style.fontSize = ((el.style?.fontSize || 28)) + "px";
        div.style.color = "#ffffff";
        div.style.background = el.style?.backgroundColor || "#7c3aed";
        div.style.borderRadius = "12px";
      }

      container.appendChild(div);
    }
  }

  /**
   * BACKWARD COMPAT API
   * Some parts of Nexora call renderPreview(container, contract)
   * Others may call render(contract, container)
   * We support BOTH.
   */

  function renderPreview(container, contract) {
    renderElements(container, contract);
  }

  function render(contract, container) {
    renderElements(container, contract);
  }

  // Exports
  try {
    if (typeof module !== "undefined" && module.exports) {
      module.exports = {
        renderPreview,
        render
      };
    }
    if (isBrowser) {
      window.NexoraPreviewRenderer = {
        renderPreview,
        render
      };
    }
  } catch (_) {}
})();
