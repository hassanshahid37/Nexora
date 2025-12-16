// Nexora / design.js
// Phase B v1 — Visual Polish + Poster-Style Templates (static, Canva-like)
// Safe: UI-agnostic. Deterministic. Layout-first.
// - Backgrounds use layered gradients for depth.
// - Adds decorative "shape" layers + image masks as elements (safe even if preview ignores them).

export function generateTemplates(count = 24) {
  const layouts = [
    agencyFlyer,
    businessProfileFlyer,
    realEstatePoster,
    gymTrainerPoster,
    restaurantMenuPoster,
    eventNightPoster,
    beautySalonPoster,
    techStartupPoster,
    travelAdventurePoster,
    minimalEditorialPoster,
    quoteBoldPoster,
    promoDiscountPoster,
    productLaunchPoster,
    webinarPoster,
    recruitmentPoster,
    testimonialPoster,
    instagramHeroCard,
    splitDiagonalCard,
    layeredGlassCard,
    gradientBlobCard,
    serviceGridCard,
    portfolioShowcaseCard,
    faqCard,
    priceCard,
    contactFooterPoster
  ];

  const palettes = [
    { bg: bgLayer("linear-gradient(135deg,#0b5fff,#7b5cff)","radial-gradient(900px 520px at 10% 20%, rgba(255,255,255,.18), transparent 60%)"), ink:"#ffffff", accent:"#7b5cff", soft:"rgba(255,255,255,.12)" },
    { bg: bgLayer("linear-gradient(135deg,#07130f,#00c389)","radial-gradient(860px 560px at 20% 10%, rgba(255,255,255,.14), transparent 62%)"), ink:"#ffffff", accent:"#00c389", soft:"rgba(255,255,255,.10)" },
    { bg: bgLayer("linear-gradient(135deg,#0b1020,#00d1ff)","radial-gradient(800px 540px at 80% 15%, rgba(255,255,255,.16), transparent 62%)"), ink:"#ffffff", accent:"#00d1ff", soft:"rgba(255,255,255,.10)" },
    { bg: bgLayer("linear-gradient(135deg,#1f1409,#ffcc66)","radial-gradient(860px 560px at 85% 10%, rgba(255,255,255,.14), transparent 62%)"), ink:"#fff7ed", accent:"#ffcc66", soft:"rgba(255,255,255,.10)" },
    { bg: bgLayer("linear-gradient(135deg,#1a0b14,#ff4d6d)","radial-gradient(900px 560px at 15% 15%, rgba(255,255,255,.12), transparent 62%)"), ink:"#ffffff", accent:"#ff4d6d", soft:"rgba(255,255,255,.10)" }
  ];

  const out = [];
  for (let i = 0; i < count; i++) {
    const l = layouts[i % layouts.length];
    const p = palettes[i % palettes.length];
    out.push(l(i, p));
  }
  return out;
}

/* ---------- helpers ---------- */

function bgLayer(base, glow) { return `${glow}, ${base}`; }

function tpl(title, p, elements, meta = {}) {
  return {
    title,
    subtitle: meta.subtitle || "Premium",
    category: meta.category || "Templates",
    canvas: { width: 1080, height: 1080, background: p.bg },
    elements
  };
}

function h(text, x, y, w, size, color, align = "left") {
  return { type:"heading", text, x, y, width:w, fontSize:size, fontWeight:800, color, align };
}
function t(text, x, y, w, size, align = "left", color = "rgba(255,255,255,.86)") {
  return { type:"text", text, x, y, width:w, fontSize:size, fontWeight:500, color, align };
}
function btn(text, x, y, fill, w = 280) {
  return { type:"button", text, x, y, width:w, height:64, background:fill, color:"#fff", radius:999, fontSize:18, fontWeight:700 };
}
function badge(text, x, y, fill) {
  return { type:"badge", text, x, y, width:200, height:52, background:fill, color:"#fff", radius:999, fontSize:14, fontWeight:800 };
}
function img(x, y, w, h, radius = 24) {
  return { type:"image", x, y, width:w, height:h, radius };
}
function shape(x, y, w, h, fill, radius = 24) {
  return { type:"shape", x, y, width:w, height:h, fill, radius };
}
function line(x, y, w, fill = "rgba(255,255,255,.30)") {
  return { type:"divider", x, y, width:w, height:2, color:fill };
}

