# Kotoba Quest – Storage stabilization v13.1

This pass addresses localStorage growth during large vocabulary review sessions.

## What changed

- The active Kotoba Quest save remains in IndexedDB.
- The vocabulary SRS safety ledger now stores compact tuples instead of verbose duplicated JSON objects.
- The verbose review commit journal is now only a transient crash-recovery buffer. Once the compact SRS ledger is written successfully, the corresponding journal entry is removed immediately.
- Old journal data is migrated into the compact ledger and cleared safely during storage maintenance.
- Smart Review's localStorage backup now stores compact directional counters only; duplicate word/reading strings and event history stay in the IndexedDB primary save.
- The cumulative analytics localStorage backup no longer duplicates the rolling 500-event timeline; day/action aggregates remain protected.
- The Kotoba ↔ Life RPG bridge no longer persists the full 500-event analytics checkpoint in localStorage and keeps a smaller recent-event window while preserving unsynced events.
- Existing helper data is compacted automatically on startup / storage maintenance.
- The 4 MB figure in the storage dialog is clarified as Kotoba's conservative localStorage warning budget, not the browser's total storage quota.

## Safety

No vocabulary SRS stage, due date, correct/incorrect count, Guru history, Mining vocabulary, grammar/particle progress, or Life RPG data is intentionally removed by this compaction pass. The large authoritative learning state remains in IndexedDB and the cloud-save path is unchanged.
