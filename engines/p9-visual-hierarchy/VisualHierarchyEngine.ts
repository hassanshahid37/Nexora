// P9.2 
// Controls attention & dominance WITHOUT changing layout/geometry/structure.
// Allowed mutations: element.style (non-geometric), and only safe visual-emphasis fields.

import { HierarchyProfile, PriorityScore, VisualHierarchyOptions } from './hierarchyTypes';
import { hierarchyProfiles } from './hierarchyProfiles';
import { applyHierarchyRules } from './hierarchyRules';
import { snapshotNonStyleState, assertNoStructureOrGeometryChanges, assertStyleSafe } from './hierarchyGuards';

export function applyVisualHierarchy(contract: any, options: VisualHierarchyOptions = {}): any {
  if (!contract) throw new Error('applyVisualHierarchy: contract required');

  const pre = snapshotNonStyleState(contract);

  const categoryKey = contract.category || contract.categoryId || contract.kind || 'default';
  const profile: HierarchyProfile =
    (hierarchyProfiles as any)[categoryKey] || (hierarchyProfiles as any).default;

  const roleRank: Record<string, number> = {};
  profile.forEach((role, idx) => { roleRank[role] = idx; });

  const elements = Array.isArray(contract.elements) ? contract.elements : [];
  const scored = elements.map((el: any) => {
    const role = String(el?.role || el?.type || 'unknown');
    const idx = roleRank[role];
    const priority: PriorityScore =
      Number.isFinite(idx) ? Math.max(0, 100 - idx * 12) : 25;

    return { ...el, __vhPriority: priority };
  });

  // Enforce safe style keys before applying changes
  scored.forEach((el: any) => assertStyleSafe(el?.style));

  const updated = applyHierarchyRules(scored, { profile, options });

  // Strip internal fields
  const cleaned = updated.map((el: any) => {
    const { __vhPriority, ...rest } = el;
    return rest;
  });

  const next = { ...contract, elements: cleaned };

  const post = snapshotNonStyleState(next);
  assertNoStructureOrGeometryChanges(pre, post);

  return next;
}
