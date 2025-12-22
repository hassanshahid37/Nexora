// Nexora / Templify – Serverless template generator
// HARD SAFE VERSION: no OpenAI calls, deterministic, never throws 500.
// Returns full templates (canvas + elements) so deployments stay consistent.

const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const hash = (s)=>{
  s=String(s||"");
  let h=2166136261;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return (h>>>0);
};
const makeRng = (seed)=>{
  let t=(seed>>>0)||1;
  return ()=>{
    t=(t+0x6D2B79F5)>>>0;
    let r=Math.imul(t^(t>>>15),1|t);
    r^=r+Math.imul(r^(r>>>7),61|r);
    return ((r^(r>>>14))>>>0)/4294967296;
  };
};
const pick = (arr, seed)=>arr[((seed>>>0)%arr.length+arr.length)%arr.length];

const CATEGORIES = {
  "Instagram Post": { w:1080, h:1080 },
  "Story": { w:1080, h:1920 },
  "YouTube Thumbnail": { w:1280, h:720 },
  "Flyer": { w:1080, h:1350 }
};

const PALETTES = [
  { bg:"#0b1020", bg2:"#111a33", ink:"#f7fbff", muted:"rgba(247,251,255,0.72)", accent:"#4cc9f0" },
  { bg:"#0b0f14", bg2:"#171f2a", ink:"#f6f2ff", muted:"rgba(246,242,255,0.72)", accent:"#a78bfa" },
  { bg:"#071a1c", bg2:"#0a2b2e", ink:"#e9ffff", muted:"rgba(233,255,255,0.72)", accent:"#34d399" },
];

function classifyIntent(prompt){
  const p=(prompt||"").toLowerCase();
  const has=(arr)=>arr.some(k=>p.includes(k));
  const intent={ type:"generic", keywords:{} };
  if(has(["sale","discount","%","off","limited","offer","deal","promo","promotion","black friday","clearance"])) intent.type="promo";
  if(has(["hiring","we are hiring","jobs","job","career","apply","join our team"])) intent.type="hiring";
  if(has(["launch","announcement","webinar","event","introducing"])) intent.type="announcement";
  if(has(["quote","motivat","inspir","mindset"])) intent.type="quote";
  intent.keywords = {
    luxury: /(luxury|premium|elite|high[-\s]?end|exclusive)/i.test(prompt||""),
    realEstate: /(real\s?estate|apartment|apartments|villa|property|condo|rent|sale)/i.test(prompt||"")
  };
  return intent;
}

function pickLayoutVariant(category, intent, seed, idx){
  const t=intent?.type||"generic";
  const pools = {
    promo: ["bigNumber","badgePromo","splitHero","featureGrid","photoCard"],
    hiring: ["featureGrid","splitHero","photoCard","badgePromo","bigNumber"],
    announcement: ["splitHero","photoCard","featureGrid","bigNumber","badgePromo"],
    quote: ["minimalQuote","photoCard","splitHero","featureGrid"],
    generic: ["splitHero","photoCard","featureGrid","bigNumber","badgePromo","minimalQuote"]
  };
  const pool=pools[t]||pools.generic;
  const r=makeRng(seed ^ hash("layout|"+category+"|"+t));
  const offset=Math.floor(r()*pool.length);
  return pool[(offset + (idx||0)) % pool.length];
}

function brandFromPrompt(prompt){
  const txt=(prompt||"").trim();
  if(!txt) return { brand:"Nexora", headline:"Create premium templates", tagline:"Fast, clean, Canva-level." };
  const words=txt.split(/\s+/).filter(Boolean);
  const headline=words.slice(0,5).join(" ");
  return { brand:"Nexora", headline: headline, tagline: "Premium layout generated instantly." };
}