/* =========================
   POSTER / FLYER ARCHETYPES
   ========================= */

function agencyFlyer(i, p) {
  return tpl(`Agency Flyer #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    shape(90, 110, 420, 860, "rgba(255,255,255,.06)", 30),
    shape(530, 110, 460, 380, "rgba(255,255,255,.06)", 30),
    badge("CREATIVE AGENCY", 120, 150, p.accent),
    h("Digital Marketing", 120, 220, 420, 78, p.ink),
    t("Grow your brand with strategy + design", 120, 320, 360, 22),
    img(150, 390, 300, 340, 28),
    shape(150, 740, 300, 110, "rgba(0,0,0,.22)", 22),
    h("Hassan Shahid", 170, 770, 260, 34, p.ink),
    t("Marketing Specialist", 170, 812, 260, 18),
    h("Services", 560, 150, 380, 40, p.ink),
    line(560, 200, 360),
    t("• Social Media Campaigns", 560, 230, 380, 22),
    t("• Brand Identity Design",   560, 270, 380, 22),
    t("• Ads + Conversion Funnels",560, 310, 380, 22),
    t("• Content Strategy",        560, 350, 380, 22),
    img(560, 520, 380, 320, 30),
    shape(90, 900, 920, 90, "rgba(0,0,0,.28)", 28),
    t("www.nexora.ai", 130, 930, 260, 20),
    t("+92 300 0000000", 420, 930, 260, 20),
    btn("Contact", 760, 920, p.accent, 230)
  ], { category:"Flyer", subtitle:"Agency" });
}

function businessProfileFlyer(i, p){
  return tpl(`Business Profile #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("BUSINESS", 120, 150, p.accent),
    h("Company Profile", 120, 220, 840, 82, p.ink),
    t("Vision • Services • Contact", 120, 320, 600, 24),
    img(120, 390, 400, 420, 30),
    shape(560, 390, 390, 200, "rgba(0,0,0,.22)", 26),
    h("What We Do", 590, 420, 330, 36, p.ink),
    t("Branding, websites, ads, motion", 590, 470, 330, 20),
    shape(560, 620, 390, 190, "rgba(0,0,0,.22)", 26),
    h("Contact", 590, 650, 330, 34, p.ink),
    t("hello@nexora.ai", 590, 695, 330, 20),
    t("+92 300 0000000", 590, 730, 330, 20),
    btn("Get Proposal", 590, 770, p.accent, 260),
  ], { category:"Flyer", subtitle:"Business" });
}

function realEstatePoster(i, p){
  return tpl(`Real Estate #${i+1}`, p, [
    img(80, 100, 920, 520, 34),
    shape(80, 560, 920, 420, "rgba(0,0,0,.28)", 34),
    badge("FOR SALE", 130, 610, p.accent),
    h("Modern Luxury Villa", 130, 670, 760, 76, p.ink),
    t("5 Bed • 4 Bath • 4200 sqft", 130, 770, 600, 22),
    t("Starting from $899,000", 130, 810, 600, 22),
    btn("Book a Visit", 130, 865, p.accent, 260),
  ], { category:"Poster", subtitle:"Real Estate" });
}

