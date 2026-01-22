// template-output-controller.js
// Purpose: single authority for what the home "preview tiles" render, and what gets exported/opened.
// Must be: crash-proof, contract-aware, and never blank the UI.
//
// P8 Phase-3: when a valid TemplateContract exists, previews should use NexoraPreview (zone-executed geometry).
// Legacy-safe: when only {canvas,elements} exist (or contract is partial), render a deterministic fallback thumb.

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

  // --- Internal fallback thumb renderer (legacy-safe) ---
  // Renders from tpl.elements + tpl.canvas without requiring a valid TemplateContract.
  function renderLegacyThumb(template, mount){
    try{
      if(!mount) return false;

      const canvasSpec = template?.canvas || template?.contract?.canvas || {};
      const W = Number(canvasSpec.w ?? canvasSpec.width ?? 1080);
      const H = Number(canvasSpec.h ?? canvasSpec.height ?? 1080);
      const w = Number.isFinite(W) && W>0 ? W : 1080;
      const h = Number.isFinite(H) && H>0 ? H : 1080;

      // Clear mount
      while(mount.firstChild) mount.removeChild(mount.firstChild);

      const c = document.createElement("canvas");
      // Small but crisp thumbnail
      const thumbW = 560;
      const scale = thumbW / w;
      c.width = thumbW;
      c.height = Math.max(1, Math.round(h * scale));
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.display = "block";
      c.style.borderRadius = "14px";
      c.style.background = "rgba(255,255,255,0.06)";
      mount.appendChild(c);

      const ctx = c.getContext("2d");
      if(!ctx) return false;

      // Background
      let bg = template?.bg || template?.contract?.palette?.bg || null;
      const els = Array.isArray(template?.elements) ? template.elements : [];
      const bgEl = els.find(e => String(e?.role||"").toLowerCase()==="background" || String(e?.type||"").toLowerCase()==="bg");
      if(bgEl){
        bg = bgEl.fill || bgEl.color || bgEl?.style?.backgroundColor || bgEl?.style?.fill || bg;
      }
      ctx.fillStyle = String(bg || "#0b1020");
      ctx.fillRect(0,0,c.width,c.height);

      function roundRect(ctx,x,y,w,h,r){
        const rr = Math.max(0, Math.min(r, Math.min(w,h)/2));
        ctx.beginPath();
        ctx.moveTo(x+rr, y);
        ctx.arcTo(x+w, y, x+w, y+h, rr);
        ctx.arcTo(x+w, y+h, x, y+h, rr);
        ctx.arcTo(x, y+h, x, y, rr);
        ctx.arcTo(x, y, x+w, y, rr);
        ctx.closePath();
      }

      // Support both absolute pixels (design.js) and normalized 0..1 coords (home seed/fallback tiles).
      function toAbsX(x){
        const n = Number(x);
        if(!Number.isFinite(n)) return 0;
        if(n >= 0 && n <= 1) return n * w;
        return n;
      }
      function toAbsY(y){
        const n = Number(y);
        if(!Number.isFinite(n)) return 0;
        if(n >= 0 && n <= 1) return n * h;
        return n;
      }
      function toAbsW(v){
        const n = Number(v);
        if(!Number.isFinite(n)) return 0;
        if(n >= 0 && n <= 1) return n * w;
        return n;
      }
      function toAbsH(v){
        const n = Number(v);
        if(!Number.isFinite(n)) return 0;
        if(n >= 0 && n <= 1) return n * h;
        return n;
      }

      function pxX(x){ return Math.round(toAbsX(x) * scale); }
      function pxY(y){ return Math.round(toAbsY(y) * scale); }
      function pxW(v){ return Math.round(toAbsW(v) * scale); }
      function pxH(v){ return Math.round(toAbsH(v) * scale); }

      // Minimal deterministic element draw
      for(const e of els){
        if(!e) continue;
        const type = String(e.type || "").toLowerCase();
        const role = String(e.role || "").toLowerCase();
        if(role === "background" || type === "bg") continue;

        const x = pxX(e.x ?? 0);
        const y = pxY(e.y ?? 0);
        const ww = pxW(e.w ?? 0);
        const hh = pxH(e.h ?? 0);
        if(ww<=0 || hh<=0) continue;

        if(type === "shape" || type === "rect"){
          const fill = e.fill || e.color || e?.style?.backgroundColor || e?.style?.fill || "rgba(255,255,255,0.12)";
          const r = Number(e.radius ?? e.r ?? 0);
          const rr = Number.isFinite(r) ? r * scale : 0;
          ctx.fillStyle = String(fill);
          if(rr>0){
            roundRect(ctx, x, y, ww, hh, rr);
            ctx.fill();
          }else{
            ctx.fillRect(x,y,ww,hh);
          }
          continue;
        }

        if(type === "text"){
          const text = String(e.text ?? e.title ?? e.label ?? "").trim();
          if(!text) continue;
          const size = Number(e.size ?? e.fontSize ?? 26);
          const weight = Number(e.weight ?? 800);
          const color = String(e.color ?? e.fill ?? "#ffffff");
          ctx.fillStyle = color;
          ctx.font = `${weight} ${Math.max(10, Math.round(size*scale))}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
          ctx.textBaseline = "top";
          ctx.textAlign = (String(e.align||"left").toLowerCase()==="center") ? "center" : "left";
          const tx = (ctx.textAlign==="center") ? Math.round(x + ww/2) : x;
          // crude clamp: single line, ellipsis by width
          const maxW = Math.max(10, ww);
          let out = text;
          while(out.length>2 && ctx.measureText(out).width > maxW){
            out = out.slice(0, -1);
          }
          if(out !== text) out = out.slice(0, Math.max(0,out.length-1)) + "…";
          ctx.fillText(out, tx, y);
          continue;
        }

        // image/photo placeholders: draw a soft slab (no external fetch)
        if(type === "image" || type === "photo"){
          ctx.fillStyle = "rgba(255,255,255,0.10)";
          roundRect(ctx, x, y, ww, hh, 14*scale);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = Math.max(1, 2*scale);
          ctx.stroke();
          continue;
        }
      }

      return true;
    }catch(_){
      return false;
    }
  }

  // Render a template into a tile thumb mount.
  // NOTE: NexoraPreview.renderTo signature is renderTo(targetNode, payload {contract,content,meta?}).
  TOC.renderThumb = function(template, mount){
    try{
      if(!mount) return;

      // 1) Prefer spine-correct preview renderer ONLY when contract looks valid enough.
      const hasContract = !!(template && template.contract && (template.content || template.doc?.content));
      if(hasContract && root.NexoraPreview && typeof root.NexoraPreview.renderTo === "function"){
        const ok = root.NexoraPreview.renderTo(mount, template);
        if(ok) return;
        // If preview failed (invalid/partial contract), fall through safely.
      }

      // 2) Legacy: if template has canvas/elements, render deterministically here.
      if(template && (template.elements || template.canvas)){
        const ok2 = renderLegacyThumb(template, mount);
        if(ok2) return;
      }

      // 3) Legacy renderer (design.js) if available (best effort).
      if(root.NexoraDesign && typeof root.NexoraDesign.renderPreview === "function"){
        root.NexoraDesign.renderPreview(template, mount);
        return;
      }

      // 4) Last resort: keep it visible (never blank).
      mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
    }catch(_){
      try{
        mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
      }catch(__){}
    }
  };

  root.TemplateOutputController = TOC;
})(typeof globalThis !== "undefined" ? globalThis : window);
