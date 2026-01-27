
/**
 * preview-renderer.js (FIXED v4 - FINAL)
 * Dumb renderer, correct for Nexora cards.
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;

function geomToPx(el, canvasW, canvasH){
  const x = Number(el.x||0), y = Number(el.y||0), w = Number(el.w||0), h = Number(el.h||0);
  const looksNorm = Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(w)&&Number.isFinite(h) &&
    Math.abs(x)<=2 && Math.abs(y)<=2 && Math.abs(w)<=2 && Math.abs(h)<=2;
  return looksNorm ? { x:x*canvasW, y:y*canvasH, w:w*canvasW, h:h*canvasH } : { x, y, w, h };
}

  function renderTo(target, previewContract){
    if(!target || !previewContract || !previewContract.canvas || !Array.isArray(previewContract.elements)){
      return;
    }

    if(!target.style.position || target.style.position === "static"){
      target.style.position = "relative";
    }

    target.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.inset = "0";
    wrapper.style.overflow = "hidden";
    wrapper.style.background = "#0b1020";
    target.appendChild(wrapper);

    requestAnimationFrame(() => {
      const rect = wrapper.getBoundingClientRect();
      const TILE_W = rect.width || target.offsetWidth || 240;
      let TILE_H = rect.height || target.offsetHeight || 240;

/* === FORCE_SQUARE_GUARD ===
   If CSS hasn't applied yet and height is tiny,
   force square so previews never collapse.
*/
if(TILE_H < 120){
  TILE_H = TILE_W;
}


      const canvasW = Number(previewContract.canvas.w) || 1080;
      const canvasH = Number(previewContract.canvas.h) || 1080;

      const scale = Math.min(TILE_W / canvasW, TILE_H / canvasH);
      const scaledW = canvasW * scale;
      const scaledH = canvasH * scale;

      const canvas = document.createElement("div");
      canvas.style.position = "absolute";
      canvas.style.width = canvasW + "px";
      canvas.style.height = canvasH + "px";
      canvas.style.transformOrigin = "top left";
      canvas.style.transform = "scale(" + scale + ")";
      canvas.style.left = ((TILE_W - scaledW) / 2) + "px";
      canvas.style.top  = ((TILE_H - scaledH) / 2) + "px";

      for(const el of previewContract.elements){
        if(!el) continue;

        const node = document.createElement("div");
        node.style.position = "absolute";
        const g = geomToPx(el, canvasW, canvasH);
        node.style.left = (g.x || 0) + "px";
        node.style.top  = (g.y || 0) + "px";
        node.style.width  = (g.w || 0) + "px";
        node.style.height = (g.h || 0) + "px";

        if(el.role === "background"){
          node.style.left = "0px";
          node.style.top  = "0px";
          node.style.width  = canvasW + "px";
          node.style.height = canvasH + "px";
          node.style.background = (el.style && el.style.background) ? el.style.background : "#0b1020";
        } else if(el.src){
          const img = document.createElement("img");
          img.src = el.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          node.appendChild(img);
        } else if(typeof el.text === "string" && el.text.length){
          node.textContent = el.text;
          node.style.color = (el.style && el.style.color) ? el.style.color : "#ffffff";
          node.style.fontWeight = (el.style && el.style.fontWeight) ? el.style.fontWeight : 600;
          node.style.fontSize = (el.style && el.style.fontSize) ? el.style.fontSize : "32px";
          node.style.display = "flex";
          node.style.alignItems = "center";
        }

        canvas.appendChild(node);
      }

      wrapper.appendChild(canvas);
    });
  }

  root.NexoraPreview = { renderTo };
})();
