/**
 * Viva Mulher - Botão de Pânico
 * Repositório de usuárias (cadastro único). Banco libSQL/SQLite.
 */

const db = require('../db/database');
const { newId, hashPin, newToken } = require('../services/validators');

const CONFIRM_INTERVAL_DAYS = 45;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email || null,
    birthDate: row.birth_date,
    hasPin: !!row.pin_hash,
    consentLgpd: !!row.consent_lgpd,
    consentLocation: !!row.consent_location,
    consentAt: row.consent_at,
    selfDeclaredWoman: !!row.self_declared_woman,
    selfDeclaredAt: row.self_declared_at,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastConfirmedAt: row.last_confirmed_at,
    needsReconfirmation: isReconfirmationDue(row.last_confirmed_at)
  };
}

function isReconfirmationDue(lastConfirmedAt) {
  if (!lastConfirmedAt) return true;
  const last = new Date(lastConfirmedAt).getTime();
  if (Number.isNaN(last)) return true;
  const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return days >= CONFIRM_INTERVAL_DAYS;
}

async function findByPhone(phone) {
  const row = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
  return row ? rowToUser(row) : null;
}

async function findByEmail(email) {
  if (!email) return null;
  const row = await db.get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]);
  return row ? rowToUser(row) : null;
}

async function findById(id) {
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  return row ? rowToUser(row) : null;
}

async function findRowById(id) {
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

/**
 * Cria a usuária. Espera dados já normalizados/validados pela rota.
 * Gera um token de acesso opaco (guardado só no servidor) usado para
 * autorizar operações sensíveis. Retorna { user, token }.
 */
async function create({ fullName, phone, email, birthDate, pin, consentLgpd, consentLocation, selfDeclaredWoman }) {
  const now = new Date().toISOString();
  const token = newToken();
  const user = {
    id: newId('user'),
    full_name: fullName.trim(),
    phone,
    email: email || null,
    birth_date: birthDate,
    pin_hash: hashPin(pin),
    access_token: token,
    consent_lgpd: consentLgpd ? 1 : 0,
    consent_location: consentLocation ? 1 : 0,
    consent_at: (consentLgpd || consentLocation) ? now : null,
    self_declared_woman: selfDeclaredWoman ? 1 : 0,
    self_declared_at: selfDeclaredWoman ? now : null,
    active: 1,
    created_at: now,
    updated_at: now,
    last_confirmed_at: now
  };

  await db.run(
    `INSERT INTO users
       (id, full_name, phone, email, birth_date, pin_hash, access_token, consent_lgpd, consent_location, consent_at, self_declared_woman, self_declared_at, active, created_at, updated_at, last_confirmed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id, user.full_name, user.phone, user.email, user.birth_date, user.pin_hash, user.access_token,
      user.consent_lgpd, user.consent_location, user.consent_at,
      user.self_declared_woman, user.self_declared_at,
      user.active, user.created_at, user.updated_at, user.last_confirmed_at
    ]
  );

  return { user: await findById(user.id), token };
}

/**
 * Reconfirmação periódica ("manter ativo"): atualiza last_confirmed_at e,
 * opcionalmente, dados editáveis.
 */
async function confirm(id, changes = {}) {
  const current = await findRowById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const fullName = changes.fullName ? changes.fullName.trim() : current.full_name;
  const birthDate = changes.birthDate || current.birth_date;

  await db.run(
    `UPDATE users SET full_name = ?, birth_date = ?, last_confirmed_at = ?, updated_at = ? WHERE id = ?`,
    [fullName, birthDate, now, now, id]
  );

  return findById(id);
}

async function updateConsent(id, { consentLgpd, consentLocation }) {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE users
       SET consent_lgpd = COALESCE(?, consent_lgpd),
           consent_location = COALESCE(?, consent_location),
           consent_at = CASE WHEN ? = 1 OR ? = 1 THEN ? ELSE consent_at END,
           updated_at = ?
     WHERE id = ?`,
    [
      consentLgpd === undefined ? null : (consentLgpd ? 1 : 0),
      consentLocation === undefined ? null : (consentLocation ? 1 : 0),
      consentLgpd ? 1 : 0,
      consentLocation ? 1 : 0,
      now,
      now,
      id
    ]
  );
  return findById(id);
}

async function remove(id) {
  const existing = await findById(id);
  if (!existing) return false;
  await db.run('DELETE FROM contacts WHERE user_id = ?', [id]);
  await db.run('DELETE FROM alerts WHERE user_id = ?', [id]);
  await db.run('DELETE FROM users WHERE id = ?', [id]);
  return true;
}

/**
 * Verifica se a conta está temporariamente bloqueada por excesso de tentativas.
 */
async function isLocked(id) {
  const row = await findRowById(id);
  if (!row || !row.locked_until) return false;
  return new Date(row.locked_until).getTime() > Date.now();
}

/**
 * Quanto falta (em ms) para o bloqueio temporário terminar.
 * Retorna 0 quando a conta não está bloqueada.
 */
async function lockRemainingMs(id) {
  const row = await findRowById(id);
  if (!row || !row.locked_until) return 0;
  return Math.max(0, new Date(row.locked_until).getTime() - Date.now());
}

/**
 * Registra uma tentativa falha de PIN/senha. Bloqueia temporariamente após
 * MAX_FAILED_ATTEMPTS. Retorna { locked, attempts, retryAfterMs }.
 */
async function registerFailedAttempt(id) {
  const row = await findRowById(id);
  if (!row) return { locked: false, attempts: 0, retryAfterMs: 0 };

  const attempts = (row.failed_attempts || 0) + 1;
  let lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : 0;

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = Date.now() + LOCK_WINDOW_MS;
  }

  await db.run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [
    attempts,
    lockedUntil ? new Date(lockedUntil).toISOString() : null,
    id
  ]);

  return {
    locked: attempts >= MAX_FAILED_ATTEMPTS,
    attempts,
    retryAfterMs: lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0
  };
}

/**
 * Zera o contador de tentativas após um acesso bem-sucedido.
 */
async function resetFailedAttempts(id) {
  await db.run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [id]);
}

/**
 * Garante que a usuária tenha um token de acesso opaco (contas antigas podem
 * não ter). Retorna o token existente ou gera e persiste um novo.
 */
async function ensureAccessToken(id) {
  const row = await findRowById(id);
  if (!row) return null;
  if (row.access_token) return row.access_token;

  const token = newToken();
  await db.run('UPDATE users SET access_token = ?, updated_at = ? WHERE id = ?', [
    token,
    new Date().toISOString(),
    id
  ]);
  return token;
}

module.exports = {
  CONFIRM_INTERVAL_DAYS,
  MAX_FAILED_ATTEMPTS,
  create,
  findByPhone,
  findByEmail,
  findById,
  findRowById,
  ensureAccessToken,
  confirm,
  updateConsent,
  remove,
  isLocked,
  lockRemainingMs,
  registerFailedAttempt,
  resetFailedAttempts,
  isReconfirmationDue
};
