/**
 * Rota API: /api/metrics
 * Métricas básicas de volume e tempo médio de atendimento.
 * Protegida — uso do painel interno, não é pública.
 */

const express = require('express');
const router = express.Router();

const { requireBasicAuth } = require('../middleware/auth');
const { computeMetrics } = require('../services/metricsService');

router.get('/', requireBasicAuth, async (req, res, next) => {
  try {
    const data = await computeMetrics();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
