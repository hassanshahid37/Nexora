/**
 * engines/preset-structure-builder.js
 * Deterministic builder: Preset -> {canvas, elements[]} (renderable)
 * - No AI. Rule-based. Safe defaults.
 * - Works in both Node (CommonJS) and Browser (globalThis).
 *
 * Expected preset schema (Instagram seed presets):
 *  {
 *    id, category, pattern,
 *    background: {type:'solid'|'gradient', colors:[...]} | string,
 *    layout: { headlinePosition:'center'|'top'|'bottom', alignment:'left'|'center'|'right' },
 *    containers: [{ enabled, radius:[min,max], padding:[min,max], fill? }],
 *    textRules: { headline:{ maxLines, fontSize:[min,max], weight }, support?:{...} },
 *    decor?: { enabled, family:[...], opacity:[min,max] }
 *  }
 */
(function (root) {
  "use strict";

  // ---------- P8 Structure Authority Binding ----------
  function safeRequire(path){
    try { return require(path); } catch(_) { return null; }
  }

  // Prefer Node/CommonJS factory; fallback to browser global
  var _factoryMod = safeRequire("../template-structure-factory.js");
  var _factory = (_factoryMod && typeof _factoryMod.createTemplateContract === "function")
    ? _factoryMod
    : (root && root.NexoraTemplateFactory && typeof root.NexoraTemplateFactory.createTemplateContract === "function"
        ? root.NexoraTemplateFactory
        : null);

  // Optional zones registry (adds meta.zones for downstream)
  var _zonesMod = safeRequire("../layout-zone-registry.js");
  var _zones = (_zonesMod && typeof _zonesMod.getZones === "function")
    ? _zonesMod
    : (root && root.NexoraZones && typeof root.NexoraZones.getZones === "function"
        ? root.NexoraZones
        : null);

  // Role allowlist (matches TemplateContract ROLE_SET when present)
  var _ROLE_SET = null;
  try{
    if(root && root.NexoraSpine && root.NexoraSpine.ROLE_SET && typeof root.NexoraSpine.ROLE_SET.has === "function"){
      _ROLE_SET = root.NexoraSpine.ROLE_SET;
    }
  }catch(_){}
  if(!_ROLE_SET){
    _ROLE_SET = new Set(["background","headline","subhead","image","cta","badge","logo"]);
  }

  function _buildContractFromElements(preset, canvas, elements, index, familyId){
    if(!_factory) return null;

    // Convert elements → layers (contract expects {id, role, locked:boolean})
    var layers = [];
    for(var i=0;i<(elements||[]).length;i++){
      var e = elements[i];
      if(!e) continue;
      var role = String(e.role || "");
      if(!_ROLE_SET.has(role)) continue;
      layers.push({ id: String(e.id || ("layer_"+i)), role: role, locked: false });
    }

    // Hard guard: contract must have at least background + headline
    var hasBg = false, hasHl = false;
    for(var j=0;j<layers.length;j++){
      if(layers[j].role === "background") hasBg = true;
      if(layers[j].role === "headline") hasHl = true;
    }
    if(!hasBg){
      layers.unshift({ id: "auto_background", role: "background", locked: true });
    }
    if(!hasHl){
      layers.push({ id: "auto_headline", role: "headline", locked: false });
    }

    var baseContract = {
      templateId: String((preset && preset.id) || ("tpl_"+index)),
      category: String((preset && preset.category) || "Instagram Post"),
      canvas: canvas,
      layers: layers,
      layoutFamily: familyId || (preset && (preset.layoutFamily || preset.familyId)) || null
    };

    var c = null;
    try{
      c = _factory.createTemplateContract(baseContract, Number(index)||0, { familyId: baseContract.layoutFamily });
    }catch(_){
      c = null;
    }
    if(!c) return null;

    // Attach zones (non-fatal)
    if(_zones && typeof _zones.getZones === "function"){
      try{
        c.meta = c.meta || {};
        c.meta.zones = _zones.getZones(c.layoutFamilyCanonical || c.layoutFamily);
      }catch(_){}
    }

    return c;
  }


  function num(v, d){ v = Number(v); return Number.isFinite(v) ? v : d; }
  function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
  function str(x){ return String(x == null ? "" : x); }
  function pick(arr, seed){
    if(!Array.isArray(arr) || !arr.length) return null;
    var i = (seed >>> 0) % arr.length;
    return arr[i];
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

  function normalizeCanvas(cv){
    var w = num(cv && (cv.w != null ? cv.w : cv.width), NaN);
    var h = num(cv && (cv.h != null ? cv.h : cv.height), NaN);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0){
      return { w: 1080, h: 1080, width: 1080, height: 1080 };
    }
    var W = Math.round(w), H = Math.round(h);
    return { w: W, h: H, width: W, height: H };
  }

  function backgroundToFill(bg, seed){
    // Allow old format: string
    if(typeof bg === "string" && bg.trim()) return bg.trim();

    if(!bg || typeof bg !== "object"){
      // default premium-ish gradient
      var bgs = [
        "linear-gradient(135deg,#0b1020,#1b2340)",
        "linear-gradient(135deg,#0f172a,#111827)",
        "linear-gradient(135deg,#0b1020,#0f172a)"
      ];
      return pick(bgs, seed) || bgs[0];
    }

    var type = str(bg.type).toLowerCase();
    var colors = Array.isArray(bg.colors) ? bg.colors.filter(Boolean) : [];
    if(type === "solid"){
      return (colors[0] || "#0b1020");
    }
    if(type === "gradient"){
      var c1 = colors[0] || "#0b1020";
      var c2 = colors[1] || "#1b2340";
      return "linear-gradient(135deg," + c1 + "," + c2 + ")";
    }
    // unknown -> first color
    return (colors[0] || "#0b1020");
  }

  function layoutAlignment(layout){
    var a = str(layout && layout.alignment).toLowerCase();
    if(a === "left" || a === "right" || a === "center") return a;
    return "center";
  }

  function headlinePos(layout){
    var p = str(layout && layout.headlinePosition).toLowerCase();
    if(p === "top" || p === "center" || p === "bottom") return p;
    return "center";
  }

  function chooseFontSize(range, text, W){
    var min = num(range && range[0], clamp(Math.round(W * 0.06), 24, 120));
    var max = num(range && range[1], clamp(Math.round(W * 0.085), 28, 140));
    min = clamp(min, 16, 220);
    max = clamp(max, min, 260);

    var t = str(text).trim();
    if(!t) return max;

    // Heuristic: shorter text -> larger font, longer -> smaller (but never below min)
    var len = t.length;
    var k = clamp((60 - len) / 60, 0, 1); // 0..1
    var size = Math.round(min + (max - min) * k);
    return clamp(size, min, max);
  }

  function buildFromPreset(preset, ctx){
    var p = (preset && typeof preset === "object") ? preset : {};
    var c = (ctx && typeof ctx === "object") ? ctx : {};

    var canvas = normalizeCanvas(c.canvas);
    var W = canvas.w, H = canvas.h;

    var seed = Number.isFinite(Number(c.seed)) ? (Number(c.seed) >>> 0)
      : stableHash32(str(p.id || "") + "|" + str(c.prompt || ""));

    var elements = [];

    // Background
    elements.push({
      id: "bg",
      type: "shape",
      role: "background",
      x: 0, y: 0, w: W, h: H,
      fill: backgroundToFill(p.background, seed),
      radius: 0
    });

    // Optional container/card
    var cont = (Array.isArray(p.containers) && p.containers[0]) ? p.containers[0] : null;
    var useCard = !!(cont && cont.enabled);
    var pad = clamp(Math.round(num(cont && cont.padding && cont.padding[1], 40)), 16, 96);
    var radius = clamp(Math.round(num(cont && cont.radius && cont.radius[1], 28)), 0, 96);

    var cardX = pad, cardY = pad;
    var cardW = W - pad * 2, cardH = H - pad * 2;

    if(useCard){
      elements.push({
        id: "card",
        type: "shape",
        role: "container",
        x: cardX, y: cardY, w: cardW, h: cardH,
        fill: (cont && cont.fill) ? cont.fill : "rgba(255,255,255,0.92)",
        radius: radius
      });
    }

    // Headline
    var align = layoutAlignment(p.layout);
    var hpos = headlinePos(p.layout);

    var headline = str(c.headline || c.prompt || "Your Headline Here").trim();
    if(!headline) headline = "Your Headline Here";

    var maxLines = num(p.textRules && p.textRules.headline && p.textRules.headline.maxLines, 2);
    maxLines = clamp(Math.round(maxLines), 1, 3);

    var textAreaPad = useCard ? Math.round(pad * 0.85) : Math.round(W * 0.08);
    var tx = useCard ? cardX + textAreaPad : textAreaPad;
    var tw = useCard ? cardW - textAreaPad * 2 : (W - textAreaPad * 2);

    var topBand = Math.round(H * 0.12);
    var centerBand = Math.round(H * 0.30);
    var bottomBand = Math.round(H * 0.58);

    var ty = (hpos === "top") ? topBand : (hpos === "bottom") ? bottomBand : centerBand;
    if(useCard) ty = cardY + Math.round(cardH * 0.18);

    var th = useCard ? Math.round(cardH * 0.34) : Math.round(H * 0.30);

    var fontSize = chooseFontSize(p.textRules && p.textRules.headline && p.textRules.headline.fontSize, headline, W);
    var weight = str(p.textRules && p.textRules.headline && p.textRules.headline.weight).toLowerCase();
    var fontWeight = (weight === "bold") ? 800 : (weight === "black") ? 900 : 700;

    elements.push({
      id: "headline",
      type: "text",
      role: "headline",
      x: tx, y: ty, w: tw, h: th,
      text: headline,
      title: headline,
      maxLines: maxLines,
      fontSize: fontSize,
      size: fontSize,
      fontWeight: fontWeight,
      weight: fontWeight,
      lineHeight: 1.12,
      align: align,
      textAlign: align,
      color: useCard ? "#0b1020" : "#ffffff"
    });

    // Optional support line (if enabled)
    var supportOn = !!(p.textRules && p.textRules.support && p.textRules.support.enabled);
    if(supportOn){
      var support = str(c.subhead || "").trim();
      if(support){
        var sSize = clamp(Math.round(fontSize * 0.42), 14, 60);
        elements.push({
          id: "support",
          type: "text",
          role: "subhead",
          x: tx,
          y: ty + Math.round(th * 0.72),
          w: tw,
          h: Math.round(th * 0.28),
          text: support,
          title: support,
          maxLines: 2,
          fontSize: sSize,
          size: sSize,
          fontWeight: 600,
          weight: 600,
          lineHeight: 1.2,
          align: align,
          textAlign: align,
          color: useCard ? "rgba(11,16,32,0.75)" : "rgba(255,255,255,0.78)"
        });
      }
    }

    // Optional decor: subtle dots/lines blobs (shape placeholders)
    var decorOn = !!(p.decor && p.decor.enabled);
    if(decorOn){
      var opMin = num(p.decor.opacity && p.decor.opacity[0], 0.15);
      var opMax = num(p.decor.opacity && p.decor.opacity[1], 0.30);
      var opacity = clamp(opMin + (opMax - opMin) * ((seed & 255) / 255), 0.05, 0.6);

      elements.push({
        id: "decor_1",
        type: "shape",
        role: "decor",
        x: Math.round(W * 0.08),
        y: Math.round(H * 0.08),
        w: Math.round(W * 0.18),
        h: Math.round(W * 0.18),
        fill: useCard ? "rgba(124,58,237," + opacity.toFixed(3) + ")" : "rgba(255,255,255," + opacity.toFixed(3) + ")",
        radius: Math.round(W * 0.09)
      });
    }

    
    // ---------- P8: build authoritative TemplateContract (structure) ----------
    var familyId = null;
    try{ familyId = (c && c.layoutFamily) || (p && p.layoutFamily) || null; }catch(_){ familyId = null; }

    var contract = _buildContractFromElements(p, canvas, elements, seed, familyId);
    if(!contract){
      // Fail fast: prevents silent loops on weak structure
      throw new Error("P8 ERROR: Failed to build TemplateContract from preset structure");
    }

    return {
      canvas: canvas,
      elements: elements,          // concrete geometry for preview/editor
      contract: contract,          // authoritative structure for downstream engines
      presetId: p.id || null,
      presetPattern: p.pattern || null,
      category: c.category || p.category || null,
      meta: { source: "preset-structure-builder", layoutFamily: contract.layoutFamily || null, layoutVariant: contract.layoutVariant || null }
    };
  }

  var api = { buildFromPreset: buildFromPreset };

  // Browser global
  try{
    if(!root.NexoraPresetStructureBuilder) root.NexoraPresetStructureBuilder = api;
  }catch(_){}

  // Node/CommonJS export
  try{
    if(typeof module !== "undefined" && module.exports){
      module.exports = api;
    }
  }catch(_){}

})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
