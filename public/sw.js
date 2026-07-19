// Service Worker do LIVO Beauty.
// Por ora, existe apenas para viabilizar o registro de push notifications
// na próxima etapa. Sem cache de assets (decisão consciente).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// TODO: listener de evento "push" será adicionado na próxima etapa.
