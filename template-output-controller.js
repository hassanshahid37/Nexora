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
  TOC.renderThumb = function(template, mount){
    try{
      if(!mount) return;

      // Prefer the spine-correct preview renderer.
      if(root.NexoraPreview && typeof root.NexoraPreview.renderTo === "function"){
        // Template objects from design.js are already { contract, content, meta? } shaped.
        root.NexoraPreview.renderTo(mount, template);
        return;
      }

      // Fallback: legacy renderer (still deterministic).
      if(root.NexoraDesign && typeof root.NexoraDesign.renderPreview === "function"){
        root.NexoraDesign.renderPreview(template, mount);
        return;
      }

      // Last resort: keep it visible (never blank).
      mount.textContent = (template?.content?.headline || template?.title || "").toString().slice(0, 40);
    }catch(_){
      // Never throw from preview rendering.
    }
  };

  root.TemplateOutputController = TOC;
})(window);
