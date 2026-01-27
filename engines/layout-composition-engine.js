
(function(root){
  "use strict";
  const str = (x) => String(x ?? "").trim();
  const clone = (x) => JSON.parse(JSON.stringify(x));

  const TEXT_ROLES = ["headline","subhead","supportingtext","text","body"];
  function isText(el){ return el && el.type === "text" && TEXT_ROLES.includes(el.role); }

  function selectPrimaryHeadline(elements){
    const headlines = elements.filter(e => e.role === "headline" && str(e.text));
    if (headlines.length <= 1) return headlines[0] || null;
    headlines.sort((a,b) => str(b.text).length - str(a.text).length);
    return headlines[0];
  }

  function mergeTextBlocks(elements){
    const out = []; let buffer = null;
    for (const el of elements){
      if (isText(el)){
        if (!buffer){ buffer = clone(el); }
        else if (buffer.role === el.role){ buffer.text = `${buffer.text} ${el.text}`.trim(); }
        else { out.push(buffer); buffer = clone(el); }
      } else {
        if (buffer){ out.push(buffer); buffer = null; }
        out.push(el);
      }
    }
    if (buffer) out.push(buffer);
    return out;
  }

  function clampHeadline(headline, category){
    if (!headline || !headline.text) return;
    const words = headline.text.split(/\s+/);
    let maxWords = 8;
    if (String(category).toLowerCase().includes("youtube")) maxWords = 4;
    if (words.length > maxWords){
      headline.text = words.slice(0, maxWords).join(" ");
    }
  }

  function preventOrphans(text){
    const words = text.split(/\s+/);
    if (words.length < 4) return text;
    const last = words[words.length - 1];
    if (last.length <= 2){
      words[words.length - 2] += ` ${last}`;
      words.pop();
    }
    return words.join(" ");
  }

  function normalizeCTA(elements){
    const ctas = elements.filter(e => e.role === "cta");
    if (ctas.length <= 1) return elements;
    const keep = ctas[0];
    return elements.filter(e => e === keep || e.role !== "cta");
  }

  function enforceHierarchy(elements, primaryHeadline){
    const ordered = [];
    if (primaryHeadline) ordered.push(primaryHeadline);
    for (const el of elements){
      if (el === primaryHeadline) continue;
      if (el.role === "subhead" || el.role === "supportingtext") ordered.push(el);
    }
    for (const el of elements){ if (el.role === "cta") ordered.push(el); }
    for (const el of elements){ if (!ordered.includes(el)) ordered.push(el); }
    return ordered;
  }

  function applyLayoutComposition(template, options = {}){
    if (!template || !Array.isArray(template.elements)) return template;
    const t = clone(template);
    const category = options.category || t.category;
    t.elements = mergeTextBlocks(t.elements);
    const primaryHeadline = selectPrimaryHeadline(t.elements);
    for (const el of t.elements){
      if (el.role === "headline" && el !== primaryHeadline){ el.role = "supportingtext"; }
    }
    clampHeadline(primaryHeadline, category);
    if (primaryHeadline){ primaryHeadline.text = preventOrphans(primaryHeadline.text); }
    t.elements = normalizeCTA(t.elements);
    t.elements = enforceHierarchy(t.elements, primaryHeadline);
    t.meta = Object.assign({}, t.meta, {
      composition: { composed: true, primaryHeadline: primaryHeadline?.id || null }
    });
    return t;
  }

  const api = { applyLayoutComposition };
  try{ if (typeof module !== "undefined") module.exports = api; }catch(_){}
  try{ root.LayoutCompositionEngine = api; }catch(_){}
  try{ root.NexoraLayoutCompositionEngine = root.NexoraLayoutCompositionEngine || api; }catch(_){ }
})(typeof globalThis !== "undefined" ? globalThis : window);
