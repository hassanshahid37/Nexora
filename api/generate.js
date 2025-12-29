/*
 PHASE 6A – YT-1
 YouTube Thumbnail Archetype Enforcement (BIG STEP)
 Archetypes: face-left, face-right, text-heavy, minimal
*/

export function buildYouTubeThumbnail({ archetype, prompt, style }) {
  const base = {
    category: "YouTube Thumbnail",
    style,
    archetype,
    meta: {
      maxWords: 6,
      enforced: true
    },
    elements: []
  };

  if (archetype === "face-left" || archetype === "face-right") {
    base.elements.push({
      type: "image",
      role: "hero",
      anchor: archetype === "face-left" ? "left" : "right",
      width: 0.65
    });
    base.elements.push({
      type: "text",
      role: "headline",
      position: archetype === "face-left" ? "right" : "left"
    });
  }

  if (archetype === "text-heavy") {
    base.elements.push({
      type: "text",
      role: "headline",
      size: "xl",
      imageAllowed: false
    });
  }

  if (archetype === "minimal") {
    base.elements.push({
      type: "text",
      role: "headline",
      size: "l",
      minimal: true
    });
  }

  return base;
}
