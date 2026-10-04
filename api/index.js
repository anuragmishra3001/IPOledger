const app = require("../server/index.js");
const { initDb } = require("../server/db.js");
const url = require("url");

let ready = null;
async function ensure() {
  if (ready) return ready;
  ready = initDb();
  try { await ready; } catch (err) { ready = null; throw err; }
  return ready;
}

function restoreOriginalPath(req) {
  const candidate =
    (req.headers && (req.headers["x-vercel-original-url"] || req.headers["x-original-url"] || req.headers["x-now-original-url"])) ||
    req.originalUrl ||
    req.url ||
    "/";
  const parsed = url.parse(String(candidate));
  req.url = parsed.path + (parsed.hash || "");
  if (!req.originalUrl) req.originalUrl = req.url;
}

module.exports = async (req, res) => {
  try {
    await ensure();
  } catch (err) {
    console.error("DB init failed:", err);
    return res.status(500).json({ error: "Database init failed" });
  }
  restoreOriginalPath(req);
  return app(req, res);
};
