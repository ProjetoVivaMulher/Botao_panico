/**
 * Viva Mulher - Botão de Pânico
 * Cliente HTTP mínimo e resiliente para a API.
 *
 * Nunca lança exceção: sempre devolve { ok, status, data, offline }.
 * Isso garante que a falha do servidor NUNCA impeça o acionamento do pânico.
 */

const Api = {
  base() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
  },

  timeout() {
    return (window.APP_CONFIG && window.APP_CONFIG.REQUEST_TIMEOUT_MS) || 8000;
  },

  async request(method, path, body, headers) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) controller.abort();
    }, this.timeout());

    try {
      const options = {
        method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
        signal: controller ? controller.signal : undefined
      };
      if (body !== undefined) options.body = JSON.stringify(body);

      const res = await fetch(this.base() + path, options);
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }
      return { ok: res.ok, status: res.status, data, offline: false };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        offline: true,
        data: { error: 'Sem conexão com o servidor.' }
      };
    } finally {
      clearTimeout(timer);
    }
  },

  get(path, headers) { return this.request('GET', path, undefined, headers); },
  post(path, body, headers) { return this.request('POST', path, body, headers); },
  patch(path, body, headers) { return this.request('PATCH', path, body, headers); },
  del(path, headers) { return this.request('DELETE', path, undefined, headers); }
};

if (typeof window !== 'undefined') {
  window.Api = Api;
}
