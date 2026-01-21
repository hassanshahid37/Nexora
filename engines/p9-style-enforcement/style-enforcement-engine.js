/**
 * NexoraStyleEnforcementEngine (bundled JS)
 * Generated from TS sources for Nexora browser + Node without a build step.
 * Mutates style only (no geometry/structure changes).
 */
(function(root){
  "use strict";
// P9.3 Style presets: data-only, deterministic, Canva-level polish targets.
// Presets define safe defaults; brand inputs (if present) override where appropriate.



const stylePresets = {
  clean: {
    id: 'clean',
    bg: '#FFFFFF',
    text: '#111111',
    primary: '#111111',
    secondary: '#555555',
    accent: '#2563EB',
    headlineFont: 'Inter',
    bodyFont: 'Inter',
    buttonRadius: 12,
    buttonPaddingX: 18,
    buttonPaddingY: 12,
    allowGradient: false,
    gradient: '',
  },
  bold: {
    id: 'bold',
    bg: '#0B0F19',
    text: '#FFFFFF',
    primary: '#FFFFFF',
    secondary: '#C7C7C7',
    accent: '#F97316',
    headlineFont: 'Poppins',
    bodyFont: 'Inter',
    buttonRadius: 14,
    buttonPaddingX: 20,
    buttonPaddingY: 14,
    allowGradient: true,
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(37,99,235,0.18))',
  },
  professional: {
    id: 'professional',
    bg: '#FFFFFF',
    text: '#0F172A',
    primary: '#0F172A',
    secondary: '#334155',
    accent: '#0EA5E9',
    headlineFont: 'Montserrat',
    bodyFont: 'Inter',
    buttonRadius: 10,
    buttonPaddingX: 18,
    buttonPaddingY: 12,
    allowGradient: true,
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,23,42,0.04))',
  },
  minimal: {
    id: 'minimal',
    bg: '#FFFFFF',
    text: '#111111',
    primary: '#111111',
    secondary: '#6B7280',
    accent: '#111111',
    headlineFont: 'Inter',
    bodyFont: 'Inter',
    buttonRadius: 10,
    buttonPaddingX: 16,
    buttonPaddingY: 10,
    allowGradient: false,
    gradient: '',
  },
  expressive: {
    id: 'expressive',
    bg: '#FFFFFF',
    text: '#111827',
    primary: '#111827',
    secondary: '#374151',
    accent: '#A855F7',
    headlineFont: 'Poppins',
    bodyFont: 'Inter',
    buttonRadius: 16,
    buttonPaddingX: 22,
    buttonPaddingY: 14,
    allowGradient: true,
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(34,197,94,0.10))',
  },
};

// Normalize category labels/ids into registry-style keys.
// Examples: "Instagram Post" -> "InstagramPost", "youtube_thumbnail" -> "YouTubeThumbnail"
function normalizeCategoryKey(raw){
  const s = String(raw || '').trim();
  if(!s) return '';
  const compact = s.replace(/[_\s-]+/g,' ').trim();
  const joined = compact.split(' ').map(w => w ? (w[0].toUpperCase()+w.slice(1)) : '').join('');
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
  return map[joined] || joined;
}

// Category-aware preset selection (data-driven, conservative defaults)
function pickPresetId(category){
  const cat = normalizeCategoryKey(category);

  switch (cat) {
    case 'Resume':
      return 'professional';
    case 'PresentationSlide':
      return 'professional';
    case 'Poster':
      return 'bold';
    case 'YouTubeThumbnail':
      return 'bold';
    case 'InstagramPost':
      return 'expressive';
    default:
      return 'clean';
  }
}

// Shared types for P9.3 Style Enforcement Engine.
// Kept lightweight so it can be wired into Nexora without refactors.





// P9.3 guards: enforce "pure styling" (no structure/geometry/content changes).


function assertStyleGuards(contract) {
  if (!contract || typeof contract !== 'object') throw new Error('StyleEnforcement: contract missing');
  if (!Array.isArray(contract.elements)) throw new Error('StyleEnforcement: contract.elements must be an array');
  for (const el of contract.elements) {
    if (!el || typeof el !== 'object') throw new Error('StyleEnforcement: element must be an object');
  }
}

