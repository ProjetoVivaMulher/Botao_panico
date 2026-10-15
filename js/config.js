/**
 * Viva Mulher - Botão de Pânico
 * Configuração do app (detecção da API e parâmetros gerais).
 *
 * Para apontar para um backend publicado, defina antes deste script:
 *   <script>window.VIVA_API_BASE = 'https://sua-api.vercel.app';</script>
 * ou use <meta name="api-base" content="https://sua-api.vercel.app">
 */

window.APP_CONFIG = (function () {
  const host = location.hostname;
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '' ||
    /^192\.168\./.test(host);

  const meta = document.querySelector('meta[name="api-base"]');
  const metaBase = meta ? meta.getAttribute('content') : '';
  const override = window.VIVA_API_BASE || metaBase || '';

  // Contato padrão da Central de Socorro — PROVISÓRIO.
  // Troque aqui (e em backend/.env -> DEFAULT_SOCORRO_PHONE) quando for definido.
  const SOCORRO_PHONE = window.VIVA_SOCORRO_PHONE || '552139553874';

  return {
    API_BASE: override || (isLocal ? 'http://localhost:3001' : ''),
    SOCORRO_PHONE,
    SOCORRO_NAME: 'Central Viva Mulher (Socorro)',
    RECONFIRM_DAYS: 45,
    REQUEST_TIMEOUT_MS: 8000
  };
})();
