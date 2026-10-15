/**
 * Viva Mulher - Botão de Pânico
 * App Express (middlewares + rotas), separado do `listen`.
 *
 * Mantido separado para rodar tanto como servidor local (server.js) quanto
 * como FUNÇÃO SERVERLESS na Vercel (api/index.js).
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { securityHeaders, rateLimiter } = require('./middleware/security');
const { sanitizeInput } = require('./middleware/validate');

const app = express();

// 1. Headers de Segurança HTTP Globais
app.use(securityHeaders);

// 2. Configuração Segura de CORS (Apenas origens autorizadas)
// Origens extras podem ser adicionadas em ALLOWED_ORIGINS (separadas por vírgula).
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  'https://botao-panico-ten.vercel.app',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080'
].concat(envOrigins);

// Permitir qualquer *.vercel.app SOMENTE se ALLOW_VERCEL=1 (padrão: desligado).
const allowVercel = process.env.ALLOW_VERCEL === '1';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowVercel && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo CORS de segurança do Viva Mulher.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));

// 3. Proteção contra Payload Overload e Prototype Pollution / Sanitização
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput);

// 4. Rate Limiting Geral e Específico
app.use('/api/', rateLimiter({ windowMs: 60 * 1000, max: 120, message: 'Muitas requisições. Tente novamente em 1 minuto.' }));
app.use('/api/alerts', rateLimiter({ windowMs: 60 * 1000, max: 20, message: 'Limite de criação de chamados atingido. Aguarde 1 minuto.' }));
// Anti força-bruta no acesso (login/reconfirmação) — janela longa, poucas tentativas.
app.use('/api/users/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Muitas tentativas de acesso. Aguarde alguns minutos.' }));
app.use('/api/users', rateLimiter({ windowMs: 60 * 1000, max: 40, message: 'Muitas requisições de cadastro. Aguarde um instante.' }));

// 5. Servir arquivos de áudio gravados de forma segura
//    (atenção: na Vercel o disco é efêmero — uploads não persistem entre execuções)
const uploadsStaticDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'viva-mulher-uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsStaticDir, {
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
const usersRouter = require('./routes/users');
const { ensureSchema } = require('./db/schema');

app.use('/api/users', usersRouter);
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

// 9. Garante o esquema do banco (libSQL/SQLite) antes de atender requisições.
//    `ready` é aguardado tanto pelo servidor local quanto pela função serverless.
const ready = ensureSchema();

module.exports = { app, ready };
