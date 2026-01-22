// template-output-controller.js
// Nexora: Template Output Controller (authoritative output gate)
// - Single place to "commit" generated templates
// - Single place to render thumbnails (routes through the existing preview router when present)
// IMPORTANT: This file is intentionally framework-free and defensive.

(function(root){
  const TOC = {};
  let committed = false;

  function isEl(x){
    return !!x && typeof x === "object" && (x.nodeType === 1 || x === document.body);
  }

  function safeContentFromTemplate(tpl){
    // Prefer explicit content; fallback to doc.content; fallback to existing helper if present.
    try{
      if(tpl && tpl.content && typeof tpl.content === "object") return tpl.content;
      if(tpl && tpl.doc && tpl.doc.content && typeof tpl.doc.content === "object") return tpl.doc.content;
      if(typeof root.__synthContentFromElements === "function") return root.__synthContentFromElements(tpl);
    }catch(_){}
    return null;
  }

  TOC.setTemplates = function(templates){
    committed = true;
    TOC.templates = Array.isArray(templates) ? templates : [];
    // Global lock: once real templates exist, seed/legacy overwrites must never run again.
    try{ root.__NEXORA_AI_COMMITTED__ = true; }catch(_){}
  };

  // Render a single template into a thumbnail mount.
  // Call signature used by index.html: renderThumb(template, mount)
  TOC.renderThumb = function(template, mount){
    if(!template || !mount) return;

    // Route through the project's unified preview router if present.
    if(typeof root.renderThumb === "function" && isEl(mount)){
      try{
        root.renderThumb(mount, template, (template.bg || null));
        return;
      }catch(_){}
    }

    // Fallback: call Preview Renderer v1 directly if available.
    try{
      const pv = root.NexoraPreview;
      if(pv && typeof pv.renderTo === "function" && isEl(mount)){
        // NexoraPreview.renderTo signature in this project: (mount, payloadOrTemplate)
        if(template.contract){
          const content = safeContentFromTemplate(template) || {};
          pv.renderTo(mount, { contract: template.contract, content });
        }else{
          pv.renderTo(mount, template);
        }
        return;
      }
    }catch(_){}

    // Last resort: legacy drawThumb if it exists.
    if(typeof root.drawThumb === "function" && isEl(mount)){
      try{ root.drawThumb(mount, template, (template.bg || null)); }catch(_){}
    }
  };

  TOC.isCommitted = function(){ return committed; };

  root.TemplateOutputController = TOC;
})(window);
