// ============================================================
// Meu Estudo Organizado — service worker
// Cacheia o essencial do app para uso offline (app shell).
// Usa caminhos relativos para funcionar em qualquer subpasta (GitHub Pages).
// ============================================================
const CACHE_NAME = 'meo-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './firebase-config.js',
  './manifest.webmanifest',
  './icone.svg',
  './icone-192.png',
  './icone-512.png',
  './js/utils.js',
  './js/icons-data.js',
  './js/db.js',
  './js/sync.js',
  './js/calendar.js',
  './js/pomodoro.js',
  './js/flashcards.js',
  './js/forms.js',
  './js/views.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('Falha ao pré-cachear', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Não interceptar chamadas para outros domínios (Firebase, Google, CDNs, fontes)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
