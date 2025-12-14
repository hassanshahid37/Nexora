// Nexora Design System v1 (Stable)
// Canva-level typography rules

export const STYLE_SYSTEM = {
  "Dark Premium": {
    headline: { size: 48, weight: 700, color: "#ffffff" },
    body: { size: 22, weight: 400, color: "#cfd3ff" }
  },
  "Minimal Clean": {
    headline: { size: 42, weight: 600, color: "#0b1020" },
    body: { size: 20, weight: 400, color: "#5b6270" }
  },
  "Bold Marketing": {
    headline: { size: 52, weight: 800, color: "#ffffff" },
    body: { size: 22, weight: 500, color: "#eef1ff" }
  },
  "Luxury Editorial": {
    headline: { size: 44, weight: 600, color: "#f5e6c8" },
    body: { size: 21, weight: 400, color: "#d6c9a8" }
  },
  "Modern Startup": {
    headline: { size: 40, weight: 600, color: "#e5edff" },
    body: { size: 20, weight: 400, color: "#aab0bd" }
  },
  "Quote Card": {
    headline: { size: 46, weight: 600, color: "#ffffff" },
    body: { size: 18, weight: 400, color: "#d1d5db" }
  }
};

export function applyStyleToTemplate(template, styleName){
  const style = STYLE_SYSTEM[styleName] || STYLE_SYSTEM["Dark Premium"];
  return {
    ...template,
    elements: template.elements.map((el, idx) => ({
      ...el,
      fontSize: idx === 0 ? style.headline.size : style.body.size,
      fontWeight: idx === 0 ? style.headline.weight : style.body.weight,
      color: idx === 0 ? style.headline.color : style.body.color
    }))
  };
}
