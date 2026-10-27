/**
 * Viva Mulher - Botão de Pânico
 * Validadores de dados de cadastro (telefone brasileiro, data de nascimento, PIN).
 */

const crypto = require('crypto');

/**
 * Remove tudo que não é dígito.
 */
function onlyDigits(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

/**
 * Normaliza um telefone brasileiro para o formato E.164 (55DDNUMERO).
 * Aceita 10 ou 11 dígitos (DDD + número) ou já com o 55 na frente.
 * Retorna null se não for um número brasileiro plausível.
 */
function normalizePhone(raw) {
  let digits = onlyDigits(raw);

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // DDD válido: 11 a 99 (não começa com 0/1x de operadora)
  if (digits.length !== 10 && digits.length !== 11) return null;

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (Number.isNaN(ddd) || ddd < 11 || ddd > 99) return null;

  const subscriber = digits.slice(2);
  // Celular (11 dígitos) precisa começar com 9; fixo pode ser 2-5.
  if (subscriber.length === 9 && subscriber[0] !== '9') return null;
  if (subscriber.length === 8 && !/^[2-5]/.test(subscriber)) return null;

  return '55' + digits;
}

/**
 * Valida e normaliza data de nascimento (aceita "AAAA-MM-DD" ou "DD/MM/AAAA").
 * Regras: data real, não futura, idade entre 0 e 120 anos.
 * Retorna { ok, iso, error }.
 */
function normalizeBirthDate(raw) {
  if (!raw) return { ok: false, error: 'Data de nascimento obrigatória.' };

  let year, month, day;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);

  if (iso) {
    [, year, month, day] = iso;
  } else if (br) {
    [, day, month, year] = br;
  } else {
    return { ok: false, error: 'Use o formato DD/MM/AAAA.' };
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const date = new Date(Date.UTC(y, m - 1, d));

  const realDate =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d;

  if (!realDate) return { ok: false, error: 'Data de nascimento inválida.' };

  const now = new Date();
  if (date.getTime() > now.getTime()) {
    return { ok: false, error: 'A data de nascimento não pode ser no futuro.' };
  }

  const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age > 120) return { ok: false, error: 'Data de nascimento inválida.' };

  const pad = (n) => String(n).padStart(2, '0');
  return { ok: true, iso: `${y}-${pad(m)}-${pad(d)}` };
}

/**
 * Normaliza e valida e-mail. O e-mail é OPCIONAL no cadastro:
 * vazio devolve { ok: true, email: null }.
 * Retorna { ok, email, error }.
 */
function normalizeEmail(raw) {
  const value = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!value) return { ok: true, email: null };
  if (value.length > 254) return { ok: false, error: 'E-mail muito longo.' };
  // Formato simples: algo@dominio.tld (sem espaços, um único @)
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(value)) {
    return { ok: false, error: 'E-mail inválido. Ex.: maria@email.com' };
  }
  return { ok: true, email: value };
}

/**
 * Diz se o identificador de login é um e-mail (tem "@") ou um telefone.
 */
function looksLikeEmail(raw) {
  return String(raw == null ? '' : raw).includes('@');
}

function isValidFullName(raw) {
  const name = String(raw == null ? '' : raw).trim();
  if (name.length < 3 || name.length > 120) return false;
  // Precisa ter ao menos duas letras (nome e sobrenome) — evita "ana" solto? Não:
  // exigimos nome + sobrenome (duas palavras).
  return name.split(/\s+/).filter((p) => p.length >= 2).length >= 2;
}

function hashPin(pin) {
  if (!pin) return null;
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function verifyPin(pin, hash) {
  if (!hash) return false;
  return hashPin(pin) === hash;
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Gera um token de acesso opaco (256 bits) para autorizar operações da usuária.
 * NUNCA é derivado do telefone/id — é um segredo aleatório por cadastro.
 */
function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Comparação em tempo constante de dois segredos (token/credencial).
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  onlyDigits,
  normalizePhone,
  normalizeEmail,
  looksLikeEmail,
  normalizeBirthDate,
  isValidFullName,
  hashPin,
  verifyPin,
  newId,
  newToken,
  safeEqual
};
