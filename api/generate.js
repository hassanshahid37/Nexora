
export default async function handler(req, res) {
  const variants = [
    {
      id: "yt-1",
      category: "YouTube Thumbnail",
      width: 1280,
      height: 720,
      elements: [
        { type: "background", fill: "#0b1220" },
        { type: "text", text: "MODERN TECH", x: 80, y: 200, fontSize: 96, color: "#ffd54f", weight: 800 },
        { type: "badge", text: "NEW", x: 80, y: 120, bg: "#ff5722" }
      ]
    },
    {
      id: "yt-2",
      category: "YouTube Thumbnail",
      width: 1280,
      height: 720,
      elements: [
        { type: "background", fill: "#111827" },
        { type: "text", text: "TECH REVIEW", x: 640, y: 220, fontSize: 88, color: "#4fc3f7", weight: 800 },
        { type: "badge", text: "HOT", x: 640, y: 120, bg: "#22c55e" }
      ]
    },
    {
      id: "yt-3",
      category: "YouTube Thumbnail",
      width: 1280,
      height: 720,
      elements: [
        { type: "background", fill: "#020617" },
        { type: "text", text: "AI TOOLS", x: 100, y: 260, fontSize: 100, color: "#e879f9", weight: 900 },
        { type: "badge", text: "TRENDING", x: 100, y: 140, bg: "#6366f1" }
      ]
    }
  ];
  res.status(200).json({ templates: variants });
}
