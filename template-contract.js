// TemplateContract v1 — Nexora Spine (Instagram Layout System v1)

export const TEMPLATE_VERSION = "v1";

export const INSTAGRAM_LAYOUTS = {
  "hero-stack": {
    layoutType: "hero-stack",
    zones: [
      { role: "image", required: true, editable: true, priority: 1 },
      { role: "headline", required: true, editable: true, priority: 2 },
      { role: "subhead", required: false, editable: true, priority: 3 },
      { role: "cta", required: false, editable: true, priority: 4 },
      { role: "badge", required: false, editable: true, priority: 5 }
    ]
  },

  "split-image-text": {
    layoutType: "split-image-text",
    zones: [
      { role: "image", required: true, editable: true, priority: 1 },
      { role: "headline", required: true, editable: true, priority: 2 },
      { role: "subhead", required: false, editable: true, priority: 3 },
      { role: "cta", required: false, editable: true, priority: 4 },
      { role: "divider", required: false, editable: false, priority: 5 }
    ]
  },

  "centered-statement": {
    layoutType: "centered-statement",
    zones: [
      { role: "headline", required: true, editable: true, priority: 1 },
      { role: "subhead", required: false, editable: true, priority: 2 },
      { role: "badge", required: false, editable: true, priority: 3 },
      { role: "background", required: true, editable: false, priority: 4 }
    ]
  },

  "card-panels": {
    layoutType: "card-panels",
    zones: [
      { role: "card", required: true, editable: true, repeatable: true, priority: 1 },
      { role: "headline", required: false, editable: true, priority: 2 },
      { role: "background", required: true, editable: false, priority: 3 }
    ]
  },

  "image-overlay": {
    layoutType: "image-overlay",
    zones: [
      { role: "image", required: true, editable: true, priority: 1 },
      { role: "overlay", required: true, editable: false, priority: 2 },
      { role: "headline", required: true, editable: true, priority: 3 },
      { role: "cta", required: false, editable: true, priority: 4 }
    ]
  },

  "asymmetric-modern": {
    layoutType: "asymmetric-modern",
    zones: [
      { role: "image", required: true, editable: true, priority: 1 },
      { role: "headline", required: true, editable: true, priority: 2 },
      { role: "accent", required: false, editable: false, priority: 3 },
      { role: "subhead", required: false, editable: true, priority: 4 }
    ]
  }
};

export function createTemplateContract({
  templateId,
  category,
  canvas,
  layoutType,
  palette
}) {
  return {
    version: TEMPLATE_VERSION,
    templateId,
    category,
    canvas,
    layoutType,
    palette,
    zones: INSTAGRAM_LAYOUTS[layoutType]?.zones || [],
    rules: {
      allowDetach: true,
      allowReorder: false
    },
    createdAt: Date.now()
  };
}
