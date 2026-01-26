
/**
 * preview-renderer.js (FIXED v2)
 * Dumb renderer, but correct thumbnail behavior:
 * - Accepts PreviewTemplateContract ONLY
 * - Enforces tile size
 * - Scales AND CENTERS canvas
 * - Background always fills tile
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;

  function renderTo(target, previewContract){
    if(!target || !previewContract || !previewContract.canvas || !Array.isArray(previewContract.elements)){
      return;
    }

    target.innerHTML = "";

    const TILE_W = target.clientWidth || 240;
    const TILE_H = target.clientHeight || 240;

    // Wrapper = authoritative preview tile
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = TILE_W + "px";
    wrapper.style.height = TILE_H + "px";
    wrapper.style.overflow = "hidden";
    wrapper.style.background = "#0b1020";

    const canvasW = previewContract.canvas.w;
    const canvasH = previewContract.canvas.h;

    const scale = Math.min(TILE_W / canvasW, TILE_H / canvasH);
    const scaledW = canvasW * scale;
    const scaledH = canvasH * scale;

    // Centered canvas
    const canvas = document.createElement("div");
    canvas.style.position = "absolute";
    canvas.style.width = canvasW + "px";
    canvas.style.height = canvasH + "px";
    canvas.style.left = (TILE_W - scaledW) / 2 + "px";
    canvas.style.top = (TILE_H - scaledH) / 2 + "px";
    canvas.style.transformOrigin = "top left";
    canvas.style.transform = "scale(" + scale + ")";

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
        node.style.width = canvasW + "px";
        node.style.height = canvasH + "px";
        node.style.background = el.style?.background || "#0b1020";
      } else if(el.text){
        node.textContent = el.text;
        node.style.color = el.style?.color || "#ffffff";
        node.style.fontWeight = el.style?.fontWeight || 600;
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
