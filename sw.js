/* RotinaFit — service worker para funcionar offline e ser instalável. */
const CACHE = "rotinafit-v1";
const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/data.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL).catch(function () {
        // Alguns arquivos podem faltar em instalações antigas; o app segue funcionando.
        return Promise.all(SHELL.map(function (url) {
          return cache.add(url).catch(function () { return null; });
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put("./index.html", copy); });
        }
        return response;
      }).catch(function () {
        return caches.match("./index.html").then(function (cached) {
          return cached || caches.match("./");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