function gymTrainerPoster(i,p){
  return tpl(`Gym Trainer #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("PERSONAL TRAINING", 120, 150, p.accent),
    h("Transform Your Body", 120, 230, 840, 84, p.ink),
    t("Programs • Nutrition • Coaching", 120, 330, 700, 24),
    img(620, 330, 330, 520, 34),
    shape(120, 420, 440, 260, "rgba(0,0,0,.22)", 26),
    t("• 12-week plan", 150, 455, 390, 22),
    t("• Fat loss + strength", 150, 495, 390, 22),
    t("• Home or gym", 150, 535, 390, 22),
    btn("Join Today", 120, 700, p.accent, 260),
  ], { category:"Poster", subtitle:"Fitness" });
}

function restaurantMenuPoster(i,p){
  return tpl(`Restaurant Menu #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    h("Chef’s Specials", 120, 170, 840, 86, p.ink, "center"),
    line(360, 275, 360),
    t("Fresh • Handmade • Premium", 120, 300, 840, 22, "center"),
    shape(120, 360, 840, 420, "rgba(0,0,0,.22)", 30),
    t("1) Truffle Pasta  —  $18", 160, 410, 760, 26),
    t("2) Wagyu Burger   —  $22", 160, 460, 760, 26),
    t("3) Salmon Bowl     —  $16", 160, 510, 760, 26),
    t("4) Lava Cake       —  $10", 160, 560, 760, 26),
    btn("Reserve Table", 400, 820, p.accent, 280),
  ], { category:"Poster", subtitle:"Food" });
}

function eventNightPoster(i,p){
  return tpl(`Night Event #${i+1}`, p, [
    img(80, 100, 920, 600, 34),
    shape(80, 620, 920, 360, "rgba(0,0,0,.32)", 34),
    badge("LIVE MUSIC", 130, 670, p.accent),
    h("Friday Night", 130, 730, 760, 92, p.ink),
    t("8PM • Downtown • Limited seats", 130, 840, 700, 22),
    btn("Get Tickets", 130, 885, p.accent, 260),
  ], { category:"Poster", subtitle:"Event" });
}

function beautySalonPoster(i,p){
  return tpl(`Beauty Salon #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("BEAUTY STUDIO", 120, 150, p.accent),
    h("Glow Up Package", 120, 230, 840, 86, p.ink),
    t("Hair • Skin • Makeup", 120, 330, 700, 24),
    img(120, 390, 420, 520, 34),
    shape(580, 420, 360, 240, "rgba(0,0,0,.22)", 26),
    t("• Bridal makeup", 610, 455, 330, 22),
    t("• Facial treatment", 610, 495, 330, 22),
    t("• Hair styling", 610, 535, 330, 22),
    btn("Book Now", 610, 600, p.accent, 240),
  ], { category:"Poster", subtitle:"Beauty" });
}

function techStartupPoster(i,p){
  return tpl(`Tech Startup #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("STARTUP", 120, 150, p.accent),
    h("Build Faster with AI", 120, 230, 840, 84, p.ink),
    t("Automate workflows. Ship products.", 120, 330, 700, 24),
    shape(120, 400, 840, 360, "rgba(0,0,0,.22)", 30),
    img(150, 430, 380, 300, 26),
    t("• Smart templates\n• Team collaboration\n• Instant export", 560, 450, 360, 22),
    btn("Try Free", 120, 800, p.accent, 230),
  ], { category:"Poster", subtitle:"Tech" });
}

function travelAdventurePoster(i,p){
  return tpl(`Travel #${i+1}`, p, [
    img(80, 100, 920, 580, 34),
    shape(80, 620, 920, 360, "rgba(0,0,0,.28)", 34),
    badge("ADVENTURE", 130, 670, p.accent),
    h("Explore the World", 130, 730, 760, 88, p.ink),
    t("Packages from $299", 130, 830, 600, 22),
    btn("Book Now", 130, 885, p.accent, 260),
  ], { category:"Poster", subtitle:"Travel" });
}

function minimalEditorialPoster(i,p){
  return tpl(`Editorial #${i+1}`, p, [
    shape(120, 120, 840, 840, "rgba(255,255,255,.06)", 34),
    h("Modern Design", 120, 310, 840, 92, p.ink, "center"),
    line(360, 420, 360),
    t("Calm spacing • clean hierarchy", 120, 460, 840, 22, "center"),
    btn("Read More", 400, 560, p.accent, 280),
  ], { category:"Poster", subtitle:"Editorial" });
}

