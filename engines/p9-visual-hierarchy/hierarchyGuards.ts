// Safety guards: NO layout / geometry / structure changes.
// The engine is allowed to mutate only element.style with safe visual keys.

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function stripStyleDeep(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripStyleDeep);
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      if (k === 'style') continue;
      out[k] = stripStyleDeep(obj[k]);
    }
    return out;
  }
  return obj;
}

export function snapshotNonStyleState(contract: any): any {
  const cloned = deepClone(contract);
  return stripStyleDeep(cloned);
}

function stableStringify(x: any): string {
  return JSON.stringify(x, Object.keys(x).sort());
}

export function assertNoStructureOrGeometryChanges(pre: any, post: any) {
  // Comparing non-style snapshots ensures:
  // - no element add/remove
  // - no id/role/type changes
  // - no box/frame geometry changes
  // - no ordering changes (since elements array is included)
  const a = JSON.stringify(pre);
  const b = JSON.stringify(post);
  if (a !== b) {
    throw new Error('P9.2 VisualHierarchyEngine violated NO-STRUCTURE/NO-GEOMETRY rule');
  }
}

const DISALLOWED_STYLE_KEYS = [
  'x','y','left','right','top','bottom',
  'width','height','w','h',
  'transform','translate','rotate','scale',
  'position','margin','marginTop','marginLeft','marginRight','marginBottom',
  'paddingLeft','paddingRight','paddingTop','paddingBottom',
];

export function assertStyleSafe(style: any) {
  if (!style) return;
  if (typeof style !== 'object') throw new Error('style must be object');
  for (const key of Object.keys(style)) {
    const k = String(key);
    if (DISALLOWED_STYLE_KEYS.includes(k)) {
      throw new Error(`Disallowed style key in P9.2: ${k}`);
    }
  }
}
