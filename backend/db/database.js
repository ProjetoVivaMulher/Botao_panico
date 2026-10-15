/**
 * Viva Mulher - Botão de Pânico
 * Camada de banco de dados (libSQL / Turso).
 *
 * Dialeto SQLite. Funciona de duas formas, sem mudar o código que consome:
 *   - Desenvolvimento/local: arquivo SQLite em backend/data/viva_mulher.db
 *     (pode ser aberto e inspecionado no Letos / SQLiteStudio).
 *   - Produção (Vercel serverless): Turso, via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 *
 * Variáveis de ambiente aceitas:
 *   TURSO_DATABASE_URL  ou DATABASE_URL   (libsql://..., https://... ou file:./data/x.db)
 *   TURSO_AUTH_TOKEN     ou DATABASE_AUTH_TOKEN
 */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

const dataDir = path.join(__dirname, '..', 'data');

function resolveConfig() {
  let url =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';

  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    undefined;

  // O Turso hoje pode entregar a URL no esquema `turso://`; o @libsql/client
  // espera `libsql://` (ou `https://`). Normalizamos para garantir compatibilidade.
  if (url.startsWith('turso://')) {
    url = 'libsql://' + url.slice('turso://'.length);
  }

  // URL remota (Turso) informada explicitamente
  if (url && !url.startsWith('file:') && !url.startsWith('postgres')) {
    return { url, authToken };
  }

  // Fallback local: arquivo SQLite dentro de backend/data/
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, 'viva_mulher.db');
  return { url: `file:${filePath}`, authToken: undefined };
}

const config = resolveConfig();
const client = createClient(config);

/**
 * Executa uma query e devolve as linhas.
 * @param {string} sql
 * @param {Array} args
 * @returns {Promise<Array>}
 */
async function all(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

/**
 * Executa uma query e devolve a primeira linha (ou null).
 */
async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows.length ? rows[0] : null;
}

/**
 * Executa um comando de escrita (INSERT/UPDATE/DELETE).
 */
async function run(sql, args = []) {
  return client.execute({ sql, args });
}

module.exports = {
  client,
  all,
  get,
  run,
  mode: config.url.startsWith('file:') ? 'local-file' : 'remote-turso',
  location: config.url,
  dataDir
};
