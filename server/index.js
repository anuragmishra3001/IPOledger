require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { pool, initDb } = require("./db");
const { signToken, attachAuth, requireAuth, TTL_MINUTES } = require("./auth");
const { formatINR, parseAmounts, likeEscape } = require("./utils");

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(cookieParser());
app.use(attachAuth);

const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || "5", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a few minutes and try again." },
  keyGenerator: (req) => req.ip,
});

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  next();
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: NODE_ENV === "production" ? "strict" : "lax",
  secure: NODE_ENV === "production",
  maxAge: TTL_MINUTES * 60 * 1000,
  path: "/",
};

function setAuthCookie(res, token) {
  res.cookie("ipo_token", token, COOKIE_OPTS);
}

function clearAuthCookie(res) {
  res.clearCookie("ipo_token", { path: "/", httpOnly: true, sameSite: COOKIE_OPTS.sameSite, secure: COOKIE_OPTS.secure });
}

app.get("/api/auth/status", async (req, res) => {
  const [[userCount]] = await pool.query("SELECT COUNT(*) AS c FROM users");
  res.json({
    initialized: userCount.c > 0,
    user: req.user || null,
  });
});

app.post("/api/auth/setup", async (req, res) => {
  try {
    const [[userCount]] = await pool.query("SELECT COUNT(*) AS c FROM users");
    if (userCount.c > 0) return res.status(404).json({ error: "Already initialized" });

    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!username || password.length < 10) {
      return res.status(400).json({
        error: "Choose a username and a password of at least 10 characters.",
      });
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users(username, password_hash) VALUES(?, ?)",
      [username, hash]
    );
    const user = { id: result.insertId, username };
    setAuthCookie(res, signToken(user));
    res.json({ user });
  } catch (err) {
    if (/duplicate|unique/i.test(err.message)) {
      return res.status(400).json({ error: "Username already exists." });
    }
    res.status(500).json({ error: "Failed to create account." });
  }
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Wrong username or password." });
    }
    setAuthCookie(res, signToken(user));
    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/ipos", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const p = likeEscape(q);
  const query = `
    SELECT i.id, i.name, i.created_at,
           COALESCE(SUM(CASE WHEN e.category='friend' THEN e.amount END),0) AS friend_total,
           COALESCE(SUM(CASE WHEN e.category='family' THEN e.amount END),0) AS family_total,
           COALESCE(SUM(e.amount),0) AS total
    FROM ipos i
    LEFT JOIN entries e ON e.ipo_id = i.id
    WHERE i.user_id = ? AND (? = ''
      OR i.name LIKE ? ESCAPE '\\\\'
      OR i.id IN (SELECT ipo_id FROM entries WHERE person LIKE ? ESCAPE '\\\\'))
    GROUP BY i.id
    ORDER BY i.created_at DESC, i.id DESC
  `;
  const [rows] = await pool.query(query, [req.user.id, q, p, p]);
  const data = rows.map((r) => ({
    ...r,
    friend_total: Number(r.friend_total),
    family_total: Number(r.family_total),
    total: Number(r.total),
    friend_total_inr: formatINR(r.friend_total),
    family_total_inr: formatINR(r.family_total),
    total_inr: formatINR(r.total),
  }));
  const grand = data.reduce((s, r) => s + r.total, 0);
  res.json({ ipos: data, grand, grand_inr: formatINR(grand) });
});

app.post("/api/ipos", requireAuth, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name || name.length > 100) {
    return res.status(400).json({ error: "Enter an IPO name (up to 100 characters)." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO ipos(name, user_id) VALUES(?, ?)",
      [name, req.user.id]
    );
    res.json({ id: result.insertId, name });
  } catch (err) {
    if (/duplicate|unique/i.test(err.message)) {
      return res.status(400).json({ error: `'${name}' already exists.` });
    }
    res.status(500).json({ error: "Failed to create IPO." });
  }
});

async function getOwnIpo(userId, ipoId) {
  const [rows] = await pool.query("SELECT * FROM ipos WHERE id = ? AND user_id = ?", [
    ipoId,
    userId,
  ]);
  return rows[0];
}

