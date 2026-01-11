

// spine-core.js
// Nexora Spine Core (S0–S7) — deterministic, extension-friendly.
// Works in both Browser (window.NexoraSpine) and Node (module.exports).
// Design goal: new features are added as extensions (stitches), not rewires.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.NexoraSpine = root.NexoraSpine || {};
    const api = factory(root);
    // Merge (do not overwrite existing keys)
    for (const k in api) {
      if (!(k in root.NexoraSpine)) root.NexoraSpine[k] = api[k];
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : global), function (root) {
  "use strict";

  // ---------- Utilities ----------
  function deepClone(x){
    try { return JSON.parse(JSON.stringify(x)); } catch(_) { return x; }
  }
  function nowISO(){ try { return new Date().toISOString(); } catch(_) { return ""; } }
  function str(x){ return String(x == null ? "" : x); }
  function safeNum(x, d){ const n = Number(x); return Number.isFinite(n) ? n : d; }
  function stableHash(s){
    // Tiny deterministic hash (non-crypto) for ids/seeds
    s = str(s);
    let h = 2166136261;
    for (let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  // ---------- Canonical Doc ----------
  // NexoraDoc is the single source of truth.
  // All consumers (editor/export/studio) read this doc, never invent state.
  function createEmptyDoc(input){
    const category = str(input?.category || "Instagram Post");
    const style = str(input?.style || "Dark Premium");
    const prompt = str(input?.prompt || "");
    const notes = str(input?.notes || "");
    const seed = (input?.seed != null) ? safeNum(input.seed, 0) : stableHash(`${category}|${style}|${prompt}|${notes}`) ;

    return {
      meta: {
        docVersion: "v1",
        createdAt: nowISO(),
        seed,
        category,
        style
      },
      input: { prompt, notes },
      intent: null,       // S1
      contract: null,     // S2
      layout: null,       // S3
      content: null,      // S4
      graph: null,        // S5
      rules: null,        // S6
      finalized: null,    // S7
      extensions: {},     // stitched nodes live here
      debug: []           // stage snapshots (optional)
    };
  }

  // ---------- Sizes (contract resolver baseline) ----------
  // Keep this table small + stable. You can extend without breaking.
  const CANVAS_SIZES = {
    "Instagram Post": { w: 1080, h: 1080 },
    "Instagram Story": { w: 1080, h: 1920 },
    "YouTube Thumbnail": { w: 1280, h: 720 },
    "Flyer": { w: 1080, h: 1350 },
    "Poster": { w: 1080, h: 1350 },
    "Presentation Slide": { w: 1920, h: 1080 },
    "Business Card": { w: 1050, h: 600 },
    "Resume": { w: 1240, h: 1754 }
  };

  function resolveCanvas(category){
    return CANVAS_SIZES[category] || CANVAS_SIZES["Instagram Post"];
  }

  // ---------- Stage S1: IntentResolve ----------
  function stageIntentResolve(doc){
    const p = str(doc?.input?.prompt).trim();
    const s = str(doc?.meta?.style).trim();

    // Deterministic lightweight intent model.
    // AI can enhance this later, but MUST output the same shape.
    const tone = (s || "Modern").toLowerCase().includes("dark") ? "premium" : "modern";
    const goal = str(doc?.meta?.category || "Instagram Post");
    const keywords = p ? p.split(/\s+/).filter(Boolean).slice(0, 10) : [];

    doc.intent = {
      goal,
      tone,
      keywords,
      // a stable "direction" is used by layout + copy binding
      direction: (tone === "premium") ? "bold_high_contrast" : "clean_modern"
    };
    return doc;
  }

  // ---------- Stage S2: ContractResolve ----------
  function stageContractResolve(doc){
    const category = str(doc?.meta?.category || "Instagram Post");
    const canvas = resolveCanvas(category);

    // Try to use existing TemplateContract creator if present (browser).
    let contract = null;
    try {
      contract = root?.NexoraSpine?.createContract?.({
        templateId: "doc_"+String(doc.meta.seed),
        category,
        canvas,
        palette: null,
        layers: [] // filled after graph build
      }) || null;
    } catch(_) {}

    // Fallback contract (server-safe)
    if(!contract){
      contract = {
        version: "v1",
        templateId: "doc_"+String(doc.meta.seed),
        category,
        canvas,
        exportProfiles: [{ id: "default", label: category, w: canvas.w, h: canvas.h, format: "png" }],
        layers: [],
        constraints: {},
        roles: {
          required: ["headline"],
          optional: ["subhead","cta","badge","hero","background"]
        }
      };
    }

    doc.contract = contract;
    return doc;
  }

  // ---------- Stage S3: LayoutResolve ----------
  function stageLayoutResolve(doc){
    const cat = str(doc?.meta?.category);
    const canvas = doc?.contract?.canvas || resolveCanvas(cat);
    // Minimal deterministic layouts (extendable).
    // Layout defines zones by semantic role.
    const layoutId = (cat === "YouTube Thumbnail") ? "yt_layout_01" : "base_layout_01";

    doc.layout = {
      id: layoutId,
      canvas: { w: canvas.w, h: canvas.h },
      zones: {
        background: { x:0,y:0,w:canvas.w,h:canvas.h },
        headline:   { x: Math.round(canvas.w*0.06), y: Math.round(canvas.h*0.08), w: Math.round(canvas.w*0.72), h: Math.round(canvas.h*0.28) },
        subhead:    { x: Math.round(canvas.w*0.06), y: Math.round(canvas.h*0.36), w: Math.round(canvas.w*0.68), h: Math.round(canvas.h*0.16) },
        hero:       { x: Math.round(canvas.w*0.62), y: Math.round(canvas.h*0.18), w: Math.round(canvas.w*0.34), h: Math.round(canvas.h*0.64) },
        cta:        { x: Math.round(canvas.w*0.06), y: Math.round(canvas.h*0.78), w: Math.round(canvas.w*0.30), h: Math.round(canvas.h*0.12) },
        badge:      { x: Math.round(canvas.w*0.74), y: Math.round(canvas.h*0.06), w: Math.round(canvas.w*0.20), h: Math.round(canvas.h*0.12) }
      }
    };
    return doc;
  }

  // ---------- Stage S4: ContentBind (P4 Gate) ----------
  function stageContentBind(doc){
    const prompt = str(doc?.input?.prompt).trim();
    const notes  = str(doc?.input?.notes).trim();
    const seedTxt = (prompt || notes || doc?.meta?.category || "template").slice(0, 120);
    const words = seedTxt.split(/\s+/).filter(Boolean);

    // Deterministic copy: headline/subhead/cta based on prompt.
    const headline = words.length ? words.slice(0, Math.min(7, words.length)).join(" ") : `${doc.meta.category} Design`;
    const subhead  = notes ? notes.slice(0, 80) : (words.length > 7 ? words.slice(7, 14).join(" ") : "Clean layout • ready to edit");
    const ctaList = ["Get Started","Learn More","Explore","Join Now","Shop Now","Download"];
    const cta = ctaList[doc.meta.seed % ctaList.length];

    doc.content = {
      headline: headline,
      subhead: subhead,
      cta: cta,
      badge: (doc.meta.category === "YouTube Thumbnail") ? "NEW" : "",
      // Keep full prompt for Studio later
      prompt: prompt
    };

    // HARD PASS/FAIL: headline must exist and be non-empty.
    if(!str(doc.content.headline).trim()){
      doc.content.headline = `${doc.meta.category} Design`;
    }
    return doc;
  }

  // ---------- Stage S5: GraphBuild ----------
  function stageGraphBuild(doc){
    const layout = doc.layout;
    const canvas = layout?.canvas || doc.contract?.canvas || resolveCanvas(doc.meta.category);

    // Graph nodes reference content via valueRef so edits can rebind later.
    const nodes = [
      { id:"bg", type:"background", role:"background", zone:"background", props:{ fill:"#0b1020" } },
      { id:"headline", type:"text", role:"headline", zone:"headline", valueRef:"content.headline",
        props:{ fontFamily:"Inter, system-ui, sans-serif", fontWeight:800, fontSize: Math.max(42, Math.round(canvas.h*0.10)), color:"rgba(255,255,255,0.95)", align:"left" } },
      { id:"subhead", type:"text", role:"subhead", zone:"subhead", valueRef:"content.subhead",
        props:{ fontFamily:"Inter, system-ui, sans-serif", fontWeight:500, fontSize: Math.max(22, Math.round(canvas.h*0.045)), color:"rgba(255,255,255,0.82)", align:"left" } },
      { id:"cta", type:"shape", role:"cta", zone:"cta",
        props:{ radius:18, fill:"rgba(255,255,255,0.12)", stroke:"rgba(255,255,255,0.22)" } },
      { id:"cta_text", type:"text", role:"cta", zone:"cta", valueRef:"content.cta",
        props:{ fontFamily:"Inter, system-ui, sans-serif", fontWeight:700, fontSize: Math.max(18, Math.round(canvas.h*0.035)), color:"rgba(255,255,255,0.92)", align:"center" } }
    ];

    // Optional badge
    if(str(doc?.content?.badge).trim()){
      nodes.push({ id:"badge", type:"shape", role:"badge", zone:"badge", props:{ radius:18, fill:"rgba(0,200,255,0.20)", stroke:"rgba(0,200,255,0.35)" } });
      nodes.push({ id:"badge_text", type:"text", role:"badge", zone:"badge", valueRef:"content.badge",
        props:{ fontFamily:"Inter, system-ui, sans-serif", fontWeight:800, fontSize: Math.max(18, Math.round(canvas.h*0.032)), color:"rgba(255,255,255,0.95)", align:"center" } });
    }

    // Optional hero placeholder (actual AI image feature stitches later)
    nodes.push({ id:"hero", type:"image", role:"hero", zone:"hero", props:{ src:null, fit:"cover", radius:24, fill:"rgba(255,255,255,0.08)" } });

    doc.graph = {
      version: "v1",
      canvas,
      nodes,
      zones: layout?.zones || {}
    };

    // Backfill contract layers for export/editor semantics
    try{
      if(doc.contract){
        doc.contract.layers = nodes.map(n => ({ id:n.id, role:n.role }));
      }
    }catch(_){}

    return doc;
  }

  // ---------- Stage S6: RuleApply ----------
  function stageRuleApply(doc){
    doc.rules = {
      editableRoles: ["headline","subhead","cta","badge"],
      lockedRoles: ["background"],
      // Studio toggles later
      canRegenerate: true
    };
    return doc;
  }

  // ---------- Stage S7: Finalize ----------
  function stageFinalize(doc){
    doc.finalized = {
      at: nowISO(),
      checksum: String(stableHash(JSON.stringify({meta:doc.meta, contract:doc.contract, layout:doc.layout, content:doc.content, graph:doc.graph}))),
    };
    return doc;
  }

  // ---------- Validation ----------
  function validateDoc(doc){
    const errs = [];
    if(!doc || typeof doc !== "object") errs.push("doc_missing");
    if(!doc?.meta?.category) errs.push("meta.category_missing");
    if(!doc?.contract?.canvas?.w || !doc?.contract?.canvas?.h) errs.push("contract.canvas_missing");
    if(!doc?.content?.headline || !str(doc.content.headline).trim()) errs.push("content.headline_missing");
    if(!Array.isArray(doc?.graph?.nodes) || !doc.graph.nodes.length) errs.push("graph.nodes_missing");
    return { ok: errs.length === 0, errors: errs };
  }

  // ---------- Adapter: Doc -> Template (legacy UI/editor) ----------
  // Convert NexoraDoc into the template shape your editor already supports.
  function docToTemplate(doc){
    const canvas = doc?.graph?.canvas || doc?.contract?.canvas || resolveCanvas(doc?.meta?.category);
    const zones = doc?.graph?.zones || doc?.layout?.zones || {};
    const content = doc?.content || {};
    const nodes = doc?.graph?.nodes || [];

    // helper to compute element box from zone, with safe fallback
    function boxFor(node){
      const z = zones[node.zone] || zones[node.role] || null;
      if(z) return { x:z.x, y:z.y, w:z.w, h:z.h };
      // fallback grid
      const w = Math.round(canvas.w*0.5), h = Math.round(canvas.h*0.18);
      return { x: Math.round(canvas.w*0.08), y: Math.round(canvas.h*0.08), w, h };
    }

    const elements = [];
    for(const n of nodes){
      const b = boxFor(n);
      if(n.type === "background"){
        elements.push({ id:n.id, type:"bg", x:0, y:0, w:canvas.w, h:canvas.h, fill: n.props?.fill || "#0b1020" });
        continue;
      }
      if(n.type === "image"){
        elements.push({ id:n.id, type:"image", x:b.x, y:b.y, w:b.w, h:b.h, src: n.props?.src || null, fit: n.props?.fit || "cover", radius: n.props?.radius ?? 24, fill: n.props?.fill || "rgba(255,255,255,0.08)" });
        continue;
      }
      if(n.type === "shape"){
        elements.push({ id:n.id, type:"shape", x:b.x, y:b.y, w:b.w, h:b.h, radius: n.props?.radius ?? 18, fill: n.props?.fill || "rgba(255,255,255,0.12)", stroke: n.props?.stroke || "rgba(255,255,255,0.22)" });
        continue;
      }
      if(n.type === "text"){
        const val = (n.valueRef && n.valueRef.startsWith("content.")) ? content[n.valueRef.slice("content.".length)] : (n.text || "");
        elements.push({
          id:n.id,
          type:"text",
          x:b.x, y:b.y, w:b.w, h:b.h,
          text: str(val),
          title: str(val),
          // preserve style hints for editor even if it ignores some fields
          fontFamily: n.props?.fontFamily || "Inter",
          fontSize: n.props?.fontSize || 32,
          fontWeight: n.props?.fontWeight || 700,
          color: n.props?.color || "rgba(255,255,255,0.92)",
          align: n.props?.align || "left"
        });
        continue;
      }
    }

    return {
      id: "doc_"+String(doc?.meta?.seed ?? stableHash(JSON.stringify(doc||{}))),
      title: str(doc?.content?.headline || doc?.meta?.category || "Untitled"),
      category: str(doc?.meta?.category || "Instagram Post"),
      canvas: { w: canvas.w, h: canvas.h },
      elements,
      // Keep doc embedded for future Studio
      doc
    };
  }

  // ---------- Pipeline runner ----------
  const CORE_STAGES = [
    ["S0", createEmptyDoc],
    ["S1", stageIntentResolve],
    ["S2", stageContractResolve],
    ["S3", stageLayoutResolve],
    ["S4", stageContentBind],
    ["S5", stageGraphBuild],
    ["S6", stageRuleApply],
    ["S7", stageFinalize],
  ];

  function runCore(input, opts){
    const options = opts || {};
    let doc = null;
    for(const [name, fn] of CORE_STAGES){
      if(name === "S0") doc = fn(input);
      else doc = fn(doc);

      if(options.debug){
        try{ doc.debug.push({ stage:name, snapshot: deepClone(doc) }); }catch(_){}
      }
    }
    return doc;
  }

  // ---------- Extensions (stitches) ----------
  // Extension signature: (doc, ctx) => doc
  const extensionRegistry = Object.create(null);

  function registerExtension(name, fn){
    if(!name || typeof fn !== "function") return false;
    extensionRegistry[name] = fn;
    return true;
  }

  function applyExtensions(doc, ctx){
    // Extensions run after S5 by design.
    // Default pipeline runs core first, then stitches.
    try{
      const names = Object.keys(extensionRegistry);
      for(const n of names){
        doc = extensionRegistry[n](doc, ctx) || doc;
      }
    }catch(_){}
    return doc;
  }

  // ---------- Public API ----------
  function createDoc(input, opts){
    const doc = runCore(input, opts);
    const stitched = applyExtensions(doc, { input, opts });
    return stitched;
  }

  function createTemplateFromInput(input, opts){
    const doc = createDoc(input, opts);
    const v = validateDoc(doc);
    const template = docToTemplate(doc);
    return { ok: v.ok, errors: v.errors, doc, template };
  }

  return {
    // spine
    createDoc,
    validateDoc,
    // adapters
    docToTemplate,
    createTemplateFromInput,
    // extensions
    registerExtension
  };
});
