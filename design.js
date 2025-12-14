// Nexora / Templify Design Engine v1
// Purpose: Provide Canva-level layout + style intelligence WITHOUT changing your UI.
// Exports:
//   - layouts: array of layout objects { name, applyTile(tile), build(meta) }
//   - styles:  array of style objects  { name, palette, applyTile(tile), applyVars(root) }
//   - buildTemplates({count, category, styleName, layoutName, prompt, notes}): returns templates with editor-friendly elements

const CANVAS_W = 980;
const CANVAS_H = 620;

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function safeText(s, max=42){
  const t = String(s ?? "").trim().replace(/\s+/g," ");
  return t.length > max ? t.slice(0, max-1) + "…" : (t || "");
}

function makeHeadline(category, prompt, notes){
  const bank = [
    "Luxury That Fits You",
    "New Collection Drop",
    "Premium Offer Inside",
    "Limited Time Deal",
    "Bold. Modern. You.",
    "Upgrade Your Brand",
    "Design That Converts",
    "Make It Stand Out"
  ];
  const p = safeText(prompt, 30);
  const n = safeText(notes, 24);
  if(p) return safeText(p, 46);
  if(n) return n;
  return pick(bank);
}

function makeSub(category){
  const bank = [
    "High-contrast layout • Strong hierarchy • Ready to edit",
    "Modern spacing • Clean typography • Premium look",
    "Optimized for attention • Clear CTA • Brand-ready",
    "Bold headline • Supporting text • Simple structure"
  ];
  return pick(bank);
}

function elementTextBlock(x,y,w,h,headline,sub,style){
  return [
    { x, y, w, h: Math.min(90, h), title: headline, sub: sub },
    { x, y: y+88, w: Math.min(w, 680), h: Math.max(90, h-88), title: "", sub: "" } // placeholder, editor ignores empty
  ];
}

// Layout builders output editor-friendly elements: {x,y,w,h,title,sub}
const layoutBuilders = {
  "Bold": (meta) => {
    const m = 36;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    const sub = makeSub(meta.category);

    return [
      { x: m, y: m, w: 620, h: 160, title: headline, sub: sub },
      { x: m, y: 220, w: 520, h: 140, title: "Key Feature", sub: "Add a short benefit line here." },
      { x: m, y: 390, w: 520, h: 120, title: "Call To Action", sub: "Tap to learn more • Edit CTA" },
      { x: 690, y: m, w: 254, h: 474, title: "Image", sub: "Drop image here" },
      { x: 0, y: 540, w: CANVAS_W, h: 80, title: meta.brand || "Brand Name", sub: "website.com • @handle" }
    ];
  },

  "Clean": (meta) => {
    const m = 44;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    const sub = makeSub(meta.category);

    return [
      { x: m, y: 80, w: 560, h: 150, title: headline, sub: sub },
      { x: m, y: 260, w: 560, h: 140, title: "Subheading", sub: "Add supporting information here." },
      { x: 640, y: 80, w: 296, h: 360, title: "Image", sub: "Drop image here" },
      { x: m, y: 450, w: 892, h: 120, title: "Offer / CTA", sub: "Limited offer • Add details" }
    ];
  },

  "Modern": (meta) => {
    const m = 38;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    const sub = makeSub(meta.category);

    return [
      { x: m, y: m, w: 904, h: 140, title: headline, sub: sub },
      { x: m, y: 195, w: 440, h: 310, title: "Main Card", sub: "Describe the value in 1–2 lines." },
      { x: 500, y: 195, w: 442, h: 150, title: "Benefit #1", sub: "Short benefit line" },
      { x: 500, y: 355, w: 442, h: 150, title: "Benefit #2", sub: "Short benefit line" },
      { x: m, y: 520, w: 904, h: 80, title: meta.brand || "Brand Name", sub: "tagline • contact • @handle" }
    ];
  },

  "Minimal": (meta) => {
    const m = 52;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    return [
      { x: m, y: 120, w: 876, h: 150, title: headline, sub: "Minimal spacing • Strong typography" },
      { x: m, y: 300, w: 640, h: 120, title: "Details", sub: "Add a short description." },
      { x: m, y: 440, w: 876, h: 120, title: "CTA", sub: "Learn more • Visit website" }
    ];
  },

  "Vibrant": (meta) => {
    const m = 34;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    return [
      { x: m, y: m, w: 520, h: 170, title: headline, sub: "Vibrant energy • High contrast" },
      { x: 570, y: m, w: 376, h: 260, title: "Image", sub: "Drop image here" },
      { x: m, y: 220, w: 520, h: 190, title: "Highlight", sub: "Feature • Benefit • Proof" },
      { x: m, y: 430, w: 912, h: 170, title: "Offer", sub: "Add price / promo / CTA" }
    ];
  },

  "Editorial": (meta) => {
    const m = 40;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    return [
      { x: m, y: 70, w: 420, h: 260, title: headline, sub: "Editorial layout • Premium spacing" },
      { x: 480, y: 70, w: 460, h: 330, title: "Image", sub: "Drop image here" },
      { x: m, y: 350, w: 420, h: 210, title: "Details", sub: "Add 2–3 lines of supporting text." },
      { x: 480, y: 420, w: 460, h: 140, title: "CTA", sub: "Swipe • Shop • Learn more" }
    ];
  },

  "Split Card": (meta) => {
    const m = 36;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    return [
      { x: 0, y: 0, w: 490, h: 620, title: headline, sub: "Left panel headline + copy" },
      { x: 490, y: 0, w: 490, h: 620, title: "Image", sub: "Right panel image" }
    ];
  },

  "Glass Banner": (meta) => {
    const m = 34;
    const headline = makeHeadline(meta.category, meta.prompt, meta.notes);
    return [
      { x: 0, y: 0, w: 980, h: 620, title: "Image", sub: "Full background image" },
      { x: m, y: 420, w: 912, h: 160, title: headline, sub: "Glass banner overlay • CTA" }
    ];
  }
};

