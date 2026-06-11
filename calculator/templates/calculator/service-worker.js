const CACHE_NAME = 'vetcalc-cache-v5';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/vet_logo.svg',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Roboto+Mono:wght@500;600;700&display=swap',
    '/static/calculator/js/lib/lucide.min.js'
];

// Install Service Worker and cache essential shell resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-caching offline shell assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Intercept requests and serve from Cache-first (with fallback to network)
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Bypass caching for API calculations: always hit the network
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(err => {
                    // Let the client-side JavaScript catch this failed fetch and run the calculations locally
                    console.log('[Service Worker] API fetch failed, client will fallback locally.');
                    throw err;
                })
        );
        return;
    }
    // Cache-first strategy for app shell assets and external fonts
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not found in cache, perform regular network fetch
                return fetch(event.request).then(response => {
                    // Cache newly requested image/css/font assets on the fly
                    if (response.status === 200 && (
                        url.origin === self.location.origin ||
                        url.host.includes('fonts.googleapis.com') ||
                        url.host.includes('fonts.gstatic.com') ||
                        url.host.includes('unpkg.com')
                    )) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
    );
});