// We snapshot the contract excluding element.style and a few known transient/computed keys.
// This lets us detect accidental layout/geometry/content changes deterministically.
function snapshotNonStyleState(contract) {
  const strip = (el) => {
    const { style, computedStyle, __priority, __debug, ...rest } = el;
    return rest;
  };

  return {
    category: contract.category,
    preset: contract.preset,
    brand: contract.brand, // read-only intent; we don't mutate it.
    backgroundColor: contract.backgroundColor,
    canvas: contract.canvas,
    elements: contract.elements.map(strip),
  };
}

function assertNoStructureOrGeometryChanges(before, after) {
  // element count
  if (before.elements.length !== after.elements.length) {
    throw new Error('StyleEnforcement: element count changed (structure mutation)');
  }

  // id set (if present)
  const beforeIds = before.elements.map((e) => e.id).filter(Boolean).sort();
  const afterIds = after.elements.map((e) => e.id).filter(Boolean).sort();
  if (beforeIds.length && JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
    throw new Error('StyleEnforcement: element ids changed (structure mutation)');
  }

  // Deep compare stripped elements
  const b = JSON.stringify(before.elements);
  const a = JSON.stringify(after.elements);
  if (b !== a) {
    throw new Error('StyleEnforcement: non-style fields changed (geometry/structure/content mutation)');
  }
}

// Typography rules: font pairing, weight control, rhythm.
// Pure styling only.


function isTextRole(role) {
  return ['headline','subline','supportingtext','bullet','meta','sectiontitle','role','badge','caption','body','subtitle'].includes(String(role||'').toLowerCase());
}

function isHeadlineRole(role) {
  return ['headline','sectiontitle'].includes(String(role||'').toLowerCase());
}

function isMetaRole(role) {
  return ['meta','caption'].includes(String(role||'').toLowerCase());
}

function toNumber(v){
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function applyTypographyRules(contract){
  const presetId = contract.preset || pickPresetId(contract.category);
  const preset = stylePresets[presetId];

  const brandHeadline = contract.brand?.fonts?.headline;
  const brandBody = contract.brand?.fonts?.body;

  const headlineFont = (brandHeadline || preset.headlineFont || 'Inter').trim();
  const bodyFont = (brandBody || preset.bodyFont || 'Inter').trim();

  const elements = contract.elements.map((el) => {
    if (!isTextRole(el.role) && el.type !== 'text') return el;

    const role = String(el.role || '').toLowerCase();
    const style = { ...(el.style || {}) };

    // Font pairing
    style.fontFamily = isHeadlineRole(role) ? headlineFont : bodyFont;

    // Weight control (hierarchy engine already sets dominance; we enforce consistency)
    if (isHeadlineRole(role)) style.fontWeight = Number(style.fontWeight ?? 700);
    else if (role === 'subline' || role === 'subtitle') style.fontWeight = Number(style.fontWeight ?? 600);
    else if (role === 'badge') style.fontWeight = Number(style.fontWeight ?? 700);
    else if (role === 'cta') style.fontWeight = Number(style.fontWeight ?? 700);
    else if (isMetaRole(role)) style.fontWeight = Number(style.fontWeight ?? 400);
    else style.fontWeight = Number(style.fontWeight ?? 500);

    // Rhythm: line height and letter spacing
    const fs = toNumber(style.fontSize) ?? null;
    if (fs != null) {
      // Large text gets tighter line-height; small text gets more breathing room.
      const lh = fs >= 48 ? 1.05 : fs >= 32 ? 1.15 : fs >= 20 ? 1.25 : 1.4;
      style.lineHeight = style.lineHeight ?? lh;
      // Gentle tracking for small caps / badges; otherwise near zero.
      style.letterSpacing = style.letterSpacing ?? (role === 'badge' ? 0.6 : 0);
    } else {
      style.lineHeight = style.lineHeight ?? (isHeadlineRole(role) ? 1.15 : 1.4);
      style.letterSpacing = style.letterSpacing ?? 0;
    }

    // Clamp ridiculous values to avoid renderer issues
    const lhNum = toNumber(style.lineHeight);
    if (lhNum != null) style.lineHeight = clamp(lhNum, 0.9, 2.0);

    const lsNum = toNumber(style.letterSpacing);
    if (lsNum != null) style.letterSpacing = clamp(lsNum, -1.0, 2.0);

    return { ...el, style };
  });

  return { ...contract, preset: presetId, elements };
}

// Color & contrast enforcement rules.
// Pure styling only.


function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function parseHex(hex){
  if (!hex) return null;
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (![3,4,6,8].includes(h.length)) return null;

  const expand = (s) => s.split('').map(ch => ch + ch).join('');
  if (h.length === 3) h = expand(h);
  if (h.length === 4) h = expand(h);

  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6,8), 16) / 255 : 1;
  return { r, g, b, a };
}

