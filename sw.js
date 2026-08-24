/**
 * Viva Mulher - Botão de Pânico
 * Service Worker para suporte a PWA e funcionamento offline
 */

const CACHE_NAME = 'viva-mulher-v103';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/geolocation.js',
  './js/emergency-message.js',
  './js/contacts.js',
  './js/camouflage.js',
  './js/audio.js',
  './js/app.js',
  './js/pwa-install.js',
  './manifest.json',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
