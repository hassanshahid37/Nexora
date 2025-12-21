export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ success: true, templates: [] });
  }

  try {
    const { prompt = "", count = 4, style = "Default" } = req.body || {};

    const templates = Array.from({ length: count }).map((_, i) => ({
      title: `Instagram Post #${i + 1}`,
      subtitle: style,
      category: "Instagram",
      blocks: [
        { type: "heading", text: prompt || "Your Message Here" },
        { type: "button", text: "Shop Now" }
      ]
    }));

    return res.status(200).json({
      success: true,
      templates
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      templates: []
    });
  }
}
