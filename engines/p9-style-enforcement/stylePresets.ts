// P9.3 Style presets: data-only, deterministic, Canva-level polish targets.
// Presets define safe defaults; brand inputs (if present) override where appropriate.

import { StylePresetId, ColorHex } from './styleTypes';

export interface StylePreset {
  id: StylePresetId;

  // palette defaults (brand overrides if present)
  bg: ColorHex;
  text: ColorHex;
  primary: ColorHex;
  secondary: ColorHex;
  accent: ColorHex;

  // typography defaults
  headlineFont: string;
  bodyFont: string;

  // component defaults
  buttonRadius: number;
  buttonPaddingX: number;
  buttonPaddingY: number;

  // background strategy
  allowGradient: boolean;
  gradient: string; // CSS-like string (renderer may interpret)
}

export const stylePresets: Record<StylePresetId, StylePreset> = {
  clean: {
    id: 'clean',
    bg: '#FFFFFF',
    text: '#111111',
    primary: '#111111',
    secondary: '#555555',
    accent: '#2563EB',
    headlineFont: 'Inter',
    bodyFont: 'Inter',
    buttonRadius: 12,
    buttonPaddingX: 18,
    buttonPaddingY: 12,
    allowGradient: false,
    gradient: '',
  },
  bold: {
    id: 'bold',
    bg: '#0B0F19',
    text: '#FFFFFF',
    primary: '#FFFFFF',
    secondary: '#C7C7C7',
    accent: '#F97316',
    headlineFont: 'Poppins',
    bodyFont: 'Inter',
    buttonRadius: 14,
    buttonPaddingX: 20,
    buttonPaddingY: 14,
    allowGradient: true,
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(37,99,235,0.18))',
  },
  professional: {
    id: 'professional',
    bg: '#FFFFFF',
    text: '#0F172A',
    primary: '#0F172A',
    secondary: '#334155',
    accent: '#0EA5E9',
    headlineFont: 'Montserrat',
    bodyFont: 'Inter',
    buttonRadius: 10,
    buttonPaddingX: 18,
    buttonPaddingY: 12,
    allowGradient: true,
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,23,42,0.04))',
  },
  minimal: {
    id: 'minimal',
    bg: '#FFFFFF',
    text: '#111111',
    primary: '#111111',
    secondary: '#6B7280',
    accent: '#111111',
    headlineFont: 'Inter',
    bodyFont: 'Inter',
    buttonRadius: 10,
    buttonPaddingX: 16,
    buttonPaddingY: 10,
    allowGradient: false,
    gradient: '',
  },
  expressive: {
    id: 'expressive',
    bg: '#FFFFFF',
    text: '#111827',
    primary: '#111827',
    secondary: '#374151',
    accent: '#A855F7',
    headlineFont: 'Poppins',
    bodyFont: 'Inter',
    buttonRadius: 16,
    buttonPaddingX: 22,
    buttonPaddingY: 14,
    allowGradient: true,
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(34,197,94,0.10))',
  },
};

// Category-aware preset selection (data-driven, conservative defaults)
export function pickPresetId(category?: string): StylePresetId {
  switch (category) {
    case 'Resume':
      return 'professional';
    case 'PresentationSlide':
      return 'professional';
    case 'Poster':
      return 'bold';
    case 'YouTubeThumbnail':
      return 'bold';
    case 'InstagramPost':
      return 'expressive';
    default:
      return 'clean';
  }
}
