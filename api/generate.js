// Bridge file: keep /api/generate as the Vercel function entry.
// Our full implementation currently lives in the repo root as generate-core.js.
module.exports = require("../generate-core.js");
