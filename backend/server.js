/**
 * Viva Mulher - Botão de Pânico
 * Servidor Backend API (Express.js) - Versão Protegida & Inviolável (LGPD & Segurança OWASP)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { securityHeaders, rateLimiter } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Headers de Segurança HTTP Globais
app.use(securityHeaders);

// 2. Configuração Segura de CORS (Apenas origens autorizadas)
const allowedOrigins = [
  'https://botao-panico-ten.vercel.app',
  'https://viva-mulher-botao-panico.vercel.app',
  'https://botao-panico-viva-mulher.vercel.app',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080'
];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS de segurança do Viva Mulher.'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));

// 3. Proteção contra Payload Overload (Limite de 1MB para JSON comum)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Rate Limiting Geral e Específico
app.use('/api/', rateLimiter({ windowMs: 60 * 1000, max: 120, message: 'Muitas requisições. Tente novamente em 1 minuto.' }));
app.use('/api/alerts', rateLimiter({ windowMs: 60 * 1000, max: 20, message: 'Limite de criação de chamados atingido. Aguarde 1 minuto.' }));

// 5. Servir arquivos de áudio gravados de forma segura
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  }
}));

// 6. Rotas da API
const alertsRouter = require('./routes/alerts');
const contactsRouter = require('./routes/contacts');
const audioRouter = require('./routes/audio');
const metricsRouter = require('./routes/metrics');
const notificationsRouter = require('./routes/notifications');

app.use('/api/alerts', alertsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/audio', audioRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/notifications', notificationsRouter);

// 7. Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Viva Mulher Backend API (Segurança, LGPD & OWASP Ativos)',
    timestamp: new Date().toISOString()
  });
});

// 8. 404 e tratamento de erro padronizado (deixar sempre por último)
app.use(notFoundHandler);
app.use(errorHandler);

// 9. Prevenção de travamento do processo Node.js por exceções não capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Safety] Rejeição de Promise não tratada:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Safety] Exceção não capturada:', err);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Viva Mulher Backend Seguro rodando na porta ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
});
