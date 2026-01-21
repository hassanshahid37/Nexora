// P9.3 - Style Enforcement Engine (Nexora)
// Applies Canva-level visual polish while preserving structure & geometry.
// Pure styling: modifies ONLY element.style and contract-level style fields (if present).

import { applyTypographyRules } from './typographyRules';
import { applyColorRules } from './colorRules';
import { applyComponentStyles } from './componentStyles';
import { assertStyleGuards, snapshotNonStyleState, assertNoStructureOrGeometryChanges } from './styleGuards';
import { TemplateContractLike } from './styleTypes';

export function applyStyleEnforcement(contract: TemplateContractLike): TemplateContractLike {
  assertStyleGuards(contract);

  // Snapshot before to guarantee we don't touch structure/geometry/content.
  const before = snapshotNonStyleState(contract);

  // Work on a shallow copy; each rule returns new element objects (no mutation).
  let next: TemplateContractLike = {
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