function normalizeLayoutName(name){
  const n = String(name||"").trim();
  return layoutBuilders[n] ? n : "Modern";
}

function normalizeStyleName(name){
  const n = String(name||"").trim();
  return styles.find(s=>s.name===n)?.name || "Dark Premium";
}

export const styles = [
  {
    name: "Dark Premium",
    palette: { bg1:"#050712", bg2:"rgba(15,18,32,.55)", accent:"#0b5fff", text:"#f6f7fb", muted:"#aab0bd" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      // only subtle preview tint; do NOT change the app UI
      tile.style.borderColor = "rgba(255,255,255,.12)";
    }
  },
  {
    name: "Light Minimal",
    palette: { bg1:"#f5f7ff", bg2:"rgba(255,255,255,.72)", accent:"#0b5fff", text:"#0b1020", muted:"#5b6270" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(10,20,60,.18)";
    }
  },
  {
    name: "Neon",
    palette: { bg1:"#050712", bg2:"rgba(15,18,32,.55)", accent:"#7c3aed", text:"#f6f7fb", muted:"#aab0bd" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(124,58,237,.35)";
    }
  },
  {
    name: "Glassmorphism",
    palette: { bg1:"#050712", bg2:"rgba(255,255,255,.12)", accent:"#0b5fff", text:"#f6f7fb", muted:"#aab0bd" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(255,255,255,.18)";
    }
  },
  {
    name: "Corporate",
    palette: { bg1:"#0b1020", bg2:"rgba(255,255,255,.08)", accent:"#0b5fff", text:"#f6f7fb", muted:"#aab0bd" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(11,95,255,.26)";
    }
  },
  {
    name: "Luxury Mono",
    palette: { bg1:"#07060a", bg2:"rgba(255,255,255,.10)", accent:"#d4af37", text:"#f6f7fb", muted:"#b9b2a8" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(212,175,55,.28)";
    }
  },
  {
    name: "Pastel Clean",
    palette: { bg1:"#f7f8ff", bg2:"rgba(255,255,255,.78)", accent:"#2dd4bf", text:"#0b1020", muted:"#5b6270" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(45,212,191,.30)";
    }
  },
  {
    name: "High Contrast",
    palette: { bg1:"#050712", bg2:"rgba(15,18,32,.55)", accent:"#ff2d55", text:"#ffffff", muted:"#c7c9d3" },
    applyVars(root=document.documentElement){
      root.style.setProperty("--primary", this.palette.accent);
      root.style.setProperty("--muted", this.palette.muted);
    },
    applyTile(tile){
      tile.style.borderColor = "rgba(255,45,85,.30)";
    }
  }
];

export const layouts = Object.keys(layoutBuilders).map(name => ({
  name,
  applyTile(tile){
    // Do NOT alter layout sizing; only update preview copy subtly
    tile.style.boxShadow = "none";
  },
  build(meta){
    const ln = normalizeLayoutName(name);
    const els = layoutBuilders[ln](meta);

    // clamp to canvas
    return els.map(e => ({
      x: clamp(Number(e.x||0), 0, CANVAS_W-1),
      y: clamp(Number(e.y||0), 0, CANVAS_H-1),
      w: clamp(Number(e.w||220), 60, CANVAS_W),
      h: clamp(Number(e.h||120), 50, CANVAS_H),
      title: safeText(e.title, 60),
      sub: safeText(e.sub, 90)
    }));
  }
}));

export function buildTemplates({count=24, category="Instagram Post", styleName="Dark Premium", layoutName="Modern", prompt="", notes="", brand=""}={}){
  const n = Math.min(200, Math.max(1, parseInt(count||24,10)));
  const layoutObj = layouts.find(l=>l.name===normalizeLayoutName(layoutName)) || layouts.find(l=>l.name==="Modern");
  const styleObj  = styles.find(s=>s.name===normalizeStyleName(styleName)) || styles[0];

  const meta = { category, prompt, notes, brand };

  const templates = Array.from({length:n}).map((_, i) => {
    const els = layoutObj.build(meta);
    return {
      title: `${category} #${i+1}`,
      description: `${styleObj.name} • ${layoutObj.name} • Click to edit`,
      canvas: { w: CANVAS_W, h: CANVAS_H },
      elements: els
    };
  });

  return { templates, layout: layoutObj.name, style: styleObj.name };
}



/* ===== Nexora Additions v5 ===== */

export const RESIZE_PRESETS = {
  "Instagram Post": { w: 1080, h: 1080 },
  "Instagram Story": { w: 1080, h: 1920 },
  "Poster": { w: 2480, h: 3508 }
};

export function applyBrandKit(elements, brandKit={}){
  const { primary="#0b5fff", text="#f6f7fb", muted="#aab0bd", font="Poppins" } = brandKit;
  return elements.map(e => ({
    ...e,
    title: e.title,
    sub: e.sub,
    brand: { primary, text, muted, font }
  }));
}

export function smartResize(elements, from={w:980,h:620}, to={w:1080,h:1080}){
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  return elements.map(e => ({
    ...e,
    x: Math.round(e.x * sx),
    y: Math.round(e.y * sy),
    w: Math.round(e.w * sx),
    h: Math.round(e.h * sy)
  }));
}
