// design.js — Canva-level Layout Intelligence Upgrade
// SAFE: UI-agnostic, preview-agnostic, editor-compatible

export function generateTemplates(count = 24) {
  const layouts = [
    heroLeftImageRight,
    fullBleedImageOverlay,
    minimalTypography,
    badgePromo,
    editorialAnnouncement
  ];

  const palettes = [
    { bg: "#0b1220", primary: "#ffffff", accent: "#4f8cff", muted: "#aab0bd" },
    { bg: "#052016", primary: "#eafff4", accent: "#22c55e", muted: "#7dd3a7" },
    { bg: "#1f1409", primary: "#fff7ed", accent: "#f59e0b", muted: "#fdba74" },
    { bg: "#1b0f17", primary: "#fde7f3", accent: "#ec4899", muted: "#f9a8d4" },
    { bg: "#0f1a17", primary: "#ecfeff", accent: "#06b6d4", muted: "#67e8f9" }
  ];

  const templates = [];

  for (let i = 0; i < count; i++) {
    const layout = layouts[i % layouts.length];
    const palette = palettes[i % palettes.length];
    templates.push(layout(i, palette));
  }

  return templates;
}

/* ---------- LAYOUT ARCHETYPES ---------- */

function heroLeftImageRight(i, p) {
  return {
    title: `Hero Brand #${i + 1}`,
    canvas: { width: 1080, height: 1080, background: p.bg },
    elements: [
      heading("Grow Your Brand", 90, 140, 520, 96, p.primary),
      text("Premium design built to convert", 90, 270, 460, 34, p.muted),
      cta("Shop Now", 90, 360, p.accent),
      image(600, 120, 380, 840)
    ]
  };
}

function fullBleedImageOverlay(i, p) {
  return {
    title: `Visual Impact #${i + 1}`,
    canvas: { width: 1080, height: 1080, background: p.bg },
    elements: [
      image(0, 0, 1080, 1080),
      overlay(0.45),
      heading("Discover the Moment", 120, 420, 840, 88, p.primary, "center"),
      text("Bold visuals. Clear message.", 120, 520, 840, 30, p.muted, "center")
    ]
  };
}

function minimalTypography(i, p) {
  return {
    title: `Minimal Type #${i + 1}`,
    canvas: { width: 1080, height: 1080, background: p.bg },
    elements: [
      heading("Midnight Thoughts", 140, 420, 800, 104, p.primary),
      text("A calm, modern statement.", 140, 560, 600, 32, p.muted)
    ]
  };
}

function badgePromo(i, p) {
  return {
    title: `Limited Offer #${i + 1}`,
    canvas: { width: 1080, height: 1080, background: p.bg },
    elements: [
      badge("LIMITED", 90, 90, p.accent),
      heading("Flash Sale", 90, 200, 720, 96, p.primary),
      cta("Get 30% Off", 90, 320, p.accent),
      image(90, 420, 900, 500)
    ]
  };
}

function editorialAnnouncement(i, p) {
  return {
    title: `Editorial #${i + 1}`,
    canvas: { width: 1080, height: 1080, background: p.bg },
    elements: [
      heading("Celebrate in Style", 120, 180, 840, 88, p.primary, "center"),
      divider(120, 300, 840),
      text("Join us for an exclusive event", 120, 340, 840, 32, p.muted, "center"),
      cta("Reserve Spot", 420, 420, p.accent)
    ]
  };
}

/* ---------- ELEMENT HELPERS ---------- */

function heading(text, x, y, width, size, color, align = "left") {
  return { type: "heading", text, x, y, width, fontSize: size, fontWeight: 700, color, align };
}

function text(text, x, y, width, size, color, align = "left") {
  return { type: "text", text, x, y, width, fontSize: size, fontWeight: 400, color, align };
}

function cta(text, x, y, color) {
  return { type: "button", text, x, y, width: 280, height: 64, background: color, color: "#fff", radius: 999 };
}

function image(x, y, w, h) {
  return { type: "image", x, y, width: w, height: h };
}

function badge(text, x, y, color) {
  return { type: "badge", text, x, y, background: color, color: "#fff" };
}

function divider(x, y, w) {
  return { type: "divider", x, y, width: w, height: 2, color: "rgba(255,255,255,.2)" };
}

function overlay(opacity) {
  return { type: "overlay", opacity };
}
