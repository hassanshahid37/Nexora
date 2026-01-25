/**
 * design-preset-selector.js (CommonJS/UMD)
 * Deterministic authority for selecting a premium design preset per template seed.
 */
(function(root, factory){
  if(typeof module === "object" && module.exports){
    module.exports = factory();
  }else{
    const api = factory();
    root.selectDesignPreset = api.selectDesignPreset;
    root.__NexoraDesignPresetSelector = api;
  }
})(typeof globalThis!=="undefined"?globalThis:(typeof window!=="undefined"?window:this), function(){

  let VisualDNARegistry = null;
  try{
    // eslint-disable-next-line global-require
    const mod = require("./visual-dna-registry.js");
    VisualDNARegistry = mod && mod.VisualDNARegistry ? mod.VisualDNARegistry : null;
  }catch(_){}

  function stableHash32(s){
    s = String(s == null ? "" : s);
    let h = 2166136261;
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function pick(list, idx){
    if(!Array.isArray(list) || !list.length) return null;
    const i = ((idx % list.length) + list.length) % list.length;
    return list[i] || null;
  }

  function filterByArchetype(list, archetype){
    const a = String(archetype || "").toLowerCase().trim();
    if(!a) return list;
    const filtered = (list || []).filter(p => {
      const pa = String(p?.archetype || p?.layoutFamily || p?.layout_family || "").toLowerCase();
      return pa && (pa === a || pa.includes(a) || a.includes(pa));
    });
    return filtered.length ? filtered : list;
  }

  /**
   * selectDesignPreset({ category, archetype, index, seed, prompt, style })
   * - Deterministic (same inputs => same preset)
   * - Supports archetype narrowing when preset packs include archetype tags
   */
  function selectDesignPreset(opts){
    const o = (opts && typeof opts === "object") ? opts : {};
    const category = o.category || "Instagram Post";
    const archetype = o.archetype || "";
    const index = Number.isFinite(o.index) ? o.index : 0;

    if(!VisualDNARegistry) return null;

    let list = VisualDNARegistry.getPresetsForCategory(category);
    list = filterByArchetype(list, archetype);

    const seed = (o.seed != null) ? Number(o.seed) : stableHash32(String(category)+"|"+String(o.style||"")+"|"+String(o.prompt||"")+"|"+String(index));
    const offset = stableHash32(String(archetype)+"|"+String(seed));

    return pick(list, index + offset);
  }

  return { selectDesignPreset };
});
