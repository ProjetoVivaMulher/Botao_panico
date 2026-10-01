/**
 * Viva Mulher - Botão de Pânico
 * Middleware de Validação e Sanitização de Entradas
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

// Validação de coordenadas GPS geográficas (Latitude: -90 a 90, Longitude: -180 a 180)
function validateCoordinates(req, res, next) {
  const loc = req.body ? req.body.location : null;
  if (loc && loc.lat !== undefined && loc.lng !== undefined && loc.lat !== null && loc.lng !== null) {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(422).json({
        success: false,
        error: 'Coordenadas geográficas inválidas. Latitude deve estar entre -90 e 90, e Longitude entre -180 e 180.'
      });
    }
  }
  next();
}

module.exports = {
  requireFields,
  validateCoordinates
};
