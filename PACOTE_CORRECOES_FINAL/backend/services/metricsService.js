/**
 * Viva Mulher - Botão de Pânico
 * Métricas básicas a partir dos chamados já registrados.
 */

const alertsRepository = require('../repositories/alertsRepository');
const { computeTimings } = require('./statusTransitions');

function average(numbers) {
  const valid = numbers.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / valid.length);
}

function computeMetrics() {
  const alerts = alertsRepository.list();

  const byStatus = alerts.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const timings = alerts.map((a) => computeTimings(a.status_history));

  return {
    totalAlerts: alerts.length,
    byStatus,
    avgT1Ms: average(timings.map((t) => t.t1Ms)),
    avgT2Ms: average(timings.map((t) => t.t2Ms)),
    avgT3Ms: average(timings.map((t) => t.t3Ms)),
    geradoEm: new Date().toISOString()
  };
}

module.exports = { computeMetrics };
