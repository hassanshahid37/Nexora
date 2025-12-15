
// design.js — Visual Upgrade (Stable UI Compatible)
// Only template data enhanced. UI/rendering untouched.

export function generateTemplates(count = 24) {
  const templates = [];
  for (let i = 0; i < count; i++) {
    templates.push({
      title: `Instagram Post #${i + 1}`,
      canvas: {
        width: 1080,
        height: 1080,
        background: "#050712"
      },
      elements: [
        {
          type: "heading",
          text: "Grow Your Brand Today",
          x: 80,
          y: 120,
          width: 920,
          fontSize: 88,
          fontWeight: 700,
          color: "#ffffff",
          align: "left"
        },
        {
          type: "image",
          x: 80,
          y: 300,
          width: 920,
          height: 460
        },
        {
          type: "text",
          text: "Premium social media design with strong hierarchy and clear focus.",

