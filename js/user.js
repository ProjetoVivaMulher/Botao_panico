/**
 * Viva Mulher - Botão de Pânico
 * Módulo de cadastro/identidade da usuária.
 *
 * Regra de ouro: o cadastro é feito uma vez e reconfirmado a cada 45 dias,
 * mas NADA aqui pode impedir o acionamento do botão de pânico. Por isso,
 * todo cadastro também funciona offline (fica pendente de sincronizar).
 */

const UserModule = (function () {
  'use strict';

  const KEY = 'viva_mulher_user_profile';
  const CONSENT_KEY = 'viva_mulher_consents';

  // Guarda o PIN apenas como hash (nunca em texto puro no aparelho).
  async function hashPin(pin) {
    const value = 'viva-mulher:' + String(pin);
    if (window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
      try {
        const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { /* usa o fallback abaixo */ }
    }
    // Fallback para navegadores sem Web Crypto (ex.: contexto não seguro)
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'fnv1a-' + (h >>> 0).toString(16);
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function write(profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('[UserModule] Não foi possível salvar o perfil:', e);
    }
    return profile;
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(CONSENT_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function consentVersion() {
    return (window.APP_CONFIG && window.APP_CONFIG.CONSENT_VERSION) || '1.0';
  }

  function readConsents() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeConsents(consents) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consents));
    } catch (e) {
      /* ignore */
    }
    return consents;
  }

  /**
   * Registra um consentimento localmente, com data/hora e versão do termo.
   * Vale mesmo sem cadastro ("continuar sem cadastro") e serve como prova (LGPD).
   */
  function recordConsent(kind, granted) {
    const consents = readConsents();
    consents[kind] = { granted: !!granted, at: new Date().toISOString(), version: consentVersion() };
    return writeConsents(consents);
  }

  function localConsent(kind) {
    const c = readConsents()[kind];
    return !!(c && c.granted);
  }

  function getConsents() {
    return readConsents();
  }

  function daysSince(iso) {
    if (!iso) return Infinity;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return Infinity;
    return (Date.now() - t) / (1000 * 60 * 60 * 24);
  }

  // Converte a resposta do servidor no formato local
  function fromServer(user) {
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      birthDate: user.birthDate,
      hasPin: !!user.hasPin,
      consentLgpd: !!user.consentLgpd,
      consentLocation: !!user.consentLocation,
      selfDeclaredWoman: !!user.selfDeclaredWoman,
      lastConfirmedAt: user.lastConfirmedAt || new Date().toISOString(),
      unsynced: false
    };
  }

  function getProfile() {
    return read();
  }

  // Cabeçalho de autorização da usuária (token opaco gerado no cadastro/login)
  function authHeaders(p) {
    return p && p.token ? { 'x-user-token': p.token } : {};
  }

  function isRegistered() {
    const p = read();
    return !!(p && p.id);
  }

  function needsReconfirmation() {
    const p = read();
    if (!p || !p.id) return false;
    const limit = (window.APP_CONFIG && window.APP_CONFIG.RECONFIRM_DAYS) || 45;
    return daysSince(p.lastConfirmedAt) >= limit;
  }

  function hasConsent() {
    const p = read();
    return !!(p && p.consentLgpd) || localConsent('lgpd');
  }

  function hasLocationConsent() {
    const p = read();
    return !!(p && p.consentLocation) || localConsent('location');
  }

  function formatPhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    const local = d.startsWith('55') && d.length > 11 ? d.slice(2) : d;
    if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    return d;
  }

  // PIN do cadastro — também é o código para sair do modo disfarce.
  // O valor em texto puro nunca é persistido; apenas o hash e o tamanho.
  function getPinLength() {
    const p = read();
    if (!p) return null;
    if (p.pinLength) return Number(p.pinLength);
    if (p.pin) return String(p.pin).length;
    return null;
  }

  async function verifyPin(pin) {
    const p = read();
    if (!p || pin == null) return false;
    const candidate = String(pin);
    if (p.pinHash) return (await hashPin(candidate)) === p.pinHash;
    if (p.pin) return candidate === String(p.pin); // versão antiga, até a migração
    return false;
  }

  async function setPin(pin) {
    const p = read();
    if (!p) return null;
    if (pin) {
      p.pinHash = await hashPin(pin);
      p.pinLength = String(pin).length;
      p.hasPin = true;
    } else {
      p.pinHash = null;
      p.pinLength = null;
      p.hasPin = false;
    }
    delete p.pin;
    return write(p);
  }

  // Converte perfis antigos (que guardavam o PIN em texto puro) para hash.
  async function migratePin() {
    const p = read();
    if (!p || !p.pin) return false;
    p.pinHash = await hashPin(p.pin);
    p.pinLength = String(p.pin).length;
    p.hasPin = true;
    delete p.pin;
    write(p);
    return true;
  }

  /**
   * Cadastro único. Se o servidor estiver fora do ar, salva localmente como
   * pendente de sincronização (o pânico continua funcionando).
   */
  async function register({ fullName, phone, birthDate, pin, consentLgpd, consentLocation, selfDeclaredWoman }) {
    const payload = { fullName, phone, birthDate, pin: pin || null, consentLgpd, consentLocation, selfDeclaredWoman: !!selfDeclaredWoman };
    const res = await Api.post('/api/users', payload);

    if (res.ok && res.data && res.data.user) {
      const prev = read();
      const profile = fromServer(res.data.user);
      profile.pinHash = pin ? await hashPin(pin) : (prev && prev.pinHash) || null;
      profile.pinLength = pin ? String(pin).length : (prev && prev.pinLength) || null;
      profile.token = res.data.token || (prev && prev.token) || null;
      return { ok: true, profile: write(profile) };
    }

    // Telefone já cadastrado: tenta recuperar via login
    if (res.status === 409 && res.data && res.data.userId) {
      const login = await login(phone, pin);
      if (login.ok) return login;
      return { ok: false, status: 409, error: 'Este telefone já possui cadastro. Informe o PIN para entrar.' };
    }

    // Servidor indisponível: guarda local para não travar a usuária
    if (res.offline) {
      return {
        ok: true,
        offline: true,
        profile: write({
          id: 'local-' + Date.now(),
          fullName,
          phone,
          birthDate,
          pinHash: pin ? await hashPin(pin) : null,
          pinLength: pin ? String(pin).length : null,
          hasPin: !!pin,
          consentLgpd: !!consentLgpd,
          consentLocation: !!consentLocation,
          selfDeclaredWoman: !!selfDeclaredWoman,
          lastConfirmedAt: new Date().toISOString(),
          unsynced: true
        })
      };
    }

    return { ok: false, status: res.status, error: (res.data && res.data.error) || 'Não foi possível cadastrar.' };
  }

  async function login(phone, pin) {
    const res = await Api.post('/api/users/login', { phone, pin: pin || null });
    if (res.ok && res.data && res.data.user) {
      const prev = read();
      const profile = fromServer(res.data.user);
      profile.pinHash = pin ? await hashPin(pin) : (prev && prev.pinHash) || null;
      profile.pinLength = pin ? String(pin).length : (prev && prev.pinLength) || null;
      profile.token = res.data.token || (prev && prev.token) || null;
      return { ok: true, profile: write(profile) };
    }
    if (res.offline) return { ok: false, offline: true, error: 'Sem conexão.' };
    return { ok: false, status: res.status, error: (res.data && res.data.error) || 'Não foi possível entrar.' };
  }

  async function confirm(pin) {
    const p = read();
    if (!p || !p.id) return { ok: false, error: 'Sem cadastro.' };

    if (p.unsynced) {
      return register({
        fullName: p.fullName, phone: p.phone, birthDate: p.birthDate,
        pin: pin || null, consentLgpd: p.consentLgpd, consentLocation: p.consentLocation,
        selfDeclaredWoman: p.selfDeclaredWoman
      });
    }

    const res = await Api.post(`/api/users/${p.id}/confirm`, { pin: pin || null }, authHeaders(p));
    if (res.ok && res.data && res.data.user) {
      const profile = fromServer(res.data.user);
      profile.pinHash = pin ? await hashPin(pin) : p.pinHash || null;
      profile.pinLength = pin ? String(pin).length : p.pinLength || null;
      profile.token = res.data.token || p.token || null;
      return { ok: true, profile: write(profile) };
    }
    if (res.offline) {
      // Confirma localmente mesmo sem servidor
      p.lastConfirmedAt = new Date().toISOString();
      p.unsynced = true;
      if (pin) {
        p.pinHash = await hashPin(pin);
        p.pinLength = String(pin).length;
        p.hasPin = true;
        delete p.pin;
      }
      return { ok: true, offline: true, profile: write(p) };
    }
    return { ok: false, status: res.status, error: (res.data && res.data.error) || 'Não foi possível confirmar.' };
  }

  // Tenta reenviar um cadastro que ficou pendente
  async function syncPending() {
    const p = read();
    if (!p || !p.unsynced || String(p.id).startsWith('local-')) {
      if (!p || !p.unsynced) return false;
    }
    const res = await register({
      fullName: p.fullName, phone: p.phone, birthDate: p.birthDate,
      pin: null, consentLgpd: p.consentLgpd, consentLocation: p.consentLocation,
      selfDeclaredWoman: p.selfDeclaredWoman
    });
    return !!res.ok && !res.offline;
  }

  async function updateConsent({ consentLgpd, consentLocation }) {
    const p = read();
    if (!p || !p.id || String(p.id).startsWith('local-')) {
      if (p) {
        if (consentLgpd !== undefined) p.consentLgpd = consentLgpd;
        if (consentLocation !== undefined) p.consentLocation = consentLocation;
        write(p);
      }
      return { ok: true, offline: true };
    }
    const res = await Api.patch(`/api/users/${p.id}/consent`, { consentLgpd, consentLocation }, authHeaders(p));
    if (res.ok && res.data && res.data.user) {
      const profile = fromServer(res.data.user);
      profile.pinHash = p.pinHash || null;
      profile.pinLength = p.pinLength || null;
      profile.token = p.token || null;
      return { ok: true, profile: write(profile) };
    }
    if (p) {
      if (consentLgpd !== undefined) p.consentLgpd = consentLgpd;
      if (consentLocation !== undefined) p.consentLocation = consentLocation;
      write(p);
    }
    return { ok: !!res.ok, offline: res.offline };
  }

  /**
   * Direito ao esquecimento (LGPD): apaga os dados no servidor (exige token)
   * e também limpa o que estiver salvo localmente.
   */
  async function remove() {
    const p = read();
    if (!p || !p.id) {
      clear();
      return { ok: true, offline: true };
    }
    if (String(p.id).startsWith('local-')) {
      clear();
      return { ok: true, offline: true };
    }
    const res = await Api.del(`/api/users/${p.id}`, authHeaders(p));
    if (res.ok || res.offline || res.status === 401 || res.status === 404) {
      clear();
    }
    return { ok: res.ok, offline: res.offline, status: res.status };
  }

  return {
    getProfile,
    isRegistered,
    needsReconfirmation,
    hasConsent,
    hasLocationConsent,
    formatPhone,
    getPinLength,
    verifyPin,
    setPin,
    migratePin,
    register,
    login,
    confirm,
    syncPending,
    updateConsent,
    recordConsent,
    localConsent,
    getConsents,
    remove,
    clear
  };
})();

if (typeof window !== 'undefined') {
  window.UserModule = UserModule;
}
