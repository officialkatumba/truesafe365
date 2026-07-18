"use strict";

var CACHE_VERSION = "ts365-v1";
var STATIC_CACHE = CACHE_VERSION + "-static";
var PAGE_CACHE = CACHE_VERSION + "-pages";

var PRECACHE_URLS = [
  "/css/theme.css",
  "/css/base-theme.css",
  "/css/navbar.css",
  "/css/footer.css",
  "/css/style.css",
  "/js/app.js",
  "/js/form-autosave.js",
  "/js/dashboard-filter.js",
  "/vendor/bootstrap/css/bootstrap.min.css",
  "/vendor/bootstrap/js/bootstrap.bundle.min.js",
  "/vendor/bootstrap-icons/font/bootstrap-icons.css",
  "/vendor/fontawesome/css/all.min.css",
  "/vendor/sweetalert2/sweetalert2.all.min.js",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () {
        // Best-effort precache - a missing asset should not block install
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.indexOf(CACHE_VERSION) !== 0;
          })
          .map(function (key) {
            return caches.delete(key);
          }),
      );
    }),
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.indexOf("/css/") === 0 ||
    url.pathname.indexOf("/js/") === 0 ||
    url.pathname.indexOf("/vendor/") === 0 ||
    url.pathname.indexOf("/images/") === 0
  );
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first, since these rarely change and this is the
  // biggest win for officers on slow 3G/4G field connections.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        return (
          cached ||
          fetch(request).then(function (response) {
            var copy = response.clone();
            caches.open(STATIC_CACHE).then(function (cache) {
              cache.put(request, copy);
            });
            return response;
          })
        );
      }),
    );
    return;
  }

  // Pages: network-first so officers always see fresh data when online,
  // falling back to the last cached copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(PAGE_CACHE).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match("/dashboard/officer");
          });
        }),
    );
  }
});
