/**
 * NexoraVisualHierarchyEngine (bundled JS)
 * Generated from TS sources for Nexora browser + Node without a build step.
 * Mutates style only (no geometry/structure changes).
 */
(function(root){
  "use strict";
  // Some builds do not ship the TS hierarchy rules modules. Keep P9.2 non-fatal.
  const applyHierarchyRules = (typeof root.applyHierarchyRules === "function")
    ? root.applyHierarchyRules
    : (arr) => Array.isArray(arr) ? arr : [];

// Category-based hierarchy profiles (data-only).
// These define intended reading order of roles.

const hierarchyProfiles = {
  InstagramPost: ['headline', 'image', 'cta', 'supportingtext', 'meta'],
  YouTubeThumbnail: ['image', 'headline', 'badge', 'cta', 'meta'],
  Poster: ['headline', 'subline', 'image', 'cta', 'supportingtext', 'meta'],
  PresentationSlide: ['headline', 'bullet', 'visual', 'meta'],
  Resume: ['sectionTitle', 'role', 'supportingtext', 'meta'],
  default: ['headline', 'image', 'cta', 'supportingtext', 'meta'],
  Story: ['headline', 'image', 'subhead', 'cta', 'badge'],
  Flyer: ['headline', 'image', 'subhead', 'cta', 'badge'],
  BusinessCard: ['logo', 'headline', 'subhead'],
  Logo: ['logo'],

};
// Normalize category labels/ids into registry-style keys.
// Examples: "Instagram Post" -> "InstagramPost", "youtube_thumbnail" -> "YouTubeThumbnail"
function normalizeCategoryKey(raw){
  const s = String(raw || 'default').trim();
  if(!s) return 'default';
  const compact = s.replace(/[_\s-]+/g,' ').trim();
  // TitleCase words and join (keeps existing camelcase reasonably)
  const joined = compact.split(' ').map(w => w ? (w[0].toUpperCase()+w.slice(1)) : '').join('');
  // Known aliases
  const map = {
    Instagram: 'InstagramPost',
    Instagrampost: 'InstagramPost',
    InstagramPost: 'InstagramPost',
    YouTube: 'YouTubeThumbnail',
    Youtubethumbnail: 'YouTubeThumbnail',
    YouTubeThumbnail: 'YouTubeThumbnail',
    Presentation: 'PresentationSlide',
    Presentationslide: 'PresentationSlide',
    PresentationSlide: 'PresentationSlide',
    Businesscard: 'BusinessCard',
    BusinessCard: 'BusinessCard',
  };
  return map[joined] || joined || 'default';
}


// Applies dominance via NON-geometric channels only.
// This file MUST NOT change any geometry, position, or element structure.



// Safety guards: NO layout / geometry / structure changes.
// The engine is allowed to mutate only element.style with safe visual keys.

function deepClone(obj){
  return JSON.parse(JSON.stringify(obj));
}

function stripStyleDeep(obj){
  if (Array.isArray(obj)) return obj.map(stripStyleDeep);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      if (k === 'style') continue;
      out[k] = stripStyleDeep(obj[k]);
    }
    return out;
  }
  return obj;
}

function snapshotNonStyleState(contract){
  const cloned = deepClone(contract);
  return stripStyleDeep(cloned);
}

function stableStringify(x){
  return JSON.stringify(x, Object.keys(x).sort());
}

function assertNoStructureOrGeometryChanges(pre, post) {
  // Comparing non-style snapshots ensures:
  // - no element add/remove
  // - no id/role/type changes
  // - no box/frame geometry changes
  // - no ordering changes (since elements array is included)
  const a = JSON.stringify(pre);
  const b = JSON.stringify(post);
  if (a !== b) {
    throw new Error('P9.2 VisualHierarchyEngine violated NO-STRUCTURE/NO-GEOMETRY rule');
  }
}

const DISALLOWED_STYLE_KEYS = [
  'x','y','left','right','top','bottom',
  'width','height','w','h',
  'transform','translate','rotate','scale',
  'position','margin','marginTop','marginLeft','marginRight','marginBottom',
  'paddingLeft','paddingRight','paddingTop','paddingBottom',
];

function assertStyleSafe(style) {
  if (!style) return;
  if (typeof style !== 'object') throw new Error('style must be object');
  for (const key of Object.keys(style)) {
    const k = String(key);
    if (DISALLOWED_STYLE_KEYS.includes(k)) {
      throw new Error(`Disallowed style key in P9.2: ${k}`);
    }
  }
}

// P9.2 Visual Hierarchy Engine
// Controls attention & dominance WITHOUT changing layout/geometry/structure.
// Allowed mutations: element.style (non-geometric), and only safe visual-emphasis fields.


function applyVisualHierarchy(contract, options= {}){
  if (!contract) throw new Error('applyVisualHierarchy: contract required');

  const pre = snapshotNonStyleState(contract);

  const categoryKey = normalizeCategoryKey(contract.category || contract.categoryId || contract.kind || 'default');
  const profile = (hierarchyProfiles)[categoryKey] || (hierarchyProfiles).default;

  const roleRank = {};
  profile.forEach((role, idx) => { roleRank[String(role||'').toLowerCase()] = idx; });

  const elements = Array.isArray(contract.elements) ? contract.elements : [];
  const scored = elements.map((el) => {
    const role = String(el?.role || el?.type || 'unknown').toLowerCase();
    const idx = roleRank[role];
    const priority =
      Number.isFinite(idx) ? Math.max(0, 100 - idx * 12) : 25;

    return { ...el, __vhPriority: priority };
  });

  // Enforce safe style keys before applying changes
  scored.forEach((el) => assertStyleSafe(el?.style));

  const updated = applyHierarchyRules(scored, { profile, options });

  // Strip internal fields
  const cleaned = updated.map((el) => {
    const { __vhPriority, ...rest } = el;
    return rest;
  });

  const next = { ...contract, elements: cleaned };

  const post = snapshotNonStyleState(next);
  assertNoStructureOrGeometryChanges(pre, post);

  return next;
}

  const api = root.NexoraVisualHierarchyEngine || {};
api.applyVisualHierarchy = applyVisualHierarchy;
  try{ if(typeof module==="object" && module.exports) module.exports = api; }catch(_){
  }
  root.NexoraVisualHierarchyEngine = api;
})(typeof globalThis!=="undefined"?globalThis:(typeof window!=="undefined"?window:this));



const EXTRA_HIERARCHY_PROFILES = {
  Story: ["headline","image","subhead","cta","badge"],
  Flyer: ["headline","image","subhead","cta","badge"],
  "Business Card": ["logo","headline","subhead"],
  Logo: ["logo"]
};

function getCategoryHierarchy(category){
  if(EXTRA_HIERARCHY_PROFILES[category]) return EXTRA_HIERARCHY_PROFILES[category];
  return null;
}
