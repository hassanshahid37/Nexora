
/**
 * preview-normalization-engine.js (FIXED)
 * Guarantees preview-safe output with REQUIRED background injection.
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;
  const Contract = root.NexoraPreviewContract;

  function normalize(template){
    try{
      if(!Contract || typeof Contract.createContract !== "function") return null;

      const baseCanvas = template?.canvas || template?.contract?.canvas || { w:1080, h:1080 };
      const elements = Array.isArray(template?.elements)
        ? template.elements
        : Array.isArray(template?.contract?.elements)
        ? template.contract.elements
        : [];

      const out = [];

      // 🔒 GUARANTEED BACKGROUND
      out.push({
        id: "bg",
        role: "background",
        x: 0,
        y: 0,
        w: baseCanvas.w || baseCanvas.width || 1080,
        h: baseCanvas.h || baseCanvas.height || 1080,
        style: { background: "#0b1020" }
      });

      for(const el of elements){
        if(!el || el.role === "background") continue;
        if(
          Number.isFinite(el.x) &&
          Number.isFinite(el.y) &&
          Number.isFinite(el.w) &&
          Number.isFinite(el.h)
        ){
          out.push({
            id: String(el.id || Math.random().toString(16).slice(2)),
            role: el.role,
            x: el.x,
            y: el.y,
            w: el.w,
            h: el.h,
            text: el.text,
            src: el.src,
            style: el.style || {}
          });
        }
      }

      return Contract.createContract({
        sourceTemplateId: template?.id || null,
        category: template?.category || "Unknown",
        canvas: baseCanvas,
        elements: out
      });
    }catch(_){
      return null;
    }
  }

  root.NexoraPreviewNormalization = { normalize };
})();
