// design.js — Canva Form Enforced (Hero-first, minimal, premium)
// SAFE: compatible with current index.html + editor.html + generate.js

export function generateTemplates(count = 24) {
  const forms = [
    heroTypography,
    imageLedPoster,
    promoBadge,
    editorialEvent
  ];

  const palettes = [
    { bg: "linear-gradient(135deg,#0b5fff,#7b5cff)", ink:"#ffffff", accent:"#7b5cff", soft:"rgba(255,255,255,.12)" },
    { bg: "linear-gradient(135deg,#07130f,#00c389)", ink:"#ffffff", accent:"#00c389", soft:"rgba(255,255,255,.10)" },
    { bg: "linear-gradient(135deg,#1f1409,#ffcc66)", ink:"#fff7ed", accent:"#ffcc66", soft:"rgba(255,255,255,.10)" },
    { bg: "linear-gradient(135deg,#0b1020,#00d1ff)", ink:"#ffffff", accent:"#00d1ff", soft:"rgba(255,255,255,.10)" }
  ];

  const out = [];
  for (let i = 0; i < count; i++) {
    const form = forms[i % forms.length];
    const pal = palettes[i % palettes.length];
    out.push(form(i, pal));
  }
  return out;
}

// ---------- FORMS (MAX 3–4 ELEMENTS EACH) ----------

function heroTypography(i, p){
  return {
    title: `Hero Type #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      heading("Create Your Future", 120, 260, 840, 110, p.ink, "left"),
      text("Premium Canva-style typography with bold hierarchy.", 120, 410, 620, 30, "rgba(255,255,255,.85)"),
      cta("Get Started", 120, 470, p.accent)
    ]
  };
}

function imageLedPoster(i, p){
  return {
    title: `Image Poster #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      image(80, 80, 920, 640, p.soft),
      heading("Experience Luxury", 120, 760, 840, 88, p.ink, "left")
    ]
  };
}

function promoBadge(i, p){
  return {
    title: `Promo #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      badge("LIMITED", 120, 200, p.accent),
      heading("30% OFF", 120, 300, 840, 140, p.ink, "left"),
      cta("Shop Now", 120, 470, p.accent)
    ]
  };
}

function editorialEvent(i, p){
  return {
    title: `Editorial #${i+1}`,
    canvas: { width:1080, height:1080, background:p.bg },
    elements: [
      heading("Design Conference 2025", 120, 360, 840, 88, p.ink, "center"),
      divider(320, 470, 440),
      text("A minimal editorial layout with calm spacing.", 220, 520, 640, 28, "rgba(255,255,255,.85)", "center")
    ]
  };
}

// ---------- ELEMENT HELPERS ----------

function heading(text, x, y, w, size, color, align="left"){
  return { type:"heading", text, x, y, width:w, fontSize:size, fontWeight:800, color, align };
}

function text(text, x, y, w, size, color, align="left"){
  return { type:"text", text, x, y, width:w, fontSize:size, fontWeight:500, color, align };
}

function cta(text, x, y, color){
  return { type:"button", text, x, y, width:280, height:64, background:color, color:"#fff", radius:18, fontSize:18, fontWeight:700 };
}

function image(x, y, w, h, bg){
  return { type:"image", x, y, width:w, height:h, background:bg, radius:24 };
}

function badge(text, x, y, color){
  return { type:"badge", text, x, y, width:200, height:54, background:color, color:"#fff", radius:999, fontSize:16, fontWeight:700 };
}

function divider(x, y, w){
  return { type:"divider", x, y, width:w, height:2, color:"rgba(255,255,255,.35)" };
}
