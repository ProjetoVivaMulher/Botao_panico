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
const requestLog = new Map();

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // Janela padrão: 1 minuto
  const maxRequests = options.max || 60; // Máximo de requisições na janela
  const message = options.message || 'Muitas requisições. Por favor, aguarde alguns instantes.';

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    if (!requestLog.has(ip)) {
      requestLog.set(ip, []);
    }

    const timestamps = requestLog.get(ip);
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

// Limpeza periódica do mapa de rate limiting a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestLog.entries()) {
    while (timestamps.length > 0 && timestamps[0] <= now - 60000) {
      timestamps.shift();
    }
    if (timestamps.length === 0) {
      requestLog.delete(ip);
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  securityHeaders,
  rateLimiter
};
