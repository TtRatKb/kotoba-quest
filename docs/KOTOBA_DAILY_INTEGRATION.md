# Daily integration audit — 2026-11-14

## Baseline and scope
Reviewed GitHub metadata for #16–#20. Current main: `e79e63aa3d8242bacf74b4d5f9ebacb57e271d6b`; #16/#17 merged. Integrated exact open heads #18 `b1eb6f6`, #19 `6cc609b`, #20 `dfe8f56` on `integrate/daily-18-19-20`. Originals remain open; no main merge or deployment authorized.

All three original PR CI runs succeeded (43604208575, 43607827334, 43609270998). Individual green runs did not guarantee combined compatibility.

## Resolution and evidence
- Resolved overlapping workflow edits by retaining all module checks and trigger paths. Retained all three documentation sections.
- Combined run initially failed the Mix test expecting `context`: #19 intentionally replaces the early context slot with `cloze`, while the short Mix uses only the first 4–5 vocabulary tasks. Updated the expectation to sentence production, preserving eight steps and the complete guided lesson.
- Added composition coverage for all seven licensed paths on both A/B dates: exact guided prompts, eight steps, cloze reading accepted, unknown variants ungraded, final open transfer, unchanged save.
- `node --test tests/*.test.mjs`: **71/71 passed**, including existing vocabulary/grammar/particle regression tests. Syntax checks for all five changed JS modules and `git diff --check` passed.
- Chromium via Playwright at **320, 390, 768px**: Mix (8), Refresh (8), sample Growth (4), Guided (4), text submission with Enter, feedback and summary worked; no horizontal overflow or JS errors. Browser source adapter was replaced with eight synthetic cards and synthetic completed particle lessons; browser Storage mutations were trapped, none occurred. This does not test the real adapter or production persistence.
- Browser reproduction script lives in local `work/daily-smoke.cjs` (requires Playwright and `/usr/bin/chromium`); not a new project dependency.

## Data-flow and preservation
`daily.html` loads unchanged `dungeon-source.js`; its `load()` reads the authoritative snapshot (IndexedDB primary, checkpoint, then legacy local fallback), hydrates catalogue metadata from fetched index.html and exposes learned vocabulary. Daily separately calls unchanged `readSave()` for exact grammar/particle flags. Pure generators return session copies; answers stay in memory. No normalizers, SRS commits, Cloud saves, Firebase calls or Life-RPG writes were added. Reviewed exact curriculum IDs and strict lessonComplete prerequisites. Open transfer is explicitly ungraded; unknown cloze answers are ungraded.

No changes to index.html, cloud.html, storage/, sync/, existing adapter, kanji or SRS. No real user data accessed, exported, backed up or modified. There is no verified production backup; existing persistence changes therefore remain out of scope. Historical kanji-progress P0 remains unresolved.

## Open validation
Real iOS Safari/Android keyboard and IME, touch and accessibility with actual devices; existing user data and IndexedDB/Firebase integration; all catalogue example sentences and valid language variants; offline/service-worker update behavior. Synthetic Chromium tests are not device or real-user tests. Integrated PR CI must also finish successfully before review approval. Existing priority uses current due times, so recommendations can change during a day when an interval becomes due.

## Next separate change
Prepare isolated streak storage design and small motivation UI improvements on a separate stacked branch. Do not enable persistence until data safety, account/origin isolation and backup requirements are resolved. Local-only state must never be presented as cross-device sync.
