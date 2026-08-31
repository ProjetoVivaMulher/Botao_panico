/**
 * Viva Mulher - Botão de Pânico
 * Modelo do "chamado" de emergência.
 */

const STATUSES = [
  'active', 'assigned', 'en_route', 'arrived', 'resolved', 'cancelled',
  'disparado', 'em_atendimento', 'encerrado', 'cancelado'
];

function generateId() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `EVT-${stamp}-${random}`;
}

/**
 * Cria um novo registro de chamado a partir dos dados recebidos do frontend ou API.
 */
function createAlert(input = {}) {
  const now = new Date().toISOString();
  const status = input.status || 'active';

  return {
    id: input.eventId || input.id || generateId(),
    user_id: input.user_id || 'anonymous',
    latitude: input.location?.lat ?? input.latitude ?? null,
    longitude: input.location?.lng ?? input.longitude ?? null,
    accuracy: input.location?.accuracy ?? input.accuracy ?? null,
    mapsUrl: input.location?.mapsUrl ?? input.mapsUrl ?? null,
    location: input.location || {
      lat: input.latitude ?? null,
      lng: input.longitude ?? null,
      mapsUrl: input.mapsUrl ?? null,
      accuracy: input.accuracy ?? null
    },
    targetPhone: input.targetPhone || process.env.DEFAULT_SOCORRO_PHONE || null,
    message: input.message ?? input.mensagem ?? '',
    battery_level: input.battery_level !== undefined ? input.battery_level : null,
    status: status,
    timings: input.timings || {
      triggered_at: now
    },
    created_at: now,
    updated_at: now,
    status_history: [{ status: status, at: now }]
  };
}

module.exports = { createAlert, STATUSES, generateId };
