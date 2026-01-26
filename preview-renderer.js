
/**
 * preview-renderer.js (FIXED)
 * Intentionally dumb renderer:
 * - Accepts PreviewTemplateContract ONLY
 * - Enforces preview tile size
 * - Scales internal canvas to fit
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;

  function renderTo(target, previewContract){
    if(!target || !previewContract || !previewContract.canvas || !Array.isArray(previewContract.elements)){
      return;
    }

    // Clear target
    target.innerHTML = "";

    // --- Preview tile sizing (authoritative) ---
    const TILE_W = target.clientWidth || 240;
    const TILE_H = target.clientHeight || 240;

    // Root wrapper (clips everything)
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = TILE_W + "px";
    wrapper.style.height = TILE_H + "px";
    wrapper.style.overflow = "hidden";

    // Internal canvas (full logical size)
    const canvas = document.createElement("div");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = previewContract.canvas.w + "px";
    canvas.style.height = previewContract.canvas.h + "px";
    canvas.style.transformOrigin = "top left";

    // Scale to fit
    const scale = Math.min(
      TILE_W / previewContract.canvas.w,
      TILE_H / previewContract.canvas.h
    );
    canvas.style.transform = "scale(" + scale + ")";

    // Render elements (dumb draw)
    for(const el of previewContract.elements){
      const node = document.createElement("div");
      node.style.position = "absolute";
      node.style.left = el.x + "px";
      node.style.top = el.y + "px";
      node.style.width = el.w + "px";
      node.style.height = el.h + "px";

      if(el.role === "background"){
        node.style.left = "0";
        node.style.top = "0";
        node.style.width = previewContract.canvas.w + "px";
        node.style.height = previewContract.canvas.h + "px";
        node.style.background = el.style?.background || "#0b1020";
      } else if(el.text){
        node.textContent = el.text;
        node.style.color = el.style?.color || "#ffffff";
        node.style.fontWeight = el.style?.fontWeight || 500;
        node.style.fontSize = el.style?.fontSize || "32px";
        node.style.display = "flex";
        node.style.alignItems = "center";
      } else if(el.src){
        const img = document.createElement("img");
        img.src = el.src;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        node.appendChild(img);
      }

      canvas.appendChild(node);
    }

    wrapper.appendChild(canvas);
    target.appendChild(wrapper);
  }

  root.NexoraPreview = { renderTo };
})();
