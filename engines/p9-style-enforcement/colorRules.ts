// Color & contrast enforcement rules.
// Pure styling only.

import { TemplateContractLike, ElementLike } from './styleTypes';
import { stylePresets, pickPresetId } from './stylePresets';

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function parseHex(hex: string): { r: number; g: number; b: number; a: number } | null {
  if (!hex) return null;
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (![3,4,6,8].includes(h.length)) return null;

  const expand = (s: string) => s.split('').map(ch => ch + ch).join('');
  if (h.length === 3) h = expand(h);
  if (h.length === 4) h = expand(h);

  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6,8), 16) / 255 : 1;
  return { r, g, b, a };
}

function toHex({r,g,b}: {r:number;g:number;b:number}) {
  const h = (n:number)=>n.toString(16).padStart(2,'0');
  return '#' + h(clamp(Math.round(r),0,255)) + h(clamp(Math.round(g),0,255)) + h(clamp(Math.round(b),0,255));
}

function srgbToLin(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(rgb: {r:number;g:number;b:number}) {
  const R = srgbToLin(rgb.r);
  const G = srgbToLin(rgb.g);
  const B = srgbToLin(rgb.b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

function contrastRatio(c1: {r:number;g:number;b:number}, c2: {r:number;g:number;b:number}) {
  const L1 = luminance(c1);
  const L2 = luminance(c2);
  const hi = Math.max(L1,L2);
  const lo = Math.min(L1,L2);
  return (hi + 0.05) / (lo + 0.05);
}

function bestTextColor(bgHex: string, preferred?: string) {
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

function isBackgroundRole(role?: string) {
  return ['background','bg'].includes(String(role || ''));
}

function isTextLike(el: ElementLike) {
  const r = String(el.role || '');
  return el.type === 'text' || ['headline','subline','supportingText','bullet','meta','sectionTitle','role','badge','caption','body','subtitle','cta'].includes(r);
}

function pickCanvasBg(contract: TemplateContractLike, presetBg: string): string {
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

export function applyColorRules(contract: TemplateContractLike): TemplateContractLike {
  const presetId = contract.preset || pickPresetId(contract.category);
  const preset = stylePresets[presetId];

  const brand = contract.brand?.colors || {};
  const canvasBg = pickCanvasBg(contract, brand.background || preset.bg);
  const defaultText = brand.text || preset.text;
  const accent = brand.accent || brand.primary || preset.accent;
  const primary = brand.primary || preset.primary;
  const secondary = brand.secondary || preset.secondary;

  const elements = contract.elements.map((el: ElementLike) => {
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

    const role = String(el.role || '');

    // Base text color by role
    const preferred =
      role === 'headline' || role === 'sectionTitle' ? primary :
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
  const next: TemplateContractLike = { ...contract, preset: presetId, backgroundColor: canvasBg, elements };
  return next;
}
