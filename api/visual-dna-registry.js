/**
 * visual-dna-registry.js (CommonJS/UMD)
 * Loads compiled design preset packs and provides lookup by category.
 *
 * NOTE: This file is intentionally build-step free and Node-friendly for Vercel serverless.
 */
(function(root, factory){
  if(typeof module === "object" && module.exports){
    module.exports = factory();
  }else{
    const api = factory();
    root.VisualDNARegistry = api.VisualDNARegistry;
    root.__NexoraVisualDNARegistry = api;
  }
})(typeof globalThis!=="undefined"?globalThis:(typeof window!=="undefined"?window:this), function(){

  function safeRequire(path){
    try{
      // eslint-disable-next-line global-require
      return require(path);
    }catch(_){
      return null;
    }
  }

  function toArray(v){
    return Array.isArray(v) ? v : (v && Array.isArray(v.presets) ? v.presets : []);
  }

  // These JSON files should live alongside this file in: /api/presets/
  const PACKS = {
    instagram: safeRequire("./instagram-presets.compiled.full.json"),
    story: safeRequire("./story.presets.compiled.full.json"),
    youtube: safeRequire("./youtube-thumbnails.presets.compiled.full.json"),
    flyer: safeRequire("./flyer-presets.compiled.full.json"),
    businessCard: safeRequire("./business-card-presets.compiled.full.json"),
    logo: safeRequire("./logo-presets.compiled.full.json"),
    poster: safeRequire("./poster-presets.compiled.full.json"),
    presentation: safeRequire("./presentation-presets.compiled.full.json"),
    resume: safeRequire("./resume-presets.compiled.full.json"),
  };

  const LISTS = {
    "Instagram Post": toArray(PACKS.instagram),
    "Story": toArray(PACKS.story),
    "YouTube Thumbnail": toArray(PACKS.youtube),
    "Flyer": toArray(PACKS.flyer),
    "Business Card": toArray(PACKS.businessCard),
    "Logo": toArray(PACKS.logo),
    "Poster": toArray(PACKS.poster),
    "Presentation Slide": toArray(PACKS.presentation),
    "Resume": toArray(PACKS.resume),
  };

  function normalizeCategoryLabel(category){
    const c = String(category || "").toLowerCase().trim();
    if(!c) return "Instagram Post";
    if(c.includes("instagram")) return "Instagram Post";
    if(c === "story" || c.includes("insta story") || c.includes("facebook story") || c.includes("tiktok")) return "Story";
    if(c.includes("youtube") || c.includes("thumbnail")) return "YouTube Thumbnail";
    if(c.includes("flyer")) return "Flyer";
    if(c.includes("business") && c.includes("card")) return "Business Card";
    if(c.includes("logo")) return "Logo";
    if(c.includes("poster")) return "Poster";
    if(c.includes("presentation") || c.includes("slide")) return "Presentation Slide";
    if(c.includes("resume") || c.includes("cv")) return "Resume";
    return "Instagram Post";
  }

  const VisualDNARegistry = {
    normalizeCategoryLabel,
    getPresetsForCategory(category){
      const label = normalizeCategoryLabel(category);
      const list = LISTS[label] || [];
      return Array.isArray(list) ? list : [];
    },
    hasAny(){
      try{
        for(const k in LISTS){
          if((LISTS[k]||[]).length) return true;
        }
      }catch(_){}
      return false;
    },
    _packs: PACKS,
    _lists: LISTS,
  };

  return { VisualDNARegistry };
});
