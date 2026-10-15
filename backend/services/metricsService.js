/**
 * Viva Mulher - Botão de Pânico
 * Métricas básicas a partir dos chamados já registrados.
 */

const alertsRepository = require('../repositories/alertsRepository');

function average(numbers) {
  const valid = numbers.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / valid.length);
}

/**
 * Calcula métricas a partir dos tempos já gravados em `alert.timings`
 * (preenchidos por computeTimings durante as transições de status).
 *
 * Mapeamento acordado (ver backend/schema/alert.schema.md):
 *  - T1 = active  -> assigned  = dispatch_delay_seconds
 *  - T2 = assigned-> arrived   = response_time_seconds
 *  - T3 = active  -> resolved  = total_resolution_seconds
 */
async function computeMetrics() {
  const alerts = await alertsRepository.list();

  const byStatus = alerts.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const t1 = alerts.map((a) => a.timings && a.timings.dispatch_delay_seconds);
  const t2 = alerts.map((a) => a.timings && a.timings.response_time_seconds);
  const t3 = alerts.map((a) => a.timings && a.timings.total_resolution_seconds);

  return {
    totalAlerts: alerts.length,
    byStatus,
    avgT1Seconds: average(t1),
    avgT2Seconds: average(t2),
    avgT3Seconds: average(t3),
    geradoEm: new Date().toISOString()
  };
}

module.exports = { computeMetrics };
