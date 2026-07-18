// ゆめカード家計簿 - Service Worker
// オフラインでも使えるように、必要なファイルをまとめてキャッシュする

const CACHE_NAME = "yumecard-kakeibo-v1";
const FILES_TO_CACHE = [
  "./index.html",
  "./manifest.json",
  "./lib/chart.umd.min.js",
  "./lib/xlsx.full.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// インストール時：必要なファイルを事前にキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 有効化時：古いバージョンのキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// リクエストの種類によって戦略を分ける：
// ・index.html（画面本体）→ ネットワーク優先。更新があれば即座に反映され、
//   オフライン時だけキャッシュを使う（これでバージョン番号を変えなくても最新画面になる）
// ・それ以外（ライブラリ・アイコンなど）→ キャッシュ優先。滅多に変わらないので高速表示を優先
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isHtmlRequest =
    event.request.mode === "navigate" ||
    event.request.url.endsWith("/index.html") ||
    event.request.url.endsWith("/");

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
