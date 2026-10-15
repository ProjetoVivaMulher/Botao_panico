/**
 * Viva Mulher - Botão de Pânico
 * Servidor LOCAL (Express). Em produção na Vercel, a entrada é api/index.js.
 *
 * Rodar: npm start
 */

const { app, ready } = require('./app');

const PORT = process.env.PORT || 3001;

// Prevenção de travamento do processo Node.js por exceções não capturadas
process.on('unhandledRejection', (reason) => {
  console.error('[Process Safety] Rejeição de Promise não tratada:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Safety] Exceção não capturada:', err);
});

// Garante o esquema do banco antes de aceitar requisições
ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Viva Mulher Backend Seguro rodando na porta ${PORT}`);
      console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
      const db = require('./db/database');
      console.log(`🗄️  Banco: ${db.mode} (${db.location})`);
    });
  })
  .catch((err) => {
    console.error('[startup] Falha ao preparar o banco de dados:', err);
    process.exit(1);
  });
