// ============================================================
// Service worker: сохраняет файлы приложения в кеш,
// чтобы оно открывалось и работало без интернета.
// При изменении файлов увеличивайте номер версии в CACHE.
// ============================================================

const CACHE = 'pecs-v1';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './icons/icon.svg',
  './js/app.js',
  './js/db.js',
  './js/defaults.js',
  './js/speech.js',
  './js/media.js',
  './js/board.js',
  './js/editor.js',
  './js/settings.js',
  './js/backup.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// Удаляем старые версии кеша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Сначала берём из кеша, если файла нет — идём в сеть
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(event.request))
  );
});
