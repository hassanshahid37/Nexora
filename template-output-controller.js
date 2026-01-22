// template-output-controller.js
// Purpose: single authority for what the home "preview tiles" render, and what gets exported/opened.
// Must be: crash-proof, contract-aware, and never blank the UI.

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
  
  // --- Internal fallback thumb renderer (legacy-safe) ---
  // Renders from tpl.elements + tpl.canvas without requiring TemplateContract.
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
      c.height = Math.round(h * scale);
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
      // Try background element
      const els = Array.isArray(template?.elements) ? template.elements : [];
      const bgEl = els.find(e => String(e?.role||"").toLowerCase()==="background" || e?.type==="bg");
      if(bgEl){
        bg = bgEl.fill || bgEl.color || bgEl?.style?.backgroundColor || bgEl?.style?.fill || bg;
      }
      ctx.fillStyle = String(bg || "#0b1020");
      ctx.fillRect(0,0,c.width,c.height);

      // Helpers
      function pxX(x){ return Math.round(Number(x)*scale); }
      function pxY(y){ return Math.round(Number(y)*scale); }
      function pxW(v){ return Math.round(Number(v)*scale); }
      function pxH(v){ return Math.round(Number(v)*scale); }

      // Minimal element draw
      for(const e of els){
        if(!e) continue;
        const type = String(e.type || "").toLowerCase();
        const role = String(e.role || "").toLowerCase();
        if(role === "background" || type === "bg") continue;

        const x = pxX(e.x ?? 0);
        const y = pxY(e.y ?? 0);
        const ww = pxW(e.w ?? 0);
        const hh = pxH(e.h ?? 0);

        if(type === "shape" || type === "rect"){
          const fill = e.fill || e.color || e?.style?.backgroundColor || e?.style?.fill || "rgba(255,255,255,0.12)";
          const r = Number(e.radius ?? e.r ?? 0) * scale;
          ctx.fillStyle = String(fill);
          if(r>0){
            roundRect(ctx, x, y, ww, hh, r);
            ctx.fill();
          }else{
            ctx.fillRect(x,y,ww,hh);
          }
          continue;
        }

        if(type === "photo" || type === "image"){
          // Placeholder (we don't load external images in thumbs)
          const r = Number(e.radius ?? e.r ?? 16) * scale;
          ctx.save();
          if(r>0){
            roundRect(ctx, x, y, ww, hh, r);
            ctx.clip();
          }
          const g = ctx.createLinearGradient(x,y,x+ww,y+hh);
          g.addColorStop(0, "rgba(11,95,255,0.22)");
          g.addColorStop(1, "rgba(136,71,255,0.18)");
          ctx.fillStyle = g;
          ctx.fillRect(x,y,ww,hh);
          ctx.restore();
          continue;
        }

        if(type === "text"){
          const txt = (e.text ?? e.title ?? "").toString();
          if(!txt) continue;
          const size = Number(e.fontSize ?? e.size ?? 32) * scale;
          const weight = Number(e.fontWeight ?? e.weight ?? 700);
          const font = (e.fontFamily || "Poppins, system-ui, sans-serif");
          ctx.font = `${weight} ${Math.max(10, Math.round(size))}px ${font}`;
          ctx.fillStyle = String(e.color || "#f6f7fb");
          ctx.textBaseline = "top";

          const align = String(e.align || "left").toLowerCase();
          ctx.textAlign = (align === "center") ? "center" : (align === "right") ? "right" : "left";
          const tx = (ctx.textAlign === "center") ? (x + ww/2) : (ctx.textAlign === "right" ? (x + ww) : x);

          // Simple wrap
          const lines = wrapText(ctx, txt, ww, 3);
          const lh = Math.round((Math.max(12, size) * 1.15));
          for(let li=0; li<lines.length; li++){
            ctx.fillText(lines[li], tx, y + li*lh);
          }
          continue;
        }
      }

      return true;
    }catch(_){
      return false;
    }
  }

  function roundRect(ctx, x, y, w, h, r){
    const rr = Math.max(0, Math.min(r, Math.min(w,h)/2));
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
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
      return [String(text).slice(0, 40)];
    }
  }

TOC.renderThumb = function(template, mount){
    try{
      if(!mount) return;

      // 1) Prefer spine-correct preview renderer ONLY when a contract exists.
      const hasContract = !!(template && template.contract);
      if(hasContract && root.NexoraPreview && typeof root.NexoraPreview.renderTo === "function"){
        const ok = root.NexoraPreview.renderTo(mount, template);
        if(ok) return;

        // If contract exists but preview failed (invalid/partial), fall through safely.
      }

      // 2) If template is legacy (canvas/elements) render it deterministically here.
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
      // Never throw from preview rendering.
      try{
        mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
      }catch(__){}
    }
};

  root.TemplateOutputController = TOC;
})(window);
