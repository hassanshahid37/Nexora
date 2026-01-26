
/**
 * preview-normalization-engine.js (FIXED v2)
 * Guarantees PreviewTemplateContract validity:
 * - Always injects a background
 * - Always guarantees at least ONE non-background element
 * - Never mutates source template
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;
  const Contract = root.NexoraPreviewContract;

  function normalize(template){
    try{
      if(!Contract || typeof Contract.createContract !== "function") return null;

      const canvas =
        template?.canvas ||
        template?.contract?.canvas ||
        { w: 1080, h: 1080 };

      const raw =
        Array.isArray(template?.elements) ? template.elements :
        Array.isArray(template?.contract?.elements) ? template.contract.elements :
        [];

      const elements = [];

      // ---- GUARANTEED BACKGROUND ----
      elements.push({
        id: "bg",
        role: "background",
        x: 0,
        y: 0,
        w: canvas.w || canvas.width || 1080,
        h: canvas.h || canvas.height || 1080,
        style: { background: "#0b1020" }
      });

      let hasContent = false;

      for(const el of raw){
        if(!el || el.role === "background") continue;

        const x = Number.isFinite(el.x) ? el.x : 80;
        const y = Number.isFinite(el.y) ? el.y : 80;
        const w = Number.isFinite(el.w) ? el.w : 600;
        const h = Number.isFinite(el.h) ? el.h : 160;

        elements.push({
          id: String(el.id || Math.random().toString(36).slice(2)),
          role: el.role || "body",
          x, y, w, h,
          text: el.text,
          src: el.src,
          style: el.style || {}
        });

        hasContent = true;
      }

      // ---- GUARANTEED NON-BACKGROUND ELEMENT ----
      if(!hasContent){
        elements.push({
          id: "placeholder",
          role: "headline",
          x: 120,
          y: 120,
          w: (canvas.w || 1080) - 240,
          h: 180,
          text: "Preview",
          style: { color: "#ffffff", fontWeight: 600 }
        });
      }

      return Contract.createContract({
        sourceTemplateId: template?.id || null,
        category: template?.category || "Unknown",
        canvas,
        elements
      });

    }catch(e){
      console.error("[PreviewNormalizationEngine] normalize failed", e);
      return null;
    }
  }

  root.NexoraPreviewNormalization = { normalize };
})();
