/**
 * Service worker del panel de Nano Resto Bar.
 * ---------------------------------------------
 * Dos trabajos:
 *  1) Dejar instalar el panel como app (ícono en el celular/tablet, se abre sin
 *     la barra del navegador) — un service worker es requisito para eso.
 *  2) Que las actualizaciones lleguen solas: la estrategia es "red primero" para
 *     los archivos propios del panel, así que mientras haya conexión SIEMPRE se
 *     pide la versión más nueva antes de mirar el cache. El cache solo se usa
 *     como respaldo para cuando no hay señal.
 *
 * CACHE_VERSION solo importa para el respaldo offline (qué versión quedó
 * guardada) — no hace falta subirlo a mano en cada cambio de index.html, porque
 * la estrategia de red-primero ya trae lo último apenas hay conexión. Subilo
 * únicamente si en algún momento cambiás la lista de ARCHIVOS_BASE.
 */
const CACHE_VERSION = 'nano-panel-v1';
const ARCHIVOS_BASE = ['./', './index.html', './manifest.json', './logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // no esperar a que se cierren las pestañas viejas para activarse
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()) // toma control de las pestañas ya abiertas, no solo las nuevas
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo se mete con pedidos GET del propio sitio (el documento, el manifest, el
  // logo). Todo lo demás —sobre todo las llamadas al backend de Apps Script,
  // que son a otro origen y a veces POST— pasa derecho, sin que el service
  // worker lo toque. Cachear o interceptar eso podría romper pedidos reales.
  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
        return respuesta;
      })
      .catch(() => caches.match(request))
  );
});
