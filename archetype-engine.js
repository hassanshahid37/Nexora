/**
 * archetype-engine.js
 * Authoritative Archetype Compilation Layer for Nexora
 */

import {
  buildAllArchetypes,
  selectArchetype
} from "./archetypes_1-20_compiled.js";

const ALL = buildAllArchetypes();

export function compileArchetype({ archetypeId, canvas, ctx }) {
  const archetype = selectArchetype(
    ALL,
    archetypeId,
    ctx?.headline,
    ctx?.subhead
  );
  return archetype.compile(canvas, ctx);
}

export function listArchetypes() {
  return ALL.map(a => a.id);
}