function quoteBoldPoster(i,p){
  return tpl(`Bold Quote #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(0,0,0,.18)", 34),
    h("Your story matters.", 120, 330, 840, 120, p.ink, "center"),
    t("Make it visible. Make it bold.", 120, 500, 840, 28, "center"),
    btn("Start Today", 400, 600, p.accent, 280),
  ], { category:"Poster", subtitle:"Quote" });
}

function promoDiscountPoster(i,p){
  return tpl(`Promo Discount #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("LIMITED TIME", 120, 150, p.accent),
    h("30% OFF", 120, 250, 840, 140, p.ink),
    t("On all premium services", 120, 410, 700, 26),
    img(120, 480, 840, 380, 34),
    btn("Claim Offer", 120, 900, p.accent, 280),
  ], { category:"Poster", subtitle:"Promo" });
}

function productLaunchPoster(i,p){
  return tpl(`Product Launch #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("NEW LAUNCH", 120, 150, p.accent),
    h("Nexora Studio", 120, 230, 840, 92, p.ink),
    t("Create professional designs in minutes", 120, 340, 700, 24),
    img(580, 420, 380, 420, 34),
    shape(120, 420, 420, 240, "rgba(0,0,0,.22)", 26),
    t("• Templates\n• Editor\n• Export", 150, 450, 360, 22),
    btn("Try Now", 120, 720, p.accent, 240),
  ], { category:"Poster", subtitle:"Launch" });
}

function webinarPoster(i,p){
  return tpl(`Webinar #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("FREE WEBINAR", 120, 150, p.accent),
    h("Marketing Masterclass", 120, 230, 840, 84, p.ink),
    t("Learn strategy that converts", 120, 330, 700, 24),
    shape(120, 390, 840, 160, "rgba(0,0,0,.22)", 30),
    t("Date: 12 Jan • Time: 7PM • Online", 150, 440, 780, 24),
    btn("Register", 120, 600, p.accent, 240),
    img(620, 600, 340, 320, 34),
  ], { category:"Poster", subtitle:"Webinar" });
}

function recruitmentPoster(i,p){
  return tpl(`Hiring #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    badge("WE'RE HIRING", 120, 150, p.accent),
    h("UI Designer", 120, 230, 840, 100, p.ink),
    t("Remote • Full-time • Competitive", 120, 350, 700, 24),
    shape(120, 420, 840, 320, "rgba(0,0,0,.22)", 30),
    t("Requirements:\n• Strong portfolio\n• Figma skills\n• Clean UI sense", 150, 460, 780, 22),
    btn("Apply Now", 120, 780, p.accent, 260),
  ], { category:"Poster", subtitle:"Recruitment" });
}

function testimonialPoster(i,p){
  return tpl(`Testimonial #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    h("Client Love", 120, 190, 840, 86, p.ink, "center"),
    shape(120, 320, 840, 360, "rgba(0,0,0,.22)", 34),
    t("“The best templates we’ve ever used.\nClean, premium, fast.”", 160, 380, 760, 32, "center"),
    t("— Brand Founder", 120, 600, 840, 22, "center"),
    btn("See More", 400, 740, p.accent, 280),
  ], { category:"Poster", subtitle:"Testimonial" });
}

/* =====================
   CARDS (grid variety)
   ===================== */

function instagramHeroCard(i,p){
  return tpl(`Instagram Hero #${i+1}`, p, [
    h("Start your journey", 110, 250, 860, 96, p.ink),
    t("Premium social design card", 110, 380, 520, 26),
    btn("Follow", 110, 460, p.accent, 220),
    img(680, 420, 280, 280, 28)
  ], { category:"Instagram", subtitle:"Hero" });
}

function splitDiagonalCard(i,p){
  return tpl(`Split Diagonal #${i+1}`, p, [
    shape(70, 90, 940, 900, "rgba(255,255,255,.06)", 34),
    shape(70, 90, 620, 900, "rgba(0,0,0,.20)", 34),
    h("New Collection", 120, 300, 520, 92, p.ink),
    t("Minimal + bold", 120, 420, 420, 24),
    img(660, 250, 300, 520, 34),
    btn("Shop", 120, 500, p.accent, 200)
  ], { category:"Promo", subtitle:"Split" });
}

