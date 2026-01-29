/**
 * engines/preset-structure-builder.js
 *
 * PURPOSE
 *  - Deterministically build an authoritative structure payload from a preset input.
 *  - MUST be executable in Node (CommonJS) and usable in browser globals.
 *
 * HARD RULES
 *  - Export ONE callable function via `module.exports = function ...`
 *  - The exported function ALSO exposes `.buildFromPreset` so callers that expect an object
 *    (eg: require(...).buildFromPreset) still work.
 *  - Always return non-empty zones (throws if zones are missing).
 */

(function (root) {
  "use strict";

  function safeRequire(p){
    try { return require(p); } catch(_) { return null; }
  }

  // Factory is the single source of truth for structure (P7/P8).
  var factoryMod = safeRequire("../template-structure-factory.js") || safeRequire("../template-structure-factory");
  var createTemplateContract =
    (factoryMod && typeof factoryMod.createTemplateContract === "function") ? factoryMod.createTemplateContract : null;

  function num(x, d){ var n = Number(x); return Number.isFinite(n) ? n : d; }

  function normalizeCanvas(cv){
    var w = num(cv && (cv.w != null ? cv.w : cv.width), NaN);
    var h = num(cv && (cv.h != null ? cv.h : cv.height), NaN);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0){
      return { w: 1080, h: 1080, width: 1080, height: 1080 };
    }
    var W = Math.round(w), H = Math.round(h);
    return { w: W, h: H, width: W, height: H };
  }

  function assertZones(contract){
    if(!contract || !contract.meta || !Array.isArray(contract.meta.zones) || contract.meta.zones.length === 0){
      throw new Error("Structure build failed: zones are empty");
    }
  }

  /**
   * buildFromPreset(preset, ctx)
   * Returns a structure payload with guaranteed non-empty zones.
   */
  function buildFromPreset(preset, ctx){
    if(!createTemplateContract){
      throw new Error("Structure build failed: template-structure-factory.createTemplateContract missing");
    }

    preset = (preset && typeof preset === "object") ? preset : {};
    ctx = (ctx && typeof ctx === "object") ? ctx : {};

    var index = Number.isFinite(ctx.index) ? ctx.index : (Number.isFinite(preset.index) ? preset.index : 0);
    var familyId = ctx.layoutFamily || ctx.familyId || preset.layoutFamily || preset.familyId || null;

    var canvas = normalizeCanvas(ctx.canvas || preset.canvas);

    // Base contract seed: factory will add layers/variant/zones and hard-assert zones exist.
    var baseContract = {
      templateId: String(preset.id || preset.templateId || ("tpl_" + index)),
      category: String(ctx.category || preset.category || "Instagram Post"),
      canvas: canvas,
      layers: Array.isArray(preset.layers) ? preset.layers : (Array.isArray(ctx.layers) ? ctx.layers : null),
      layoutFamily: familyId || null
    };

    var contract = createTemplateContract(baseContract, Number(index)||0, { familyId: familyId || baseContract.layoutFamily });

    // Hard guard: never allow silent empty structure.
    assertZones(contract);

    return {
      canvas: contract.canvas || canvas,
      zones: contract.meta.zones,
      contract: contract,
      presetId: preset.id || null,
      presetPattern: preset.pattern || null,
      category: baseContract.category,
      meta: { source: "preset-structure-builder", layoutFamily: contract.layoutFamily || null, layoutVariant: contract.layoutVariant || null }
    };
  }

  /**
   * Primary exported callable:
   *   presetStructureBuilder({ preset, ctx })  OR  presetStructureBuilder(presetLike)
   */
  function presetStructureBuilder(input){
    if(input && typeof input === "object" && (input.preset || input.ctx || input.context)){
      return buildFromPreset(input.preset || {}, input.ctx || input.context || input);
    }
    // Allow direct preset objects too.
    return buildFromPreset(input || {}, {});
  }

  // Back-compat: allow require(...).buildFromPreset and browser global object access.
  presetStructureBuilder.buildFromPreset = buildFromPreset;

  try{
    if(root && !root.NexoraPresetStructureBuilder){
      root.NexoraPresetStructureBuilder = { buildFromPreset: buildFromPreset };
    }else if(root && root.NexoraPresetStructureBuilder && typeof root.NexoraPresetStructureBuilder.buildFromPreset !== "function"){
      root.NexoraPresetStructureBuilder.buildFromPreset = buildFromPreset;
    }
  }catch(_){}

  try{
    if(typeof module !== "undefined" && module.exports){
      module.exports = presetStructureBuilder;
    }
  }catch(_){}

})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
