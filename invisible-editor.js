


// invisible-editor.js — Phase G1
// Generator-side invisible editor (data-driven, no UI)

(function () {
  if (window.__NEXORA_INVISIBLE_EDITOR__) return;
  window.__NEXORA_INVISIBLE_EDITOR__ = true;

  window.NEXORA_TEMPLATES = window.NEXORA_TEMPLATES || [];

  const originalRender = window.renderTemplates;
  if (typeof originalRender === "function") {
    window.renderTemplates = function (templates) {
      window.NEXORA_TEMPLATES = JSON.parse(JSON.stringify(templates || []));
      return originalRender.apply(this, arguments);
    };
  }

  window.applyPromptToTemplates = function (prompt) {
    if (!prompt || !Array.isArray(window.NEXORA_TEMPLATES)) return;
    window.NEXORA_TEMPLATES.forEach(t => {
      if (!t.layers) return;
      t.layers.forEach(l => {
        if (l.type === "text" && l.role === "headline") {
          l.text = prompt.slice(0, 80);
        }
      });
    });
  };

  window.getTemplateForEditor = function (index) {
    const t = window.NEXORA_TEMPLATES[index];
    return t ? JSON.parse(JSON.stringify(t)) : null;
  };

  console.log("Phase G1 Invisible Editor loaded");
})();
