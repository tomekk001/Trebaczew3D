// Dawny service worker z katalogu głównego: gra mieszka teraz w /gra/ - ten plik czyści stare kopie i się wyrejestrowuje.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => self.registration.unregister()).then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)))); });
