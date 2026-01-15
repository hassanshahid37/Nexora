
/**
 * layout-family-registry.js — Nexora P7
 * Data-only registry of layout families.
 * ADDITIVE ONLY. No side effects.
 */
(function(root){
  const REGISTRY = {
    "generic": {
      id: "generic",
      description: "Safe default layout family",
      zones: ["background","headline","image","subhead","cta","badge","logo"],
      hierarchy: ["headline","image","subhead","cta","badge","logo"],
      constraints: {}
    },
    "text-first": {
      id: "text-first",
      description: "Headline-driven layouts",
      zones: ["background","headline","subhead","cta","badge"],
      hierarchy: ["headline","subhead","cta","badge"],
      constraints: { imageOptional: true }
    },
    "image-led": {
      id: "image-led",
      description: "Image-dominant layouts",
      zones: ["background","image","headline","badge","cta"],
      hierarchy: ["image","headline","badge","cta"],
      constraints: { imageRequired: true }
    }
  };

  function getLayoutFamily(id){
    return REGISTRY[id] || REGISTRY["generic"];
  }

  if(typeof module !== "undefined" && module.exports){
    module.exports = { REGISTRY, getLayoutFamily };
  } else {
    root.NexoraLayoutRegistry = { REGISTRY, getLayoutFamily };
  }
})(typeof globalThis!=="undefined"?globalThis:window);
