const express = require('express');
const router = express.Router();

const alertsRepository = require('../repositories/alertsRepository');
const { isValidTransition, computeTimings } = require('../services/statusTransitions');
const { requireBasicAuth } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const logger = require('../services/logger');

// POST /api/alerts - Criação de novo alerta (Público / App Mobile)
router.post('/', requireFields(['user_id', 'location']), async (req, res, next) => {
  try {
    const { user_id, location, message, battery_level } = req.body;

    const alertData = {
      user_id,
      location,
      message: message || '',
      battery_level: battery_level !== undefined ? battery_level : null,
      status: 'active',
      timings: {
        triggered_at: new Date().toISOString()
      }
    };

    const newAlert = await alertsRepository.create(alertData);
    logger.info(`Alerta criado com sucesso: ${newAlert.id}`);
    return res.status(201).json(newAlert);
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts - Listagem de alertas com filtros (Autenticado)
router.get('/', requireBasicAuth, async (req, res, next) => {
  try {
    const { status, user_id, limit, offset } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (user_id) filters.user_id = user_id;

    const alerts = await alertsRepository.findAll(filters, { limit, offset });
    return res.status(200).json(alerts);
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/:id - Detalhes de um alerta específico (Autenticado)
router.get('/:id', requireBasicAuth, async (req, res, next) => {
  try {
    const alert = await alertsRepository.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    return res.status(200).json(alert);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/alerts/:id/status - Atualização de status e timings (Autenticado)
router.patch('/:id/status', requireBasicAuth, requireFields(['status']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: nextStatus, note, assigned_to } = req.body;

    const alert = await alertsRepository.findById(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    if (!isValidTransition(alert.status, nextStatus)) {
      return res.status(422).json({
        error: `Transição inválida de status: de '${alert.status}' para '${nextStatus}'`
      });
    }

    const updatedTimings = computeTimings(alert.timings, nextStatus);

    const updatePayload = {
      status: nextStatus,
      timings: updatedTimings
    };

    if (assigned_to) updatePayload.assigned_to = assigned_to;
    if (note) updatePayload.resolution_note = note;

    const updatedAlert = await alertsRepository.update(id, updatePayload);
    logger.info(`Status do alerta ${id} atualizado para ${nextStatus}`);

    return res.status(200).json(updatedAlert);
  } catch (error) {
    next(error);
  }
});

module.exports = router;