
// PATCH: Global sandboxing — legacy style engine is opt-in only.
function shouldApplyLegacyStyle(category){
  return false;
}


// style-engine.js (CommonJS)
// Decides HOW elements should look

function applyStyle({ category, archetype, elementType }) {
  const style = {
    fontSize: 48,
    fontWeight: 600,
    casing: "none",
    stroke: null,
    overlay: null,
    imageFilter: null
  };

  if(!shouldApplyLegacyStyle(category)) return style;

  if (elementType === "headline") {
    if (archetype === "AUTHORITY_EXPERT") {
      style.fontSize = 96;
      style.fontWeight = 900;
      style.casing = "uppercase";
      style.stroke = { width: 6, color: "#000000" };
    }
    if (archetype === "EDUCATIONAL_EXPLAINER") {
      style.fontSize = 72;
      style.fontWeight = 700;
      style.casing = "capitalize";
    }
    if (archetype === "NEWS_URGENT") {
      style.fontSize = 88;
      style.fontWeight = 900;
      style.casing = "uppercase";
      style.stroke = { width: 4, color: "#ff0000" };
    }
  }
  return style;
}

// UMD-ish export: Node (server) + Browser (client)
try {
  if (typeof module !== "undefined" && module.exports) module.exports = { applyStyle };
} catch (_) {}
try {
  if (typeof window !== "undefined") window.applyStyle = window.applyStyle || applyStyle;
} catch (_) {}
