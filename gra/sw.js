// Symulator życia w Trębaczewie - pamięć podręczna: gra działa po zainstalowaniu także bez internetu.
const CACHE = 'trebaczew-v101';
const CORE = ['./', 'index.html', 'manifest.webmanifest', '../src/icon-192.png', '../src/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('.mp3')) return;   // muzyka z radia: prosto z sieci, bez kopii
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/ceny_paliw.json');
  if (isPage) {   // najpierw sieć (żeby dostać nową wersję), a bez internetu - kopia
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // biblioteki (three.js), czcionki i obrazki: najpierw kopia
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
});
