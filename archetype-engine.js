(function(){
  // Nexora Archetype Engine
  // Purpose: isolate archetype compilation away from generate.js.
  // Works in Node (CommonJS) and browser (window) without crashing.

  let _cache = null;
  async function loadCompiled(){
    if(_cache) return _cache;
    // 1) If a global is already present (browser builds), use it.
    try{
      if(typeof globalThis !== 'undefined' && globalThis.NexoraArchetypes && typeof globalThis.NexoraArchetypes.buildAllArchetypes==='function'){
        _cache = {
          buildAllArchetypes: globalThis.NexoraArchetypes.buildAllArchetypes,
          selectArchetype: globalThis.NexoraArchetypes.selectArchetype,
        };
        return _cache;
      }
    }catch(_){ }

    // 2) Try require (works if compiled file is CommonJS; harmless if not).
    try{
      if(typeof require === 'function'){
        const mod = require('./archetypes_1-20_compiled.js');
        if(mod && typeof mod.buildAllArchetypes==='function' && typeof mod.selectArchetype==='function'){
          _cache = mod;
          return _cache;
        }
      }
    }catch(_){ }

    // 3) Dynamic import for ESM compiled file.
    try{
      const mod = await import('./archetypes_1-20_compiled.js');
      if(mod && typeof mod.buildAllArchetypes==='function' && typeof mod.selectArchetype==='function'){
        _cache = mod;
        return _cache;
      }
    }catch(_){ }

    return null;
  }

  async function compileArchetype(input){
    const mod = await loadCompiled();
    if(!mod) throw new Error('Archetype module not available');

    const all = mod.buildAllArchetypes();
    const archetypeId = input && input.archetypeId;
    const canvas = input && input.canvas;
    const ctx = input && input.ctx;

    const chosen = mod.selectArchetype(all, archetypeId, ctx && ctx.headline, ctx && ctx.subhead);
    return chosen.compile(canvas, ctx);
  }

  async function listArchetypes(){
    const mod = await loadCompiled();
    if(!mod) return [];
    const all = mod.buildAllArchetypes();
    return all.map(a => a.id);
  }



  // Convert archetype compiled blocks into legacy Nexora 'elements' for preview/editor.
  function _placeholderImage(label){
    try{
      const safe = String(label || 'Nexora').slice(0, 18).replace(/</g,'').replace(/>/g,'');
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'><rect width='1200' height='800' fill='#0b1020'/><text x='64' y='140' font-family='Arial' font-size='72' fill='#ffffff' font-weight='800'>" + safe + "</text><text x='64' y='200' font-family='Arial' font-size='28' fill='rgba(255,255,255,0.65)'>Auto image</text></svg>";
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }catch(_){
      return '';
    }
  }

  function _zoneToRect(z){
    z = z || {};
    return {
      x: Math.round(Number(z.x || 0)),
      y: Math.round(Number(z.y || 0)),
      w: Math.round(Number(z.w || 0)),
      h: Math.round(Number(z.h || 0))
    };
  }

  function _blockToElement(block, ctx){
    try{
      const r = _zoneToRect(block && block.zone);
      const style = (block && block.style) || {};

      if(block.type === 'background'){
        return { type:'bg', x:r.x, y:r.y, w:r.w, h:r.h, fill: style.color || style.fill || '#0b1020' };
      }

      if(block.type === 'image'){
        const src = (ctx && (ctx.imageSrc || ctx.photoSrc || ctx.image)) || _placeholderImage((ctx && (ctx.brand || ctx.headline)) || 'Nexora');
        return { type:'photo', x:r.x, y:r.y, w:r.w, h:r.h, r: style.radius || 0, src };
      }

      if(block.type === 'overlay'){
        let fill = style.color || style.fill;
        if(!fill && style.type === 'gradient' && Array.isArray(style.stops) && style.stops.length){
          fill = style.stops[0].color;
        }
        if(!fill) fill = 'rgba(0,0,0,0.25)';
        return { type:'shape', x:r.x, y:r.y, w:r.w, h:r.h, r: style.radius || 0, fill, opacity: style.opacity };
      }

      if(block.type === 'text'){
        const val = (block && (block.value || block.text)) || '';
        return {
          type:'text',
          x:r.x,
          y:r.y,
          text:String(val),
          size: Number(style.fontSize || 48),
          weight: Number(style.weight || 700),
          color: style.fill || style.color || '#ffffff',
          align: style.align || 'left'
        };
      }

      if(block.type === 'badge'){
        const label = String(style.label || style.text || '');
        return {
          type:'badge',
          x:r.x,
          y:r.y,
          w:r.w,
          h:r.h,
          r: style.radius || 999,
          fill: style.fill || '#ffffff',
          text: label,
          tcolor: style.textColor || '#0b1020',
          tsize: Number(style.fontSize || 24),
          tweight: Number(style.weight || 800)
        };
      }

      if(block.type === 'line'){
        return { type:'shape', x:r.x, y:r.y, w:r.w, h: Math.max(1,r.h), fill: style.color || style.fill || '#ffffff', opacity: style.opacity };
      }

      return null;
    }catch(_){
      return null;
    }
  }

  async function compileArchetypeToElements(input){
    const compiled = await compileArchetype(input);
    const ctx = input && input.ctx;

    const blocks = (compiled && Array.isArray(compiled.blocks)) ? compiled.blocks : [];
    const elements = [];
    for(const b of blocks){
      const el = _blockToElement(b, ctx);
      if(el) elements.push(el);
    }
    return {
      canvas: (compiled && compiled.canvas) || (input && input.canvas) || { w:1280, h:720 },
      archetypeId: (compiled && compiled.archetypeId) || (input && input.archetypeId) || null,
      elements,
      blocks
    };
  }
  const api = { compileArchetype, compileArchetypeToElements, listArchetypes };

  try{ if(typeof module!=='undefined' && module.exports) module.exports = api; }catch(_){ }
  try{ if(typeof window!=='undefined') window.NexoraArchetypeEngine = api; }catch(_){ }
})();
