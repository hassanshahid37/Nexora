
/**
 * preview-renderer.js (FIXED v4 - FINAL)
 * Dumb renderer, correct for Nexora cards.
 */
(function(){
  const root = typeof window !== "undefined" ? window : globalThis;

function normFontSize(fs, canvasW, canvasH){
  if(fs == null) return null;
  let n = (typeof fs === "number") ? fs : Number(String(fs).replace("px","").trim());
  if(!Number.isFinite(n)) return null;
  const minDim = Math.min(Number(canvasW)||0, Number(canvasH)||0) || 1080;
  // If value looks normalized (0-2.5), treat it as a fraction of min dimension.
  if(n > 0 && n <= 2.5) return n * minDim;
  // If tiny pixel value, bump minimally
  if(n > 0 && n < 10) return 10;
  return n;
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
      // SQUARE_TILE_GUARD_V7: if CSS constrains height (e.g., 120px banner), force square using width.
      if (TILE_H < Math.min(220, TILE_W * 0.60)) {
        TILE_H = TILE_W;
      }

      const canvasW = Number(previewContract.canvas.w) || 1080;
      const canvasH = Number(previewContract.canvas.h) || 1080;
let scale = Math.min(TILE_W / canvasW, TILE_H / canvasH);
if (!Number.isFinite(scale) || scale <= 0) scale = 1; // SAFE_SCALE_FALLBACK

// FONT_BOOST_FROM_SCALE:
// Keep previews readable even when the canvas must be downscaled to fit the tile.
// We boost text size inversely with scale (clamped) so it never becomes hairline.
const __fontBoost = (scale < 1) ? Math.min(3, 1 / Math.max(scale, 0.20)) : 1;
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
        node.style.left = (Number(el.x) || 0) + "px";
        node.style.top  = (Number(el.y) || 0) + "px";
        node.style.width  = (Number(el.w) || 0) + "px";
        node.style.height = (Number(el.h) || 0) + "px";

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
          const fs0 = (el.style && el.style.fontSize) ? el.style.fontSize : (el.fontSize ?? el.size ?? 32);
const basePx = normFontSize(fs0, canvasW, canvasH) ?? 32;
const fsPx = Math.max(12, Math.min(140, basePx * (__fontBoost || 1)));
node.style.fontSize = fsPx + "px"; // FONT_BOOST_APPLIED
          node.style.display = "flex";
          node.style.alignItems = "center";
        }

        canvas.appendChild(node);
      }

      wrapper.appendChild(canvas);
    });
  }

  root.NexoraPreview = { renderTo }; // PREVIEW_READABILITY_FIX_V1
})();
