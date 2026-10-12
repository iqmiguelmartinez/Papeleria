// Service Worker de Pixel y Papel (lo comparten index.html y pruebas.html).
// Páginas (HTML): primero internet, y solo si no hay conexión se usa la última copia guardada.
// Así, cada versión que subas a GitHub se ve en cuanto abras la página. Para forzar limpiar todo, cambia CACHE_NAME.
const CACHE_NAME = 'pixel-papel-v4';
const PRECACHE = ['logo.jpeg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting(); // la versión nueva del Service Worker entra de inmediato
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))) // borra las copias viejas (pixel-test-v3, etc.)
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Apps Script, CDNs, etc.: directo a internet, sin tocarlos

  const esPagina = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (esPagina) {
    // Primero internet (sin usar la caché del navegador); si falla, la última copia guardada
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copia)); }
          return resp;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }
  // Imágenes y demás archivos: copia guardada si existe, y se actualiza en segundo plano
  event.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(resp => {
        if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copia)); }
        return resp;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
