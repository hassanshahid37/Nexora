// P9.3 guards: enforce "pure styling" (no structure/geometry/content changes).

import { TemplateContractLike, ElementLike } from './styleTypes';

export function assertStyleGuards(contract: TemplateContractLike) {
  if (!contract || typeof contract !== 'object') throw new Error('StyleEnforcement: contract missing');
  if (!Array.isArray(contract.elements)) throw new Error('StyleEnforcement: contract.elements must be an array');
  for (const el of contract.elements) {
    if (!el || typeof el !== 'object') throw new Error('StyleEnforcement: element must be an object');
  }
}

// We snapshot the contract excluding element.style and a few known transient/computed keys.
// This lets us detect accidental layout/geometry/content changes deterministically.
export function snapshotNonStyleState(contract: TemplateContractLike) {
  const strip = (el: ElementLike) => {
    const { style, computedStyle, __priority, __debug, ...rest } = el as any;
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

export function assertNoStructureOrGeometryChanges(before: any, after: any) {
  // element count
  if (before.elements.length !== after.elements.length) {
    throw new Error('StyleEnforcement: element count changed (structure mutation)');
  }

  // id set (if present)
  const beforeIds = before.elements.map((e: any) => e.id).filter(Boolean).sort();
  const afterIds = after.elements.map((e: any) => e.id).filter(Boolean).sort();
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
