/* ══════════════════════════════════════════════════════════════
   Service worker · Estudo de Poltronas
   Estratégia: stale-while-revalidate para os arquivos do app.
   Suba a versão do cache a cada deploy — o SW limpa os antigos
   sozinho no evento activate.
   ══════════════════════════════════════════════════════════════ */
const VERSION = 'v5.1.0';
const CACHE = `poltronas-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './assets/css/app.css',
  './assets/js/engine.js',
  './assets/js/app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* navegação: rede primeiro, cache como rede de segurança offline */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* estáticos: entrega o cache na hora e atualiza em segundo plano */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
