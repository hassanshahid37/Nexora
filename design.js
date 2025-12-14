/* Nexora / Templify Design Engine (Canva-level blocks)
   Outputs editor-compatible elements: {id?, x,y,w,h,title,sub}
*/
const CANVAS_W = 980;
const CANVAS_H = 620;

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function safeText(s,max=60){
  const t = String(s ?? "").trim().replace(/\s+/g," ");
  if(!t) return "";
  return t.length>max ? t.slice(0,max-1)+"…" : t;
}

function headlineFrom(meta){
  if(meta.prompt) return safeText(meta.prompt, 52);
  if(meta.notes) return safeText(meta.notes, 52);
  return pick([
    "Elevate Your Brand Presence",
    "Premium Offer Inside",
    "Bold Visuals That Convert",
    "New Collection Drop",
    "Limited Time Deal"
  ]);
}

function subFrom(){
  return pick([
    "Clean layout • Strong hierarchy • Ready to edit",
    "Modern spacing with premium typography",
    "Designed for engagement and clarity",
    "High-contrast visuals that convert"
  ]);
}

const layoutBuilders = {
  Modern(meta){
    const m=38;
    return [
      {x:m,y:m,w:904,h:140,title:headlineFrom(meta),sub:subFrom()},
      {x:m,y:195,w:440,h:310,title:"Main Card",sub:"Describe the value in 1–2 lines."},
      {x:500,y:195,w:442,h:150,title:"Benefit #1",sub:"Short benefit line"},
      {x:500,y:355,w:442,h:150,title:"Benefit #2",sub:"Short benefit line"},
      {x:m,y:520,w:904,h:80,title:meta.brand||"Brand Name",sub:"tagline • contact • @handle"}
    ];
  },
  Bold(meta){
    const m=36;
    return [
      {x:m,y:m,w:620,h:160,title:headlineFrom(meta),sub:subFrom()},
      {x:m,y:220,w:520,h:140,title:"Key Feature",sub:"Add a short benefit line here."},
      {x:m,y:390,w:520,h:120,title:"Call To Action",sub:"Tap to learn more • Edit CTA"},
      {x:690,y:m,w:254,h:474,title:"Image",sub:"Drop image here"},
      {x:0,y:540,w:CANVAS_W,h:80,title:meta.brand||"Brand Name",sub:"website.com • @handle"}
    ];
  },
  Clean(meta){
    const m=44;
    return [
      {x:m,y:80,w:560,h:150,title:headlineFrom(meta),sub:subFrom()},
      {x:m,y:260,w:560,h:140,title:"Subheading",sub:"Add supporting information here."},
      {x:640,y:80,w:296,h:360,title:"Image",sub:"Drop image here"},
      {x:m,y:450,w:892,h:120,title:"Offer / CTA",sub:"Limited offer • Add details"}
    ];
  },
  Editorial(meta){
    const m=40;
    return [
      {x:m,y:70,w:420,h:260,title:headlineFrom(meta),sub:"Editorial layout • Premium spacing"},
      {x:480,y:70,w:460,h:330,title:"Image",sub:"Drop image here"},
      {x:m,y:350,w:420,h:210,title:"Details",sub:"Add 2–3 lines of supporting text."},
      {x:480,y:420,w:460,h:140,title:"CTA",sub:"Swipe • Shop • Learn more"}
    ];
  }
};

export const layouts = Object.keys(layoutBuilders).map(name=>({
  name,
  applyTile(tile){ /* no-op */ },
  build(meta){
    const els = layoutBuilders[name](meta);
    return els.map(e=>({
      x: clamp(Number(e.x||0), 0, CANVAS_W-1),
      y: clamp(Number(e.y||0), 0, CANVAS_H-1),
      w: clamp(Number(e.w||220), 60, CANVAS_W),
      h: clamp(Number(e.h||120), 50, CANVAS_H),
      title: safeText(e.title, 60),
      sub: safeText(e.sub, 90)
    }));
  }
}));

export const styles = [
  { name:"Dark Premium", applyTile(tile){ tile.style.borderColor="rgba(255,255,255,.12)"; } },
  { name:"Light Minimal", applyTile(tile){ tile.style.borderColor="rgba(10,20,60,.16)"; } },
  { name:"Neon", applyTile(tile){ tile.style.borderColor="rgba(124,58,237,.32)"; } },
  { name:"Luxury Mono", applyTile(tile){ tile.style.borderColor="rgba(212,175,55,.28)"; } }
];

export function buildTemplates({count=24, category="Instagram Post", styleName="Dark Premium", layoutName="Modern", prompt="", notes="", brand=""}={}){
  const n = Math.min(200, Math.max(1, parseInt(count||24,10)));
  const layoutObj = layouts.find(l=>l.name===layoutName) || layouts[0];
  const meta = { category, prompt, notes, brand };

  const templates = Array.from({length:n}).map((_, i)=>({
    title: `${category} #${i+1}`,
    description: `${styleName} • ${layoutObj.name} • Click to edit`,
    canvas: { w: CANVAS_W, h: CANVAS_H },
    elements: layoutObj.build(meta)
  }));

  return { templates };
}

export const RESIZE_PRESETS = {
  "Instagram Post": { w: 1080, h: 1080 },
  "Instagram Story": { w: 1080, h: 1920 },
  "Poster": { w: 2480, h: 3508 }
};
