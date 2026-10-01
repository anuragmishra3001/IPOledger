const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me-please-in-production";
const TTL_MINUTES = parseInt(process.env.SESSION_TTL_MINUTES || "30", 10);

function signToken(user) {
  return jwt.sign(
    { uid: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: TTL_MINUTES * 60 }
  );
}

async function attachAuth(req, res, next) {
  const token =
    req.cookies?.ipo_token ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT id, username, created_at FROM users WHERE id = ?",
      [decoded.uid]
    );
    if (rows[0]) {
      req.user = rows[0];
    }
  } catch (_) {
    /* invalid token — proceed anonymously */
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

module.exports = { signToken, attachAuth, requireAuth, TTL_MINUTES, JWT_SECRET };
