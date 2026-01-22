// template-output-controller.js
// Purpose: single authority for what the home "preview tiles" render, and what gets exported/opened.
// Must be: crash-proof, contract-aware, and never blank the UI.

(function(root){
  const TOC = root.TemplateOutputController || {};
  let committed = false;

  TOC.templates = Array.isArray(TOC.templates) ? TOC.templates : [];

  TOC.setTemplates = function(templates, opts){
    const commit = !(opts && opts.commit === false);
    if(commit) committed = true;
    TOC.templates = Array.isArray(templates) ? templates : [];
  };

  TOC.setPreviewTemplates = function(templates){
    TOC.setTemplates(templates, { commit:false });
  };

  TOC.isCommitted = function(){ return committed; };

  // --- Internal fallback thumb renderer (legacy-safe) ---
// Renders from template.elements + template.canvas without requiring TemplateContract.
// IMPORTANT: design.js's DOM preview can be guarded after AI commit, so this must be robust.
function renderLegacyThumb(template, mount){
  try{
    if(!mount) return false;

    const canvasSpec = template?.canvas || template?.contract?.canvas || {};
    const W = Number(canvasSpec.w ?? canvasSpec.width ?? 1080);
    const H = Number(canvasSpec.h ?? canvasSpec.height ?? 1080);
    const baseW = (Number.isFinite(W) && W>0) ? W : 1080;
    const baseH = (Number.isFinite(H) && H>0) ? H : 1080;

    // Clear mount
    mount.innerHTML = "";

    // Preserve aspect ratio so tiles don't look "weird"
    const boxW = Math.max(160, (mount.clientWidth || 260));
    const boxH = Math.max(120, Math.round(boxW * (baseH / baseW)));
    mount.style.height = boxH + "px";

    const dpr = (typeof devicePixelRatio === "number" && devicePixelRatio>0) ? devicePixelRatio : 1;

    const c = document.createElement("canvas");
    c.width = Math.round(boxW * dpr);
    c.height = Math.round(boxH * dpr);
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.display = "block";
    c.style.borderRadius = "14px";
    c.style.background = "rgba(255,255,255,0.06)";
    mount.appendChild(c);

    const ctx = c.getContext("2d");
    if(!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const els = Array.isArray(template?.elements) ? template.elements : [];

    // Heuristic: support both absolute pixels and normalized 0..1 coords.
    const toPx = (v, base)=>{
      const n = Number(v);
      if(!Number.isFinite(n)) return 0;
      if(Math.abs(n) <= 1.5) return n * base;
      return n;
    };

    const sx = boxW / baseW;
    const sy = boxH / baseH;

    const pxX = (x)=> Math.round(toPx(x, baseW) * sx);
    const pxY = (y)=> Math.round(toPx(y, baseH) * sy);
    const pxW = (w)=> Math.round(toPx(w, baseW) * sx);
    const pxH = (h)=> Math.round(toPx(h, baseH) * sy);

    const safeColor = (v, fallback)=>{
      const s = (v==null ? "" : String(v)).trim();
      return s ? s : fallback;
    };

    // Draw background (supports radial gradient used by generator)
    let bgFill = template?.bg || template?.contract?.palette?.bg || "#0b1020";
    let bgFill2 = null;
    let bgStyle = null;
    const bgEl = els.find(e => String(e?.role||"").toLowerCase()==="background" || String(e?.type||"").toLowerCase()==="bg");
    if(bgEl){
      bgFill = bgEl.fill || bgEl.color || bgEl?.style?.backgroundColor || bgEl?.style?.fill || bgFill;
      bgFill2 = bgEl.fill2 || bgEl.bg2 || bgEl.color2 || null;
      bgStyle = bgEl.style || bgEl.kind || null;
    }

    try{
      const style = String(bgStyle||"").toLowerCase();
      if(style === "radial" && bgFill2){
        const g = ctx.createRadialGradient(boxW*0.20, boxH*0.10, 0, boxW*0.60, boxH*0.60, Math.max(boxW, boxH));
        g.addColorStop(0, safeColor(bgFill2, "#1b2d6e"));
        g.addColorStop(1, safeColor(bgFill, "#0b1020"));
        ctx.fillStyle = g;
      }else if(bgFill2){
        const g = ctx.createLinearGradient(0,0,boxW,boxH);
        g.addColorStop(0, safeColor(bgFill2, "#1b2d6e"));
        g.addColorStop(1, safeColor(bgFill, "#0b1020"));
        ctx.fillStyle = g;
      }else{
        ctx.fillStyle = safeColor(bgFill, "#0b1020");
      }
    }catch(_){
      ctx.fillStyle = "#0b1020";
    }
    ctx.fillRect(0,0,boxW,boxH);

    const drawRoundRect = (x,y,w,h,r)=>{
      const rr = Math.max(0, Math.min(r, Math.min(w,h)/2));
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.arcTo(x+w, y, x+w, y+h, rr);
      ctx.arcTo(x+w, y+h, x, y+h, rr);
      ctx.arcTo(x, y+h, x, y, rr);
      ctx.arcTo(x, y, x+w, y, rr);
      ctx.closePath();
    };

    const drawRectFillStroke = (x,y,w,h,r,fill,stroke,strokeW)=>{
      if(w<=0 || h<=0) return;
      drawRoundRect(x,y,w,h,r);
      if(fill && fill !== "transparent"){
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if(stroke && stroke !== "transparent"){
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(0.5, strokeW || 2);
        ctx.stroke();
      }
    };

    const order = (e)=>{
      const t = String(e?.type||"").toLowerCase();
      if(t === "bg") return 0;
      if(t === "shape" || t === "rect" || t === "card") return 10;
      if(t === "photo" || t === "image") return 20;
      if(t === "pill" || t === "badge") return 30;
      if(t === "chip") return 40;
      if(t === "text") return 50;
      return 60;
    };

    for(const e of [...els].sort((a,b)=>order(a)-order(b))){
      if(!e) continue;

      const type = String(e.type || "").toLowerCase();
      const role = String(e.role || "").toLowerCase();
      if(role === "background" || type === "bg") continue;

      const x = pxX(e.x ?? 0);
      const y = pxY(e.y ?? 0);
      const ww = pxW(e.w ?? 0);
      const hh = pxH(e.h ?? 0);
      if(ww<=0 || hh<=0) continue;

      const opacity = (e.opacity==null) ? 1 : Math.max(0, Math.min(1, Number(e.opacity)));
      ctx.save();
      ctx.globalAlpha = Number.isFinite(opacity) ? opacity : 1;

      if(type === "shape" || type === "rect" || type === "card"){
        const fill = safeColor(e.fill || e.bg || e.color || e?.style?.backgroundColor || e?.style?.fill, "rgba(255,255,255,0.12)");
        const stroke = e.stroke || null;
        const sw = Number(e.strokeWidth || 2) * Math.min(sx, sy);
        const r = toPx(e.radius ?? e.r ?? 18, Math.min(baseW, baseH)) * Math.min(sx, sy);
        drawRectFillStroke(x,y,ww,hh, r, fill, stroke, sw);
        ctx.restore();
        continue;
      }

      if(type === "photo" || type === "image"){
        const r = toPx(e.radius ?? e.r ?? 16, Math.min(baseW, baseH)) * Math.min(sx, sy);
        drawRoundRect(x,y,ww,hh, r);
        ctx.clip();
        const g = ctx.createLinearGradient(x,y,x+ww,y+hh);
        g.addColorStop(0, "rgba(11,95,255,0.26)");
        g.addColorStop(1, "rgba(136,71,255,0.20)");
        ctx.fillStyle = g;
        ctx.fillRect(x,y,ww,hh);
        ctx.restore();
        continue;
      }

      if(type === "pill" || type === "badge"){
        const fill = safeColor(e.fill || e.bg || "rgba(255,255,255,0.10)", "rgba(255,255,255,0.10)");
        const stroke = e.stroke || null;
        const sw = Number(e.strokeWidth || 2) * Math.min(sx, sy);
        const r = toPx(e.radius ?? e.r ?? 999, Math.min(baseW, baseH)) * Math.min(sx, sy);
        drawRectFillStroke(x,y,ww,hh, r, fill, stroke, sw);

        const t = String(e.text || e.title || "").trim();
        if(t){
          const fontSize = Math.max(10, Math.round(toPx(e.tsize || e.fontSize || e.size || 22, baseH) * sy));
          const weight = String(e.tweight || e.weight || 800);
          const font = (e.fontFamily || "Poppins, system-ui, sans-serif");
          ctx.font = `${weight} ${fontSize}px ${font}`;
          ctx.fillStyle = safeColor(e.tcolor || e.color, "#ffffff");
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          let out = t;
          const maxW = Math.max(10, ww - 10);
          while(out.length>2 && ctx.measureText(out).width > maxW){
            out = out.slice(0, -1);
          }
          if(out !== t) out = out.slice(0, Math.max(0,out.length-1)) + "…";
          ctx.fillText(out, x + ww/2, y + hh/2);
        }

        ctx.restore();
        continue;
      }

      if(type === "chip"){
        const t = String(e.text || e.title || "").trim();
        if(t){
          const fontSize = Math.max(10, Math.round(toPx(e.size || e.fontSize || 18, baseH) * sy));
          const weight = String(e.weight || 700);
          const font = (e.fontFamily || "Poppins, system-ui, sans-serif");
          ctx.font = `${weight} ${fontSize}px ${font}`;
          ctx.fillStyle = safeColor(e.color, "#f6f7fb");
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(t, x, y);
        }
        ctx.restore();
        continue;
      }

      if(type === "text"){
        const t = (e.text ?? e.title ?? "").toString().trim();
        if(!t){ ctx.restore(); continue; }

        const size = Math.max(10, Math.round(toPx(e.fontSize ?? e.size ?? 32, baseH) * sy));
        const weight = String(e.fontWeight ?? e.weight ?? 700);
        const font = (e.fontFamily || "Poppins, system-ui, sans-serif");
        ctx.font = `${weight} ${size}px ${font}`;
        ctx.fillStyle = safeColor(e.color, "#f6f7fb");
        ctx.textBaseline = "top";

        const align = String(e.align || "left").toLowerCase();
        ctx.textAlign = (align === "center") ? "center" : (align === "right") ? "right" : "left";
        const tx = (ctx.textAlign === "center") ? (x + ww/2) : (ctx.textAlign === "right" ? (x + ww) : x);

        const lines = wrapText(ctx, t, ww, 3);
        const lh = Math.round(size * 1.18);
        for(let li=0; li<lines.length; li++){
          ctx.fillText(lines[li], tx, y + li*lh);
        }

        ctx.restore();
        continue;
      }

      ctx.restore();
    }

    return true;
  }catch(_){
    return false;
  }
}

function wrapText(ctx, text, maxWidth, maxLines){
  try{
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for(const w of words){
      const test = line ? (line + " " + w) : w;
      if(ctx.measureText(test).width <= maxWidth){
        line = test;
      }else{
        if(line) lines.push(line);
        line = w;
        if(lines.length >= (maxLines||3)-1) break;
      }
    }
    if(line && lines.length < (maxLines||3)) lines.push(line);
    return lines;
  }catch(_){
    return [String(text).slice(0, 50)];
  }
}

TOC.renderThumb = function(template, mount){
  try{
    if(!mount) return;

    // 1) Contract-aware renderer (correct payload)
    if(template && template.contract && root.NexoraPreview && typeof root.NexoraPreview.renderTo === "function"){
      try{
        const content = template.content || template.doc?.content || null;
        if(content && typeof content === "object"){
          mount.innerHTML = "";
          root.NexoraPreview.renderTo(mount, { contract: template.contract, content, meta: template.meta || template.contract?.meta || {} });
          return;
        }
      }catch(_){ /* fall through */ }
    }

    // 2) Deterministic legacy canvas preview (never blank)
    if(template && (template.elements || template.canvas || template.contract?.canvas)){
      if(renderLegacyThumb(template, mount)) return;
    }

    // 3) Legacy DOM preview (best effort)
    if(root.NexoraDesign && typeof root.NexoraDesign.renderPreview === "function"){
      try{
        root.NexoraDesign.renderPreview(template, mount);
        if(mount.childNodes && mount.childNodes.length) return;
      }catch(_){}
    }

    // 4) Last resort
    mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
  }catch(_){
    try{
      mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
    }catch(__){}
  }
};



  root.TemplateOutputController = TOC;
})(window);
