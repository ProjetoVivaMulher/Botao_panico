/**
 * Viva Mulher - Botão de Pânico
 * Logs estruturados de tentativas de envio e mudanças de status.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const logFile = path.join(dataDir, 'logs.jsonl');

function ensureLogFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '', 'utf8');
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  if (phone.length <= 4) return '****';
  return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}

function appendLog(entry) {
  ensureLogFile();
  const line = JSON.stringify({ ...entry, at: new Date().toISOString() });
  fs.appendFileSync(logFile, line + '\n', 'utf8');
  console.log('[log]', line);
}

function info(message, meta = {}) {
  appendLog({ level: 'info', message, ...meta });
}

function warn(message, meta = {}) {
  appendLog({ level: 'warn', message, ...meta });
}

function error(message, meta = {}) {
  appendLog({ level: 'error', message, ...meta });
}

function logAlertCreated(alert) {
  appendLog({
    event: 'alert_created',
    alertId: alert.id,
    targetPhoneMasked: maskPhone(alert.targetPhone),
    hasLocation: alert.latitude !== null && alert.longitude !== null
  });
}

function logStatusChange(alertId, fromStatus, toStatus) {
  appendLog({
    event: 'status_changed',
    alertId,
    from: fromStatus,
    to: toStatus
  });
}

function readAllLogs() {
  ensureLogFile();
  const raw = fs.readFileSync(logFile, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

module.exports = {
  info,
  warn,
  error,
  logAlertCreated,
  logStatusChange,
  readAllLogs
};
