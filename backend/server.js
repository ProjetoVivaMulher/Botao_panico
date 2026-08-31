/**
 * Viva Mulher - Botão de Pânico
 * Servidor Backend API (Express.js) - Versão Protegida (LGPD & Segurança)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração Segura de CORS (Apenas origens autorizadas)
const allowedOrigins = [
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
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS de segurança do Viva Mulher.'));
    }
  },
  // PATCH adicionado: os endpoints de status operacional (B3) precisam dele.
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos de áudio gravados de forma segura
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  }
}));

// Rotas da API
// alerts, contacts e audio já existiam no projeto — preservados sem alteração de contrato.
const alertsRouter = require('./routes/alerts');
const contactsRouter = require('./routes/contacts');
const audioRouter = require('./routes/audio');

// metrics e notifications são novos (tarefa B4 - Everaldo).
const metricsRouter = require('./routes/metrics');
const notificationsRouter = require('./routes/notifications');

app.use('/api/alerts', alertsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/audio', audioRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/notifications', notificationsRouter);

// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Viva Mulher Backend API (Segurança & LGPD Ativos)',
    timestamp: new Date().toISOString()
  });
});

// 404 e tratamento de erro padronizado (deixar sempre por último)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Viva Mulher Backend Seguro rodando na porta ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
});
