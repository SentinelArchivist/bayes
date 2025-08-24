/* Service Worker for Bayes PWA */
const CACHE_VER = 'v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/js/main.js',
  '/js/app.js',
  '/js/algorithms.js',
  '/js/storage.js',
  '/js/charts.js',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VER).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_VER) return caches.delete(k); })))
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // App shell: Cache First
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Others: Network First with fallback to cache then offline page
  event.respondWith(
    fetch(req)
      .then(res => {
        const resClone = res.clone();
        caches.open(CACHE_VER).then(cache => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/offline.html')))
  );
});
