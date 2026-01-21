// Applies dominance via NON-geometric channels only.
// This file MUST NOT change any geometry, position, or element structure.

import { Profile, VisualHierarchyOptions } from './hierarchyTypes';
import { assertStyleSafe } from './hierarchyGuards';

type Ctx = { profile: HierarchyProfile; options: VisualHierarchyOptions };

export function applyHierarchyRules(elements: any[], ctx: Ctx): any[] {
  const { options } = ctx;

  return elements.map(el => {
    const p = Number(el.__vhPriority ?? 0);

    // Allow emphasis only through safe style fields
    const style = { ...(el.style || {}) };

    // Never change fontFamily in P9.2 (reserved for P9.3)
    // If fontFamily exists, we preserve it.
    const fontFamily = style.fontFamily;

    // Weight: headline/primary gets heavier, low priority gets lighter.
    style.fontWeight = p >= 85 ? (options.maxHeadlineWeight ?? 800) :
                      p >= 65 ? (options.midWeight ?? 650) :
                      p >= 45 ? (options.bodyWeight ?? 500) :
                                (options.lowWeight ?? 400);

    // Slight line-height tuning for readability (non-geometric)
    // Keep within safe band.
    if (typeof style.lineHeight !== 'number') {
      style.lineHeight = p >= 80 ? (options.tightLineHeight ?? 1.15) :
                       p >= 50 ? (options.normalLineHeight ?? 1.25) :
                                 (options.looseLineHeight ?? 1.35);
    }

    // De-emphasize low priority items slightly
    style.opacity = p < 35 ? (options.lowOpacity ?? 0.78) :
                    p < 50 ? (options.midOpacity ?? 0.9) : 1;

    // Optional: contrast flag for downstream renderer (still style)
    if (options.emitContrastHint) {
      style.__contrastHint = p >= 70 ? 'high' : p >= 45 ? 'medium' : 'low';
    }

    if (fontFamily !== undefined) style.fontFamily = fontFamily;

    assertStyleSafe(style);

    return { ...el, style };
  });
}
