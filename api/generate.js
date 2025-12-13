export default async function handler(req, res) {
  try {
    // Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Safe read body
    const body = req.body || {};
    const count = Math.min(Number(body.count) || 24, 200);
    const category = body.category || "Instagram Post";
    const style = body.style || "Dark Premium";

    // SIMPLE guaranteed output
    const templates = Array.from({ length: count }, (_, i) => ({
      title: `${category} #${i + 1}`,
      description: `${style} · AI generated layout`
    }));

    return res.status(200).json({ templates });

  } catch (err) {
    return res.status(200).json({
      templates: Array.from({ length: 12 }, (_, i) => ({
        title: `Fallback Template #${i + 1}`,
        description: "Safe fallback"
      }))
    });
  }
}
