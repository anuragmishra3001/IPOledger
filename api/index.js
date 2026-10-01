const app = require("../server/index.js");
const { initDb } = require("../server/db.js");

let ready = null;
async function ensure() {
  if (ready) return ready;
  ready = initDb();
  try { await ready; } catch (err) { ready = null; throw err; }
  return ready;
}

module.exports = async (req, res) => {
  try {
    await ensure();
  } catch (err) {
    console.error("DB init failed:", err);
    return res.status(500).json({ error: "Database init failed" });
  }
  if (!req.originalUrl) req.originalUrl = req.url;
  return app(req, res);
};
