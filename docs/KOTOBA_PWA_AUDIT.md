# Kotoba installation candidate and worker audit — 15 November 2026

## Current inventory
No Web App manifest or app icon assets existed for Kotoba; index/cloud/Daily did not link a manifest or load pwa.js. The existing pwa.js is a Life RPG progression loader (LifeRPGSkills and related modules) and registers service-worker.js at scope ./ with updateViaCache:none. The existing worker uses a life-rpg-* cache, skips waiting, claims clients, and precaches many Life RPG paths, including names colliding with Kotoba (index.html and daily.js). Its same-origin GET handler is network-first except images/assets cache-first; offline navigation may fall back to index.html. Reusing it for Kotoba would be unsafe.

Source inspection finds no active registration from current Kotoba entry pages. This does not prove a previously registered worker is absent on the production origin or on a user's device. No real user registrations or caches were read, removed or updated. The files pwa.js and service-worker.js are byte-for-byte unchanged.

## Separate conservative implementation
kotoba.webmanifest supplies stable identity ./cloud.html, start ./cloud.html?source=homescreen, repository-relative scope ./, display standalone, German app name and fresh, uniquely named PNG icons (180 Apple touch, 192 and 512; maskable artwork stays in the central safe zone). All three local entry pages link it and Apple install metadata. A tiny standalone stylesheet respects safe areas. Daily/main navigation remains within the same app origin and scope; no new target=_blank is introduced.

**No new service worker, cache API, offline fallback, automatic update/restore, install prompt or registration cleanup.** This is an online-only Add-to-Home-Screen candidate, particularly for iOS Safari, not an offline-ready PWA or a guarantee that every browser will offer an install prompt. Installing on the same origin must not be described as a data migration or synchronization. No changes to IndexedDB/Firebase/SRS/Life RPG.

## Remaining release gates (draft)
- Inspect existing registrations/scopes/controllers/cache names read-only on the actual origin and on the target iPhone. If a historical worker controls these pages, first analyze ownership and backups; do not unregister it or clear caches blindly.
- Safari Add to Home Screen, icon crop, portrait/landscape safe areas, real keyboard, standalone Cloud/Daily round-trip and Google login/logout/popups require device testing. Browser emulator is not an iPhone install test.
- Test online update with an already-installed icon and constrained network. Offline support is intentionally absent; no fallback to a wrong app document may be claimed as success. Ordinary HTTP cache behavior still needs production verification.
- A future offline worker is a separate project: explicit ownership/scope, minimal versioned immutable shell, network-only auth/data requests, atomic upgrades and no blanket cache deletion; before any storage/restore change, verified full backups and record-level isolated comparisons remain mandatory. Kanji-progress P0 unresolved.

Validation in this draft: manifest URL resolution from /kotoba-quest/, icon PNG dimensions, metadata links and absence of registration in all three hosts checked by Node tests. Combined UI/browser tests and CI are reported in the PR. Actual installed browser/cache/device validation remains open. Nothing merged or deployed.
