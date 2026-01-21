// Typography rules: font pairing, weight control, rhythm.
// Pure styling only.

import { TemplateContractLike, ElementLike } from './styleTypes';
import { stylePresets, pickPresetId } from './stylePresets';

function isTextRole(role?: string) {
  return [
    'headline','subline','supportingText','bullet','meta','sectionTitle','role','badge','caption','body','subtitle'
  ].includes(String(role || ''));
}

function isHeadlineRole(role?: string) {
  return ['headline','sectionTitle'].includes(String(role || ''));
}

function isMetaRole(role?: string) {
  return ['meta','caption'].includes(String(role || ''));
}

function toNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function applyTypographyRules(contract: TemplateContractLike): TemplateContractLike {
  const presetId = contract.preset || pickPresetId(contract.category);
  const preset = stylePresets[presetId];

  const brandHeadline = contract.brand?.fonts?.headline;
  const brandBody = contract.brand?.fonts?.body;

  const headlineFont = (brandHeadline || preset.headlineFont || 'Inter').trim();
  const bodyFont = (brandBody || preset.bodyFont || 'Inter').trim();

  const elements = contract.elements.map((el: ElementLike) => {
    if (!isTextRole(el.role) && el.type !== 'text') return el;

    const role = String(el.role || '');
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
