// Service Worker for Musio App
// Implements caching strategies for optimal performance

const CACHE_NAME = 'musio-cache-v1';
const STATIC_CACHE = 'musio-static-v1';
const AUDIO_CACHE = 'musio-audio-v1';
const API_CACHE = 'musio-api-v1';
const IMAGE_CACHE = 'musio-images-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/feed',
  '/search',
  '/upload',
  '/_next/static/css/app/globals.css',
  '/manifest.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: ['/_next/static/', '/static/', '/icons/', '/images/'],

  // API responses - stale while revalidate
  api: ['/api/'],

  // Audio files - cache first with long TTL
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],

  // Images - cache first
  images: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg', '.gif'],

  // Videos - network first (too large to cache aggressively)
  video: ['.mp4', '.webm', '.mov'],
};

// Cache size limits
const CACHE_LIMITS = {
  [AUDIO_CACHE]: 50, // 50 audio files
  [IMAGE_CACHE]: 100, // 100 images
  [API_CACHE]: 200, // 200 API responses
  [STATIC_CACHE]: 50, // 50 static files
};

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting and immediately activate
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Precaching failed:', error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');

  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),

      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const validCaches = [CACHE_NAME, STATIC_CACHE, AUDIO_CACHE, API_CACHE, IMAGE_CACHE];
        return Promise.all(
          cacheNames
            .filter((cacheName) => !validCaches.includes(cacheName))
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }),
        );
      }),
    ]),
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine cache strategy based on URL
  const strategy = determineStrategy(url.pathname, url.href);

  event.respondWith(
    handleRequest(request, strategy).catch((error) => {
      console.error('Service worker fetch error:', error);

      // Fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/') || fetch(request);
      }

      // For other requests, try to fetch from network
      return fetch(request);
    }),
  );
});

// Determine caching strategy for a request
function determineStrategy(pathname, href) {
  // Static assets
  if (CACHE_STRATEGIES.static.some((pattern) => pathname.includes(pattern))) {
    return { type: 'cache-first', cache: STATIC_CACHE };
  }

  // API requests
  if (CACHE_STRATEGIES.api.some((pattern) => pathname.includes(pattern))) {
    return { type: 'stale-while-revalidate', cache: API_CACHE, ttl: 300000 }; // 5 minutes
  }

  // Audio files
  if (CACHE_STRATEGIES.audio.some((ext) => href.includes(ext))) {
    return { type: 'cache-first', cache: AUDIO_CACHE, ttl: 86400000 }; // 24 hours
  }

  // Images
  if (CACHE_STRATEGIES.images.some((ext) => href.includes(ext))) {
    return { type: 'cache-first', cache: IMAGE_CACHE, ttl: 3600000 }; // 1 hour
  }

  // Videos - network first (don't cache due to size)
  if (CACHE_STRATEGIES.video.some((ext) => href.includes(ext))) {
    return { type: 'network-first', cache: null };
  }

  // Navigation requests - network first with cache fallback
  if (pathname === '/' || pathname.startsWith('/feed') || pathname.startsWith('/search')) {
    return { type: 'network-first', cache: STATIC_CACHE };
  }

  // Default - network first
  return { type: 'network-first', cache: null };
}

// Handle request based on strategy
async function handleRequest(request, strategy) {
  switch (strategy.type) {
    case 'cache-first':
      return cacheFirst(request, strategy);

    case 'network-first':
      return networkFirst(request, strategy);

    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, strategy);

    default:
      return fetch(request);
  }
}

// Cache first strategy - check cache, fallback to network
async function cacheFirst(request, strategy) {
  if (!strategy.cache) return fetch(request);

  const cache = await caches.open(strategy.cache);
  const cached = await cache.match(request);

  if (cached) {
    // Check if cached response is still fresh
    const cachedDate = new Date(cached.headers.get('date') || cached.headers.get('cached-at'));
    const now = new Date();
    const age = now.getTime() - cachedDate.getTime();

    if (!strategy.ttl || age < strategy.ttl) {
      return cached;
    }
  }

  // Fetch from network and cache
  try {
    const response = await fetch(request);

    if (response.ok) {
      // Clone response before caching
      const responseToCache = response.clone();

      // Add timestamp header
      const headers = new Headers(responseToCache.headers);
      headers.set('cached-at', new Date().toISOString());

      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });

      // Cache with size limit
      await cacheWithLimit(cache, request, modifiedResponse, strategy.cache);
    }

    return response;
  } catch (error) {
    // Return cached version if network fails
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network first strategy - try network, fallback to cache
async function networkFirst(request, strategy) {
  try {
    const response = await fetch(request);

    // Cache successful responses if cache is specified
    if (response.ok && strategy.cache) {
      const cache = await caches.open(strategy.cache);
      await cacheWithLimit(cache, request, response.clone(), strategy.cache);
    }

    return response;
  } catch (error) {
    // Fallback to cache if network fails
    if (strategy.cache) {
      const cache = await caches.open(strategy.cache);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    }
    throw error;
  }
}

// Stale while revalidate - return cache immediately, update in background
async function staleWhileRevalidate(request, strategy) {
  if (!strategy.cache) return fetch(request);

  const cache = await caches.open(strategy.cache);
  const cached = await cache.match(request);

  // Start network request in background
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cacheWithLimit(cache, request, response.clone(), strategy.cache);
      }
      return response;
    })
    .catch((error) => {
      console.warn('Background fetch failed:', error);
    });

  // Return cached version immediately if available
  if (cached) {
    // Check if cache is stale
    const cachedDate = new Date(cached.headers.get('date') || cached.headers.get('cached-at'));
    const now = new Date();
    const age = now.getTime() - cachedDate.getTime();

    // If cache is fresh enough, return it
    if (!strategy.ttl || age < strategy.ttl) {
      return cached;
    }
  }

  // Wait for network response if no cache or cache is stale
  return networkPromise;
}

// Cache with size limit
async function cacheWithLimit(cache, request, response, cacheName) {
  const limit = CACHE_LIMITS[cacheName];

  if (limit) {
    const keys = await cache.keys();

    // If we're at the limit, remove oldest entries
    if (keys.length >= limit) {
      const entriesToRemove = keys.slice(0, keys.length - limit + 1);
      await Promise.all(entriesToRemove.map((key) => cache.delete(key)));
    }
  }

  await cache.put(request, response);
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_STATS':
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
      });
      break;

    case 'CLEAR_CACHE':
      clearCache(data.cacheName).then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED', data: { cacheName: data.cacheName } });
      });
      break;

    case 'PRELOAD_AUDIO':
      preloadAudio(data.urls).then(() => {
        event.ports[0].postMessage({ type: 'AUDIO_PRELOADED', data: { urls: data.urls } });
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
});

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      size: keys.length,
      limit: CACHE_LIMITS[cacheName] || 'unlimited',
    };
  }

  return stats;
}

// Clear specific cache
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
}

// Preload audio files
async function preloadAudio(urls) {
  const cache = await caches.open(AUDIO_CACHE);

  const preloadPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cacheWithLimit(cache, new Request(url), response, AUDIO_CACHE);
      }
    } catch (error) {
      console.warn('Failed to preload audio:', url, error);
    }
  });

  await Promise.all(preloadPromises);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any offline actions that were queued
  console.log('Performing background sync...');

  // This could include:
  // - Uploading posts that were created offline
  // - Syncing likes/comments that were made offline
  // - Updating user profile changes

  // For now, just log that sync occurred
  try {
    // Attempt to sync with server
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() }),
    });

    console.log('Background sync completed:', response.ok);
  } catch (error) {
    console.warn('Background sync failed:', error);
  }
}
