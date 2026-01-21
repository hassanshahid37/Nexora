// Shared types for P9.3 Style Enforcement Engine.
// Kept lightweight so it can be wired into Nexora without refactors.

export type StylePresetId = 'clean' | 'bold' | 'professional' | 'minimal' | 'expressive';

export type ColorHex = string; // '#RRGGBB' or '#RRGGBBAA' (we normalize internally)

export interface BrandLike {
  colors?: {
    primary?: ColorHex;
    secondary?: ColorHex;
    background?: ColorHex;
    text?: ColorHex;
    accent?: ColorHex;
  };
  fonts?: {
    headline?: string;
    body?: string;
  };
}

export interface StyleMap {
  // typography
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;

  // color
  color?: ColorHex;
  backgroundColor?: ColorHex;
  fill?: ColorHex;
  stroke?: ColorHex;
  strokeWidth?: number;

  // component-like
  borderRadius?: number;
  padding?: string | number;
  paddingX?: number;
  paddingY?: number;

  // depth
  shadow?: string;

  // background/gradient
  gradient?: string;

  // misc
  opacity?: number;

  // Allow extension without breaking.
  [key: string]: any;
}

export interface ElementLike {
  id?: string;
  role?: string;     // e.g. 'headline', 'cta', 'image', 'background', etc.
  type?: string;     // renderer type if present
  style?: StyleMap;

  // Geometry/structure fields must exist but are intentionally not typed here.
  [key: string]: any;
}

export interface TemplateContractLike {
  category?: string;
  preset?: StylePresetId;
  brand?: BrandLike;

  // Optional contract-level styling hooks
  backgroundColor?: ColorHex;
  canvas?: { backgroundColor?: ColorHex; [k: string]: any };

  elements: ElementLike[];

  [key: string]: any;
}