function buildElements(layout, spec){
  const { w,h,pal,seed,headline,tagline,ctaText,intent } = spec;
  const elements=[];
  const add=(e)=>{ elements.push(e); return e; };

  add({ type:"bg", x:0,y:0,w,h, fill:pal.bg, fill2:pal.bg2, style:"radial" });

  const lux=!!(intent && intent.keywords && intent.keywords.luxury);
  const pad = lux ? Math.round(Math.min(w,h)*0.05) : Math.round(Math.min(w,h)*0.04);
  add({ type:"shape", x:pad, y:pad, w:w-pad*2, h:h-pad*2, r:Math.round(Math.min(w,h)*0.04), fill:"rgba(255,255,255,0.02)", stroke:"rgba(255,255,255,0.10)" });

  if(layout==="bigNumber"){
    add({ type:"badge", x:Math.round(w*0.74), y:Math.round(h*0.12), w:Math.round(w*0.18), h:Math.round(h*0.08), r:999, fill: pal.accent, text:"LIMITED", tcolor:"#0b1020", tsize:Math.round(h*0.03), tweight:900 });
    add({ type:"text", x:Math.round(w*0.12), y:Math.round(h*0.22), w:Math.round(w*0.76), h:Math.round(h*0.12), text: headline.toUpperCase(), size:Math.round(h*0.085), weight:900, color: pal.ink, letter:-1 });
    add({ type:"shape", x:Math.round(w*0.12), y:Math.round(h*0.36), w:Math.round(w*0.20), h:Math.round(h*0.01), r:10, fill:"rgba(255,255,255,0.18)" });
    add({ type:"text", x:Math.round(w*0.12), y:Math.round(h*0.40), w:Math.round(w*0.70), h:Math.round(h*0.10), text: tagline, size:Math.round(h*0.038), weight:650, color: pal.muted });
    add({ type:"pill", x:Math.round(w*0.12), y:Math.round(h*0.60), w:Math.round(w*0.44), h:Math.round(h*0.085), r:999, fill: pal.accent, text: ctaText, tcolor:"#0b1020", tsize:Math.round(h*0.035), tweight:900 });
    return elements;
  }

  if(layout==="splitHero"){
    add({ type:"shape", x:0, y:0, w:Math.round(w*0.56), h:h, r:48, fill: pal.bg2, opacity:0.85 });
    add({ type:"shape", x:Math.round(w*0.53), y:Math.round(h*0.12), w:Math.round(w*0.40), h:Math.round(h*0.58), r:36, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.14)" });
    add({ type:"text", x:Math.round(w*0.07), y:Math.round(h*0.16), w:Math.round(w*0.48), h:Math.round(h*0.24), text: headline, size:Math.round(h*0.06), weight:900, color: pal.ink, letter:-0.5 });
    add({ type:"text", x:Math.round(w*0.07), y:Math.round(h*0.35), w:Math.round(w*0.42), h:Math.round(h*0.10), text: tagline, size:Math.round(h*0.034), weight:650, color: pal.muted });
    add({ type:"pill", x:Math.round(w*0.07), y:Math.round(h*0.62), w:Math.round(w*0.32), h:Math.round(h*0.085), r:999, fill: pal.accent, text: ctaText, tcolor:"#0b1020", tsize:Math.round(h*0.032), tweight:900 });
    return elements;
  }

  if(layout==="featureGrid"){
    add({ type:"text", x:Math.round(w*0.10), y:Math.round(h*0.12), w:Math.round(w*0.80), h:Math.round(h*0.10), text: headline, size:Math.round(h*0.055), weight:900, color: pal.ink });
    const gx=Math.round(w*0.10), gy=Math.round(h*0.26), gw=Math.round(w*0.80), gh=Math.round(h*0.46);
    const cols=2, rows=2;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const bx=gx+Math.round((gw/cols)*c);
        const by=gy+Math.round((gh/rows)*r);
        const bw=Math.round(gw/cols)-Math.round(w*0.02);
        const bh=Math.round(gh/rows)-Math.round(h*0.02);
        add({ type:"shape", x:bx, y:by, w:bw, h:bh, r:28, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.12)" });
      }
    }
    add({ type:"pill", x:Math.round(w*0.10), y:Math.round(h*0.76), w:Math.round(w*0.42), h:Math.round(h*0.085), r:999, fill: pal.accent, text: ctaText, tcolor:"#0b1020", tsize:Math.round(h*0.034), tweight:900 });
    return elements;
  }

  // default: badgePromo / photoCard-ish
  add({ type:"badge", x:Math.round(w*0.74), y:Math.round(h*0.12), w:Math.round(w*0.18), h:Math.round(h*0.08), r:999, fill: pal.accent, text:"LIMITED", tcolor:"#0b1020", tsize:Math.round(h*0.03), tweight:900 });
  add({ type:"shape", x:Math.round(w*0.10), y:Math.round(h*0.22), w:Math.round(w*0.80), h:Math.round(h*0.52), r:40, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.14)" });
  add({ type:"text", x:Math.round(w*0.16), y:Math.round(h*0.30), w:Math.round(w*0.68), h:Math.round(h*0.16), text: headline, size:Math.round(h*0.06), weight:900, color: pal.ink });
  add({ type:"text", x:Math.round(w*0.16), y:Math.round(h*0.44), w:Math.round(w*0.68), h:Math.round(h*0.10), text: tagline, size:Math.round(h*0.032), weight:650, color: pal.muted });
  add({ type:"pill", x:Math.round(w*0.16), y:Math.round(h*0.60), w:Math.round(w*0.40), h:Math.round(h*0.085), r:999, fill: pal.accent, text: ctaText, tcolor:"#0b1020", tsize:Math.round(h*0.032), tweight:900 });
  return elements;
}

export default async function handler(req, res) {
  try{
    if (req.method !== "POST") return res.status(200).json({ success:true, templates:[] });

    let body={};
    try{
      body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    }catch{ body={}; }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const category = typeof body.category === "string" && CATEGORIES[body.category] ? body.category : "Instagram Post";
    const style = typeof body.style === "string" ? body.style : "Dark Premium";
    const count = clamp(parseInt(body.count ?? 4,10) || 4, 1, 200);

    const baseSeed = hash(category+"|"+style+"|"+prompt);
    const intent = classifyIntent(prompt);
    const b = brandFromPrompt(prompt);

    const templates=[];
    for(let i=0;i<count;i++){
      const seed=(baseSeed + i*1013)>>>0;
      const pal = pick(PALETTES, seed ^ hash("pal"));
      const layout = pickLayoutVariant(category, intent, seed, i);
      const { w,h } = CATEGORIES[category] || CATEGORIES["Instagram Post"];
      const ctaText = intent.type==="promo" ? "Book a tour" : "Learn more";

      const elements = buildElements(layout, { w,h,pal,seed,intent, headline:b.headline, tagline:b.tagline, ctaText });
      templates.push({
        id: "tpl_"+seed.toString(16)+"_"+i,
        title: `${category} #${i+1}`,
        subtitle: `${style} • ${layout}`,
        category, style,
        canvas: { w,h },
        palette: pal,
        elements
      });
    }
    return res.status(200).json({ success:true, templates });
  }catch(e){
    return res.status(200).json({ success:true, templates:[] });
  }
}
