
/**
 * template-structure-factory.js
 * P8-ready structural template generator
 * Pure logic. No DOM. No editor. No side effects.
 */

(function(){
  const FAMILIES = ["text-first","image-led","split-hero","minimal","dense"];

  function pickFamily(index){
    return FAMILIES[index % FAMILIES.length];
  }

  function buildLayers(category, family, variant){
    // Minimal but real structural differences
    const layers = [];
    if(family !== "minimal"){
      layers.push({ role:"background" });
    }
    if(family === "image-led" || family === "split-hero"){
      layers.push({ role:"image" });
    }
    layers.push({ role:"headline" });
    if(family !== "minimal"){
      layers.push({ role:"subhead" });
    }
    if(family === "dense"){
      layers.push({ role:"body" });
      layers.push({ role:"badge" });
    }
    layers.push({ role:"cta" });
    return layers;
  }

  function createTemplateContract(base, index){
    const family = pickFamily(index);
    const variant = Math.floor(index / FAMILIES.length) + 1;

    const c = JSON.parse(JSON.stringify(base));
    c.templateId = base.templateId + "_idx_" + index;
    c.layoutFamily = family;
    c.layoutVariant = variant;
    c.layers = buildLayers(c.category, family, variant);
    return c;
  }

  try{
    if(typeof module!=="undefined") module.exports = { createTemplateContract };
    if(typeof window!=="undefined"){
      window.NexoraTemplateFactory = { createTemplateContract };
    }
  }catch(_){}
})();
