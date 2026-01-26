// template-output-controller.js
// Purpose: single authority for what the home "preview tiles" render, and what gets exported/opened.
// Must be: crash-proof, contract-aware, and never blank the UI.


function renderLegacyThumb(template, mount){
  // DOM-based miniature renderer (editor-like) so previews are never "blank boxes".
  // This is intentionally independent from NexoraDesign (which can be disabled after AI commit).
  try{
    if(!mount) return false;

    const canvasSpec = template?.canvas || template?.contract?.canvas || {};
    const W = Number(canvasSpec.w ?? canvasSpec.width ?? 1080);
    const H = Number(canvasSpec.h ?? canvasSpec.height ?? 1080);
    const baseW = (Number.isFinite(W) && W>0) ? W : 1080;
    const baseH = (Number.isFinite(H) && H>0) ? H : 1080;

    // Clear mount
    mount.innerHTML = "";

    // Root wrapper keeps aspect ratio stable inside tiles
    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.width = "100%";
    wrap.style.aspectRatio = baseW + " / " + baseH;
    wrap.style.borderRadius = "16px";
    wrap.style.overflow = "hidden";
    wrap.style.background = "rgba(255,255,255,0.06)";
    wrap.style.border = "1px solid rgba(255,255,255,0.10)";

    // Scale factor based on available width
    const boxW = Math.max(1, mount.clientWidth || mount.getBoundingClientRect().width || 260);
    const scale = boxW / baseW;

    // Helper: normalize element fields (legacy + spine-to-template)
// Elements may live in multiple places depending on pipeline stage.
// Prefer top-level, then contract.elements, then content.elements.
    const els = Array.isArray(template?.elements) ? template.elements
              : Array.isArray(template?.contract?.elements) ? template.contract.elements
              : Array.isArray(template?.content?.elements) ? template.content.elements
              : [];

    // If there are no elements, draw a minimal but non-blank placeholder.
    if(!els.length){
      const ph = document.createElement("div");
      ph.style.position = "absolute";
      ph.style.left = "0";
      ph.style.top = "0";
      ph.style.right = "0";
      ph.style.bottom = "0";
      ph.style.display = "flex";
      ph.style.alignItems = "center";
      ph.style.justifyContent = "center";
      ph.style.color = "rgba(255,255,255,0.85)";
      ph.style.fontWeight = "700";
      ph.style.fontSize = "16px";
      ph.textContent = (template?.content?.headline || template?.headline || template?.title || "Template").toString().slice(0, 40);
      wrap.appendChild(ph);
      mount.appendChild(wrap);
      return true;
    }

    // Sort so backgrounds go first
    const sorted = els.slice().sort((a,b)=>{
      const ra = String(a?.role || a?.type || "");
      const rb = String(b?.role || b?.type || "");
      if(ra === "background" && rb !== "background") return -1;
      if(rb === "background" && ra !== "background") return 1;
      return 0;
    });

    for(const e of sorted){
      const type = String(e?.type || "");
      const role = String(e?.role || "");
      const isImg = (type === "image") || (role === "image") || (e?.src || e?.url);
      const x = Number(e?.x ?? 0), y = Number(e?.y ?? 0), w = Number(e?.w ?? 0), h = Number(e?.h ?? 0);

// Support both pixel coordinates and 0..1 normalized coordinates (common in deterministic/seed templates).
// Heuristic: if all geometry looks <= ~2, treat as normalized.
const looksNormalized = (
  Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) &&
  Math.abs(x) <= 2 && Math.abs(y) <= 2 && Math.abs(w) <= 2 && Math.abs(h) <= 2
);
const pxX = looksNormalized ? (x * baseW) : x;
const pxY = looksNormalized ? (y * baseH) : y;
const pxW = looksNormalized ? (w * baseW) : w;
const pxH = looksNormalized ? (h * baseH) : h;

const node = document.createElement("div");
node.style.position = "absolute";
node.style.left = (pxX * scale) + "px";
node.style.top  = (pxY * scale) + "px";
node.style.width  = Math.max(1, pxW * scale) + "px";
node.style.height = Math.max(1, pxH * scale) + "px";

      node.style.borderRadius = (Number(e?.radius ?? 16) * scale) + "px";
      node.style.opacity = String(e?.opacity ?? 1);
      node.style.overflow = "hidden";
      node.style.boxSizing = "border-box";

      // Background
      const bg = e?.bg ?? e?.fill ?? e?.background ?? null;
      if(typeof bg === "string" && bg){
        // Handle legacy bg: "url(...)" or color
        if(bg.startsWith("url(")){
          node.style.backgroundImage = bg;
          node.style.backgroundSize = e?.fit || e?.objectFit || "cover";
          node.style.backgroundPosition = "center";
          node.style.backgroundRepeat = "no-repeat";
        }else{
          node.style.background = bg;
        }
      }else{
        // Provide subtle default for shapes/cards
        if(type === "shape" || type === "card" || type === "pill" || role === "background"){
          node.style.background = "rgba(255,255,255,0.06)";
        }else{
          node.style.background = "transparent";
        }
      }

      // Border / stroke (if any)
      const stroke = e?.stroke ?? e?.border ?? null;
      if(typeof stroke === "string" && stroke){
        node.style.border = (Math.max(1, 1*scale)) + "px solid " + stroke;
      }else{
        node.style.border = "none";
      }

      // Shadow (scaled)
      const sh = e?.shadow;
      if(sh && typeof sh === "object"){
        const sx = Number(sh.x ?? 0) * scale;
        const sy = Number(sh.y ?? 0) * scale;
        const sb = Number(sh.blur ?? 0) * scale;
        const sc = String(sh.color ?? "rgba(0,0,0,0.25)");
        node.style.boxShadow = `${sx}px ${sy}px ${sb}px ${sc}`;
      }

      if(isImg){
        const img = document.createElement("img");
        const src = e?.src || e?.url || (typeof bg === "string" && bg.startsWith("url(") ? bg.slice(4,-1).replace(/['"]/g,"") : null);
        if(src) img.src = src;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = e?.fit || e?.objectFit || "cover";
        img.style.display = "block";
        node.style.background = "transparent";
        node.appendChild(img);
        wrap.appendChild(node);
        continue;
      }

      // Text
      const txt = (e?.title ?? e?.text ?? "").toString();
      const sub = (e?.subtitle ?? "").toString();
      if(txt || sub){
        node.style.display = "flex";
        node.style.flexDirection = "column";
        node.style.justifyContent = "center";
        node.style.gap = (4 * scale) + "px";
        node.style.padding = (Math.max(2, 10 * scale)) + "px";

        const color = e?.color || "rgba(255,255,255,0.92)";
        const size = Number(e?.fontSize ?? e?.size ?? 22);
        const weight = Number(e?.weight ?? 700);

        const t1 = document.createElement("div");
        t1.textContent = txt;
        t1.style.color = color;
        t1.style.fontWeight = String(weight);
        t1.style.fontSize = Math.max(9, size * scale) + "px";
        t1.style.lineHeight = "1.15";
        t1.style.whiteSpace = "nowrap";
        t1.style.overflow = "hidden";
        t1.style.textOverflow = "ellipsis";
        node.appendChild(t1);

        if(sub){
          const t2 = document.createElement("div");
          t2.textContent = sub;
          t2.style.color = color;
          t2.style.opacity = "0.85";
          t2.style.fontWeight = String(Math.max(400, Math.min(600, weight-200)));
          t2.style.fontSize = Math.max(8, (size*0.72) * scale) + "px";
          t2.style.lineHeight = "1.15";
          t2.style.whiteSpace = "nowrap";
          t2.style.overflow = "hidden";
          t2.style.textOverflow = "ellipsis";
          node.appendChild(t2);
        }
      }

      wrap.appendChild(node);
    }

    mount.appendChild(wrap);
    return true;
  }catch(_){
    try{
      mount.innerHTML = "";
      const box = document.createElement("div");
      box.style.padding = "10px";
      box.style.color = "rgba(255,255,255,0.85)";
      box.textContent = (template?.content?.headline || template?.title || "Template").toString().slice(0, 40);
      mount.appendChild(box);
    }catch(__){}
    return true;
  }
}

(function(root){
  const TOC = root.TemplateOutputController || {};
  let committed = false;

  // Keep the latest list so Export/OpenEditor always has something deterministic.
  TOC.templates = Array.isArray(TOC.templates) ? TOC.templates : [];

  // Set templates and (by default) mark them as "committed" (AI-backed).
  // Pass {commit:false} to update the list without flipping committed.
  TOC.setTemplates = function(templates, opts){
    const commit = !(opts && opts.commit === false);
    if(commit) committed = true;
    TOC.templates = Array.isArray(templates) ? templates : [];
  };

  // Seed previews update: keep deterministic list but DO NOT mark committed.
  TOC.setPreviewTemplates = function(templates){
    TOC.setTemplates(templates, { commit: false });
  };

  TOC.isCommitted = function(){ return committed; };

  // Render a template into a tile thumb mount.
  // NOTE: NexoraPreview.renderTo signature is renderTo(targetNode, payload).
  TOC.renderThumb = function(template, mount){
    try{
      if(!mount) return;

      // Prefer the spine-correct preview renderer when available.
// IMPORTANT: renderTo(target, payload) expects a spine-shaped payload: { contract, content, meta? }.
if(root.NexoraPreview && typeof root.NexoraPreview.renderTo === "function"){
  const payload = (template && typeof template === "object") ? {
    // Provide flat fields too so preview-renderer can auto-adapt when contract is missing/partial.
    canvas: (template.canvas || template.contract?.canvas || null),
    elements: Array.isArray(template.elements) ? template.elements
            : Array.isArray(template.contract?.elements) ? template.contract.elements
            : undefined,

    contract: (template.contract && typeof template.contract === "object") ? template.contract : (template.Contract || null),
    content:  (template.content && typeof template.content === "object") ? template.content : {
      elements: Array.isArray(template.elements) ? template.elements
              : Array.isArray(template.contract?.elements) ? template.contract.elements
              : undefined,
      headline: template.headline ?? template.title ?? undefined,
      subhead: template.subhead ?? template.subtitle ?? undefined
    },
    meta: (template.meta && typeof template.meta === "object") ? template.meta : undefined
  } : template;

  // Try spine renderer first. If it renders nothing, fall through to legacy renderer.
  try{
    mount.innerHTML = "";
    const r = root.NexoraPreview.renderTo(mount, payload);
    const rendered = (r === true) || (mount.childNodes && mount.childNodes.length > 0);
    if(rendered) return;
    // else fall through
    mount.innerHTML = "";
  }catch(_){
    try{ mount.innerHTML = ""; }catch(__){}
    // fall through
  }
}

      // Fallback: legacy DOM renderer (editor-like). Never blank.
      if(renderLegacyThumb(template, mount)) return;

      // Last resort: keep it visible (never blank).
      mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
    }catch(_){
      // Never throw from preview rendering.
    }
  };

  root.TemplateOutputController = TOC;
})(window);
