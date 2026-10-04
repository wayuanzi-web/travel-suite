var C = "wang-swiss-v1.7.8";
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(["./"]); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  /* 只清這個 App 自己的舊快取:wayuanzi-web.github.io 底下的網站共用同一個快取空間,別的網站的不能動 */
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("wang-swiss-") === 0 && k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var cp = r.clone();
      caches.open(C).then(function (c) { c.put(e.request, cp); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (m) { return m || caches.match("./"); });
    })
  );
});