function toHex({r,g,b}) {
  const h = (n) =>n.toString(16).padStart(2,'0');
  return '#' + h(clamp(Math.round(r),0,255)) + h(clamp(Math.round(g),0,255)) + h(clamp(Math.round(b),0,255));
}

function srgbToLin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  const R = srgbToLin(rgb.r);
  const G = srgbToLin(rgb.g);
  const B = srgbToLin(rgb.b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

function contrastRatio(c1, c2) {
  const L1 = luminance(c1);
  const L2 = luminance(c2);
  const hi = Math.max(L1,L2);
  const lo = Math.min(L1,L2);
  return (hi + 0.05) / (lo + 0.05);
}

function bestTextColor(bgHex, preferred) {
  const bg = parseHex(bgHex);
  if (!bg) return preferred || '#111111';

  const black = { r: 17, g: 17, b: 17 };
  const white = { r: 255, g: 255, b: 255 };

  const crBlack = contrastRatio(black, bg);
  const crWhite = contrastRatio(white, bg);

  // If preferred already works, keep it.
  if (preferred) {
    const p = parseHex(preferred);
    if (p && contrastRatio(p, bg) >= 4.5) return preferred;
  }

  return crBlack >= crWhite ? '#111111' : '#FFFFFF';
}

function isBackgroundRole(role) {
  return ['background','bg'].includes(String(role || ''));
}

function isTextLike(el) {
  const r = String(el.role || '');
  return el.type === 'text' || ['headline','subline','supportingtext','bullet','meta','sectionTitle','role','badge','caption','body','subtitle','cta'].includes(r);
}

function pickCanvasBg(contract, presetBg){
  return (
    contract.backgroundColor ||
    contract.canvas?.backgroundColor ||
    // If there is an explicit background element, prefer its bg color
    (() => {
      const bgEl = contract.elements.find(e => isBackgroundRole(e.role));
      const bgc = bgEl?.style?.backgroundColor || bgEl?.style?.fill;
      return bgc || '';
    })() ||
    presetBg
  );
}

function applyColorRules(contract){
  const presetId = contract.preset || pickPresetId(contract.category);
  const preset = stylePresets[presetId];

  const brand = contract.brand?.colors || {};
  const canvasBg = pickCanvasBg(contract, brand.background || preset.bg);
  const defaultText = brand.text || preset.text;
  const accent = brand.accent || brand.primary || preset.accent;
  const primary = brand.primary || preset.primary;
  const secondary = brand.secondary || preset.secondary;

  const elements = contract.elements.map((el) => {
    const style = { ...(el.style || {}) };

    // Background element styling
    if (isBackgroundRole(el.role)) {
      style.backgroundColor = style.backgroundColor || canvasBg;
      // Optional gradient if allowed and background has no explicit brand background
      if (!brand.background && preset.allowGradient && !style.gradient) {
        style.gradient = preset.gradient;
      }
      return { ...el, style };
    }

    if (!isTextLike(el)) return { ...el, style };

    const role = String(el.role || '').toLowerCase();

    // Base text color by role
    const preferred =
      role === 'headline' || role === 'sectiontitle' ? primary :
      role === 'cta' ? (style.color || '#FFFFFF') :
      role === 'badge' ? '#FFFFFF' :
      role === 'meta' || role === 'caption' ? secondary :
      defaultText;

    // Ensure readable against canvas background (or element background if present)
    const localBg = style.backgroundColor || style.fill || canvasBg;
    style.color = bestTextColor(localBg, style.color || preferred);

    // CTA/badge accent enforcement (button fill gets accent, text forced readable)
    if (role === 'cta') {
      style.backgroundColor = style.backgroundColor || accent;
      style.color = bestTextColor(style.backgroundColor, style.color || '#FFFFFF');
    }
    if (role === 'badge') {
      style.backgroundColor = style.backgroundColor || accent;
      style.color = bestTextColor(style.backgroundColor, style.color || '#FFFFFF');
    }

    return { ...el, style };
  });

  // Apply contract-level background if present
  const next = { ...contract, preset: presetId, backgroundColor: canvasBg, elements };
  return next;
}

// Component styling rules (buttons/badges/cards) with strict "no structure" discipline.


function isCta(role) { return String(role || '').toLowerCase() === 'cta'; }
function isBadge(role) { return String(role || '').toLowerCase() === 'badge'; }

function applyComponentStyles(contract){
  const presetId = contract.preset || pickPresetId(contract.category);
  const preset = stylePresets[presetId];

  const elements = contract.elements.map((el) => {
    const role = String(el.role || '').toLowerCase();
    const style = { ...(el.style || {}) };

    if (isCta(role)) {
      // Standard CTA affordance
      style.borderRadius = style.borderRadius ?? preset.buttonRadius;
      style.paddingX = style.paddingX ?? preset.buttonPaddingX;
      style.paddingY = style.paddingY ?? preset.buttonPaddingY;

      // If renderer expects a single padding string, provide it too (non-breaking)
      style.padding = style.padding ?? `${style.paddingY}px ${style.paddingX}px`;

      // Depth: subtle elevation (consistent light source)
      style.shadow = style.shadow ?? '0 8px 18px rgba(0,0,0,0.18)';

      // Rounded button look
      style.strokeWidth = style.strokeWidth ?? 0;

      return { ...el, style };
    }

    if (isBadge(role)) {
      style.borderRadius = style.borderRadius ?? 999; // pill
      style.paddingX = style.paddingX ?? 12;
      style.paddingY = style.paddingY ?? 8;
      style.padding = style.padding ?? `${style.paddingY}px ${style.paddingX}px`;
      style.shadow = style.shadow ?? '0 6px 14px rgba(0,0,0,0.15)';
      return { ...el, style };
    }

    return { ...el, style };
  });

  return { ...contract, preset: presetId, elements };
}

// P9.3 - Style Enforcement Engine (Nexora)
// Applies Canva-level visual polish while preserving structure & geometry.
// Pure styling: modifies ONLY element.style and contract-level style fields (if present).


function applyStyleEnforcement(contract){
  assertStyleGuards(contract);

  // Snapshot before to guarantee we don't touch structure/geometry/content.
  const before = snapshotNonStyleState(contract);

  // Work on a shallow copy; each rule returns new element objects (no mutation).
  let next = {
    ...contract,
    elements: contract.elements.map(e => ({ ...e, style: { ...(e.style || {}) } })),
  };

  // Order matters: typography sets readable rhythm; color enforces contrast; components standardize UI primitives.
  next = applyTypographyRules(next);
  next = applyColorRules(next);
  next = applyComponentStyles(next);

  // Hard guard: ensure ONLY style fields changed.
  const after = snapshotNonStyleState(next);
  assertNoStructureOrGeometryChanges(before, after);

  return next;
}

  const api = root.NexoraStyleEnforcementEngine || {};
api.applyStyleEnforcement = applyStyleEnforcement;
  try{ if(typeof module==="object" && module.exports) module.exports = api; }catch(_){
  }
  root.NexoraStyleEnforcementEngine = api;
})(typeof globalThis!=="undefined"?globalThis:(typeof window!=="undefined"?window:this));
