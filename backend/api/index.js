/**
 * Viva Mulher - Botão de Pânico
 * Entrada SERVERLESS da Vercel para o backend.
 *
 * O vercel.json reescreve todas as rotas para esta função, e o Express
 * (app.js) resolve os caminhos /api/... normalmente.
 */

const { app, ready } = require('../app');

module.exports = async (req, res) => {
  try {
    // Garante o esquema do banco (Turso) antes de atender a requisição.
    await ready;
  } catch (err) {
    console.error('[api] Falha ao preparar o banco de dados:', err);
  }
  return app(req, res);
};
