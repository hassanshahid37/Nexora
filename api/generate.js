export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { category, style, count } = req.body;

    const total = Math.min(parseInt(count || 12, 10), 200);

    const templates = Array.from({ length: total }, (_, i) => ({
      title: `${category || "Template"} #${i + 1}`,
      description: `${style || "Premium"} • AI generated layout`
    }));

    return res.status(200).json({
      templates
    });
  } catch (err) {
    return res.status(500).json({
      error: "Backend crash",
      message: err.message
    });
  }
}
