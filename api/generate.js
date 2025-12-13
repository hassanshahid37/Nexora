export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count, prompt, notes } = req.body;

    const templates = Array.from({ length: count || 10 }, (_, i) => ({
      title: `${category || "Template"} #${i + 1}`,
      description: `${style || "Premium"} • AI generated layout`
    }));

    return res.status(200).json({
      templates
    });
  } catch (err) {
    return res.status(500).json({
      error: "Generation failed",
      details: err.message
    });
  }
}
