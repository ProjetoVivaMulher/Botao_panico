/**
 * Rota API: /api/metrics
 * Métricas básicas de volume e tempo médio de atendimento.
 * Protegida — uso do painel interno, não é pública.
 */

const express = require('express');
const router = express.Router();

const { requireBasicAuth } = require('../middleware/auth');
const { computeMetrics } = require('../services/metricsService');

router.get('/', requireBasicAuth, (req, res) => {
  res.json({ success: true, data: computeMetrics() });
});

module.exports = router;
