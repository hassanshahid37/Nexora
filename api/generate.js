// /api/generate.js
// Nexora — serverless "AI copy" generator (safe fallback, no external deps).
// IMPORTANT: This endpoint is intentionally deterministic + lightweight.
// It should NEVER throw; it returns usable defaults even on bad input.


// Optional Spine integration (adds docs/contracts while preserving legacy "templates")
let Spine = null;
try{ Spine = require("./spine-core.js"); }catch(_){ try{ Spine = require("../spine-core.js"); }catch(__){} }

function safeJson(req){
  return new Promise((resolve) => {
    try{
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        if(!body) return resolve({});
        try{ resolve(JSON.parse(body)); }catch(_){ resolve({}); }
      });
    }catch(_){ resolve({}); }
  });
}

function clampInt(n, a, b){
  n = Number.isFinite(n) ? n : parseInt(String(n||""), 10);
  if(!Number.isFinite(n)) n = a;
  return Math.max(a, Math.min(b, n));
}

function words(s){
  return String(s||"").trim().split(/\s+/).filter(Boolean);
}

function titleCase(s){
  return String(s||"")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.length ? (w[0].toUpperCase()+w.slice(1).toLowerCase()) : w)
    .join(" ");
}

function pick(list, i){
  return list[i % list.length];
}

function makeCopy({ category, style, prompt, notes }, i){
  const p = String(prompt||"").trim();
  const n = String(notes||"").trim();
  const seedText = (p || n || category || style || "template").slice(0, 80);
  const baseWords = words(seedText).slice(0, 8).join(" ");
  const vibe = (String(style||"").trim() || "Modern");

  const title = baseWords
    ? titleCase(baseWords)
    : titleCase(`${category} Idea`);

  const descOptions = [
    `${vibe} • clean layout • ready to edit`,
    `${vibe} • bold typography • high contrast`,
    `${vibe} • premium spacing • modern shapes`,
    `${vibe} • fast conversion • clear CTA`,
  ];

  const ctaOptions = ["Get Started", "Learn More", "Explore", "Join Now", "Shop Now", "Download"];

  return {
    title: title.length > 48 ? title.slice(0, 48) : title,
    description: pick(descOptions, i),
    cta: pick(ctaOptions, i),
    // Optional (non-breaking): echoed metadata
    category,
    style
  };
}

// Vercel/Node serverless handler (CommonJS)
module.exports = async (req, res) => {
  try{
    if(req.method !== "POST"){
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok:true, templates: [] }));
      return;
    }

    const body = await safeJson(req);
    const category = String(body?.category || "Instagram Post");
    const style = String(body?.style || "Dark Premium");
    const prompt = String(body?.prompt || "");
    const notes = String(body?.notes || "");
    const count = clampInt(body?.count, 1, 200);

    const templates = [];
    const docs = [];
    for(let i=0;i<count;i++){
      const t = makeCopy({ category, style, prompt, notes }, i);
      templates.push(t);
      if(Spine && typeof Spine.createDoc === "function"){
        try{
          const doc = Spine.createDoc({ category, style, prompt, notes, seed: (t?.seed ?? i) });
          docs.push(doc);
        }catch(_){ docs.push(null); }
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok:true, templates, docs: (docs.length ? docs : undefined) }));
  }catch(_){
    // Never throw
    try{
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok:true, templates: [] }));
    }catch(__){}
  }
};
