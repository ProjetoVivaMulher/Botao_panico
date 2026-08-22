/**
 * Viva Mulher - Botão de Pânico
 * Modelo do "chamado" de emergência.
 *
 * Mantém os mesmos nomes de campo que já existiam no protótipo (id, latitude,
 * longitude, accuracy, mapsUrl, targetPhone, created_at) em vez de inventar
 * nomes novos — isso preserva compatibilidade com o que o frontend já envia
 * e evita quebrar código que já funciona.
 *
 * Dados pessoais da vítima (nome, telefone de contato) não são duplicados
 * aqui: o "targetPhone" é apenas o número de destino do disparo, não um
 * cadastro de identidade.
 */

const STATUSES = ['disparado', 'em_atendimento', 'encerrado', 'cancelado'];

function generateId() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `EVT-${stamp}-${random}`;
}

/**
 * Cria um novo registro de chamado a partir dos dados recebidos do frontend.
 * Campos não confiáveis (status, timestamps) nunca vêm do cliente.
 */
function createAlert(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.eventId || generateId(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy: input.accuracy ?? null,
    mapsUrl: input.mapsUrl ?? null,
    targetPhone: input.targetPhone || process.env.DEFAULT_SOCORRO_PHONE || null,
    mensagem: input.mensagem ?? null,
    status: 'disparado',
    created_at: now,
    updated_at: now,
    status_history: [{ status: 'disparado', at: now }]
  };
}

module.exports = { createAlert, STATUSES };
