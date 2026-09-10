const CACHE_NAME = "life-rpg-v0314af2-skills-hub";
const CORE = [
  "./",
  "./index.html",
  "./data/quests.js?v=0.31.4h",
  "./styles.css?v=0.31.4z1",
  "./skills.css?v=0.31.4af1-0.31.4ac",
  "./skills.js?v=0.31.4af1-0.31.4ac",
  "./journal-rewards.js?v=0.31.4af1-0.31.4ab",
  "./weekly-review.css?v=0.31.4af1-0.31.4ac",
  "./weekly-review.js?v=0.31.4af1-0.31.4ac",
  "./knowledge-tree.css?v=0.31.4af1-0.31.4ad",
  "./knowledge-tree.js?v=0.31.4af1-0.31.4ad",
  "./health-tree.css?v=0.31.4af1-0.31.4ae",
  "./health-tree.js?v=0.31.4af1-0.31.4ae",
  "./work-tree.css?v=0.31.4af1-0.31.4af",
  "./work-tree.js?v=0.31.4af1-0.31.4af",
  "./skills-ui.css?v=0.31.4af2-0.31.4af2",
  "./skills-ui.js?v=0.31.4af2-0.31.4af2",
  "./manifest.webmanifest?v=0.30.3a",
  "./pwa.js?v=0.31.4af2",
  "./visual-performance.js?v=0.31.4c",
  "./modal-manager.js?v=0.31.4d",
  "./training-focus.js?v=0.31.4o",
  "./app.js?v=0.31.4s",
  "./daily-streaks.js?v=0.31.4z",
  "./stewardship.js?v=0.31.3a",
  "./habits.js?v=0.30.9",
  "./adventures.js?v=0.31.1",
  "./adventure-workspace.js?v=0.31.4c",
  "./library.js?v=0.30.6",
  "./games.js?v=0.31.4x",
  "./time.js?v=0.31.1",
  "./universal-timers.js?v=0.31.1",
  "./inspirations.js?v=0.31.4c",
  "./data/sudoku-levels.js?v=0.31.4h",
  "./sudoku.js?v=0.31.4z",
  "./data/nonogram-levels.js?v=0.31.4k",
  "./nonogram.js?v=0.31.4z",
  "./data/number-sense-levels.js?v=0.31.4l",
  "./number-sense.js?v=0.31.4z",
  "./recovery-studio.js?v=0.31.4s",
  "./memory-garden.js?v=0.31.4z",
  "./data/lexicon-lab-data.js?v=0.31.4q",
  "./data/lexicon-lab-enrichment.js?v=0.31.4y",
  "./data/lexicon-pool.js?v=0.31.4z",
  "./lexicon-lab.js?v=0.31.4z1",
  "./smart-action-router.js?v=0.31.4s",
  "./smart-quests.js?v=0.31.0",
  "./daily.js?v=0.31.4y",
  "./journal.js?v=0.31.4ac",
  "./story-engine.js?v=0.31.4r",
  "./story-ui.js?v=0.31.4r",
  "./content/SP_003.dat?v=0.31.4r",
  "./shop.js?v=0.30.6",
  "./achievements.js?v=0.31.0",
  "./activity-log.js?v=0.31.4z",
  "./kotoba-integration.js?v=0.31.4k",
  "./kotoba-quick-training.js?v=0.31.4k",
  "./cloud-save.js?v=0.31.0",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/ui/thumbs/characters/luca_neutral.webp"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async asset => {
      try {
        await cache.add(asset);
      } catch (error) {
        console.warn("Life RPG precache skipped an unavailable asset", asset, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("life-rpg-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirstAsset(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await caches.match("./index.html")) || (await caches.match("./"));
    }
    throw new Error("Offline and not cached");
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.destination === "image" || url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
