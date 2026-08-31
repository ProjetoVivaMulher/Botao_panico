/**
 * Viva Mulher - Botão de Pânico
 * Repositório de chamados de emergência.
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

// Alias compatível com o controller alerts.js
function create(input) {
  return insert(input);
}

function list() {
  return store.readAll();
}

// Suporte a filtros de consulta (ex.: status, user_id, limit, offset)
function findAll(filters = {}, pagination = {}) {
  let alerts = store.readAll();

  if (filters.status) {
    alerts = alerts.filter(a => a.status === filters.status);
  }
  if (filters.user_id) {
    alerts = alerts.filter(a => a.user_id === filters.user_id);
  }

  const offset = parseInt(pagination.offset, 10) || 0;
  const limit = parseInt(pagination.limit, 10) || alerts.length;

  return alerts.slice(offset, offset + limit);
}

function findById(id) {
  return store.readAll().find((a) => a.id === id) || null;
}

/**
 * Atualiza um chamado existente.
 */
function update(id, changes) {
  const alerts = store.readAll();
  const index = alerts.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const current = alerts[index];
  const updated = { ...current, ...changes, updated_at: now };

  if (changes.status && changes.status !== current.status) {
    updated.status_history = [...(current.status_history || []), { status: changes.status, at: now }];
  }

  alerts[index] = updated;
  store.writeAll(alerts);
  return updated;
}

module.exports = {
  insert,
  create,
  list,
  findAll,
  findById,
  update
};
