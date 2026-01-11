// style-engine.js
// Nexora Style Execution Layer (v1)
// Decides HOW things should look (no rendering here)

export function applyStyle({ category, archetype, elementType }) {
  const style = {
    fontSize: 48,
    fontWeight: 600,
    casing: "none",
    stroke: null,
    overlay: null,
    imageFilter: null
  };

  if (category !== "YouTube Thumbnail") return style;

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
