'use strict';
const root = self.registration.scope;
const prefix = 'offline-voice-notes:' + encodeURIComponent(root) + ':';
const name = prefix + 'v1';
const index = new URL('index.html', root).href;
const manifest = new URL('manifest.json', root).href;
const shell = [index, manifest];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(name);
    await cache.addAll(shell.map(url => new Request(url, { cache: 'reload', redirect: 'error' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys())
      .filter(key => key.startsWith(prefix) && key !== name)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;
  url.search = '';
  const cleanRoot = root.replace(/\/$/, '');
  const key = (url.href === root || url.href === cleanRoot) ? index : url.href;
  if (!shell.includes(key)) {
    event.respondWith(Response.error());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(name);
    const saved = await cache.match(key);
    if (saved) return saved;
    const response = await fetch(key, { redirect: 'error' });
    if (response.ok) await cache.put(key, response.clone());
    return response;
  })());
});