function layeredGlassCard(i,p){
  return tpl(`Glass Card #${i+1}`, p, [
    img(80, 140, 920, 520, 34),
    shape(120, 420, 840, 420, "rgba(255,255,255,.10)", 34),
    h("Premium Design", 160, 470, 760, 84, p.ink),
    t("Glassmorphism + depth", 160, 580, 520, 24),
    btn("Preview", 160, 650, p.accent, 240)
  ], { category:"Card", subtitle:"Glass" });
}

function gradientBlobCard(i,p){
  return tpl(`Blob Card #${i+1}`, p, [
    shape(140, 160, 420, 420, "rgba(255,255,255,.08)", 999),
    shape(520, 340, 420, 420, "rgba(0,0,0,.18)", 999),
    h("Bold Shapes", 120, 280, 840, 96, p.ink, "center"),
    t("Modern abstract layout", 120, 410, 840, 24, "center"),
    btn("Use Template", 400, 520, p.accent, 280)
  ], { category:"Card", subtitle:"Abstract" });
}

function serviceGridCard(i,p){
  return tpl(`Service Grid #${i+1}`, p, [
    h("Our Services", 120, 170, 840, 78, p.ink, "center"),
    shape(140, 300, 380, 240, "rgba(255,255,255,.08)", 28),
    shape(560, 300, 380, 240, "rgba(255,255,255,.08)", 28),
    shape(140, 580, 380, 240, "rgba(255,255,255,.08)", 28),
    shape(560, 580, 380, 240, "rgba(255,255,255,.08)", 28),
    t("Branding", 160, 395, 340, 26),
    t("Social Ads", 580, 395, 340, 26),
    t("Websites", 160, 675, 340, 26),
    t("Strategy", 580, 675, 340, 26),
  ], { category:"Flyer", subtitle:"Services" });
}

function portfolioShowcaseCard(i,p){
  return tpl(`Portfolio #${i+1}`, p, [
    h("Portfolio", 120, 150, 840, 92, p.ink, "center"),
    img(140, 300, 380, 300, 28),
    img(560, 300, 380, 300, 28),
    img(140, 640, 380, 300, 28),
    img(560, 640, 380, 300, 28),
  ], { category:"Portfolio", subtitle:"Showcase" });
}

function faqCard(i,p){
  return tpl(`FAQ #${i+1}`, p, [
    h("FAQ", 120, 170, 840, 92, p.ink, "center"),
    shape(140, 330, 840, 520, "rgba(0,0,0,.22)", 34),
    t("Q: How fast is it?\nA: One click.\n\nQ: Can I edit?\nA: Yes, in the editor.", 180, 380, 760, 26),
    btn("Learn More", 400, 880, p.accent, 280)
  ], { category:"Card", subtitle:"FAQ" });
}

function priceCard(i,p){
  return tpl(`Pricing #${i+1}`, p, [
    h("Pricing", 120, 150, 840, 92, p.ink, "center"),
    shape(180, 300, 720, 560, "rgba(0,0,0,.22)", 34),
    t("Starter", 240, 360, 600, 26, "center"),
    h("$9/mo", 240, 420, 600, 110, p.ink, "center"),
    t("Templates • Export • Updates", 240, 550, 600, 24, "center"),
    btn("Choose Plan", 400, 760, p.accent, 280)
  ], { category:"Card", subtitle:"Pricing" });
}

function contactFooterPoster(i,p){
  return tpl(`Contact Footer #${i+1}`, p, [
    img(80, 100, 920, 640, 34),
    shape(80, 700, 920, 280, "rgba(0,0,0,.30)", 34),
    h("Let’s Work Together", 130, 740, 760, 78, p.ink),
    t("hello@nexora.ai  •  +92 300 0000000", 130, 830, 760, 22),
    btn("Message", 130, 880, p.accent, 240)
  ], { category:"Poster", subtitle:"Contact" });
}
