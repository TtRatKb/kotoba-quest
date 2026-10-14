# Kotoba Quest — Codex instructions

Kotoba Quest is a static GitHub Pages Japanese-learning app (HTML/CSS/vanilla JS). `index.html` holds the core vocabulary/SRS app; `cloud.html` integrates Firebase and features. `storage/kotoba-durable-storage.js` virtualizes `kotobaQuestDataV3` over IndexedDB; `sync/` connects Life RPG; Dungeon has independent progress.

## Non-negotiable safety
- Preserve vocabulary, Mining, kanji (`kanjiPilot`), grammar, particles, N4, story, Dungeon, analytics, accepted synonyms, and all individual SRS stages/due dates across changes, migrations, imports and sync.
- Preserve Core identities (`packEntryId`, word+reading), bidirectional reviews and SRS ownership. Free practice/Dungeon must not change vocabulary SRS; Life RPG write-back uses validated commit APIs.
- **P0: Kanji-progress loss remains unresolved.** Never invent per-kanji states from aggregate events. Before changing storage, loading, migrations, import/export, SRS, Firebase or bridge logic: trace current flows; secure and verify immutable backups; test losslessness on isolated copies with record-level before/after comparisons. No production writes, restores, cleanup, resets or deployment of such changes without explicit approval. Stop if safety is uncertain.
- Avoid broad rewrites; preserve working features. Consult `README.md`, relevant release notes and migration handoff only when needed.

## GitHub delivery
- Work from current `main` on a feature branch; implement focused changes and regression coverage. Run relevant checks and a final functional smoke test; disclose untested areas.
- Commit and push; open a PR. Merge after checks pass and conflicts/data risks are excluded, only if permissions and rules allow. Never bypass branch protections or merge failing/uncertain changes.
- Verify the change is on `main`. A Codex preview/environment is **not** GitHub publication.
