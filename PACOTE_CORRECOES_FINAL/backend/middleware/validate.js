/**
 * Viva Mulher - Botão de Pânico
 * Middleware genérico de validação de payload.
 *
 * Uso dentro de uma rota:
 *   const { requireFields } = require('../middleware/validate');
 *   router.post('/', requireFields(['eventId']), (req, res) => { ... });
 */

function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => {
      const value = req.body ? req.body[field] : undefined;
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    next();
  };
}

module.exports = { requireFields };
