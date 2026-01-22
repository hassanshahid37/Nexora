/*
 Template Materializer - Nexora
 Authoritative finalization layer (final choke point)

 Goal:
   Guarantee that every template reaching the UI is FULLY MATERIALIZED and renderable:
     { canvas:{w,h,width,height}, elements:[...] }

 Contract:
   - NEVER throws (all errors become warnings)
   - Accepts any input shape: {template}, {contract+content}, partial AI output, or nothing
   - Spine-first: uses NexoraSpine.createTemplateFromInput when available
   - Fallbacks: sanitize partial templates -> deterministic minimal -> forced minimal
*/

(function (root) {
  "use strict";

  // -----------------------------
  // Small utilities (no deps)
  // -----------------------------
  function str(x){ return String(x == null ? "" : x); }
  function num(x, d){ var n = Number(x); return Number.isFinite(n) ? n : d; }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function normalizeCanvasShape(canvas){
    var w = num(canvas && (canvas.w != null ? canvas.w : canvas.width), NaN);
    var h = num(canvas && (canvas.h != null ? canvas.h : canvas.height), NaN);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    var W = Math.round(w), H = Math.round(h);
    return { w: W, h: H, width: W, height: H };
  }

  function stableHash32(s){
    s = str(s);
    var h = 2166136261;
    for(var i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function pick(arr, seed){
    if(!Array.isArray(arr) || !arr.length) return null;
    var i = (seed >>> 0) % arr.length;
    return arr[i];
  }

  function deepClone(x){
    try { return JSON.parse(JSON.stringify(x)); } catch(_) { return x; }
  }

  // -----------------------------
  // Category resolution (P5.1)
  // - accepts label/id/key/spec
  // - never throws; defaults to IG Post
  // -----------------------------
  function resolveCategorySpec(input){
    try{
      // Prefer the official normalizer if present
      var norm =
        (typeof root.normalizeCategory === "function" && root.normalizeCategory) ||
        (root.NexoraSpine && typeof root.NexoraSpine.normalizeCategory === "function" && root.NexoraSpine.normalizeCategory) ||
        null;

      if(typeof norm === "function"){
        var spec = norm(input);
        if(spec && spec.canvas) return spec;
      }

      // Direct registry access
      var reg =
        root.CategorySpecV1 ||
        (root.NexoraSpine && root.NexoraSpine.CategorySpecV1) ||
        null;

      if(reg && typeof input === "string"){
        var key = input.trim().toLowerCase().replace(/\s+/g,"_");
        var direct = reg[key] || reg[input] || null;
        if(direct && direct.canvas) return direct;
      }

      // Fall back to IG Post if available
      if(reg && (reg.instagram_post || reg["instagram_post"])) return reg.instagram_post || reg["instagram_post"];
    }catch(_){}
    // Hard fallback spec
    return { id: "instagram_post", label: "Instagram Post", canvas: { w: 1080, h: 1080 } };
  }

  // -----------------------------
  // Renderability checks + sanitize
  // -----------------------------
  function looksRenderableCanvas(cv){
    var c = normalizeCanvasShape(cv);
    return !!c;
  }

  function looksRenderableElements(els){
    if(!Array.isArray(els) || !els.length) return false;
    // Require at least ONE meaningful element box (background or text/image/shape with size)
    for(var i=0;i<els.length;i++){
      var e = els[i];
      if(!e || typeof e !== "object") continue;
      var w = num(e.w, NaN), h = num(e.h, NaN);
      var role = str(e.role || e.type || "").toLowerCase();
      if(role === "background" || role === "bg"){
        if(Number.isFinite(w) && Number.isFinite(h) && w > 10 && h > 10) return true;
        // background might be implicit; allow as meaningful if it has a fill
        if(str(e.fill || e.bg || e.background || "").trim()) return true;
        continue;
      }
      if(Number.isFinite(w) && Number.isFinite(h) && w > 10 && h > 10) return true;
    }
    return false;
  }

  function normalizeRole(el){
    var role = str(el && el.role).toLowerCase();
    if(role) return role;
    var t = str(el && el.type).toLowerCase();
    if(t === "bg" || t === "background") return "background";
    if(t === "photo" || t === "image") return "image";
    if(t === "cta" || t === "button") return "cta";
    if(t === "badge" || t === "pill" || t === "chip") return "badge";
    if(t === "headline" || t === "title") return "headline";
    if(t === "subhead" || t === "subtitle") return "subhead";
    if(t === "shape" || t === "card") return "shape";
    if(t === "text") return "text";
    return "";
  }

  function defaultRects(canvas){
    var W = canvas.w, H = canvas.h;
    return {
      background: { x:0, y:0, w:W, h:H },
      headline:   { x:Math.round(W*0.08), y:Math.round(H*0.12), w:Math.round(W*0.84), h:Math.round(H*0.26) },
      subhead:    { x:Math.round(W*0.08), y:Math.round(H*0.40), w:Math.round(W*0.84), h:Math.round(H*0.16) },
      image:      { x:Math.round(W*0.58), y:Math.round(H*0.18), w:Math.round(W*0.34), h:Math.round(H*0.56) },
      badge:      { x:Math.round(W*0.72), y:Math.round(H*0.08), w:Math.round(W*0.20), h:Math.round(H*0.10) },
      cta:        { x:Math.round(W*0.08), y:Math.round(H*0.78), w:Math.round(W*0.42), h:Math.round(H*0.10) },
      center:     { x:Math.round(W*0.20), y:Math.round(H*0.30), w:Math.round(W*0.60), h:Math.round(H*0.40) }
    };
  }

  function sanitizeTemplate(tpl, canvas, seed, prompt){
    var out = (tpl && typeof tpl === "object") ? deepClone(tpl) : {};
    out.canvas = normalizeCanvasShape(out.canvas) || canvas;

    var els = Array.isArray(out.elements) ? out.elements.slice() : [];
    var rects = defaultRects(out.canvas);

    // Ensure there is a background layer first
    var hasBg = false;
    for(var i=0;i<els.length;i++){
      var r = normalizeRole(els[i]);
      if(r === "background") { hasBg = true; break; }
    }
    if(!hasBg){
      els.unshift({ id:"bg", type:"bg", role:"background", x:0, y:0, w:out.canvas.w, h:out.canvas.h, fill:"#0b1020" });
    }

    // Fill missing geometry deterministically by role buckets
    for(var j=0;j<els.length;j++){
      var e = els[j];
      if(!e || typeof e !== "object") continue;

      var role = normalizeRole(e) || "center";
      var rr = rects[role] || rects.center;

      var x = num(e.x, NaN), y = num(e.y, NaN), w = num(e.w, NaN), h = num(e.h, NaN);
      var hasBox = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;

      if(!hasBox){
        e.x = rr.x; e.y = rr.y; e.w = rr.w; e.h = rr.h;
      }

      // Normalize common legacy fields
      if(e.type == null){
        if(role === "background") e.type = "bg";
        else if(role === "image") e.type = "photo";
        else if(role === "cta" || role === "badge" || role === "shape") e.type = "shape";
        else e.type = "text";
      }

      // Provide safe text fields so thumb renderers don't show blank
      if(String(e.type).toLowerCase() === "text"){
        if(e.text == null && e.title != null) e.text = e.title;
        if(e.title == null && e.text != null) e.title = e.text;

        if((e.text == null || !str(e.text).trim()) && (role === "headline" || role === "text")){
          e.text = str(out.title || prompt || "Your design");
          e.title = e.text;
        }
      }

      // Ensure background has fill
      if(role === "background"){
        if(!str(e.fill || "").trim() && !str(e.bg || "").trim()){
          e.fill = "#0b1020";
        }
      }
    }

    out.elements = els;
    out.category = out.category || out.categoryLabel || out.kind || null;
    out.meta = Object.assign({}, out.meta || {}, { materialized: true });
    return out;
  }

  // -----------------------------
  // Deterministic minimal generator (final safety net)
  // -----------------------------
  function buildMinimalTemplate(args){
    var canvas = args.canvas;
    var prompt = args.prompt;
    var headline = args.headline;
    var subhead = args.subhead;
    var cta = args.cta;
    var seed = args.seed >>> 0;

    var W = canvas.w, H = canvas.h;

    var safeHeadline = str(headline || "").trim() || str(prompt || "").trim() || "Your design";
    var safeSub = str(subhead || "").trim();
    var safeCta = str(cta || "").trim();

    var base = seed >>> 0;
    var bgChoices = ["#0b1020","#101827","#0f172a","#111827"];
    var inkChoices = ["#ffffff","#f8fafc","#e5e7eb"];
    var accentChoices = ["#7c3aed","#22c55e","#06b6d4","#f97316","#ef4444"];

    var bg = pick(bgChoices, base) || "#0b1020";
    var ink = pick(inkChoices, base ^ 0x9e37) || "#ffffff";
    var accent = pick(accentChoices, base ^ 0x51f2) || "#7c3aed";

    var padX = Math.round(W * 0.08);
    var topY = Math.round(H * 0.12);

    var headlineSize = clamp(Math.round(W * 0.07), 24, 120);
    var subSize = clamp(Math.round(W * 0.035), 16, 56);
    var ctaSize = clamp(Math.round(W * 0.032), 14, 52);

    var elements = [];
    elements.push({ id: "bg", type: "bg", role: "background", x: 0, y: 0, w: W, h: H, fill: bg });

    elements.push({
      id: "headline",
      type: "text",
      role: "headline",
      text: safeHeadline,
      title: safeHeadline,
      x: padX,
      y: topY,
      w: W - padX * 2,
      h: Math.round(H * 0.30),
      size: headlineSize,
      fontSize: headlineSize,
      weight: 900,
      fontWeight: 900,
      color: ink,
      align: "left"
    });

    if(safeSub){
      elements.push({
        id: "subhead",
        type: "text",
        role: "subhead",
        text: safeSub,
        title: safeSub,
        x: padX,
        y: topY + Math.round(H * 0.22),
        w: W - padX * 2,
        h: Math.round(H * 0.16),
        size: subSize,
        fontSize: subSize,
        weight: 600,
        fontWeight: 600,
        color: "rgba(255,255,255,0.78)",
        align: "left"
      });
    }

    if(safeCta){
      var ctaW = Math.round(W * 0.46);
      var ctaH = Math.round(H * 0.09);
      var ctaX = padX;
      var ctaY = Math.round(H * 0.78);

      elements.push({
        id: "cta_btn",
        type: "shape",
        role: "cta",
        x: ctaX,
        y: ctaY,
        w: ctaW,
        h: ctaH,
        fill: accent,
        radius: Math.round(ctaH * 0.35)
      });
      elements.push({
        id: "cta_text",
        type: "text",
        role: "cta",
        text: safeCta,
        title: safeCta,
        x: ctaX,
        y: ctaY + Math.round(ctaH * 0.18),
        w: ctaW,
        h: ctaH,
        size: ctaSize,
        fontSize: ctaSize,
        weight: 800,
        fontWeight: 800,
        color: "#ffffff",
        align: "center"
      });
    }

    return { canvas: canvas, elements: elements, _seed: base, _headline: safeHeadline, _subhead: safeSub, _cta: safeCta };
  }

  // -----------------------------
  // Main API
  // -----------------------------
  function materializeTemplate(options){
    var opts = (options && typeof options === "object") ? options : {};
    var warnings = [];

    // Accept many caller shapes
    var rawCategory = opts.category || opts.categoryId || (opts.contract && opts.contract.category) || null;
    var spec = resolveCategorySpec(rawCategory);
    var categoryLabel = str(spec && spec.label ? spec.label : (rawCategory || "Instagram Post")) || "Instagram Post";

    var style = str(opts.style || (opts.contract && opts.contract.style) || "Dark Premium") || "Dark Premium";
    var prompt = str(opts.prompt || (opts.intent && (opts.intent.prompt || opts.intent.title)) || "") || "";
    var seed = Number.isFinite(Number(opts.seed)) ? (Number(opts.seed) >>> 0) : stableHash32(categoryLabel + "|" + style + "|" + prompt);

    // Canvas: prioritize provided, then spec
    var canvas =
      normalizeCanvasShape(opts.canvas) ||
      normalizeCanvasShape(opts.template && opts.template.canvas) ||
      normalizeCanvasShape(opts.contract && (opts.contract.canvas || (opts.contract.meta && opts.contract.meta.canvas))) ||
      normalizeCanvasShape(spec && spec.canvas) ||
      { w: 1080, h: 1080, width: 1080, height: 1080 };

    // Prefer Spine normalizeCanvas if present (keeps {w,h,width,height})
    try{
      var nc = (root.NexoraSpine && typeof root.NexoraSpine.normalizeCanvas === "function") ? root.NexoraSpine.normalizeCanvas : null;
      if(nc){
        var cv = nc(canvas);
        if(cv) canvas = cv;
      }
    }catch(_){}

    // 1) If caller provides a template, sanitize it.
    try{
      var tpl0 = opts.template;
      if(tpl0 && typeof tpl0 === "object"){
        var cv0 = normalizeCanvasShape(tpl0.canvas) || canvas;
        var sanitized = sanitizeTemplate(tpl0, cv0, seed, prompt);
        if(looksRenderableCanvas(sanitized.canvas) && looksRenderableElements(sanitized.elements)){
          sanitized.category = sanitized.category || categoryLabel;
          sanitized.style = sanitized.style || style;
          sanitized.meta = Object.assign({}, sanitized.meta || {}, { source: "passthrough-sanitized", warnings: warnings });
          return sanitized;
        }
        warnings.push("Passthrough template was partial/invalid; re-materializing");
      }
    }catch(e){
      warnings.push("Passthrough sanitize failed: " + (e && e.message ? e.message : "unknown"));
    }

    // 2) Spine-first: ask Spine to produce the full template if available.
    try{
      var spine = root.NexoraSpine || null;
      if(spine && typeof spine.createTemplateFromInput === "function"){
        var out = spine.createTemplateFromInput({
          category: categoryLabel,
          style: style,
          prompt: prompt,
          notes: str(opts.notes || ""),
          seed: seed
        }, {});

        var tpl = out && out.template ? out.template : null;
        if(tpl && typeof tpl === "object"){
          var cv = normalizeCanvasShape(tpl.canvas) || canvas;
          var sanitizedSpine = sanitizeTemplate(tpl, cv, seed, prompt);
          if(looksRenderableCanvas(sanitizedSpine.canvas) && looksRenderableElements(sanitizedSpine.elements)){
            sanitizedSpine.category = sanitizedSpine.category || categoryLabel;
            sanitizedSpine.style = sanitizedSpine.style || style;
            sanitizedSpine.meta = Object.assign({}, sanitizedSpine.meta || {}, { source: "spine", warnings: warnings });
            return sanitizedSpine;
          }
        }
        warnings.push("Spine produced empty/invalid template");
      }
    }catch(e){
      warnings.push("Spine failed: " + (e && e.message ? e.message : "unknown"));
    }

    // 3) Deterministic minimal template (guaranteed renderable).
    try{
      var t = buildMinimalTemplate({
        canvas: canvas,
        prompt: prompt,
        headline: opts.headline,
        subhead: opts.subhead,
        cta: opts.cta,
        seed: seed
      });

      // Optional P9 visual engines (safe; style-only)
      // These engines expect a contract-like object: {category, canvas, elements}
      // and return an updated contract-like object.
      try{
        var contractLike = { category: categoryLabel, canvas: canvas, elements: t.elements };
        var vh = root.NexoraVisualHierarchyEngine && root.NexoraVisualHierarchyEngine.applyVisualHierarchy;
        var se = root.NexoraStyleEnforcementEngine && root.NexoraStyleEnforcementEngine.applyStyleEnforcement;

        if(typeof vh === "function"){
          contractLike = vh(contractLike, {}) || contractLike;
        }
        if(typeof se === "function"){
          contractLike = se(contractLike) || contractLike;
        }
        if(contractLike && Array.isArray(contractLike.elements) && contractLike.elements.length){
          t.elements = contractLike.elements;
        }
      }catch(e2){
        warnings.push("P9 visual engines skipped: " + (e2 && e2.message ? e2.message : "unknown"));
      }

      return {
        canvas: t.canvas,
        elements: t.elements,
        category: categoryLabel,
        style: style,
        _seed: t._seed,
        _headline: t._headline,
        _subhead: t._subhead,
        _cta: t._cta,
        meta: { source: "deterministic-min", warnings: warnings }
      };
    }catch(e3){
      warnings.push("Deterministic-min failed: " + (e3 && e3.message ? e3.message : "unknown"));
    }

    // 4) Forced final fallback (impossible to fail)
    var forced = buildMinimalTemplate({ canvas: canvas, prompt: prompt, seed: seed, headline: "Your message here" });
    return {
      canvas: forced.canvas,
      elements: forced.elements,
      category: categoryLabel,
      style: style,
      _seed: forced._seed,
      _headline: forced._headline,
      _subhead: forced._subhead,
      _cta: forced._cta,
      meta: { source: "forced-fallback", warnings: warnings.length ? warnings : ["Forced fallback used"] }
    };
  }

  // Exports: merge-safe
  try{
    if(typeof module !== "undefined" && module.exports){
      module.exports = { materializeTemplate: materializeTemplate };
    }
  }catch(_){}

  try{
    if(!root.materializeTemplate) root.materializeTemplate = materializeTemplate;
  }catch(_){}

})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
