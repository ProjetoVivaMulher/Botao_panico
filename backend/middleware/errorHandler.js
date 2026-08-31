/**
 * Viva Mulher - Botão de Pânico
 * Middleware padronizado de tratamento de erros.
 *
 * Uso: registrar por último em server.js, depois de todas as rotas:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[errorHandler]', err.message);

  // Erro de CORS lançado no server.js
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ success: false, error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Erro interno do servidor.' : err.message
  });
}

module.exports = { notFoundHandler, errorHandler };