app.get("/api/ipos/:id", requireAuth, async (req, res) => {
  const ipo = await getOwnIpo(req.user.id, req.params.id);
  if (!ipo) return res.status(404).json({ error: "Not found" });
  const q = String(req.query.q || "").trim();
  const p = likeEscape(q);
  const [rows] = await pool.query(
    `SELECT * FROM entries
     WHERE ipo_id = ? AND (? = '' OR person LIKE ? ESCAPE '\\\\')
     ORDER BY person COLLATE utf8mb4_general_ci, id`,
    [ipo.id, q, p]
  );
  const cols = { friend: { people: [], total: 0 }, family: { people: [], total: 0 } };
  for (const cat of ["friend", "family"]) {
    const peopleMap = new Map();
    for (const r of rows) {
      if (r.category !== cat) continue;
      const key = r.person.toLowerCase();
      if (!peopleMap.has(key)) {
        peopleMap.set(key, { name: r.person, entries: [], total: 0 });
      }
      const pEntry = peopleMap.get(key);
      const amt = Number(r.amount);
      pEntry.entries.push({
        id: r.id,
        amount: amt,
        amount_inr: formatINR(amt),
        note: r.note,
        created_at: r.created_at,
      });
      pEntry.total += amt;
    }
    const people = [...peopleMap.values()].map((pp) => ({
      ...pp,
      total_inr: formatINR(pp.total),
    }));
    const total = people.reduce((s, pp) => s + pp.total, 0);
    cols[cat] = { people, total, total_inr: formatINR(total) };
  }
  const grand = cols.friend.total + cols.family.total;
  res.json({
    ipo: { id: ipo.id, name: ipo.name, created_at: ipo.created_at },
    cols,
    grand,
    grand_inr: formatINR(grand),
    entries: rows,
  });
});

app.delete("/api/ipos/:id", requireAuth, async (req, res) => {
  const ipo = await getOwnIpo(req.user.id, req.params.id);
  if (!ipo) return res.status(404).json({ error: "Not found" });
  await pool.query("DELETE FROM ipos WHERE id = ?", [ipo.id]);
  res.json({ ok: true });
});

app.get("/api/ipos/:id/export", requireAuth, async (req, res) => {
  const ipo = await getOwnIpo(req.user.id, req.params.id);
  if (!ipo) return res.status(404).json({ error: "Not found" });
  const [rows] = await pool.query(
    `SELECT person, category, amount, note, created_at FROM entries WHERE ipo_id = ? ORDER BY category, person, id`,
    [ipo.id]
  );
  const header = "Person,Category,Amount (INR),Note,Created At\n";
  const body = rows
    .map((r) => {
      const inr = (Number(r.amount) / 100).toFixed(2);
      const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      return [esc(r.person), esc(r.category), inr, esc(r.note), esc(r.created_at)].join(",");
    })
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="ipo-${encodeURIComponent(ipo.name)}.csv"`
  );
  res.send("\uFEFF" + header + body);
});

app.post("/api/ipos/:id/entries", requireAuth, async (req, res) => {
  const ipo = await getOwnIpo(req.user.id, req.params.id);
  if (!ipo) return res.status(404).json({ error: "Not found" });
  const person = String(req.body.person || "").split(/\s+/).join(" ").trim();
  const category = req.body.category;
  const note = String(req.body.note || "").trim().slice(0, 200);
  if (!person || person.length > 80 || (category !== "friend" && category !== "family")) {
    return res.status(400).json({ error: "Enter a name and choose Friend or Family." });
  }
  let amounts;
  try {
    amounts = parseAmounts(req.body.amounts);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const values = amounts.map((a) => [ipo.id, person, category, a, note]);
  await pool.query(
    "INSERT INTO entries(ipo_id, person, category, amount, note) VALUES ?",
    [values]
  );
  res.json({ added: amounts.length });
});

async function getOwnEntry(userId, entryId) {
  const [rows] = await pool.query(
    `SELECT e.* FROM entries e
     JOIN ipos i ON i.id = e.ipo_id
     WHERE e.id = ? AND i.user_id = ?`,
    [entryId, userId]
  );
  return rows[0];
}

app.patch("/api/entries/:id", requireAuth, async (req, res) => {
  const entry = await getOwnEntry(req.user.id, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });
  const person = "person" in req.body ? String(req.body.person).split(/\s+/).join(" ").trim() : entry.person;
  const category = "category" in req.body ? req.body.category : entry.category;
  const note = "note" in req.body ? String(req.body.note || "").trim().slice(0, 200) : entry.note;
  let amount = entry.amount;
  if ("amount" in req.body) {
    try {
      const parsed = parseAmounts(String(req.body.amount));
      if (parsed.length !== 1) throw new Error("Enter exactly one amount.");
      amount = parsed[0];
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }
  if (!person || person.length > 80 || (category !== "friend" && category !== "family")) {
    return res.status(400).json({ error: "Invalid person name or category." });
  }
  await pool.query(
    "UPDATE entries SET person = ?, category = ?, amount = ?, note = ? WHERE id = ?",
    [person, category, amount, note, entry.id]
  );
  res.json({ ok: true });
});

app.delete("/api/entries/:id", requireAuth, async (req, res) => {
  const entry = await getOwnEntry(req.user.id, req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });
  await pool.query("DELETE FROM entries WHERE id = ?", [entry.id]);
  res.json({ ok: true, ipo_id: entry.ipo_id });
});

if (NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

async function boot() {
  await initDb();
  if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[ipo-ledger] API ready on http://localhost:${PORT}`);
    });
  }
}

boot().catch((err) => {
  console.error("Failed to initialize:", err);
  process.exit(1);
});

module.exports = app;
