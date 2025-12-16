// design.js — Premium Static Templates (AI-layout compatible)
// This file is safe to keep for future client-side generation.
// Current index uses /api/generate, but editor can also use this schema.

export function generateTemplates(count = 24, opts = {}) {
  const category = opts.category || "Instagram Post";
  const style = opts.style || "Dark Premium";
  const W = 980, H = 620;

  const palettes = [
    { name:"Blue Violet", bg:"linear-gradient(135deg,#0b5fff,#7b5cff)", ink:"#ffffff", accent:"#7b5cff" },
    { name:"Midnight Cyan", bg:"linear-gradient(135deg,#0b1020,#00d1ff)", ink:"#ffffff", accent:"#00d1ff" },
    { name:"Emerald Noir", bg:"linear-gradient(135deg,#07130f,#00c389)", ink:"#ffffff", accent:"#00c389" },
    { name:"Sunset Premium", bg:"linear-gradient(135deg,#ff4d6d,#ffcc66)", ink:"#fff7ed", accent:"#ffcc66" },
  ];

  const forms = [heroType, imageLed, promoBadge, editorial];

  const out = [];
  for(let i=0;i<count;i++){
    const p = palettes[i % palettes.length];
    const f = forms[i % forms.length];
    const tpl = f(i, { W, H, p, category, style });
    out.push(tpl);
  }
  return out;
}

function heroType(i, {W,H,p,category,style}){
  return {
    id: `d_${Date.now()}_${i}`,
    title: `${category} #${i+1}`,
    description: `${style} • Hero Typography`,
    category, style,
    bg: p.bg,
    canvas: { w: W, h: H },
    elements: [
      el("heading", 70, 110, 740, 120, "Create Your Future", { fontSize: 70, fontWeight: 900, color: p.ink }),
      el("text", 70, 235, 560, 70, "Premium spacing • bold hierarchy • clean layout", { fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,.86)" }),
      el("button", 70, 330, 240, 56, "Get Started", { fill: "rgba(255,255,255,.14)", color: p.ink, radius: 999 }),
    ]
  };
}

function imageLed(i, {W,H,p,category,style}){
  return {
    id: `d_${Date.now()}_${i}`,
    title: `${category} #${i+1}`,
    description: `${style} • Image-led Poster`,
    category, style,
    bg: p.bg,
    canvas: { w: W, h: H },
    elements: [
      el("image", 560, 90, 340, 440, "IMAGE", { background: "rgba(255,255,255,.10)", radius: 24 }),
      el("heading", 70, 120, 460, 150, "Experience Luxury", { fontSize: 62, fontWeight: 900, color: p.ink }),
      el("text", 70, 255, 420, 60, "Minimal copy • strong visual anchor", { fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,.86)" }),
      el("badge", 70, 90, 160, 44, "NEW", { background:"rgba(255,255,255,.14)", radius: 999, color: p.ink, fontSize: 14, fontWeight: 800 }),
    ]
  };
}

function promoBadge(i, {W,H,p,category,style}){
  return {
    id: `d_${Date.now()}_${i}`,
    title: `${category} #${i+1}`,
    description: `${style} • Promo / Offer`,
    category, style,
    bg: p.bg,
    canvas: { w: W, h: H },
    elements: [
      el("badge", 70, 100, 210, 48, "LIMITED", { background:"rgba(255,255,255,.14)", radius: 999, color: p.ink, fontSize: 14, fontWeight: 900 }),
      el("heading", 70, 175, 720, 170, "30% OFF", { fontSize: 92, fontWeight: 950, color: p.ink }),
      el("text", 70, 320, 520, 64, "Premium collection • today only", { fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,.86)" }),
      el("button", 70, 410, 260, 56, "Shop Now", { fill: "rgba(255,255,255,.14)", color: p.ink, radius: 999 }),
    ]
  };
}

function editorial(i, {W,H,p,category,style}){
  return {
    id: `d_${Date.now()}_${i}`,
    title: `${category} #${i+1}`,
    description: `${style} • Editorial`,
    category, style,
    bg: p.bg,
    canvas: { w: W, h: H },
    elements: [
      el("heading", 90, 165, 800, 120, "Design Conference", { fontSize: 64, fontWeight: 900, color: p.ink, align:"center" }),
      el("shape", 300, 285, 380, 2, "", { fill:"rgba(255,255,255,.30)" }),
      el("text", 160, 310, 660, 80, "A calm, centered layout with intentional spacing.", { fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,.86)", align:"center" }),
      el("button", 370, 420, 240, 56, "Reserve Spot", { fill: "rgba(255,255,255,.14)", color: p.ink, radius: 999 }),
    ]
  };
}

function el(type, x, y, w, h, title, extra={}){
  return {
    id: `${type}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`,
    type, x, y, w, h, title, sub: "",
    ...extra
  };
}
