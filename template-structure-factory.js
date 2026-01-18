/**
 * template-structure-factory.js
 * P8 Phase-2 — Structural Variants per Layout Family (Spine-first)
 * - Pure logic (no DOM/editor)
 * - Deterministic (index-driven)
 * - Accepts P7 familyId (from selector). Falls back safely.
 */
(function(){
  const CANON_FAMILIES = ["text-first","image-led","split-hero","minimal","dense"];

  // Map P7 family ids → P8 canonical structural generators
  const FAMILY_ALIAS = {
    "promo-badge": "image-led",
    "minimal-quote": "minimal",
    "feature-grid": "dense",
    "photo-card": "image-led",
    "badge-promo": "image-led",
    "clean": "text-first",
    "generic": "split-hero"
  };

  const VARIANTS = {
    "text-first": [
      ["headline"],
      ["headline","cta"],
      ["headline","subhead","cta"],
      ["headline","body","cta"],
      ["headline","subhead","body","cta"]
    ],
    "image-led": [
      ["image"],
      ["image","headline"],
      ["image","headline","cta"],
      ["image","badge","headline","cta"],
      ["image","headline","subhead","cta"]
    ],
    "split-hero": [
      ["image","headline"],
      ["image","headline","cta"],
      ["image","headline","subhead","cta"],
      ["headline","image","cta"],
      ["image","headline","badge","cta"]
    ],
    "minimal": [
      ["headline"],
      ["headline","cta"],
      ["image"],
      ["image","headline"]
    ],
    "dense": [
      ["headline","subhead","body","cta"],
      ["image","headline","subhead","body","cta"],
      ["headline","body","badge","cta"],
      ["image","headline","body","cta"],
      ["image","headline","badge","subhead","cta"]
    ]
  };

  function str(x){ return String(x == null ? "" : x); }

  function canonFamily(familyId){
    const id = str(familyId).trim();
    if(!id) return null;
    if(CANON_FAMILIES.includes(id)) return id;
    if(FAMILY_ALIAS[id]) return FAMILY_ALIAS[id];
    // Heuristic: keep stable for unseen ids
    if(id.includes("quote")) return "minimal";
    if(id.includes("grid")) return "dense";
    if(id.includes("promo") || id.includes("badge")) return "image-led";
    if(id.includes("hero")) return "split-hero";
    return "text-first";
  }

  function pickVariantRoles(canon, index, countFamilies){
    const list = VARIANTS[canon] || [["headline","cta"]];
    const stride = Math.max(1, Number(countFamilies) || CANON_FAMILIES.length);
    const v = Math.floor(index / stride) % list.length;
    return list[v];
  }

  function buildLayers(canon, index){
    const roles = pickVariantRoles(canon, index, CANON_FAMILIES.length);
    const layers = [{ role:"background" }];
    for(const r of roles){
      layers.push({ role:r });
    }
    return { roles, layers };
  }

  /**
   * createTemplateContract(baseContract, index, opts)
   * opts.familyId: P7 selector family id (string)
   */
  function createTemplateContract(base, index, opts){
    const baseContract = base && typeof base === "object" ? base : {};
    const familyId = opts && opts.familyId;
    const canon = canonFamily(familyId || baseContract.layoutFamily || baseContract.layoutFamilyId) || "text-first";
    const built = buildLayers(canon, index);

    // clone base
    let c;
    try{ c = JSON.parse(JSON.stringify(baseContract)); }catch(_){ c = Object.assign({}, baseContract); }

    const baseId = str(baseContract.templateId || baseContract.id || "tpl");
    c.templateId = `${baseId}_idx_${index}`;

    // Keep BOTH: raw familyId (authority) + canonical structural family (generator)
    c.layoutFamily = familyId || str(baseContract.layoutFamily || baseContract.layoutFamilyId || canon) || canon;
    c.layoutFamilyCanonical = canon;

    c.layoutVariant = built.roles.join("+");
    c.layers = built.layers;

    return c;
  }

  try{
    if(typeof module!=="undefined") module.exports = { createTemplateContract };
    if(typeof window!=="undefined"){
      window.NexoraTemplateFactory = { createTemplateContract };
    }
  }catch(_){}
})();
