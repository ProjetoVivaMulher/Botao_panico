/**
 * Viva Mulher - Botão de Pânico
 * Service Worker para suporte a PWA e funcionamento offline resiliente
 */

const CACHE_NAME = 'viva-mulher-v113';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/api.js',
  './js/user.js',
  './js/geolocation.js',
  './js/accessibility.js',
  './js/emergency-message.js',
  './js/contacts.js',
  './js/camouflage.js',
  './js/audio.js',
  './js/audio-store.js',
  './js/app.js',
  './js/pwa-install.js',
  './manifest.json',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de versões antigas de cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia Stale-While-Revalidate para garantir app atualizado e offline funcional
self.addEventListener('fetch', (event) => {
  // Só trata requisições GET do próprio app (ignora API, analytics e outros domínios)
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  let sameOrigin = false;
  try {
    sameOrigin = new URL(event.request.url).origin === self.location.origin;
  } catch (e) {
    return;
  }
  if (!sameOrigin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      // Busca na rede em background para atualizar o cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse || (event.request.mode === 'navigate' ? cache.match('./index.html') : null);
        });

      return cachedResponse || fetchPromise;
    })
  );
});
