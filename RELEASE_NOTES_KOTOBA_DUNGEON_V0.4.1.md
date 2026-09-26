# Kotoba Quest – Dungeon Native Navigation Fix V0.4.1

## What to upload
This compact repo-root delta contains the **complete current `cloud.html` and `index.html` from the user-uploaded `kotoba-quest-main 2.zip`**, plus these notes. Replace **both** files in the Kotoba Quest repository root. They preserve their existing 5.8 MB Cloud/Firebase/sync and 780 KB standalone study logic. There is no installer, code-copying step, new account or reset. Existing Dungeon V0.4 files (`dungeon.html`, `.js`, `.css`, `dungeon-source.js`, `.engine.js`, `.bridge.js`) remain in place unchanged.

## The actual prior defect
- `cloud.html` embeds `index.html` inside an iframe and later **reconstructs the main navigation** (`nav.innerHTML = ""`). The prior installer only appended `dungeon-nav.js` to the outer HTML, so it could not safely guarantee an in-app button. The uploaded real `cloud.html` and `index.html` had no Dungeon entry.
- V0.4.1 adds a stable outer **⚔ Dungeon** link in Cloud's top toolbar (compact icon on narrow screens). It survives inner navigation rewrites.
- It also adds `dungeon` to the Cloud interface-reorganization `MAIN_GROUPS`, with a real click handler that opens `./dungeon.html` in the top-level window, not inside the iframe.
- A standalone `index.html` direct link is included for users opening that page outside Cloud.

## Preservation
No vocabulary items, SRS stages, Guru data, reviews, cloud sync/Firebase setup, storage keys, audio, lesson flow, Dungeon balance or reward events are altered. This ZIP contains **no old V0.4 Dungeon files** and does not touch Life RPG.

## QA and limitations
- Verified exact-source small additive diffs and HTML structure, Cloud and standalone inline script syntax, stable menu group and relative URLs.
- Browser injected-document smoke checks: desktop Cloud entry visible outside iframe; compact mobile entry in viewport; standalone link visible. Localhost navigation to HTTP pages is blocked by the test environment, so **full end-to-end live GitHub Pages + Firebase authentication testing remains open**. The actual inner Cloud app requires online Firebase/core data, which this isolated smoke test cannot reproduce.

## Install
1. Export Kotoba save for safety. Upload the **two root HTML files** and keep the older Dungeon files, `storage/`, `sync/`, other assets.
2. Wait for Pages deployment and reload `cloud.html` using a hard refresh if necessary; look for ⚔ Dungeon in the top toolbar and within the main navigation. `index.html` has its own link.
3. Ignore/delete the old helper `dungeon-nav-installer.html` if desired; it is no longer needed. Do not clear site data/IndexedDB.
