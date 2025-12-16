// Nexora / design.js
// PHASE A — Canva-style Static Template Archetype Engine (v1)
// Layout-first. Premium. Deterministic.
// Editor + index compatible. NO UI logic here.

export function generateTemplates(count = 24) {
  const archetypes = [
    heroPromotion,
    quoteStatement,
    saleOffer,
    eventAnnouncement,
    brandMessage
  ];

  const palettes = [
    { bg: "linear-gradient(135deg,#0b5fff,#7b5cff)", ink:"#ffffff", accent:"#7b5cff" },
    { bg: "linear-gradient(135deg,#07130f,#00c389)", ink:"#ffffff", accent:"#00c389" },
    { bg: "linear-gradient(135deg,#1f1409,#ffcc66)", ink:"#fff7ed", accent:"#ffcc66" },
    { bg: "linear-gradient(135deg,#0b1020,#00d1ff)", ink:"#ffffff", accent:"#00d1ff" },
    { bg: "linear-gradient(135deg,#1a0b14,#ff4d6d)", ink:"#ffffff", accent:"#ff4d6d" }
  ];

  const out = [];
  for (let i = 0; i < count; i++) {
    const archetype = archetypes[i % archetypes.length];
    const palette = palettes[i % palettes.length];
    out.push(archetype(i, palette));
  }
  return out;
}

/* =====================
   ARCHETYPES (LOCKED)
   ===================== */

function heroPromotion(i, p) {
  return {
    title: `Hero Promotion #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      heading("Create Your Future", 100, 220, 780, 110, p.ink),
      text("Premium Canva-style hero layout", 100, 360, 520, 30, "rgba(255,255,255,.85)"),
      button("Get Started", 100, 430, p.accent),
      imageBlock(640, 180, 300, 520)
    ]
  };
}

function quoteStatement(i, p) {
  return {
    title: `Quote Statement #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      heading("Design is intelligence made visible.", 120, 360, 840, 120, p.ink, "center"),
      text("— Premium Quote Layout", 120, 520, 840, 28, "rgba(255,255,255,.8)", "center")
    ]
  };
}

function saleOffer(i, p) {
  return {
    title: `Sale Offer #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      badge("LIMITED", 100, 200, p.accent),
      heading("30% OFF", 100, 300, 780, 140, p.ink),
      button("Shop Now", 100, 470, p.accent)
    ]
  };
}

function eventAnnouncement(i, p) {
  return {
    title: `Event Announcement #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      heading("Design Conference 2025", 120, 320, 840, 90, p.ink, "center"),
      divider(340, 430, 400),
      text("Join the future of creativity", 120, 470, 840, 28, "rgba(255,255,255,.85)", "center"),
      button("Reserve Spot", 400, 530, p.accent)
    ]
  };
}

function brandMessage(i, p) {
  return {
    title: `Brand Message #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      imageBlock(100, 180, 360, 360),
      heading("Build a Brand That Matters", 520, 260, 440, 90, p.ink),
      text("Minimal brand-focused layout", 520, 380, 420, 28, "rgba(255,255,255,.85)")
    ]
  };
}

/* =====================
   ELEMENT HELPERS
   ===================== */

function heading(text, x, y, w, size, color, align="left") {
  return {
    type:"heading",
    text,
    x, y, width:w,
    fontSize:size,
    fontWeight:800,
    color,
    align
  };
}

function text(text, x, y, w, size, color, align="left") {
  return {
    type:"text",
    text,
    x, y, width:w,
    fontSize:size,
    fontWeight:500,
    color,
    align
  };
}

function button(text, x, y, color) {
  return {
    type:"button",
    text,
    x, y,
    width:260,
    height:64,
    background:color,
    color:"#fff",
    radius:999,
    fontSize:18,
    fontWeight:700
  };
}

function badge(text, x, y, color) {
  return {
    type:"badge",
    text,
    x, y,
    width:200,
    height:54,
    background:color,
    color:"#fff",
    radius:999,
    fontSize:16,
    fontWeight:800
  };
}

function imageBlock(x, y, w, h) {
  return {
    type:"image",
    x, y,
    width:w,
    height:h
  };
}

function divider(x, y, w) {
  return {
    type:"divider",
    x, y,
    width:w,
    height:2,
    color:"rgba(255,255,255,.35)"
  };
}
