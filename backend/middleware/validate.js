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
// Prevenção de Prototype Pollution e Sanitização básica de Strings
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Bloqueia injeção de propriedades maliciosas
    }
    const val = obj[key];
    if (typeof val === 'string') {
      clean[key] = val.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } else if (typeof val === 'object') {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
}

module.exports = {
  requireFields,
  validateCoordinates,
  sanitizeInput,
  sanitizeObject
};
