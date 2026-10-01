require("dotenv").config();
const path = require("path");
const fs = require("fs");

const {
  TIDB_HOST,
  TIDB_PORT = 4000,
  TIDB_USER,
  TIDB_PASSWORD,
  TIDB_DATABASE,
  TIDB_SSL = "true",
  JAWSDB_URL,
  DATABASE_URL,
} = process.env;

const hasMysql = Boolean(
  JAWSDB_URL || DATABASE_URL || TIDB_HOST || process.env.MYSQL_HOST
);

let driver = null;

function sqliteWrap(db) {
  function expand(sql, params) {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      Array.isArray(params[0]) &&
      Array.isArray(params[0][0]) &&
      /VALUES\s+\?\s*$/i.test(sql)
    ) {
      const rows = params[0];
      const cols = rows[0].length;
      const ph = "(" + Array(cols).fill("?").join(",") + ")";
      const allPh = Array(rows.length).fill(ph).join(",");
      const flat = rows.flat();
      return { sql: sql.replace(/VALUES\s+\?\s*$/i, "VALUES " + allPh + " "), params: flat };
    }
    return { sql, params: params ?? [] };
  }
  return {
    driver: "sqlite",
    async query(rawSql, rawParams) {
      const { sql, params } = expand(rawSql, rawParams);
      const upper = sql.trimStart().slice(0, 6).toUpperCase();
      if (upper === "SELECT" || upper === "PRAGMA" || upper === "WITH " || /^.{0,20}\bSELECT\b/i.test(sql)) {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        return [rows, []];
      }
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return [
        { insertId: info.lastInsertRowid, affectedRows: info.changes },
        undefined,
      ];
    },
    async getConnection() {
      return {
        release() {},
        async query(rawSql, rawParams) {
          const { sql, params } = expand(rawSql, rawParams);
          const upper = sql.trimStart().slice(0, 6).toUpperCase();
          if (upper === "SELECT" || upper === "PRAGMA") {
            const rows = db.prepare(sql).all(...params);
            return [rows, []];
          }
          const info = db.prepare(sql).run(...params);
          return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }];
        },
      };
    },
  };
}

function initSqlite() {
  const Database = require("better-sqlite3");
  const dbFile = process.env.DB_PATH || path.join(__dirname, "ledger.db");
  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  try { fs.chmodSync(dbFile, 0o600); } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS ipos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      user_id    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ipos_user ON ipos(user_id);
    CREATE TABLE IF NOT EXISTS entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ipo_id     INTEGER NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
      person     TEXT NOT NULL,
      category   TEXT NOT NULL CHECK (category IN ('friend','family')),
      amount     INTEGER NOT NULL CHECK (amount > 0),
      note       TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_entries_ipo    ON entries(ipo_id);
    CREATE INDEX IF NOT EXISTS idx_entries_person ON entries(person COLLATE NOCASE);
  `);

  driver = sqliteWrap(db);
  return driver;
}

async function initMysql() {
  const mysql = require("mysql2/promise");
  let poolConfig;
  if (JAWSDB_URL || DATABASE_URL) {
    const url = new URL(JAWSDB_URL || DATABASE_URL);
    poolConfig = {
      host: url.hostname,
      port: parseInt(url.port || "3306", 10),
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, ""),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
    if (
      TIDB_SSL === "true" ||
      url.protocol === "mysqls:" ||
      /tidbcloud|planetscale/.test(url.hostname)
    ) {
      poolConfig.ssl = { rejectUnauthorized: true };
    }
  } else {
    poolConfig = {
      host: TIDB_HOST || "127.0.0.1",
      port: parseInt(TIDB_PORT, 10),
      user: TIDB_USER || "root",
      password: TIDB_PASSWORD || "",
      database: TIDB_DATABASE || "ipo_ledger",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
    if (TIDB_SSL === "true" && TIDB_HOST && /tidbcloud/.test(TIDB_HOST)) {
      poolConfig.ssl = { rejectUnauthorized: true };
    }
  }
  const pool = mysql.createPool(poolConfig);

  const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS users (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      username      VARCHAR(80) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS ipos (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      name       VARCHAR(100) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id    INT NOT NULL,
      INDEX idx_ipos_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS entries (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      ipo_id     INT NOT NULL,
      person     VARCHAR(80) NOT NULL,
      category   ENUM('friend','family') NOT NULL,
      amount     INT NOT NULL,
      note       VARCHAR(200) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_entries_ipo (ipo_id),
      INDEX idx_entries_person (person),
      FOREIGN KEY (ipo_id) REFERENCES ipos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  const conn = await pool.getConnection();
  try {
    for (const stmt of SCHEMA) await conn.query(stmt);
  } finally {
    conn.release();
  }

  driver = { driver: "mysql", query: pool.query.bind(pool), getConnection: pool.getConnection.bind(pool) };
  return driver;
}

async function initDb() {
  if (driver) return;
  if (hasMysql) {
    await initMysql();
  } else {
    initSqlite();
  }
}

const lazyPool = new Proxy(
  {},
  {
    get(_, prop) {
      if (!driver) {
        throw new Error("Database not initialized — call initDb() first");
      }
      return driver[prop];
    },
  }
);

module.exports = { pool: lazyPool, initDb, hasMysql };
