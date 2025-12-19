
// Visual Phase Upgrade – Prompt-aware visuals (client-side)
// No UI touched

export function applyVisual(template, prompt) {
  const p = (prompt || "").toLowerCase();

  if (p.includes("hiring") || p.includes("job")) {
    template.visual = "people-team";
    template.accent = "#4f7cff";
  } else if (p.includes("sale") || p.includes("discount")) {
    template.visual = "product-promo";
    template.accent = "#ff7a18";
  } else {
    template.visual = "brand-abstract";
    template.accent = "#6a5cff";
  }

  return template;
}
