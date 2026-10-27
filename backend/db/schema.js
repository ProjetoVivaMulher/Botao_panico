/**
 * Viva Mulher - Botão de Pânico
 * Esquema do banco (libSQL/SQLite). Idempotente: pode rodar quantas vezes quiser.
 */

const { run } = require('./database');

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    birth_date TEXT NOT NULL,
    pin_hash TEXT,
    access_token TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    consent_lgpd INTEGER NOT NULL DEFAULT 0,
    consent_location INTEGER NOT NULL DEFAULT 0,
    consent_at TEXT,
    self_declared_woman INTEGER NOT NULL DEFAULT 0,
    self_declared_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_confirmed_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    maps_url TEXT,
    message TEXT,
    target_phone TEXT,
    battery_level INTEGER,
    status TEXT NOT NULL,
    status_history TEXT NOT NULL DEFAULT '[]',
    timings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id)`
];

// Colunas adicionadas depois (migração suave para bancos já existentes).
// Erros de "coluna duplicada" são ignorados de propósito.
const COLUMN_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN access_token TEXT`,
  `ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN locked_until TEXT`,
  `ALTER TABLE users ADD COLUMN self_declared_woman INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN self_declared_at TEXT`,
  `ALTER TABLE users ADD COLUMN email TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`,
  // E-mail é opcional: o índice único ignora quem não informou (NULL).
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`
];

async function ensureSchema() {
  for (const sql of STATEMENTS) {
    await run(sql);
  }
  for (const sql of COLUMN_MIGRATIONS) {
    try {
      await run(sql);
    } catch (error) {
      // Coluna/índice já existente — seguro ignorar.
    }
  }
}

module.exports = { ensureSchema, STATEMENTS };
