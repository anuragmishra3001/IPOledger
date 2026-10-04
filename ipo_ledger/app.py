"""IPO Ledger - a small, private, local ledger (Flask + SQLite)."""
import os
import re
import secrets
import sqlite3
import time
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from flask import (Flask, abort, flash, g, redirect, render_template, request,
                   session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("IPO_LEDGER_DATA_DIR", "/tmp/ipo_ledger")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "ledger.db")
KEY_PATH = os.path.join(DATA_DIR, ".secret_key")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ipos (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY,
    ipo_id     INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    person     TEXT NOT NULL,
    category   TEXT NOT NULL CHECK (category IN ('friend','family')),
    amount     INTEGER NOT NULL CHECK (amount > 0),   -- stored in paise, never floats
    note       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_entries_ipo    ON entries(ipo_id);
CREATE INDEX IF NOT EXISTS idx_entries_person ON entries(person COLLATE NOCASE);
"""


def load_secret_key():
    if not os.path.exists(KEY_PATH):
        fd = os.open(KEY_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(secrets.token_hex(32))
    with open(KEY_PATH) as f:
        return f.read().strip()


app = Flask(__name__)
app.config.update(
    SECRET_KEY=load_secret_key(),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=30),  # auto logout when idle
)


# ---------- database ----------
def init_db():
    new = not os.path.exists(DB_PATH)
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    con.close()
    if new:
        os.chmod(DB_PATH, 0o600)  # owner-only on Linux/macOS


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_):
    con = g.pop("db", None)
    if con:
        con.close()


# ---------- helpers ----------
@app.template_filter("inr")
def inr(paise):
    rupees, p = divmod(int(paise), 100)
    s = str(rupees)
    if len(s) > 3:                       # Indian digit grouping: 1,23,456
        head, tail, parts = s[:-3], s[-3:], []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts + [tail])
    return "₹" + s + (f".{p:02d}" if p else "")


def parse_amounts(text):
    """'14852, 853 1000' -> [1485200, 85300, 100000] (paise). Raises ValueError."""
    parts = [x for x in re.split(r"[,\s+]+", text.strip()) if x]
    if not parts:
        raise ValueError("Enter at least one amount.")
    out = []
    for part in parts:
        try:
            d = Decimal(part)
        except InvalidOperation:
            raise ValueError(f"'{part}' is not a valid amount.")
        if not d.is_finite() or d <= 0 or d > Decimal("100000000") \
                or d != d.quantize(Decimal("0.01")):
            raise ValueError(f"'{part}' must be a positive amount with at most 2 decimals.")
        out.append(int(d * 100))
    return out


def like(q):
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


app.jinja_env.globals["csrf_token"] = csrf_token

_fails = {}  # ip -> (count, locked_until)


@app.before_request
def guard():
    session.permanent = True
    if request.method == "POST":
        sent = request.form.get("csrf", "")
        if not secrets.compare_digest(sent, session.get("csrf", "")):
            abort(400)
    open_routes = ("login", "setup", "static")
    if request.endpoint not in open_routes and "uid" not in session:
        return redirect(url_for("login"))


@app.after_request
def secure_headers(resp):
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none'; form-action 'self'")
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cache-Control"] = "no-store"   # browser never caches your data
    return resp


# ---------- auth ----------
@app.route("/setup", methods=["GET", "POST"])
def setup():
    if db().execute("SELECT 1 FROM users").fetchone():
        abort(404)                      # only works once, on first run
    if request.method == "POST":
        u = request.form["username"].strip()
        p = request.form["password"]
        if not u or len(p) < 10:
            flash("Choose a username and a password of at least 10 characters.")
        else:
            db().execute("INSERT INTO users(username,password_hash) VALUES(?,?)",
                         (u, generate_password_hash(p)))
            db().commit()
            flash("Account created. Log in to continue.")
            return redirect(url_for("login"))
    return render_template("login.html", mode="setup")


@app.route("/login", methods=["GET", "POST"])
def login():
    if not db().execute("SELECT 1 FROM users").fetchone():
        return redirect(url_for("setup"))
    ip = request.remote_addr
    count, until = _fails.get(ip, (0, 0))
    if request.method == "POST":
        if time.time() < until:
            flash("Too many attempts. Wait a few minutes and try again.")
        else:
            row = db().execute("SELECT * FROM users WHERE username=?",
                               (request.form["username"].strip(),)).fetchone()
            if row and check_password_hash(row["password_hash"], request.form["password"]):
                _fails.pop(ip, None)
                session.clear()
                session["uid"] = row["id"]
                return redirect(url_for("index"))
            count += 1
            _fails[ip] = (count, time.time() + 300 if count >= 5 else 0)
            flash("Wrong username or password.")
    return render_template("login.html", mode="login")


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------- IPOs ----------
@app.route("/")
def index():
    q = request.args.get("q", "").strip()
    rows = db().execute("""
        SELECT i.id, i.name, i.created_at,
               COALESCE(SUM(CASE WHEN e.category='friend' THEN e.amount END),0) AS friend_total,
               COALESCE(SUM(CASE WHEN e.category='family' THEN e.amount END),0) AS family_total,
               COALESCE(SUM(e.amount),0) AS total
        FROM ipos i LEFT JOIN entries e ON e.ipo_id = i.id
        WHERE :q = '' OR i.name LIKE :p ESCAPE '\\'
              OR i.id IN (SELECT ipo_id FROM entries WHERE person LIKE :p ESCAPE '\\')
        GROUP BY i.id ORDER BY i.created_at DESC, i.id DESC
    """, {"q": q, "p": like(q)}).fetchall()
    grand = sum(r["total"] for r in rows)
    return render_template("index.html", ipos=rows, q=q, grand=grand)


@app.post("/ipo/new")
def ipo_new():
    name = request.form["name"].strip()
    if not name or len(name) > 100:
        flash("Enter an IPO name (up to 100 characters).")
        return redirect(url_for("index"))
    try:
        cur = db().execute("INSERT INTO ipos(name) VALUES(?)", (name,))
        db().commit()
    except sqlite3.IntegrityError:
        flash(f"'{name}' already exists.")
        return redirect(url_for("index"))
    return redirect(url_for("ipo_view", ipo_id=cur.lastrowid))


def get_ipo(ipo_id):
    ipo = db().execute("SELECT * FROM ipos WHERE id=?", (ipo_id,)).fetchone()
    if not ipo:
        abort(404)
    return ipo


@app.route("/ipo/<int:ipo_id>")
def ipo_view(ipo_id):
    ipo = get_ipo(ipo_id)
    q = request.args.get("q", "").strip()
    rows = db().execute("""
        SELECT * FROM entries WHERE ipo_id=:i AND (:q='' OR person LIKE :p ESCAPE '\\')
        ORDER BY person COLLATE NOCASE, id
    """, {"i": ipo_id, "q": q, "p": like(q)}).fetchall()
    cols = {}
    for cat in ("friend", "family"):
        people = {}
        for r in rows:
            if r["category"] == cat:
                p = people.setdefault(r["person"].lower(),
                                      {"name": r["person"], "entries": [], "total": 0})
                p["entries"].append(r)
                p["total"] += r["amount"]
        cols[cat] = {"people": list(people.values()),
                     "total": sum(p["total"] for p in people.values())}
    grand = cols["friend"]["total"] + cols["family"]["total"]
    return render_template("ipo.html", ipo=ipo, cols=cols, grand=grand, q=q)


@app.post("/ipo/<int:ipo_id>/add")
def entry_add(ipo_id):
    get_ipo(ipo_id)
    person = " ".join(request.form["person"].split())
    category = request.form.get("category")
    note = request.form.get("note", "").strip()[:200]
    if not person or len(person) > 80 or category not in ("friend", "family"):
        flash("Enter a name and choose Friend or Family.")
        return redirect(url_for("ipo_view", ipo_id=ipo_id))
    try:
        amounts = parse_amounts(request.form["amounts"])
    except ValueError as e:
        flash(str(e))
        return redirect(url_for("ipo_view", ipo_id=ipo_id))
    con = db()
    con.executemany(
        "INSERT INTO entries(ipo_id,person,category,amount,note) VALUES(?,?,?,?,?)",
        [(ipo_id, person, category, a, note) for a in amounts])
    con.commit()
    return redirect(url_for("ipo_view", ipo_id=ipo_id))


@app.post("/entry/<int:entry_id>/delete")
def entry_delete(entry_id):
    row = db().execute("SELECT ipo_id FROM entries WHERE id=?", (entry_id,)).fetchone()
    if not row:
        abort(404)
    db().execute("DELETE FROM entries WHERE id=?", (entry_id,))
    db().commit()
    return redirect(url_for("ipo_view", ipo_id=row["ipo_id"]))


@app.post("/ipo/<int:ipo_id>/delete")
def ipo_delete(ipo_id):
    get_ipo(ipo_id)
    db().execute("DELETE FROM ipos WHERE id=?", (ipo_id,))
    db().commit()
    return redirect(url_for("index"))


init_db()

if __name__ == "__main__":
    # 127.0.0.1 = reachable only from this computer, never from the network.
    app.run(host="127.0.0.1", port=5000, debug=False)
