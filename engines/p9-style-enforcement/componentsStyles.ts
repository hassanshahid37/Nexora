// Component styling rules (buttons/badges/cards) with strict "no structure" discipline.

import { TemplateContractLike, ElementLike } from './styleTypes';
import { stylePresets, pickPresetId } from './stylePresets';

function isCta(role?: string) { return String(role || '') === 'cta'; }
function isBadge(role?: string) { return String(role || '') === 'badge'; }

export function applyComponentStyles(contract: TemplateContractLike): TemplateContractLike {
  const presetId = contract.preset || pickPresetId(contract.category);
  const preset = stylePresets[presetId];

  const elements = contract.elements.map((el: ElementLike) => {
    const role = String(el.role || '');
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
