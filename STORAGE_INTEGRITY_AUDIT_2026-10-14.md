# Kotoba save-integrity audit — 2026-10-14

**Status:** Draft safeguard only. **Do not merge or deploy.** Live Safari/Cloud paths remain unverified.

## Observations (read-only diagnosis, Safari)

- Origin storage estimate: 5776.3 MB used / 78643.2 MB estimated quota.
- Physical localStorage estimate: 2.204 MB total; 0.521 MB Kotoba-specific; 30 keys.
- IndexedDB `primaryLearningState`, `mainCheckpoint`, `progressVault`, and the separate `kotobaQuestKanjiPilotBackupV1` contain **zero** `kanjiPilot.kanji` entries and **zero** `kanjiPilot.placementResults`. IndexedDB primary still contains 2006 vocabulary entries.
- No current recorded durable-storage error. These facts **do not** establish the cause of the loss on October 12 or prove that storage was never full historically.
- Do not share raw user saves or access tokens in issues/PRs.

## Confirmed source weaknesses on main (commit 2e88655)

1. `isValidProgress` validates a `vocabulary` array but does not validate Kanji evidence. A parsed game save missing `kanjiPilot` is valid.
2. `writePrimary` updates synchronous memory before its IndexedDB transaction completes; errors are asynchronous.
3. Startup unconditionally re-seeded `mainCheckpoint` from the selected current primary, potentially replacing a prior recovery source.
4. `cloud.html` health label "Gesund" is mainly based on Kotoba-owned *localStorage byte count* and `lastError`; not Kanji record survival, backup integrity, or total origin use.
5. `cloud.html` `saveLocalProgressToCloud` uses whole-document `setDoc` without a preupload check against loss of existing individual Kanji evidence. This **still requires a fix**.
6. `cloud.html` Kanji `ensureState()` includes earlier schema migration branches clearing placement evidence for versions below 2 and 3. Their historical contribution remains unproven.

## Staged in this development branch

- Pure `kanjiLossReason` rejects deleting Kanji placement evidence or card/component records and stage >0 becoming stage 0, but permits normal positive-stage SRS downgrades.
- IndexedDB primary writes, checkpoint writes, vault writes and legacy migration check against available earlier Kanji evidence.
- Existing checkpoint is not overwritten merely by opening the app.
- New status fields: confirmed primary timestamp, pending primary write count, active regression-guard flag.
- Isolated JavaScript mock-IDB run: ten checks passed (no Safari/real Firebase run). Pure guard tests also passed.

## Blocking work before any deployment

- Modify `cloud.html` health badge to say **Speicherplatz OK**, not **Gesund**, and warn when IndexedDB is unavailable, pending or unconfirmed. Quota ratio must count total *origin* localStorage, not Kotoba-only bytes.
- Before writing cloud `users/{uid}`, await `durableStorage.flush()`, demand `verifyPrimary()`, compare existing remote Kanji evidence against outgoing full document, and reject loss; preferably keep versioned remote snapshots instead of replacing the only copy.
- Run the test suite in Node, followed by Safari/Chrome/Firefox integration tests on **anonymized copies**: app load, Placement, Kanji reviews, failed/quota write, outdated tab, offline/online, cloud conflict, reload, device restore, explicit reset and full backup export.
- Design an explicit intentionally-destructive reset/migration path with prior verified backup and user confirmation; current UI's reset action is not yet adapted to the guard.
- Do **not** restore actual Kanji data based on aggregate event counts.
