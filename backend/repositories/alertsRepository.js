/**
 * Viva Mulher - Botão de Pânico
 * Repositório de chamados de emergência (banco libSQL/SQLite).
 */

const db = require('../db/database');
const { createAlert } = require('../models/Alert');

function toDb(alert) {
  return {
    id: alert.id,
    user_id: alert.user_id,
    latitude: alert.latitude,
    longitude: alert.longitude,
    accuracy: alert.accuracy,
    maps_url: alert.mapsUrl,
    message: alert.message,
    target_phone: alert.targetPhone,
    battery_level: alert.battery_level,
    status: alert.status,
    status_history: JSON.stringify(alert.status_history || []),
    timings: JSON.stringify(alert.timings || {}),
    created_at: alert.created_at,
    updated_at: alert.updated_at
  };
}

function rowToAlert(row) {
  if (!row) return null;
  let statusHistory = [];
  let timings = {};
  try { statusHistory = JSON.parse(row.status_history || '[]'); } catch (e) { /* ignore */ }
  try { timings = JSON.parse(row.timings || '{}'); } catch (e) { /* ignore */ }

  return {
    id: row.id,
    user_id: row.user_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    mapsUrl: row.maps_url,
    location: {
      lat: row.latitude,
      lng: row.longitude,
      accuracy: row.accuracy,
      mapsUrl: row.maps_url
    },
    message: row.message,
    targetPhone: row.target_phone,
    battery_level: row.battery_level,
    status: row.status,
    status_history: statusHistory,
    timings,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function insert(input) {
  const alert = createAlert(input);
  const r = toDb(alert);
  await db.run(
    `INSERT INTO alerts
       (id, user_id, latitude, longitude, accuracy, maps_url, message, target_phone, battery_level, status, status_history, timings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id, r.user_id, r.latitude, r.longitude, r.accuracy, r.maps_url, r.message,
      r.target_phone, r.battery_level, r.status, r.status_history, r.timings,
      r.created_at, r.updated_at
    ]
  );
  return rowToAlert(await db.get('SELECT * FROM alerts WHERE id = ?', [alert.id]));
}

// Alias compatível com o controller alerts.js
async function create(input) {
  return insert(input);
}

async function list() {
  const rows = await db.all('SELECT * FROM alerts ORDER BY created_at DESC');
  return rows.map(rowToAlert);
}

async function findAll(filters = {}, pagination = {}) {
  const where = [];
  const args = [];
  if (filters.status) { where.push('status = ?'); args.push(filters.status); }
  if (filters.user_id) { where.push('user_id = ?'); args.push(filters.user_id); }

  const offset = parseInt(pagination.offset, 10) || 0;
  const limit = parseInt(pagination.limit, 10) || 100;

  const sql = `SELECT * FROM alerts
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const rows = await db.all(sql, [...args, limit, offset]);
  return rows.map(rowToAlert);
}

async function findById(id) {
  return rowToAlert(await db.get('SELECT * FROM alerts WHERE id = ?', [id]));
}

async function update(id, changes) {
  const current = await findById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const updated = { ...current, ...changes, updated_at: now };

  if (changes.status && changes.status !== current.status) {
    updated.status_history = [...(current.status_history || []), { status: changes.status, at: now }];
  }

  await db.run(
    `UPDATE alerts SET
       user_id = ?, latitude = ?, longitude = ?, accuracy = ?, maps_url = ?,
       message = ?, target_phone = ?, battery_level = ?, status = ?,
       status_history = ?, timings = ?, updated_at = ?
     WHERE id = ?`,
    [
      updated.user_id, updated.latitude, updated.longitude, updated.accuracy,
      updated.mapsUrl, updated.message, updated.targetPhone,
      updated.battery_level, updated.status,
      JSON.stringify(updated.status_history || []), JSON.stringify(updated.timings || {}),
      updated.updated_at, id
    ]
  );

  return findById(id);
}

module.exports = {
  insert,
  create,
  list,
  findAll,
  findById,
  update
};
