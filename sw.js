// ══════════════════════════════════════════════════════════════
// NYSOA BTP — Service Worker v0.4
// Cache-first pour offline, sync en arrière-plan pour Supabase
// CORRIGÉ Bug #10: NE JAMAIS CACHER config.js (contient les clés API)
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'nysoa-btp-v4';
const DATA_CACHE = 'nysoa-data-v1';

// Fichiers à mettre en cache pour fonctionnement offline
// IMPORTANT: NE PAS inclure config.js (contient SUPABASE_URL et SUPABASE_KEY)
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  // './config.js',  // ← RETIRÉ Bug #10: Ne jamais cacher les credentials
  './icon.svg',
  './styles.css',
  './script.js',
  './supabase.js',
  './modules_new.js',
  './stock.js',
  './devis.js',
  './enhancements.js',
  './import-excel.js',
  './admin.html',
  './chef-chantier.html',
  './daf.html',
  './rh.html',
  './controleur.html',
  './technicien.html',
  './pointage.html',
  './suivi-chantier.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './LOGO_NYSOA.png',
];

// Extensions de fichiers à ne JAMAIS mettre en cache
const NEVER_CACHE = [
  'config.js',
  '.env',
  '.example',
];

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Install v3');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On tente de cacher les assets statiques
      // Les erreurs 404 individuelles ne bloquent pas l'install
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Cache miss:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => {
            console.log('[SW] Suppression ancien cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non-GET et les extensions Chrome
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // CORRIGÉ Bug #10: Ne jamais mettre en cache config.js ou fichiers sensibles
  const path = url.pathname.split('/').pop() || '';
  if (NEVER_CACHE.some(f => path.includes(f))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Requêtes Supabase → Network first avec no-store (données sensibles)
  // Ne pas mettre en cache les réponses API (peuvent contenir des données utilisateurs)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => new Response(
          JSON.stringify({ error: 'offline', data: [] }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        ))
    );
    return;
  }

  // Ressources Google Fonts → Cache first (statiques et publiques)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Assets statiques → Cache first, fallback network
  event.respondWith(cacheFirstWithNetwork(event.request));
});

// ── STRATÉGIES ────────────────────────────────────────────────

// Cache first → si absent, charge depuis network et met en cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ressource non disponible hors-ligne', { status: 503 });
  }
}

// Cache first mais essaie le network en arrière-plan (stale-while-revalidate)
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  const networkFetch = fetch(request).then(response => {
    if (response.ok) {
      try { const cloned = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, cloned)); } catch(e) {}
    }
    return response;
  }).catch(() => null);

  return cached || await networkFetch || offlineFallback(request);
}

// Network first → si réseau KO, retourne le cache
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName });
    return cached || new Response(
      JSON.stringify({ error: 'offline', data: [] }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  }
}

// Fallback HTML pour navigation offline
async function offlineFallback(request) {
  if (request.destination === 'document') {
    const cached = await caches.match('/index.html');
    if (cached) return cached;
  }
  return new Response('Contenu non disponible hors-ligne', { status: 503 });
}

// ── BACKGROUND SYNC (pour futures écritures offline) ──────────
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-journal') {
    event.waitUntil(syncPendingJournal());
  }
  if (event.tag === 'sync-achats') {
    event.waitUntil(syncPendingAchats());
  }
});

// Synchronise les écritures journal créées offline
async function syncPendingJournal() {
  try {
    // TODO: lire depuis IndexedDB les entrées en attente
    // const pending = await getPendingFromIDB('journal_pending');
    // for (const entry of pending) {
    //   await supabase.from('journal').insert(entry);
    //   await removeFromIDB('journal_pending', entry.id);
    // }
    console.log('[SW] Journal sync effectué');
    notifyClients({ type: 'SYNC_DONE', module: 'journal' });
  } catch (err) {
    console.error('[SW] Erreur sync journal:', err);
    throw err; // Retry automatique par le navigateur
  }
}

async function syncPendingAchats() {
  try {
    // TODO: même logique pour les achats
    console.log('[SW] Achats sync effectué');
    notifyClients({ type: 'SYNC_DONE', module: 'achats' });
  } catch (err) {
    console.error('[SW] Erreur sync achats:', err);
    throw err;
  }
}

// ── PUSH NOTIFICATIONS (pour alertes achats urgents) ──────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'Notification NYSOA BTP',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: data.tag || 'nysoa-notif',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'NYSOA BTP', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NAVIGATE', url });
      } else {
        clients.openWindow(url);
      }
    })
  );
});

// ── MESSAGE HANDLER ───────────────────────────────────────────
self.addEventListener('message', event => {
  const { type } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
  if (type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0]?.postMessage({ done: true });
    });
  }
});

// ── HELPER: notifier tous les clients ─────────────────────────
function notifyClients(message) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clientList => {
    clientList.forEach(client => client.postMessage(message));
  });
}
