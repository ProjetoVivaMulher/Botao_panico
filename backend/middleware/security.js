/**
 * Viva Mulher - Botão de Pânico
 * Middleware de Segurança Avançada & Proteção (OWASP & Anti-Abuso)
 */

// 1. Headers de Segurança HTTP (Proteção contra Clickjacking, XSS, MIME-sniffing)
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');
  
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Desativa header 'X-Powered-By' para não expor a stack Express
  res.removeHeader('X-Powered-By');
  next();
}

// 2. Rate Limiting em memória (Proteção contra spam / DoS) - Zero dependências externas
//
// Cada limitador tem o SEU PRÓPRIO contador (Map por IP).
// Antes todos compartilhavam um único Map global, então qualquer requisição a
// /api/* consumia a cota do login: um POST /api/users/login empilhava 3 marcas
// (geral + /api/users + /api/users/login) e a usuária podia levar 429 no login
// sem ter errado o PIN uma única vez.
const limiterBuckets = [];

function createBucket(windowMs) {
  const bucket = { entries: new Map(), windowMs };
  limiterBuckets.push(bucket);
  return bucket;
}

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // Janela padrão: 1 minuto
  const maxRequests = options.max || 60; // Máximo de requisições na janela
  const message = options.message || 'Muitas requisições. Por favor, aguarde alguns instantes.';
  const bucket = createBucket(windowMs);

  return (req, res, next) => {
    // `x-forwarded-for` pode vir com uma lista ("cliente, proxy1, proxy2").
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
      forwarded ||
      req.socket.remoteAddress ||
      'unknown-ip';
    const now = Date.now();

    if (!bucket.entries.has(ip)) {
      bucket.entries.set(ip, []);
    }

    const timestamps = bucket.entries.get(ip);
    // Remove registros mais velhos que a janela
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift();
    }

    if (timestamps.length >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        success: false,
        error: message
      });
    }

    timestamps.push(now);
    next();
  };
}

// Limpeza periódica dos contadores de rate limiting a cada 10 minutos.
// Cada contador é podado pela própria janela (a do login é de 15 minutos).
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const bucket of limiterBuckets) {
    for (const [ip, timestamps] of bucket.entries.entries()) {
      while (timestamps.length > 0 && timestamps[0] <= now - bucket.windowMs) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        bucket.entries.delete(ip);
      }
    }
  }
}, 10 * 60 * 1000);

// Não segura o processo vivo só por causa da limpeza (importante no serverless).
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

module.exports = {
  securityHeaders,
  rateLimiter
};
