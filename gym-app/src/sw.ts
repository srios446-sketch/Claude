/// <reference lib="webworker" />
// Service worker: guarda la app para usarla sin internet y muestra las notificaciones push.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

interface Aviso { titulo?: string; cuerpo?: string; url?: string; tag?: string; tipo?: string }

self.addEventListener('push', (evento) => {
  let a: Aviso = {};
  try { a = evento.data?.json() ?? {}; } catch { a = { cuerpo: evento.data?.text() }; }
  evento.waitUntil(self.registration.showNotification(a.titulo ?? 'EvaSof Training', {
    body: a.cuerpo ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: a.tipo === 'descanso' ? 'descanso' : a.tag,
    data: { url: a.url ?? '/' },
  }));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = new URL((evento.notification.data?.url as string) ?? '/', self.location.origin).href;
  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = ventanas[0] as WindowClient | undefined;
    if (abierta) { await abierta.focus(); if (new URL(abierta.url).pathname !== new URL(url).pathname) await abierta.navigate(url).catch(() => undefined); }
    else await self.clients.openWindow(url);
  })());
});
