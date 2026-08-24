/**
 * Viva Mulher - Botão de Pânico
 * Repositório de chamados de emergência.
 *
 * Esta é a única porta de entrada para ler/escrever chamados. Gabriel (B3) e
 * Everaldo (B4) usam este arquivo — nenhum dos dois deve manter uma lista em
 * memória paralela.
 */

const { createJsonStore } = require('../db/jsonStore');
const { createAlert } = require('../models/Alert');

const store = createJsonStore('alerts.json');

function insert(input) {
  const alerts = store.readAll();
  const alert = createAlert(input);
  alerts.unshift(alert);
  store.writeAll(alerts);
  return alert;
}

function list() {
  return store.readAll();
}

function findById(id) {
  return store.readAll().find((a) => a.id === id) || null;
}

/**
 * Atualiza um chamado existente. `changes` deve conter pelo menos os campos
 * que mudaram; `status`, se presente, também é anexado em `status_history`.
 * Não valida transição de status aqui — isso é responsabilidade de
 * `backend/services/statusTransitions.js` (Gabriel), chamado antes deste update.
 */
function update(id, changes) {
  const alerts = store.readAll();
  const index = alerts.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updated = { ...alerts[index], ...changes, updated_at: now };

  if (changes.status && changes.status !== alerts[index].status) {
    updated.status_history = [...(alerts[index].status_history || []), { status: changes.status, at: now }];
  }

  alerts[index] = updated;
  store.writeAll(alerts);
  return updated;
}

module.exports = { insert, list, findById, update };
