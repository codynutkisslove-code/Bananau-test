importScripts('/core/bundle.js');
importScripts('/core/sys.config.js');
importScripts('/core/sw.js');

const sw = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
    event.respondWith(sw.fetch(event));
});
