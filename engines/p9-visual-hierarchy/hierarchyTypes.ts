export type PriorityScore = number;

export type Profile = string[];

export type VisualHierarchyOptions = {
  // Typography emphasis tuning
  maxHeadlineWeight?: number; // default 800
  midWeight?: number;         // default 650
  bodyWeight?: number;        // default 500
  lowWeight?: number;         // default 400

  tightLineHeight?: number;   // default 1.15
  normalLineHeight?: number;  // default 1.25
  looseLineHeight?: number;   // default 1.35

  lowOpacity?: number;        // default 0.78
  midOpacity?: number;        // default 0.9

  emitContrastHint?: boolean; // default false
};
