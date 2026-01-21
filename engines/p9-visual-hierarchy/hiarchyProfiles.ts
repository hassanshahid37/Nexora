// Category-based (data-only).
// These define intended reading order of roles.

export const hierarchyProfiles: Record<string, string[]> = {
  InstagramPost: ['headline', 'image', 'cta', 'supportingText', 'meta'],
  YouTubeThumbnail: ['image', 'headline', 'badge', 'cta', 'meta'],
  Poster: ['headline', 'subline', 'image', 'cta', 'supportingText', 'meta'],
  PresentationSlide: ['headline', 'bullet', 'visual', 'meta'],
  Resume: ['sectionTitle', 'role', 'supportingText', 'meta'],
  default: ['headline', 'image', 'cta', 'supportingText', 'meta'],
};
