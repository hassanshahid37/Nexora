export const CANVAS = { w: 980, h: 620 };

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pick=(a)=>a[Math.floor(Math.random()*a.length)];

const HEADLINES=[
  "Elevate Your Brand",
  "Limited Offer",
  "New Collection Drop",
  "Bold Ideas. Real Impact.",
  "Premium Look, Fast",
  "Make It Stand Out",
  "Designed To Convert"
];

const CTAS=["Shop Now","Learn More","Get Started","Join Today","Download","Book Now"];

export const styles = [
  { name:"Dark Premium", bg:"#050712", accent:"#0b5fff", text:"#f6f7fb", muted:"#aab0bd" },
  { name:"Light Minimal", bg:"#f7f8ff", accent:"#0b5fff", text:"#0b1020", muted:"#5b6270" },
  { name:"Neon", bg:"#050712", accent:"#7c3aed", text:"#f6f7fb", muted:"#aab0bd" },
  { name:"Luxury Mono", bg:"#07060a", accent:"#d4af37", text:"#f6f7fb", muted:"#b9b2a8" }
];

export const layouts = [
  { name:"Modern", build },
  { name:"Bold", buildBold },
  { name:"Editorial", buildEditorial },
  { name:"Split", buildSplit }
];

function baseMeta(meta){
  return {
    cat: meta?.cat || meta?.category || "Instagram Post",
    style: meta?.style || "Dark Premium",
    prompt: meta?.prompt || "",
    notes: meta?.notes || ""
  };
}

function headline(meta){
  const p=(meta.prompt||"").trim();
  return p ? (p.length>46? p.slice(0,45)+"…" : p) : pick(HEADLINES);
}
function subline(meta){
  const n=(meta.notes||"").trim();
  return n ? (n.length>70? n.slice(0,69)+"…" : n) : "Clean layout • Strong hierarchy • Ready to edit";
}

function element(x,y,w,h,title,sub,type="text"){
  return {
    id: Math.random().toString(16).slice(2)+Date.now().toString(16),
    type,
    x: clamp(Math.round(x),0,CANVAS.w-1),
    y: clamp(Math.round(y),0,CANVAS.h-1),
    w: clamp(Math.round(w),40,CANVAS.w),
    h: clamp(Math.round(h),40,CANVAS.h),
    title: String(title||""),
    sub: String(sub||"")
  };
}

function build(metaIn){
  const meta=baseMeta(metaIn);
  const m=36;
  return [
    element(m,m,640,150, headline(meta), subline(meta),"text"),
    element(m,210,520,150,"Key Benefit","Short benefit line here","text"),
    element(m,380,520,120,pick(CTAS),"Add a supporting CTA line","text"),
    element(700,m,244,470,"Image","Drop image here","image"),
    element(0,540,CANVAS.w,80,"Brand Name","website.com • @handle","text")
  ];
}

function buildBold(metaIn){
  const meta=baseMeta(metaIn);
  const m=34;
  return [
    element(m,70,560,190, headline(meta), subline(meta),"text"),
    element(620,70,326,360,"Image","Drop image here","image"),
    element(m,290,560,140,"Offer","Describe the offer in one line","text"),
    element(m,450,912,130,pick(CTAS),"Limited time • Add details","text")
  ];
}

function buildEditorial(metaIn){
  const meta=baseMeta(metaIn);
  const m=40;
  return [
    element(m,70,420,250, headline(meta), "Editorial spacing • Premium look","text"),
    element(480,70,460,330,"Image","Drop image here","image"),
    element(m,340,420,220,"Details","2–3 lines of supporting text","text"),
    element(480,420,460,140,pick(CTAS),"Swipe • Shop • Learn more","text")
  ];
}

function buildSplit(metaIn){
  const meta=baseMeta(metaIn);
  return [
    element(0,0,490,620, headline(meta), subline(meta),"text"),
    element(490,0,490,620,"Image","Right panel image","image"),
    element(40,470,410,110,pick(CTAS),"Add short CTA","text")
  ];
}

export function buildTemplates(metaIn={}, opts={}){
  const meta=baseMeta(metaIn);
  const count = Math.min(200, Math.max(1, parseInt(metaIn.count||opts.count||24,10)));
  const layoutName = metaIn.layout || opts.layout || "Modern";
  const layout = layouts.find(l=>l.name===layoutName) || layouts[0];

  const templates = Array.from({length:count}).map((_,i)=>({
    title: `${meta.cat} #${i+1}`,
    description: `${meta.style} • ${layout.name}`,
    canvas: { ...CANVAS },
    elements: layout.build(meta)
  }));

  return { templates };
}
