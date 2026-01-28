/* preview-normalization-engine.js — Nexora Preview Normalization Engine (Preview Authority)
   Purpose:
     Convert a fully materialized Nexora template into a preview-safe contract:
       PreviewTemplateContract { canvas, elements[] } with deterministic aspect + clamp + crop + button rules.
   Notes:
     - Preview output is a VISUAL PROXY for browsing, not the real template.
     - Never mutates the input template.
     - Never throws; returns a minimal valid preview on any failure.

   Public (UMD-ish):
     - window.NexoraPreviewNormalization.normalize(templateOrPayload, options)
       -> PreviewTemplateContract or minimal fallback
*/

(function(){
  const root = (typeof window !== "undefined" ? window : globalThis);

  // -----------------------------
  // Small utilities (no deps)
  // -----------------------------
  function str(x){ return String(x == null ? "" : x); }
  function num(x, d){ const n = Number(x); return Number.isFinite(n) ? n : d; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function deepClone(x){
    try{ return JSON.parse(JSON.stringify(x)); }catch(_){ return x; }
  }

  function stableHash32(s){
    s = str(s);
    let h = 2166136261;
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function pick(arr, seed){
    if(!Array.isArray(arr) || !arr.length) return null;
    return arr[(seed >>> 0) % arr.length];
  }

  // -----------------------------
  // Input adaptation (accepts many shapes)
  // -----------------------------
  function extractTemplateShape(input){
    const payload = (input && typeof input === "object") ? input : {};
    // Common shapes:
    // - template object: { canvas, elements }
    // - controller payload: { contract, content, canvas, elements }
    // - spine shape: { contract:{canvas,layers/elements?}, content:{elements?} }
    const canvas =
      payload.canvas ||
      payload.template?.canvas ||
      payload.contract?.canvas ||
      payload.contract?.contract?.canvas ||
      payload.template?.contract?.canvas ||
      payload.template?.content?.canvas ||
      payload.content?.canvas ||
      null;

    const elements =
      (Array.isArray(payload.elements) ? payload.elements : null) ||
      (Array.isArray(payload.template?.elements) ? payload.template.elements : null) ||
      (Array.isArray(payload.contract?.elements) ? payload.contract.elements : null) ||
      (Array.isArray(payload.content?.elements) ? payload.content.elements : null) ||
      (Array.isArray(payload.template?.contract?.elements) ? payload.template.contract.elements : null) ||
      (Array.isArray(payload.template?.content?.elements) ? payload.template.content.elements : null) ||
      null;

    const category =
      payload.category ||
      payload.categoryId ||
      payload.kind ||
      payload.template?.category ||
      payload.contract?.category ||
      payload.contract?.categoryId ||
      payload.content?.category ||
      payload.template?.contract?.category ||
      null;

    const sourceTemplateId =
      payload.templateId ||
      payload.id ||
      payload.template?.templateId ||
      payload.template?.id ||
      payload.contract?.templateId ||
      payload.contract?.id ||
      payload.contract?.contract?.templateId ||
      null;

    const meta = payload.meta || payload.template?.meta || payload.contract?.meta || {};

    return { canvas, elements, category, sourceTemplateId, meta };
  }

  function normalizeCanvasShape(canvas){
    const w = num(canvas && (canvas.w != null ? canvas.w : canvas.width), NaN);
    const h = num(canvas && (canvas.h != null ? canvas.h : canvas.height), NaN);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w<=0 || h<=0) return null;
    const W = Math.round(w), H = Math.round(h);
    return { w: W, h: H, width: W, height: H };
  }

  function inferRole(el){
    const r = str(el && el.role).toLowerCase().trim();
    if(r) return r;
    const t = str(el && el.type).toLowerCase().trim();
    if(t === "bg" || t === "background") return "background";
    if(t === "photo" || t === "image") return "image";
    if(t === "pill" || t === "badge" || t === "chip") return "badge";
    if(t === "button" || t === "cta") return "cta";
    if(t === "headline" || t === "title" || t === "h1") return "headline";
    if(t === "subhead" || t === "subtitle" || t === "h2") return "subhead";
    if(t === "shape" || t === "card") return "shape";
    if(t === "logo") return "logo";
    if(t === "text") return "body";
    return "meta";
  }

  function pickText(el){
    return str(el?.text ?? el?.title ?? el?.label ?? el?.subtitle ?? el?.content ?? "").trim();
  }

  function clampText(text, maxChars){
    const t = str(text).replace(/\s+/g," ").trim();
    if(!t) return "";
    const m = Math.max(4, Number(maxChars) || 0);
    if(t.length <= m) return t;
    return t.slice(0, Math.max(0, m-1)).trimEnd() + "…";
  }

  // -----------------------------
  // Aspect + preview canvas policy
  // -----------------------------
  function computePreviewCanvas(srcCanvas, options){
    const opts = options && typeof options === "object" ? options : {};
    const targetLongSide = clamp(num(opts.targetLongSide, 640), 360, 960);
    const minSide = clamp(num(opts.minSide, 360), 240, 600);

    const W = srcCanvas.w, H = srcCanvas.h;
    const aspect = W / Math.max(1, H);

    // Preserve aspect ratio; enforce deterministic long side.
    let pw, ph;
    if (aspect >= 1) { // landscape or square
      pw = targetLongSide;
      ph = Math.round(targetLongSide / aspect);
      if(ph < minSide) { ph = minSide; pw = Math.round(minSide * aspect); }
    } else { // portrait
      ph = targetLongSide;
      pw = Math.round(targetLongSide * aspect);
      if(pw < minSide) { pw = minSide; ph = Math.round(minSide / aspect); }
    }

    // Clamp final bounds
    pw = clamp(pw, minSide, targetLongSide);
    ph = clamp(ph, minSide, targetLongSide);

    return { w: pw, h: ph, width: pw, height: ph, aspect };
  }

  // -----------------------------
  // Deterministic preview layout recipes (zone-like)
  // -----------------------------
  function previewRects(canvas, mode){
    const W = canvas.w, H = canvas.h;
    const pad = Math.round(W * 0.08);
    const isLandscape = (W / Math.max(1,H)) >= 1.15;

    if(mode === "text-first"){
      return {
        background:{ x:0,y:0,w:W,h:H },
        badge:{ x:pad, y:pad, w:Math.round(W*0.34), h:Math.round(H*0.10) },
        headline:{ x:pad, y:Math.round(H*0.20), w:W-pad*2, h:Math.round(H*0.28) },
        subhead:{ x:pad, y:Math.round(H*0.50), w:W-pad*2, h:Math.round(H*0.16) },
        cta:{ x:pad, y:Math.round(H*0.74), w:Math.round(W*0.46), h:Math.round(H*0.11) },
        image:{ x:Math.round(W*0.58), y:Math.round(H*0.18), w:Math.round(W*0.34), h:Math.round(H*0.56) },
        logo:{ x:pad, y:Math.round(H*0.86), w:Math.round(W*0.22), h:Math.round(H*0.08) }
      };
    }

    if(mode === "split"){
      if(isLandscape){
        return {
          background:{ x:0,y:0,w:W,h:H },
          image:{ x:Math.round(W*0.52), y:Math.round(H*0.10), w:Math.round(W*0.42), h:Math.round(H*0.80) },
          badge:{ x:pad, y:pad, w:Math.round(W*0.28), h:Math.round(H*0.10) },
          headline:{ x:pad, y:Math.round(H*0.26), w:Math.round(W*0.44), h:Math.round(H*0.30) },
          subhead:{ x:pad, y:Math.round(H*0.54), w:Math.round(W*0.44), h:Math.round(H*0.16) },
          cta:{ x:pad, y:Math.round(H*0.74), w:Math.round(W*0.34), h:Math.round(H*0.12) },
          logo:{ x:pad, y:Math.round(H*0.10), w:Math.round(W*0.18), h:Math.round(H*0.08) }
        };
      }
      // Portrait split: image top, text bottom
      return {
        background:{ x:0,y:0,w:W,h:H },
        image:{ x:Math.round(W*0.08), y:Math.round(H*0.10), w:Math.round(W*0.84), h:Math.round(H*0.42) },
        badge:{ x:pad, y:pad, w:Math.round(W*0.34), h:Math.round(H*0.08) },
        headline:{ x:pad, y:Math.round(H*0.56), w:W-pad*2, h:Math.round(H*0.18) },
        subhead:{ x:pad, y:Math.round(H*0.74), w:W-pad*2, h:Math.round(H*0.12) },
        cta:{ x:pad, y:Math.round(H*0.88), w:Math.round(W*0.46), h:Math.round(H*0.10) },
        logo:{ x:Math.round(W*0.70), y:pad, w:Math.round(W*0.22), h:Math.round(H*0.08) }
      };
    }

    // image-led (default)
    if(isLandscape){
      return {
        background:{ x:0,y:0,w:W,h:H },
        image:{ x:Math.round(W*0.06), y:Math.round(H*0.10), w:Math.round(W*0.52), h:Math.round(H*0.80) },
        badge:{ x:Math.round(W*0.62), y:pad, w:Math.round(W*0.32), h:Math.round(H*0.10) },
        headline:{ x:Math.round(W*0.62), y:Math.round(H*0.26), w:Math.round(W*0.32), h:Math.round(H*0.32) },
        subhead:{ x:Math.round(W*0.62), y:Math.round(H*0.58), w:Math.round(W*0.32), h:Math.round(H*0.16) },
        cta:{ x:Math.round(W*0.62), y:Math.round(H*0.76), w:Math.round(W*0.26), h:Math.round(H*0.12) },
        logo:{ x:Math.round(W*0.82), y:Math.round(H*0.90), w:Math.round(W*0.12), h:Math.round(H*0.06) }
      };
    }

    // square/portrait image-led
    return {
      background:{ x:0,y:0,w:W,h:H },
      image:{ x:Math.round(W*0.06), y:Math.round(H*0.10), w:Math.round(W*0.88), h:Math.round(H*0.48) },
      badge:{ x:pad, y:pad, w:Math.round(W*0.34), h:Math.round(H*0.08) },
      headline:{ x:pad, y:Math.round(H*0.62), w:W-pad*2, h:Math.round(H*0.18) },
      subhead:{ x:pad, y:Math.round(H*0.80), w:W-pad*2, h:Math.round(H*0.10) },
      cta:{ x:pad, y:Math.round(H*0.90), w:Math.round(W*0.46), h:Math.round(H*0.08) },
      logo:{ x:Math.round(W*0.72), y:pad, w:Math.round(W*0.22), h:Math.round(H*0.08) }
    };
  }

  function choosePreviewMode(elements, aspect){
    const hasImage = (elements||[]).some(e => inferRole(e) === "image" || e?.src || e?.url);
    if(!hasImage) return "text-first";
    if(aspect >= 1.25) return "image-led";
    if(aspect <= 0.85) return "split";
    // square-ish
    return "split";
  }

  // -----------------------------
  // Style defaults for preview visibility (not final design)
  // -----------------------------
  function paletteForSeed(seed){
    const bgChoices = [
      "linear-gradient(135deg,#0b1020,#1b2340)",
      "linear-gradient(135deg,#0f172a,#111827)",
      "linear-gradient(135deg,#0b1020,#0f172a)"
    ];
    const accentChoices = ["#7c3aed","#22c55e","#06b6d4","#f97316","#ef4444","#2563eb"];
    const inkChoices = ["#ffffff","#f8fafc","#e5e7eb"];
    return {
      bg: pick(bgChoices, seed) || bgChoices[0],
      accent: pick(accentChoices, seed ^ 0x51f2) || "#7c3aed",
      ink: pick(inkChoices, seed ^ 0x9e37) || "#ffffff"
    };
  }

  function buildPreviewElements(srcEls, rects, canvas, seed, options){
    const opts = options && typeof options === "object" ? options : {};
    const palette = paletteForSeed(seed);

    // Role buckets from source
    const buckets = {
      background: [],
      image: [],
      headline: [],
      subhead: [],
      body: [],
      cta: [],
      badge: [],
      logo: [],
      shape: [],
      meta: []
    };

    for(const e of Array.isArray(srcEls) ? srcEls : []){
      if(!e || typeof e !== "object") continue;
      const role = inferRole(e);
      (buckets[role] || buckets.meta).push(e);
    }

    // Helpers to pick best candidate for a role.
    function firstNonEmpty(list){
      for(const e of list){
        if(!e) continue;
        if(inferRole(e) === "image") return e;
        const t = pickText(e);
        if(t) return e;
        return e;
      }
      return null;
    }

    const bgSrc = buckets.background[0] || null;
    const imgSrc = buckets.image[0] || null;
    const badgeSrc = buckets.badge[0] || null;
    const logoSrc = buckets.logo[0] || null;

    // CTA normalization: combine shape+text if both exist
    // If multiple cta elements, prefer the one with meaningful text.
    let ctaSrc = firstNonEmpty(buckets.cta) || null;

    // Text preference: headline > big text > title
    let headSrc = firstNonEmpty(buckets.headline) || firstNonEmpty(buckets.body) || null;
    let subSrc = firstNonEmpty(buckets.subhead) || null;

    // Determine clamp sizes by canvas width
    const W = canvas.w;
    const isLandscape = (canvas.w / Math.max(1, canvas.h)) >= 1.15;
    const maxHeadline = clamp(num(opts.maxHeadlineChars, isLandscape ? 28 : 24), 12, 60);
    const maxSub = clamp(num(opts.maxSubheadChars, isLandscape ? 44 : 36), 18, 90);
    const maxBadge = clamp(num(opts.maxBadgeChars, 18), 8, 30);
    const maxCta = clamp(num(opts.maxCtaChars, 18), 6, 30);

    // Font sizes (preview-only)
    const headlineSize = clamp(Math.round(W * (isLandscape ? 0.10 : 0.11)), 34, 96);
    const subSize = clamp(Math.round(W * (isLandscape ? 0.045 : 0.050)), 16, 46);
    const badgeSize = clamp(Math.round(W * 0.040), 14, 34);
    const ctaSize = clamp(Math.round(W * 0.045), 14, 40);

    const out = [];

    // Background (required)
    out.push({
      id: "pv_bg",
      type: "bg",
      role: "background",
      ...rects.background,
      style: {
        background: (bgSrc && (bgSrc.style?.background || bgSrc.style?.backgroundColor)) || (bgSrc && (bgSrc.fill || bgSrc.bg || bgSrc.background)) || palette.bg
      }
    });

    // Image (optional but strongly preferred if present)
    if(imgSrc){
      const src = imgSrc.src || imgSrc.url || null;
      out.push({
        id: "pv_img",
        type: "image",
        role: "image",
        ...rects.image,
        src: src || undefined,
        url: (!src && imgSrc.url) ? imgSrc.url : undefined,
        style: {
          borderRadius: 14,
          objectFit: "cover",
          background: "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03))",
          border: "1px solid rgba(255,255,255,.14)"
        }
      });
    }

    // Badge
    if(badgeSrc){
      const t = clampText(pickText(badgeSrc), maxBadge) || "NEW";
      out.push({
        id: "pv_badge",
        type: "badge",
        role: "badge",
        text: t,
        title: t,
        ...rects.badge,
        style: {
          fontFamily: badgeSrc.style?.fontFamily || "Inter, sans-serif",
          fontSize: num(badgeSrc.style?.fontSize, badgeSize),
          fontWeight: num(badgeSrc.style?.fontWeight, 800),
          color: badgeSrc.style?.color || "#ffffff",
          backgroundColor: badgeSrc.style?.backgroundColor || "rgba(255,255,255,.12)",
          border: "1px solid rgba(255,255,255,.18)"
        }
      });
    }

    // Headline
    const headTextRaw = headSrc ? pickText(headSrc) : "";
    const headText = clampText(headTextRaw, maxHeadline) || clampText(opts.fallbackHeadline || "Your design", maxHeadline);
    out.push({
      id: "pv_headline",
      type: "text",
      role: "headline",
      text: headText,
      title: headText,
      ...rects.headline,
      style: {
        fontFamily: headSrc?.style?.fontFamily || "Poppins, sans-serif",
        fontSize: num(headSrc?.style?.fontSize ?? headSrc?.size, headlineSize),
        fontWeight: num(headSrc?.style?.fontWeight ?? headSrc?.weight, 900),
        color: headSrc?.style?.color || palette.ink,
        lineHeight: 1.08
      }
    });

    // Subhead (optional)
    const subTextRaw = subSrc ? pickText(subSrc) : "";
    const subText = clampText(subTextRaw, maxSub);
    if(subText){
      out.push({
        id: "pv_subhead",
        type: "text",
        role: "subhead",
        text: subText,
        title: subText,
        ...rects.subhead,
        style: {
          fontFamily: subSrc?.style?.fontFamily || "Inter, sans-serif",
          fontSize: num(subSrc?.style?.fontSize ?? subSrc?.size, subSize),
          fontWeight: num(subSrc?.style?.fontWeight ?? subSrc?.weight, 650),
          color: subSrc?.style?.color || "rgba(255,255,255,0.86)",
          lineHeight: 1.15
        }
      });
    }

    // CTA (optional)
    if(ctaSrc){
      const t = clampText(pickText(ctaSrc), maxCta) || "Get Started";
      out.push({
        id: "pv_cta",
        type: "button",
        role: "cta",
        text: t,
        title: t,
        ...rects.cta,
        style: {
          fontFamily: ctaSrc?.style?.fontFamily || "Inter, sans-serif",
          fontSize: num(ctaSrc?.style?.fontSize ?? ctaSrc?.size, ctaSize),
          fontWeight: num(ctaSrc?.style?.fontWeight ?? ctaSrc?.weight, 800),
          color: ctaSrc?.style?.color || "#ffffff",
          backgroundColor: ctaSrc?.style?.backgroundColor || palette.accent,
          borderRadius: num(ctaSrc?.style?.borderRadius, 14)
        }
      });
    }

    // Logo (optional)
    if(logoSrc){
      out.push({
        id: "pv_logo",
        type: "shape",
        role: "logo",
        ...rects.logo,
        style: {
          backgroundColor: logoSrc?.style?.backgroundColor || "rgba(255,255,255,.10)",
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: 12
        }
      });
    }

    // Density control: cap to a safe list
    const maxEls = clamp(num(opts.maxElements, 7), 4, 9);
    const bg = out[0];
    const rest = out.slice(1);
    const trimmed = [bg].concat(rest.slice(0, maxEls-1));

    // Ensure background is first
    return trimmed;
  }

  // -----------------------------
  // Minimal fallback preview
  // -----------------------------
  function minimalPreviewContract(category, seed){
    const cv = { w: 640, h: 640, width: 640, height: 640 };
    const palette = paletteForSeed(seed);
    const rects = previewRects(cv, "text-first");
    const els = [
      { id:"pv_bg", type:"bg", role:"background", ...rects.background, style:{ background: palette.bg } },
      { id:"pv_headline", type:"text", role:"headline", text:"Your design", title:"Your design", ...rects.headline,
        style:{ fontFamily:"Poppins, sans-serif", fontSize:84, fontWeight:900, color:palette.ink, lineHeight:1.08 } }
    ];

    const pc = root.NexoraPreviewContract;
    if(pc && typeof pc.createContract === "function"){
      return pc.createContract({ sourceTemplateId: null, category: category || "Unknown", canvas: cv, elements: els, meta:{ source:"minimal-fallback" } }) || null;
    }
    // If contract lib missing, return raw object (still renderable by dumb renderer later)
    return { version:"pv1", previewId:"preview_fallback", sourceTemplateId:null, category:category||"Unknown", canvas:cv, elements:els, meta:{ source:"minimal-fallback" }, createdAt: Date.now() };
  }

  
  // REALISTIC_PREVIEW_PASSTHROUGH
  // If template already has valid canvas + elements with geometry, prefer pass-through.
  function hasValidGeometry(canvas, elements){
    if(!canvas || !Array.isArray(elements) || !elements.length) return false;
    const W = Number(canvas.w ?? canvas.width), H = Number(canvas.h ?? canvas.height);
    if(!Number.isFinite(W) || !Number.isFinite(H) || W<=0 || H<=0) return false;
    return elements.some(e =>
      Number.isFinite(e?.x) && Number.isFinite(e?.y) &&
      Number.isFinite(e?.w) && Number.isFinite(e?.h)
    );
  }

// -----------------------------
  // Main normalize API
  // -----------------------------
  function normalize(templateOrPayload, options){
    try{
      const extracted0 = extractTemplateShape(templateOrPayload);
      if(hasValidGeometry(extracted0.canvas, extracted0.elements)){
        // Light clamp only
        const cv0 = normalizeCanvasShape(extracted0.canvas) || extracted0.canvas;
        return {
          version:"pv1",
          previewId:"preview_passthrough",
          sourceTemplateId: extracted0.sourceTemplateId || null,
          category: extracted0.category || "Unknown",
          canvas: cv0,
          elements: extracted0.elements,
          meta: Object.assign({}, extracted0.meta || {}, { source:"preview-passthrough" }),
          createdAt: Date.now()
        };
      }

      const extracted = extractTemplateShape(templateOrPayload);
      const srcCanvas = normalizeCanvasShape(extracted.canvas) || { w:1080,h:1080,width:1080,height:1080 };
      const category = str(extracted.category || "Instagram Post") || "Instagram Post";
      const seed = Number.isFinite(Number(options?.seed)) ? (Number(options.seed)>>>0) : stableHash32(category + "|" + str(extracted.sourceTemplateId || ""));
      const previewId = "preview_" + seed.toString(16);

      const previewCanvas = computePreviewCanvas(srcCanvas, options);
      const mode = choosePreviewMode(extracted.elements || [], previewCanvas.aspect);
      const rects = previewRects(previewCanvas, mode);

      const srcEls = Array.isArray(extracted.elements) ? deepClone(extracted.elements) : [];
      const previewEls = buildPreviewElements(srcEls, rects, previewCanvas, seed, options);

      const meta = Object.assign({}, (extracted.meta && typeof extracted.meta === "object") ? extracted.meta : {}, {
        source: "preview-normalizer",
        previewMode: mode,
        sourceCanvas: { w: srcCanvas.w, h: srcCanvas.h },
        previewCanvas: { w: previewCanvas.w, h: previewCanvas.h },
        aspect: previewCanvas.aspect,
        seed
      });

      const pc = root.NexoraPreviewContract;
      if(pc && typeof pc.createContract === "function"){
                const built = pc.createContract({
          sourceTemplateId: extracted.sourceTemplateId || null,
          category,
          canvas: previewCanvas,
          elements: previewEls,
          meta,
          previewId
        });
        return built || minimalPreviewContract(category, seed);
      }

      // No contract library: return raw shape (still usable by renderer with future integration)
      return {
        version: "pv1",
        previewId: previewId,
        sourceTemplateId: extracted.sourceTemplateId || null,
        category,
        canvas: previewCanvas,
        elements: previewEls,
        meta,
        createdAt: Date.now()
      };

    }catch(_){
      const category = str(templateOrPayload?.category || templateOrPayload?.contract?.category || "Instagram Post");
      const seed = stableHash32(category);
      return minimalPreviewContract(category, seed);
    }
  }

  // Export (merge-safe)
  const api = root.NexoraPreviewNormalization = root.NexoraPreviewNormalization || {};
  if(typeof api.normalize !== "function") api.normalize = normalize;

  try{
    if(typeof module === "object" && module.exports){
      module.exports = api;
    }
  }catch(_){}
})();
