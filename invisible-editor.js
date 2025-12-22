
// invisible-editor.js — Editor Handoff Fix (AD-H1)
// Ensures generated templates are injected into Manual Editor
// No UI / HTML / CSS changes

(function () {
  if (window.__NEXORA_EDITOR_HANDOFF__) return;
  window.__NEXORA_EDITOR_HANDOFF__ = true;

  const STORAGE_KEY = "NEXORA_LAST_TEMPLATES";

  // Capture templates at generation time
  const originalRender = window.renderTemplates;
  if (typeof originalRender === "function") {
    window.renderTemplates = function (templates) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates || []));
      } catch (e) {}
      return originalRender.apply(this, arguments);
    };
  }

  // When editor loads, inject last generated template
  function injectIntoEditor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const templates = JSON.parse(raw);
      if (!templates || !templates.length) return;

      // Prefer first template
      const tpl = templates[0];

      // Common editor loaders
      if (typeof window.loadTemplate === "function") {
        window.loadTemplate(tpl);
        console.log("[Nexora] Template injected via loadTemplate");
        return;
      }
      if (typeof window.setCanvasFromTemplate === "function") {
        window.setCanvasFromTemplate(tpl);
        console.log("[Nexora] Template injected via setCanvasFromTemplate");
        return;
      }

      // Fallback: expose for manual trigger
      window.__NEXORA_PENDING_TEMPLATE__ = tpl;
      console.log("[Nexora] Template ready for editor (pending)");
    } catch (e) {}
  }

  // Run on editor pages
  if (location.pathname.includes("editor")) {
    window.addEventListener("load", injectIntoEditor);
  }
})();
