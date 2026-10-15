/**
 * Viva Mulher - Botão de Pânico
 * Migração reproduzível: prepara o banco (libSQL/SQLite) num ambiente novo.
 *
 * Como rodar (a partir da pasta backend/):
 *   node migrations/init.js
 *
 * Local: cria/atualiza backend/data/viva_mulher.db (abre normal no Letos/SQLiteStudio).
 * Turso: usa TURSO_DATABASE_URL + TURSO_AUTH_TOKEN do ambiente.
 * Rodar de novo NÃO apaga dados (usa CREATE TABLE IF NOT EXISTS).
 */

// Carrega backend/.env (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, etc.) ANTES de
// abrir o banco — as variáveis precisam estar prontas quando o cliente conecta.
require('dotenv').config();

const { ensureSchema } = require('../db/schema');
const db = require('../db/database');

async function main() {
  await ensureSchema();
  console.log(`[migrations/init] Banco pronto (${db.mode}).`);
  console.log(`[migrations/init] Local: ${db.location}`);
  console.log('[migrations/init] Tabelas: users, contacts, alerts.');
}

main().catch((err) => {
  console.error('[migrations/init] Falha ao preparar o banco:', err);
  process.exit(1);
});
