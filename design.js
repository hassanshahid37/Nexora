

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

  // Phase AC-V1: prompt → content model (headline/subhead/badges/features)
  function contentModel(prompt, category, intent, seed){
    const p = String(prompt||"").trim();
    const words = p.replace(/[^\w\s%$-]/g," ").split(/\s+/).filter(Boolean);
    const first = (words[0]||"").slice(0,20);
    const brandGuess = words.slice(0,3).join(" ").trim() || "Nexora";

    const cm = {
      headline: "",
      subhead: "",
      kicker: "",
      badge: "",
      features: [],
      eventName: "",
      eventMeta: "",
      dateLabel: "",
      location: "",
      speakers: [],
      smallprint: ""
    };

    const it = intent?.type || "generic";
    const cat = String(category||"");
    const s = seed>>>0;

    // Headline
    if(it==="promo"){
      cm.kicker = pick(["LIMITED TIME","FLASH DEAL","WEEKEND SALE","NEW DROP"], s^hash("k"));
      cm.badge  = pick(["% OFF","SALE","DEAL","HOT"], s^hash("b"));
      cm.headline = p ? titleish(p, 38) : pick(["New Collection","Premium Drop","Big Savings"], s);
      cm.subhead  = pick(["Premium quality • Fast delivery","Limited stock • Don’t miss out","Shop the best picks today"], s^hash("s"));
      cm.features = pick([
        ["Free delivery","Easy returns","Top rated"],
        ["Best price","New arrivals","Limited stock"],
        ["Premium materials","Modern design","Exclusive offer"]
      ], s^hash("f"));
    } else if(it==="hiring"){
      cm.kicker = pick(["WE’RE HIRING","JOIN OUR TEAM","NOW HIRING"], s^hash("k"));
      cm.badge  = pick(["FULL‑TIME","REMOTE","APPLY"], s^hash("b"));
      cm.headline = pick(["Designer","Developer","Marketing Lead","Sales Executive"], s^hash("h")) + " Needed";
      cm.subhead  = p ? titleish(p, 60) : "Build something great with us. Apply today.";
      cm.features = pick([
        ["Competitive pay","Growth","Great team"],
        ["Remote friendly","Flexible hours","Fast career"],
        ["Health benefits","Learning budget","Mentorship"]
      ], s^hash("f"));
      cm.smallprint = "Send CV • careers@" + brandGuess.toLowerCase().replace(/\s+/g,"") + ".com";
    } else if(it==="announcement"){
      cm.kicker = pick(["ANNOUNCEMENT","SAVE THE DATE","YOU’RE INVITED"], s^hash("k"));
      cm.badge  = pick(["LIVE","EVENT","NEW"], s^hash("b"));
      cm.eventName = p ? titleish(p, 44) : "Special Event";
      cm.eventMeta = pick(["Talks • Networking • Q&A","Workshop • Live Demo • Gifts","Community • Speakers • Updates"], s^hash("m"));
      cm.dateLabel = pick(["SAT • 7 PM","FRI • 6:30 PM","SUN • 5 PM"], s^hash("d"));
      cm.location = pick(["Downtown Hall","Online • Zoom","Main Auditorium"], s^hash("l"));
      cm.speakers = pick([
        ["Keynote • Guest Speaker","Panel • Q&A","Networking"],
        ["Live demo","Workshop session","Open Q&A"],
        ["Meet the team","Product updates","Community stories"]
      ], s^hash("sp"));
      cm.headline = cm.eventName;
      cm.subhead = cm.eventMeta + " • " + cm.location;
    } else if(it==="quote"){
      cm.kicker = pick(["DAILY MOTIVATION","QUOTE","MINDSET"], s^hash("k"));
      cm.headline = p ? titleish(p, 70) : pick(["Discipline beats motivation.","Start now.","Stay consistent."], s);
      cm.subhead  = pick(["Save this • Share • Repeat","One step every day","Build the habit"], s^hash("s"));
      cm.badge = pick(["INSPIRE","FOCUS","GROW"], s^hash("b"));
    } else {
      cm.kicker = pick(["NEW","FEATURED","PREMIUM"], s^hash("k"));
      cm.badge = pick(["QUALITY","MODERN","PRO"], s^hash("b"));
      cm.headline = p ? titleish(p, 46) : "Designed to impress.";
      cm.subhead  = pick(["Clean layouts • Strong hierarchy","Canva‑level posters • Ready fast","Made for socials • Built for brands"], s^hash("s"));
      cm.features = pick([
        ["Clean grid","Strong contrast","Modern shapes"],
        ["Photo zones","Text safe area","Premium accents"],
        ["Balanced spacing","Readable type","Export ready"]
      ], s^hash("f"));
    }

    // Category hinting
    if(cat.toLowerCase().includes("youtube")){
      cm.kicker = cm.kicker || "WATCH THIS";
      cm.subhead = cm.subhead || "Click to see the full story";
      cm.badge = cm.badge || "NEW";
    }
    if(cat.toLowerCase().includes("logo")){
      cm.headline = brandGuess;
      cm.subhead = cm.subhead || "Brand identity • Clean mark";
      cm.features = [];
    }

  // YouTube Thumbnail: stronger hooky copy defaults (Phase 6A / YT-1)
  if(cat.includes("youtube") || cat.includes("yt")){
    const raw = (prompt||"").trim();
    const cleaned = raw
      .replace(/^[\s\-–—:]+/g,"")
      .replace(/^(why|how|what|when|where|the truth about|truth about)\s+/i,"")
      .replace(/\?+$/,"")
      .trim();

    let head = cleaned || "WATCH THIS";
    const words = head.split(/\s+/).filter(Boolean);
    if(words.length > 7) head = words.slice(0,7).join(" ");
    if(head.length > 34) head = head.slice(0,34).trim();

    const hooks = ["SHOCKING", "TRUTH", "SECRET", "MISTAKES", "WARNING", "REAL REASON"];
    const micro = ["WATCH NOW", "DON'T MISS", "FULL STORY", "NEW VIDEO", "IN 5 MINUTES"];
    const badge = ["NEW", "2025", "TOP 5", "BREAKDOWN", "EXPOSED", "HOW TO"];

    cm.badge = pick(badge, seed ^ 0x5151);
    cm.kicker = pick(hooks, seed ^ 0x6161);
    cm.headline = (head).toUpperCase();
    cm.subhead = pick(micro, seed ^ 0x7171);
    cm.cta = "WATCH";
    cm.body = "";
    cm.features = [];
  }

  return cm;
  }

  function titleish(text, maxLen){
    const s = String(text||"").trim().replace(/[\r\n]+/g," ");
    if(!s) return "";
    // keep some natural casing but avoid huge strings
    const t = s.length > maxLen ? (s.slice(0, maxLen).replace(/\s+\S*$/,"")) : s;
    return t;
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
    intent.category = category || "";
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

  function archetypeWithIntent(intent, seed){
  // Category-specific archetype resolver (Phase 6A / YT-1 final)
  // Keep the existing spine intact, but route YouTube Thumbnails into a richer set of layouts.
  const base = archetype(seed);

  const cat = ((intent && intent.category) ? String(intent.category) : "").toLowerCase();
  const type = ((intent && intent.type) ? String(intent.type) : "generic").toLowerCase();

  function pickLayout(weightMap){
    const entries = Object.entries(weightMap).filter(([,w]) => w > 0);
    const total = entries.reduce((a,[,w]) => a + w, 0);
    if(!total) return base.layout;
    let r = rand(seed ^ 0xBEEF) * total;
    for(const [k,w] of entries){
      r -= w;
      if(r <= 0) return k;
    }
    return entries[entries.length-1][0];
  }

  if(cat.includes("youtube") || cat.includes("yt")){
    const yt = {
      generic:  { splitHero: 0.30, photoCard: 0.25, posterHero: 0.20, featureGrid: 0.15, badgePromo: 0.10 },
      tutorial: { splitHero: 0.35, photoCard: 0.25, featureGrid: 0.20, posterHero: 0.10, badgePromo: 0.10 },
      listicle: { featureGrid: 0.35, splitHero: 0.25, posterHero: 0.15, badgePromo: 0.15, photoCard: 0.10 },
      promo:    { badgePromo: 0.40, splitHero: 0.25, posterHero: 0.20, photoCard: 0.15, featureGrid: 0.00 },
      offer:    { badgePromo: 0.40, splitHero: 0.25, posterHero: 0.20, photoCard: 0.15, featureGrid: 0.00 },
      quote:    { posterHero: 0.35, minimalQuote: 0.25, splitHero: 0.20, photoCard: 0.20, featureGrid: 0.00 }
    };

    const weights = yt[type] || yt.generic;
    const layout = pickLayout(weights);

    const nameByLayout = {
      splitHero: "YouTube Face",
      photoCard: "YouTube Photo",
      featureGrid: "YouTube List",
      badgePromo: "YouTube Badge",
      posterHero: "YouTube Bold",
      minimalQuote: "YouTube Quote"
    };

    return { ...base, name: nameByLayout[layout] || "YouTube", layout };
  }

  // Non-YouTube: keep existing behavior (small type-based bias only).
  const w = {
    generic: 0.18,
    posterHero: 0.22,
    splitHero: 0.16,
    badgePromo: 0.14,
    featureGrid: 0.12,
    photoCard: 0.10,
    minimalQuote: 0.04,
    bigNumber: 0.04
  };

  if(type === "quote") { w.minimalQuote += 0.20; w.posterHero += 0.05; }
  if(type === "promo" || type === "offer") { w.badgePromo += 0.20; w.posterHero += 0.05; }
  if(type === "listicle") { w.featureGrid += 0.20; w.splitHero += 0.05; }
  if(type === "tutorial") { w.splitHero += 0.15; w.photoCard += 0.05; }

  const layout = pickLayout(w);
  const nameByLayout = {
    posterHero: "Poster Hero",
    splitHero: "Split Hero",
    badgePromo: "Badge Promo",
    featureGrid: "Feature Grid",
    photoCard: "Photo Card",
    minimalQuote: "Minimal Quote",
    bigNumber: "Big Number"
  };

  return { ...base, name: nameByLayout[layout] || base.name, layout };
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

    // Phase AC-V1: poster-first layouts (Canva-level compositions)
    const M = Math.round(Math.min(w,h) * 0.06); // safe margin
    const glass = !!pal.__glass;

    const tHeadline = String(spec.headline || tagline || brand || "New");
    const tSub = String(spec.subhead || spec.subtitle || "Designed • Clean • Modern");
    const tKicker = String(spec.kicker || "").trim();
    const tCTA = String(spec.ctaText || "Learn More");

    const photoLabel = (brand||"Nexora").toString().slice(0,18);
    const photoSrcA = smartPhotoSrc((s^hash("A"))>>>0, pal, photoLabel);
    const photoSrcB = smartPhotoSrc((s^hash("B"))>>>0, pal, (tHeadline.split(" ")[0]||photoLabel));

    if(layout==="posterHero"){
      // Full-bleed hero photo with gradient overlay + strong typography.
      add({ type:"photo", src: photoSrcA, x:0,y:0,w,h, r:0, opacity:1 });
      add({ type:"shape", x:0,y:0,w,h, r:0, fill:"linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.60))", opacity:1 });
      add({ type:"shape", x:M,y:Math.round(h*0.10),w:Math.round(w*0.56),h:Math.round(h*0.62), r:44,
            fill: glass ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.20)",
            stroke:"rgba(255,255,255,0.18)" , opacity: glass ? 1 : 0.95 });
      if(tKicker){
        add({ type:"chip", x:M+24,y:Math.round(h*0.12), text:tKicker.toUpperCase(), size:Math.round(h*0.028), color: pal.muted });
      }
      add({ type:"text", x:M+24,y:Math.round(h*0.20), text:tHeadline, size:Math.round(h*0.070), weight:900, color: pal.ink, letter:-0.8 });
      add({ type:"text", x:M+24,y:Math.round(h*0.33), text:tSub, size:Math.round(h*0.040), weight:600, color: "rgba(255,255,255,0.88)" });
      add({ type:"pill", x:M+24,y:Math.round(h*0.54), w:Math.round(w*0.26),h:Math.round(h*0.085), r:999,
            fill: pal.accent, text:tCTA, tcolor:"#071423", tsize:Math.round(h*0.032), tweight:800 });
      add({ type:"chip", x:M+24,y:Math.round(h*0.64), text:(spec.smallprint||"@"+(brand||"nexora").toString().replace(/\s+/g,"").toLowerCase()), size:Math.round(h*0.028), color:"rgba(255,255,255,0.72)" });
    }

    if(layout==="productPoster"){
      // Product/offer: split photo + info stack + price/badge
      add({ type:"shape", x:0,y:0,w,h, r:0, fill: pal.bg, fill2: pal.bg2, style:"radial" });
      add({ type:"shape", x:M,y:M,w:Math.round(w*0.56),h:Math.round(h-2*M), r:46, fill: glass?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.05)", stroke:"rgba(255,255,255,0.16)" });
      add({ type:"photo", src: photoSrcB, x:Math.round(w*0.60),y:Math.round(h*0.12),w:Math.round(w*0.32),h:Math.round(h*0.46), r:40, stroke:"rgba(255,255,255,0.18)" });
      add({ type:"badge", x:Math.round(w*0.63),y:Math.round(h*0.62),w:Math.round(w*0.26),h:Math.round(h*0.13), r:999,
            fill: pal.accent2, text:(spec.badge||"LIMITED"), tcolor:"#0b1020", tsize:Math.round(h*0.032), tweight:900 });
      add({ type:"text", x:M+28,y:M+28, text:(brand||"Nexora").toUpperCase(), size:Math.round(h*0.032), weight:800, color: pal.muted, letter:2 });
      add({ type:"text", x:M+28,y:Math.round(h*0.20), text:tHeadline, size:Math.round(h*0.064), weight:900, color: pal.ink, letter:-0.7 });
      add({ type:"text", x:M+28,y:Math.round(h*0.32), text:tSub, size:Math.round(h*0.038), weight:600, color:"rgba(255,255,255,0.86)" });
      // feature bullets
      const feats = Array.isArray(spec.features) ? spec.features.slice(0,3) : [];
      let fy = Math.round(h*0.44);
      for(const f of feats){
        add({ type:"chip", x:M+28,y:fy, text:"• "+String(f), size:Math.round(h*0.030), color:"rgba(255,255,255,0.78)" });
        fy += Math.round(h*0.05);
      }
      add({ type:"pill", x:M+28,y:Math.round(h*0.74), w:Math.round(w*0.30),h:Math.round(h*0.090), r:999,
            fill: pal.accent, text:tCTA, tcolor:"#0b1020", tsize:Math.round(h*0.034), tweight:900 });
    }

    if(layout==="eventFlyer"){
      // Event: date/time/location emphasis + speaker blocks
      add({ type:"shape", x:0,y:0,w,h, r:0, fill: pal.bg, fill2: pal.bg2, style:"radial" });
      add({ type:"shape", x:M,y:M,w:Math.round(w-2*M),h:Math.round(h-2*M), r:52, fill:"rgba(255,255,255,0.05)", stroke:"rgba(255,255,255,0.16)" });
      add({ type:"shape", x:M,y:M,w:Math.round(w-2*M),h:Math.round(h*0.22), r:52, fill:"rgba(0,0,0,0.16)" });
      add({ type:"text", x:M+26,y:M+26, text:(spec.eventName||tHeadline), size:Math.round(h*0.060), weight:900, color: pal.ink, letter:-0.6 });
      add({ type:"text", x:M+26,y:Math.round(h*0.18), text:(spec.eventMeta||tSub), size:Math.round(h*0.034), weight:600, color:"rgba(255,255,255,0.84)" });

      // date card
      add({ type:"card", x:M+26,y:Math.round(h*0.30),w:Math.round(w*0.34),h:Math.round(h*0.20), r:34,
            fill: glass?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.06)", stroke:"rgba(255,255,255,0.16)" });
      add({ type:"text", x:M+50,y:Math.round(h*0.33), text:(spec.dateLabel||"SAT, 7 PM"), size:Math.round(h*0.050), weight:900, color: pal.ink });
      add({ type:"text", x:M+50,y:Math.round(h*0.40), text:(spec.location||"Downtown • RSVP Required"), size:Math.round(h*0.030), weight:600, color:"rgba(255,255,255,0.78)" });

      // right photo / atmosphere
      add({ type:"photo", src: photoSrcA, x:Math.round(w*0.56),y:Math.round(h*0.30),w:Math.round(w*0.34),h:Math.round(h*0.34), r:40, stroke:"rgba(255,255,255,0.18)" });

      // speakers/agenda chips
      const sp = Array.isArray(spec.speakers) ? spec.speakers.slice(0,3) : [];
      let syy = Math.round(h*0.68);
      for(const spt of sp){
        add({ type:"shape", x:M+26,y:syy,w:Math.round(w*0.44),h:Math.round(h*0.075), r:24, fill:"rgba(0,0,0,0.16)", stroke:"rgba(255,255,255,0.12)" });
        add({ type:"text", x:M+46,y:syy+Math.round(h*0.018), text:String(spt), size:Math.round(h*0.030), weight:700, color:"rgba(255,255,255,0.88)" });
        syy += Math.round(h*0.09);
      }

      add({ type:"pill", x:Math.round(w*0.62),y:Math.round(h*0.74), w:Math.round(w*0.26),h:Math.round(h*0.090), r:999,
            fill: pal.accent, text:tCTA, tcolor:"#0b1020", tsize:Math.round(h*0.034), tweight:900 });
    }

    if(layout==="youtubeBold"){
      // Thumbnail: heavy contrast, big headline, subtle brand bar
      add({ type:"photo", src: photoSrcA, x:0,y:0,w,h, r:0, opacity:1 });
      add({ type:"shape", x:0,y:0,w,h, r:0, fill:"linear-gradient(90deg, rgba(0,0,0,0.70), rgba(0,0,0,0.05))", opacity:1 });
      add({ type:"shape", x:Math.round(w*0.05),y:Math.round(h*0.08),w:Math.round(w*0.38),h:Math.round(h*0.12), r:26, fill:"rgba(255,255,255,0.08)", stroke:"rgba(255,255,255,0.18)" });
      add({ type:"text", x:Math.round(w*0.08),y:Math.round(h*0.105), text:(brand||"Nexora").toUpperCase(), size:Math.round(h*0.050), weight:900, color: pal.ink, letter:1.4 });
      add({ type:"text", x:Math.round(w*0.06),y:Math.round(h*0.30), text:tHeadline.toUpperCase(), size:Math.round(h*0.120), weight:900, color:"#ffffff", letter:-1.1 });
      add({ type:"text", x:Math.round(w*0.06),y:Math.round(h*0.66), text:tSub, size:Math.round(h*0.050), weight:700, color:"rgba(255,255,255,0.88)" });
    }


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

    const cm = contentModel(prompt, category, intent, seed);

    // Spine-first: canonical doc for this template (P4 binding source of truth)
    let spineDoc = null;
    try{
      if(window.NexoraSpine && typeof window.NexoraSpine.createDoc === 'function'){
        spineDoc = window.NexoraSpine.createDoc({ category, style, prompt, notes: '', seed });
        // If spine content exists, prefer it for binding
        if(spineDoc && spineDoc.content){
          cm.headline = String(spineDoc.content.headline || cm.headline || '');
          cm.subhead  = String(spineDoc.content.subhead  || cm.subhead  || '');
          cm.cta      = String(spineDoc.content.cta      || cm.cta      || '');
          cm.badge    = String(spineDoc.content.badge    || cm.badge    || '');
        }
      }
    }catch(_){ spineDoc = null; }

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

    const ctaText = pickCTA(intent, seed);

    const spec = {
      w: meta.w, h: meta.h,
      pal,
      brand: b.brand,
      tagline: b.tagline,
      seed,
      ctaText,
      // AC-V1 content model
      headline: cm.headline,
      subhead: cm.subhead,
      kicker: cm.kicker,
      badge: cm.badge,
      features: cm.features,
      eventName: cm.eventName,
      eventMeta: cm.eventMeta,
      dateLabel: cm.dateLabel,
      location: cm.location,
      speakers: cm.speakers,
      smallprint: cm.smallprint
    };

    const elementsRaw = buildElements(arch.layout, spec);

    // Spine v1: attach semantic roles (background/headline/subhead/image/cta/badge)
    const elements = (Array.isArray(elementsRaw) ? elementsRaw : []).map((e)=>({ ...e }));
    let textSeen = 0;
    for(const e of elements){
      const t = String(e?.type || "").toLowerCase();
      if(t === "bg"){
        e.role = "background";
        e.id = e.id || "bg";
        continue;
      }
      if(t === "photo" || t === "image"){
        e.role = "image";
        e.id = e.id || "media";
        continue;
      }
      if(t === "pill" || t === "badge" || t === "chip"){
        const txt = String(e?.text || e?.title || "").trim();
        if(txt && String(spec.ctaText || "").trim() && txt === String(spec.ctaText).trim()){
          e.role = "cta";
          e.id = e.id || "cta";
        }else{
          e.role = "badge";
          e.id = e.id || "badge";
        }
        continue;
      }
      if(t === "text"){
        textSeen += 1;
        // First text is headline, second is subhead, remaining default to subhead
        e.role = (textSeen === 1) ? "headline" : "subhead";
        e.id = e.id || (textSeen === 1 ? "headline" : (textSeen === 2 ? "subhead" : ("text_"+textSeen)));
        continue;
      }
      // Default fallbacks
      e.role = e.role || "badge";
      e.id = e.id || ("el_" + Math.random().toString(16).slice(2));
    }

    // Spine v1: build TemplateContract (best-effort; works even if NexoraSpine isn't loaded)
    let contract = null;
    try{
      contract = window.NexoraSpine?.createContract?.({
        templateId: "tpl_"+seed.toString(16),
        category,
        canvas: { w: meta.w, h: meta.h },
        palette: pal,
        layers: elements.map(el => ({ id: String(el.id||"layer"), role: String(el.role||"badge") }))
      }) || null;
    }catch(_){ contract = null; }

    return {
      id: "tpl_"+seed.toString(16),
      contract,
      doc: spineDoc || null,
      title: titleByCategory[category] || (category+" #"+(idx+1)),
      description: normalizeStyleName(style)+" • "+arch.name+" • "+(intent.type||"generic"),
      category,
      style,
      vibe: intent.type || "generic",
      cta: ctaText,
      canvas: { w: meta.w, h: meta.h },
      bg: pal.bg,
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
    // Preserve original signature: generateOne(opts, idx)
    const wrapped = function(opts, idx){
      const t = _gen(opts, idx);
      try {
        if (opts && opts.intent) return applyIntentScene(t, opts.intent);
      } catch(e) {}
      return t;
    };
    wrapped.__intentWrapped = true;
    generateOne = wrapped;
  }
})();



/* ===== Phase AD-2 & AD-3 : Depth, Contrast, Accent Dominance ===== */

(function(){
  if(window.__NEXORA_AD23__) return;
  window.__NEXORA_AD23__ = true;

  function applyDepth(el){
    if(el.type === "shape" || el.type === "pill"){
      el.shadow = {
        x: 0,
        y: 12,
        blur: 30,
        color: "rgba(0,0,0,0.35)"
      };
      el.radius = el.radius || 18;
    }
  }

  function accentOwnership(el, intent){
    if(intent === "promo" && el.type === "pill"){
      el.scale = 1.08;
    }
    if(intent === "hiring" && el.type === "text"){
      el.weight = Math.max(el.weight || 700, 800);
    }
  }

  function hierarchyBoost(el){
    if(el.type === "text" && el.role === "headline"){
      el.size = Math.round(el.size * 1.2);
      el.weight = 900;
    }
  }

  const hook = window.buildElements;
  if(typeof hook === "function"){
    window.buildElements = function(layout, spec){
      const els = hook(layout, spec);
      const intent = spec.intent || "generic";
      els.forEach(el=>{
        applyDepth(el);
        accentOwnership(el, intent);
        hierarchyBoost(el);
      });
      return els;
    };
  }
})();
