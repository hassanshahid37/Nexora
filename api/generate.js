import { generateTemplates } from "../generate-core.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ success: true });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const result = await generateTemplates(body);

    return res.status(200).json({
      success: true,
      templates: result,
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
