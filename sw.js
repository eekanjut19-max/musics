/* Kaca Musik — service worker.
   NAIKKAN nomor VERSION setiap kali index.html diubah, supaya versi baru langsung dipakai. */
const VERSION = 'v1';
const CACHE = 'kaca-musik-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('kaca-musik-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // YouTube (pemutar, iframe, API), pencarian, dan lirik online: selalu lewat jaringan, tidak disimpan.
  if (/youtube\.com|youtu\.be|googlevideo\.com|googleapis\.com\/youtube|lrclib\.net/.test(url.hostname + url.pathname)) return;
  if (req.headers.has('range')) return; // streaming audio/video

  // Halaman: jaringan dulu (supaya update cepat terbaca), cadangan dari cache saat offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // File lain (ikon, font Google, gambar sampul): cache dulu, perbarui di belakang.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
