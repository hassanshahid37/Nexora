
// Design Preset Selector (Server-side authority)

import { VisualDNARegistry } from "./visual-dna-registry.js";

export function selectDesignPreset({ category, archetype, index = 0 }) {
  const presets = VisualDNARegistry[category];
  if (!Array.isArray(presets) || presets.length === 0) return null;

  // Filter by archetype compatibility if defined
  const compatible = presets.filter(p => {
    if (!p.archetypes) return true;
    const { allowed = [], blocked = [] } = p.archetypes;
    if (blocked.includes(archetype)) return false;
    if (allowed.length > 0 && !allowed.includes(archetype)) return false;
    return true;
  });

  const pool = compatible.length > 0 ? compatible : presets;
  return pool[index % pool.length];
}
