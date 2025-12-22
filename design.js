
/* Nexora – design.js
   Visual template generator (client-side fallback + preview layouts)
   No external deps. Exposes window.NexoraDesign.
*/
(function(){
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const pick=(arr,seed)=>arr[(seed%arr.length+arr.length)%arr.length];
  const hash=(s)=>{
    s=String(s||"");
    let h=2166136261;
    for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h = Math.imul(h,16777619); }
    return (h>>>0);
  };

  const CATEGORIES = {
    "Instagram Post": { w:1080,h:1080, ratio:"1:1", kind:"social" },
    "Story": { w:1080,h:1920, ratio:"9:16", kind:"story" },
    "YouTube Thumbnail": { w:1280,h:720, ratio:"16:9", kind:"video" },
    "Flyer": { w:1080,h:1350, ratio:"4:5", kind:"print" },
    "Business Card": { w:1050,h:600, ratio:"7:4", kind:"print" },
    "Logo": { w:1000,h:1000, ratio:"1:1", kind:"logo" },
    "Presentation Slide": { w:1920,h:1080, ratio:"16:9", kind:"deck" },
    "Resume": { w:1240,h:1754, ratio:"A4-ish", kind:"doc" },
    "Poster": { w:1414,h:2000, ratio:"A3-ish", kind:"poster" }
  };

  const PALETTES = [
    { name:"Cobalt Night", bg:"#0b1020", bg2:"#0a2a5a", ink:"#f7f9ff", muted:"#b9c3d6", accent:"#2f7bff", accent2:"#9b5cff" },
    { name:"Emerald Studio", bg:"#071613", bg2:"#0b3a2b", ink:"#f4fffb", muted:"#b9d7cc", accent:"#2dd4bf", accent2:"#84cc16" },
    { name:"Sunset Premium", bg:"#140a12", bg2:"#3b0f2b", ink:"#fff6fb", muted:"#f3cfe0", accent:"#fb7185", accent2:"#f59e0b" },
    { name:"Mono Luxe", bg:"#0b0c10", bg2:"#1a1d29", ink:"#f6f7fb", muted:"#b4bbcb", accent:"#e5e7eb", accent2:"#60a5fa" }
  ];

  function brandFromPrompt(prompt){
    const p=(prompt||"").trim();
    if(!p) return { brand:"Nexora", tagline:"Premium templates, fast.", keywords:["premium","clean","modern"] };
    const words=p.replace(/\s+/g," ").split(" ").filter(Boolean);
    const brand = words.slice(0,3).join(" ");
    const tagline = words.slice(3,9).join(" ") || "Designed for your next post.";
    return { brand, tagline, keywords: words.slice(0,10) };
  }


  // Phase H: Smart inline "photo" blocks (no external URLs, so no 404s)
  function smartPhotoSrc(seed, pal, label){
    const a = pal?.accent || "#4f8cff";
    const b = pal?.accent2 || "#22c55e";
    const bg = pal?.bg2 || pal?.bg || "#0b1220";
    const txt = (label || "Nexora").toString().slice(0,18);

    // Deterministic blobs from seed
    const r1 = 120 + (seed % 140);
    const r2 = 90 + ((seed >> 3) % 160);
    const x1 = 260 + ((seed >> 5) % 420);
    const y1 = 240 + ((seed >> 7) % 420);
    const x2 = 620 + ((seed >> 9) % 360);
    const y2 = 520 + ((seed >> 11) % 360);

    const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${b}" stop-opacity="0.90"/>
    </linearGradient>
    <radialGradient id="rg" cx="0.25" cy="0.2" r="0.95">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="1200" height="800" fill="${bg}"/>
  <rect width="1200" height="800" fill="url(#rg)"/>

  <circle cx="${x1}" cy="${y1}" r="${r1}" fill="url(#g)" filter="url(#blur)" opacity="0.9"/>
  <circle cx="${x2}" cy="${y2}" r="${r2}" fill="url(#g)" filter="url(#blur)" opacity="0.85"/>

  <path d="M0,640 C240,560 360,740 600,670 C820,608 920,520 1200,590 L1200,800 L0,800 Z"
        fill="#000000" opacity="0.14"/>

  <text x="64" y="116" font-family="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="64" font-weight="800"
        fill="#ffffff" opacity="0.92">${escapeXML(txt)}</text>
  <text x="64" y="170" font-family="Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="26" font-weight="600"
        fill="#ffffff" opacity="0.60">Auto image • Phase H</text>
</svg>`;

    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function escapeXML(str){
    return String(str)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  
  // === Phase AD: Intent Biasing (no UI changes) ===
  function classifyIntent(prompt, category, style){
    const p = (prompt||"").toLowerCase();
    const has = (arr)=>arr.some(k=>p.includes(k));
    const intent = {
      type: "generic",
      energy: "medium",   // low|medium|high
      density: "balanced",// text|balanced|visual
      ctaMode: "generic"  // hiring|promo|info|brand|generic
    };

    if(has(["hiring","we are hiring","job","jobs","vacancy","vacancies","career","careers","apply","join our team","recruit"])){
      intent.type="hiring"; intent.energy="medium"; intent.density="text"; intent.ctaMode="hiring";
    } else if(has(["sale","discount","%","off","limited","offer","deal","flash","promo","promotion","black friday","clearance"])){
      intent.type="promo"; intent.energy="high"; intent.density="balanced"; intent.ctaMode="promo";
    } else if(has(["launch","new","update","announcement","announcing","introducing","event","webinar","workshop","meetup","conference"])){
      intent.type="announcement"; intent.energy="medium"; intent.density="balanced"; intent.ctaMode="info";
    } else if(has(["quote","motiv","inspir","mindset","success","dream","life"]) || (p.split(/\s+/).filter(Boolean).length<=6 && !has(["sale","discount","hiring","job"]))){
      intent.type="quote"; intent.energy="low"; intent.density="text"; intent.ctaMode="brand";
    }

    // Category bias
    const cat = (category||"").toLowerCase();
    if(cat.includes("presentation") || cat.includes("slide") || cat.includes("resume")){
      // more structured & text-friendly by default
      if(intent.density==="visual") intent.density="balanced";
      if(intent.energy==="high") intent.energy="medium";
    }
    // Style bias (keep premium and consistent)
    const st = (style||"").toLowerCase();
    if(st.includes("corporate") && intent.type==="promo"){
      // corporate promos should be less loud
      intent.energy="medium";
    }
    return intent;
  }

  function weightedPick(list, seed){
    // list: [{w:number, v:any}, ...]
    let total = 0;
    for(const it of list) total += Math.max(0, it.w||0);
    if(total<=0) return list[0]?.v;
    let r = (seed>>>0) / 4294967296 * total;
    for(const it of list){
      r -= Math.max(0, it.w||0);
      if(r<=0) return it.v;
    }
    return list[list.length-1].v;
  }

  function archetypeWithIntent(seed, intent){
    // Keep existing archetypes but weight them by intent.
    const base = [
      { name:"Split Hero", layout:"splitHero" },
      { name:"Badge Promo", layout:"badgePromo" },
      { name:"Minimal Quote", layout:"minimalQuote" },
      { name:"Feature Grid", layout:"featureGrid" },
      { name:"Big Number", layout:"bigNumber" },
      { name:"Photo Card", layout:"photoCard" }
    ];

    const t = intent?.type || "generic";
    const s = (seed ^ hash("intent|"+t)) >>> 0;

    const weights = {
      generic:     { splitHero:18, badgePromo:14, minimalQuote:10, featureGrid:14, bigNumber:12, photoCard:12 },
      promo:       { splitHero:12, badgePromo:22, minimalQuote:6,  featureGrid:12, bigNumber:22, photoCard:10 },
      hiring:      { splitHero:20, badgePromo:6,  minimalQuote:8,  featureGrid:22, bigNumber:10, photoCard:14 },
      announcement:{ splitHero:18, badgePromo:10, minimalQuote:10, featureGrid:16, bigNumber:10, photoCard:18 },
      quote:       { splitHero:10, badgePromo:6,  minimalQuote:30, featureGrid:10, bigNumber:10, photoCard:12 }
    };

    const w = weights[t] || weights.generic;
    const wlist = base.map(a=>({ w: w[a.layout] ?? 10, v: a }));
    return weightedPick(wlist, s);
  }

  function normalizeStyleName(style){
    return (style||"Dark Premium").trim();
  }

  function paletteForStyle(style, seed, intent){
    // Use base palettes but transform according to style family (visible dropdown).
    const sname = normalizeStyleName(style).toLowerCase();
    const base = pick(PALETTES, seed);

    // shallow clone
    let pal = { ...base };

    const toLight = (hex)=>{
      // very small util; fallback if parsing fails
      try{
        const h = hex.replace("#","").trim();
        const r = parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
        const mix = (c, t)=>Math.round(c + (t-c)*0.9);
        return "#"+[mix(r,255),mix(g,255),mix(b,255)].map(x=>x.toString(16).padStart(2,"0")).join("");
      }catch(e){ return "#f8fafc"; }
    };

    if(sname.includes("light minimal")){
      pal.bg = "#f8fafc";
      pal.bg2 = toLight(base.bg2 || base.bg);
      pal.ink = "#0b1220";
      pal.muted = "#334155";
      pal.accent = base.accent2 || "#2563eb";
      pal.accent2 = base.accent || "#0ea5e9";
    } else if(sname.includes("corporate")){
      pal.bg = "#071423";
      pal.bg2 = "#0b2a4a";
      pal.ink = "#f3f7ff";
      pal.muted = "#b8c7dd";
      pal.accent = "#38bdf8";
      pal.accent2 = "#a78bfa";
    } else if(sname.includes("glass")){
      pal.bg = base.bg;
      pal.bg2 = base.bg2;
      pal.ink = "#f7fbff";
      pal.muted = "#c9d6ea";
      pal.accent = base.accent || "#60a5fa";
      pal.accent2 = base.accent2 || "#a78bfa";
      pal.__glass = true; // hint to renderer/buildElements for more translucent overlays
    } else if(sname.includes("neon")){
      pal.bg = "#05040a";
      pal.bg2 = "#130a2a";
      pal.ink = "#ffffff";
      pal.muted = "#c7c3ff";
      pal.accent = "#22d3ee";
      pal.accent2 = "#fb7185";
    } else {
      // Dark Premium default: keep base but strengthen contrast a bit
      pal.bg = base.bg;
      pal.bg2 = base.bg2;
      pal.ink = base.ink;
      pal.muted = base.muted;
      pal.accent = base.accent;
      pal.accent2 = base.accent2;
    }

    // Intent tinting: hiring should feel trustworthy; promo louder accents
    const t = intent?.type;
    if(t==="hiring"){
      pal.accent = "#60a5fa";
      pal.accent2 = "#34d399";
    } else if(t==="promo"){
      pal.accent = pal.accent2 || pal.accent;
    }
    return pal;
  }

  function pickCTA(intent, seed){
    const t = intent?.ctaMode || "generic";
    const s = (seed ^ hash("cta|"+t)) >>> 0;

    const choices = {
      hiring: [
        { w:28, v:"Apply Now" },
        { w:22, v:"View Roles" },
        { w:18, v:"Join Our Team" },
        { w:12, v:"Send CV" }
      ],
      promo: [
        { w:26, v:"Shop Now" },
        { w:24, v:"Get 30% Off" },
        { w:16, v:"Limited Offer" },
        { w:14, v:"Buy Now" }
      ],
      info: [
        { w:26, v:"Learn More" },
        { w:18, v:"Read More" },
        { w:16, v:"Get Details" }
      ],
      brand: [
        { w:26, v:"Discover" },
        { w:20, v:"Explore" },
        { w:14, v:"Get Started" }
      ],
      generic: [
        { w:22, v:"Get Started" },
        { w:18, v:"Learn More" },
        { w:14, v:"Join Now" }
      ]
    };

    const list = choices[t] || choices.generic;
    return weightedPick(list.map(x=>({w:x.w, v:x.v})), s);
  }
  // === End Phase AD Intent Biasing ===


  function archetype(seed){
    const archetypes = [
      { name:"Split Hero", layout:"splitHero" },
      { name:"Badge Promo", layout:"badgePromo" },
      { name:"Minimal Quote", layout:"minimalQuote" },
      { name:"Feature Grid", layout:"featureGrid" },
      { name:"Big Number", layout:"bigNumber" },
      { name:"Photo Card", layout:"photoCard" }
    ];
    return pick(archetypes, seed);
  }

  function buildElements(layout, spec){
    const { w,h,pal,brand,tagline,seed } = spec;
    const elements = [];
    const s = seed;

    const add = (el)=>{ elements.push(el); return el; };
    add({ type:"bg", x:0,y:0,w,h, fill: pal.bg, fill2: pal.bg2, style:"radial" });

    if(layout==="splitHero"){
      add({ type:"shape", x:0,y:0,w:Math.round(w*0.56),h, r:48, fill: pal.bg2, opacity:0.85 });
      add({ type:"shape", x:Math.round(w*0.53),y:Math.round(h*0.1),w:Math.round(w*0.42),h:Math.round(h*0.55), r:48, stroke:"rgba(255,255,255,0.14)", fill:"rgba(255,255,255,0.04)" });
      add({ type:"text", x:Math.round(w*0.07),y:Math.round(h*0.14), text: brand.toUpperCase(), size:Math.round(h*0.055), weight:800, color: pal.ink, letter: -0.5 });
      add({ type:"text", x:Math.round(w*0.07),y:Math.round(h*0.25), text: "NEW COLLECTION", size:Math.round(h*0.03), weight:700, color: pal.muted, letter: 2 });
      add({ type:"text", x:Math.round(w*0.07),y:Math.round(h*0.33), text: tagline, size:Math.round(h*0.038), weight:600, color: pal.ink });
      add({ type:"pill", x:Math.round(w*0.07),y:Math.round(h*0.72), w:Math.round(w*0.28),h:Math.round(h*0.085), r:999, fill: pal.accent, text:(spec.ctaText||"Get Started"), tcolor:"#0b1020", tsize:Math.round(h*0.032), tweight:800 });
      add({ type:"chip", x:Math.round(w*0.07),y:Math.round(h*0.82), text:"Premium • Fast • Ready", size:Math.round(h*0.028), color: pal.muted });
      add({ type:"photo", src: smartPhotoSrc(s+11, pal, brand), x:Math.round(w*0.60),y:Math.round(h*0.16),w:Math.round(w*0.32),h:Math.round(h*0.38), r:40, stroke:"rgba(255,255,255,0.18)" });
    }

    if(layout==="badgePromo"){
      const badgeW=Math.round(w*0.22), badgeH=Math.round(h*0.11);
      add({ type:"shape", x:Math.round(w*0.08),y:Math.round(h*0.12),w:Math.round(w*0.84),h:Math.round(h*0.56), r:52, fill:"rgba(255,255,255,0.05)", stroke:"rgba(255,255,255,0.14)" });
      add({ type:"badge", x:Math.round(w*0.73),y:Math.round(h*0.09),w:badgeW,h:badgeH, r:22, fill: pal.accent2, text:"LIMITED", tcolor:"#0b1020", tsize:Math.round(h*0.03), tweight:900 });
      add({ type:"text", x:Math.round(w*0.12),y:Math.round(h*0.22), text: brand, size:Math.round(h*0.06), weight:900, color: pal.ink });
      add({ type:"text", x:Math.round(w*0.12),y:Math.round(h*0.31), text: "Flash Sale", size:Math.round(h*0.09), weight:900, color: pal.ink, letter:-1 });
      add({ type:"shape", x:Math.round(w*0.12),y:Math.round(h*0.46),w:Math.round(w*0.56),h:Math.round(h*0.01), r:8, fill:"rgba(255,255,255,0.16)" });
      add({ type:"pill", x:Math.round(w*0.12),y:Math.round(h*0.52), w:Math.round(w*0.34),h:Math.round(h*0.095), r:999, fill: pal.accent, text:(spec.ctaText||"Get 30% Off"), tcolor:"#0b1020", tsize:Math.round(h*0.035), tweight:900 });
      add({ type:"chip", x:Math.round(w*0.12),y:Math.round(h*0.65), text:"Use code: NEXORA", size:Math.round(h*0.03), color: pal.muted });
      add({ type:"shape", x:Math.round(w*0.70),y:Math.round(h*0.40),w:Math.round(w*0.18),h:Math.round(w*0.18), r:40, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.14)" });
    }

    if(layout==="minimalQuote"){
      add({ type:"shape", x:Math.round(w*0.10),y:Math.round(h*0.12),w:Math.round(w*0.80),h:Math.round(h*0.76), r:46, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.12)" });
      add({ type:"text", x:Math.round(w*0.16),y:Math.round(h*0.22), text:"“"+(tagline||"Create something memorable.")+"”", size:Math.round(h*0.06), weight:800, color: pal.ink, italic:true });
      add({ type:"text", x:Math.round(w*0.16),y:Math.round(h*0.52), text:"— "+brand, size:Math.round(h*0.035), weight:700, color: pal.muted });
      add({ type:"pill", x:Math.round(w*0.16),y:Math.round(h*0.66), w:Math.round(w*0.30),h:Math.round(h*0.08), r:999, fill: "rgba(255,255,255,0.06)", stroke:"rgba(255,255,255,0.16)", text:(spec.ctaText||"Learn More"), tcolor: pal.ink, tsize:Math.round(h*0.03), tweight:800 });
      add({ type:"dots", x:Math.round(w*0.74),y:Math.round(h*0.74), w:Math.round(w*0.14),h:Math.round(h*0.14), color:"rgba(255,255,255,0.14)" });
    }

    if(layout==="featureGrid"){
      add({ type:"text", x:Math.round(w*0.08),y:Math.round(h*0.12), text: brand, size:Math.round(h*0.055), weight:900, color: pal.ink });
      add({ type:"text", x:Math.round(w*0.08),y:Math.round(h*0.20), text: "What you get", size:Math.round(h*0.035), weight:700, color: pal.muted });
      const boxW=Math.round(w*0.40), boxH=Math.round(h*0.16);
      const startX=Math.round(w*0.08), startY=Math.round(h*0.30);
      for(let r=0;r<3;r++){
        for(let c=0;c<2;c++){
          const x=startX + c*(boxW+Math.round(w*0.04));
          const y=startY + r*(boxH+Math.round(h*0.03));
          add({ type:"shape", x,y,w:boxW,h:boxH, r:28, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.12)" });
          add({ type:"dot", x:x+22,y:y+22, r:8, fill: (c===0?pal.accent:pal.accent2) });
          add({ type:"text", x:x+44,y:y+16, text: pick(["Clean layout","Bold title","Smart spacing","Premium palette","Strong CTA","Easy edit"], (s+r*7+c*3)), size:Math.round(h*0.03), weight:800, color: pal.ink });
          add({ type:"text", x:x+44,y:y+50, text: pick(["Optimized typography","Designed for scroll","Balanced hierarchy","Readable and modern","Looks expensive","Canva-style"], (s+r*11+c*5)), size:Math.round(h*0.025), weight:600, color: pal.muted });
        }
      }
    }

    if(layout==="bigNumber"){
      const num = String((s%9)+1);
      add({ type:"text", x:Math.round(w*0.10),y:Math.round(h*0.18), text:"0"+num, size:Math.round(h*0.26), weight:900, color:"rgba(255,255,255,0.10)", letter:-6 });
      add({ type:"text", x:Math.round(w*0.10),y:Math.round(h*0.34), text: brand, size:Math.round(h*0.06), weight:900, color: pal.ink });
      add({ type:"text", x:Math.round(w*0.10),y:Math.round(h*0.44), text: tagline, size:Math.round(h*0.04), weight:700, color: pal.muted });
      add({ type:"pill", x:Math.round(w*0.10),y:Math.round(h*0.60), w:Math.round(w*0.34),h:Math.round(h*0.09), r:999, fill: pal.accent, text:(spec.ctaText||"Join Now"), tcolor:"#0b1020", tsize:Math.round(h*0.034), tweight:900 });
      add({ type:"shape", x:Math.round(w*0.62),y:Math.round(h*0.20),w:Math.round(w*0.28),h:Math.round(w*0.28), r:46, fill:"rgba(255,255,255,0.03)", stroke:"rgba(255,255,255,0.14)" });
    }

    if(layout==="photoCard"){
      add({ type:"shape", x:Math.round(w*0.08),y:Math.round(h*0.12),w:Math.round(w*0.84),h:Math.round(h*0.76), r:50, fill:"rgba(255,255,255,0.04)", stroke:"rgba(255,255,255,0.12)" });
      add({ type:"photo", src: smartPhotoSrc(s+37, pal, brand), x:Math.round(w*0.58),y:Math.round(h*0.18),w:Math.round(w*0.30),h:Math.round(h*0.40), r:42, stroke:"rgba(255,255,255,0.18)" });
      add({ type:"text", x:Math.round(w*0.14),y:Math.round(h*0.22), text: brand, size:Math.round(h*0.06), weight:900, color: pal.ink });
      add({ type:"text", x:Math.round(w*0.14),y:Math.round(h*0.31), text: pick(["Grow your brand","Creative studio","Premium design","New launch","Build momentum","Meet your goals"], s), size:Math.round(h*0.075), weight:900, color: pal.ink, letter:-1 });
      add({ type:"text", x:Math.round(w*0.14),y:Math.round(h*0.44), text: tagline, size:Math.round(h*0.032), weight:650, color: pal.muted });
      add({ type:"pill", x:Math.round(w*0.14),y:Math.round(h*0.60), w:Math.round(w*0.30),h:Math.round(h*0.085), r:999, fill: pal.accent2, text:(spec.ctaText||"Shop Now"), tcolor:"#0b1020", tsize:Math.round(h*0.032), tweight:900 });
      add({ type:"chip", x:Math.round(w*0.14),y:Math.round(h*0.71), text:"@"+brand.replace(/\s+/g,"").toLowerCase(), size:Math.round(h*0.028), color: pal.muted });
    }

    return elements;
  }

  function generateOne(category, prompt, style, idx){
    const meta = CATEGORIES[category] || CATEGORIES["Instagram Post"];
    const seed = (hash(category+"|"+style+"|"+prompt) + idx*1013) >>> 0;
    const intent = classifyIntent(prompt, category, style);
    const pal = paletteForStyle(style, seed, intent);
    const b = brandFromPrompt(prompt);
    const arch = archetypeWithIntent(seed, intent);

    const titleByCategory = {
      "Instagram Post": "Instagram Post #"+(idx+1),
      "Story": "Story #"+(idx+1),
      "YouTube Thumbnail": "YouTube Thumbnail #"+(idx+1),
      "Flyer": "Flyer #"+(idx+1),
      "Business Card": "Business Card #"+(idx+1),
      "Logo": "Logo #"+(idx+1),
      "Presentation Slide": "Slide #"+(idx+1),
      "Resume": "Resume #"+(idx+1),
      "Poster": "Poster #"+(idx+1)
    };

    const subtitle = (style||"Dark Premium") + " • " + arch.name;
    const elements = buildElements(arch.layout, {
      w: meta.w, h: meta.h, pal,
      brand: b.brand || "Nexora",
      tagline: b.tagline || "Premium templates, fast.",
      ctaText: pickCTA(intent, seed),
      intent,
      seed
    });

    return {
      id: "tpl_"+seed.toString(16)+"_"+idx,
      title: titleByCategory[category] || (category+" #"+(idx+1)),
      subtitle,
      category,
      style: style || "Dark Premium",
      ratio: meta.ratio,
      canvas: { w: meta.w, h: meta.h },
      palette: pal,
      elements
    };
  }

  function generateTemplates(opts){
    const category = opts?.category || "Instagram Post";
    const prompt = opts?.prompt || "";
    const style = opts?.style || "Dark Premium";
    const count = clamp(parseInt(opts?.count ?? 24,10) || 24, 1, 200);
    const out=[];
    for(let i=0;i<count;i++) out.push(generateOne(category, prompt, style, i));
    return out;
  }

  function renderPreview(template, container){
    if(!container) return;
    container.innerHTML = "";
    const w=template?.canvas?.w||1080, h=template?.canvas?.h||1080;
    const boxW=container.clientWidth||260;
    const scale = boxW / w;
    const boxH = Math.max(120, Math.round(h*scale));
    container.style.height = boxH+"px";
    container.style.position="relative";
    container.style.overflow="hidden";
    container.style.borderRadius="14px";

    const mk = (tag)=>document.createElement(tag);
    const els = template?.elements || [];
    for(const e of els){
      if(e.type==="bg"){
        const d=mk("div");
        d.style.position="absolute"; d.style.left="0"; d.style.top="0";
        d.style.width="100%"; d.style.height="100%";
        d.style.background = e.style==="radial"
          ? `radial-gradient(120% 90% at 20% 10%, ${e.fill2}, ${e.fill})`
          : e.fill;
        container.appendChild(d);
        continue;
      }
      if(e.type==="shape"){
        const d=mk("div");
        d.style.position="absolute";
        d.style.left=(e.x*scale)+"px"; d.style.top=(e.y*scale)+"px";
        d.style.width=(e.w*scale)+"px"; d.style.height=(e.h*scale)+"px";
        d.style.borderRadius=((e.r||0)*scale)+"px";
        d.style.background=e.fill||"transparent";
        if(e.stroke) d.style.border=`${Math.max(1,Math.round(1.2*scale))}px solid ${e.stroke}`;
        if(e.opacity!=null) d.style.opacity=String(e.opacity);
        container.appendChild(d);
        continue;
      }
      if(e.type==="photo"){
        const d=mk("div");
        d.style.position="absolute";
        d.style.left=(e.x*scale)+"px"; d.style.top=(e.y*scale)+"px";
        d.style.width=(e.w*scale)+"px"; d.style.height=(e.h*scale)+"px";
        d.style.borderRadius=((e.r||0)*scale)+"px";
        d.style.background = e.src ? `url(${e.src})` : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))";
        if(e.src){ d.style.backgroundSize="cover"; d.style.backgroundPosition="center"; }
        d.style.border=`${Math.max(1,Math.round(1.2*scale))}px dashed ${e.stroke||"rgba(255,255,255,0.18)"}`;
        container.appendChild(d);
        continue;
      }
      if(e.type==="text"){
        const d=mk("div");
        d.style.position="absolute";
        d.style.left=(e.x*scale)+"px"; d.style.top=(e.y*scale)+"px";
        d.style.right="8px";
        d.style.color=e.color||"#fff";
        d.style.fontSize=Math.max(10, Math.round((e.size||28)*scale))+"px";
        d.style.fontWeight=e.weight||700;
        d.style.lineHeight="1.05";
        d.style.letterSpacing=(e.letter!=null? (e.letter*scale)+"px":"0px");
        d.style.whiteSpace="pre-wrap";
        if(e.italic) d.style.fontStyle="italic";
        d.textContent=e.text||"";
        container.appendChild(d);
        continue;
      }
      if(e.type==="pill" || e.type==="badge"){
        const d=mk("div");
        d.style.position="absolute";
        d.style.left=(e.x*scale)+"px"; d.style.top=(e.y*scale)+"px";
        d.style.width=(e.w*scale)+"px"; d.style.height=(e.h*scale)+"px";
        d.style.borderRadius=((e.r||999)*scale)+"px";
        d.style.background=e.fill||"rgba(255,255,255,0.1)";
        if(e.stroke) d.style.border=`${Math.max(1,Math.round(1.2*scale))}px solid ${e.stroke}`;
        d.style.display="flex";
        d.style.alignItems="center";
        d.style.justifyContent="center";
        d.style.color=e.tcolor||"#0b1020";
        d.style.fontWeight=e.tweight||900;
        d.style.fontSize=Math.max(10, Math.round((e.tsize||22)*scale))+"px";
        d.textContent=e.text||"";
        container.appendChild(d);
        continue;
      }
      if(e.type==="chip"){
        const d=mk("div");
        d.style.position="absolute";
        d.style.left=(e.x*scale)+"px"; d.style.top=(e.y*scale)+"px";
        d.style.color=e.color||"rgba(255,255,255,0.75)";
        d.style.fontSize=Math.max(10, Math.round((e.size||18)*scale))+"px";
        d.style.fontWeight="700";
        d.textContent=e.text||"";
        container.appendChild(d);
        continue;
      }
      if(e.type==="dots" || e.type==="dot"){
        const d=mk("div");
        d.style.position="absolute";
        d.style.left=(e.x*scale)+"px"; d.style.top=(e.y*scale)+"px";
        if(e.type==="dot"){
          d.style.width=(e.r*2*scale)+"px"; d.style.height=(e.r*2*scale)+"px";
          d.style.borderRadius="999px";
          d.style.background=e.fill||"rgba(255,255,255,0.2)";
        } else {
          d.style.width=(e.w*scale)+"px"; d.style.height=(e.h*scale)+"px";
          d.style.backgroundImage="radial-gradient(currentColor 1px, transparent 1px)";
          d.style.backgroundSize=`${Math.max(6,Math.round(10*scale))}px ${Math.max(6,Math.round(10*scale))}px`;
          d.style.color=e.color||"rgba(255,255,255,0.16)";
        }
        container.appendChild(d);
        continue;
      }
    }

    const g=mk("div");
    g.style.position="absolute"; g.style.left="-20%"; g.style.top="-30%";
    g.style.width="60%"; g.style.height="160%";
    g.style.transform="rotate(20deg)";
    g.style.background="linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)";
    container.appendChild(g);
  }

  window.NexoraDesign = { CATEGORIES, generateTemplates, renderPreview };
})();


/* =====================================================
   PHASE AB — SCENE BUILDER ENGINE (POSTER STRUCTURE)
   ===================================================== */

function applySceneBuilder(template){
  if(!template) return template;

  // Scene regions
  const scenes = ["hero-left","hero-right","hero-top","center-focus"];
  const scene = scenes[Math.floor(Math.random()*scenes.length)];

  template.scene = {
    layout: scene,
    regions: {
      hero: { weight: 0.55 + Math.random()*0.2 },
      support: { weight: 0.2 + Math.random()*0.15 },
      base: { weight: 0.15 + Math.random()*0.1 }
    }
  };

  // Anchors
  template.anchors = [
    { type: "panel", dominance: "hero", radius: 18, opacity: 0.9 },
    { type: "shape", dominance: "support", radius: 999, opacity: 0.35 }
  ];

  // Structured blocks
  template.blocksStructure = {
    textPlacement:
      scene === "hero-left" ? "right" :
      scene === "hero-right" ? "left" :
      scene === "hero-top" ? "bottom" : "center",
    visualPlacement:
      scene === "hero-left" ? "left" :
      scene === "hero-right" ? "right" :
      scene === "hero-top" ? "top" : "center"
  };

  // Poster balance
  template.posterBalance = {
    negativeSpace: 0.18 + Math.random()*0.12,
    contrastBias: Math.random() > 0.5 ? "visual" : "text"
  };

  template.visualDominance = "scene";

  return template;
}

if(typeof window !== "undefined"){
  window.__NEXORA_PHASE_AB_SCENE__ = applySceneBuilder;
}


// === Phase AD-1: Visual Intelligence / Layout Sophistication ===
// Goal: make layouts feel art-directed, not templated.

function ad1EnhanceLayout(t, index){
  const intent =
    (t.headline && t.headline.length > 20) ? "headline-heavy" :
    (t.cta && t.cta.length > 8) ? "promo" :
    "minimal";

  // Dominant element logic
  t.visualIntent = intent;

  if (!t.layoutHint) {
    t.layoutHint =
      intent === "headline-heavy" ? "poster-hero" :
      intent === "promo" ? "cta-focus" :
      "minimal-center";
  }

  // Controlled asymmetry
  t.spacing = {
    padding:
      intent === "headline-heavy" ? 28 :
      intent === "promo" ? 20 : 36,
    offsetX: index % 2 === 0 ? 0 : 6,
    offsetY: index % 3 === 0 ? 4 : 0,
  };

  // Emphasis rules
  t.emphasis = {
    primary:
      intent === "headline-heavy" ? "headline" :
      intent === "promo" ? "cta" : "visual",
    secondary:
      intent === "headline-heavy" ? "visual" :
      intent === "promo" ? "headline" : "headline",
  };

  return t;
}

if (Array.isArray(window.templates)) {
  window.templates = window.templates.map((t, i) => ad1EnhanceLayout(t, i));
}


// ---- Intent Biasing v3: Scene Wiring & Layout Morphing ----
function applyIntentScene(template, intent) {
  if (typeof applySceneBuilder === "function") {
    applySceneBuilder(template, intent);
  }
  template.__intent = intent;
  return template;
}

// Wrap generateOne to ensure scene wiring (explicit, no silent fallback)
(function(){
  if (typeof generateOne === "function" && !generateOne.__intentWrapped) {
    const _gen = generateOne;
    const wrapped = function(seed, opts){
      const t = _gen(seed, opts);
      try {
        if (opts && opts.intent) return applyIntentScene(t, opts.intent);
      } catch(e) {}
      return t;
    };
    wrapped.__intentWrapped = true;
    generateOne = wrapped;
  }
})();
