# Kotoba Dungeon V0.5

## Live Kotoba vocabulary is available again

Kotoba Quest storage V3 moved the authoritative learning state out of physical `localStorage` and into IndexedDB. The Dungeon source adapter still looked only at the old `kotobaQuestDataV*` localStorage keys, so a current installation could appear to have no learned vocabulary and effectively leave only the 20-word Starter deck usable.

V0.5 reads `kotobaQuestDurableStorageV1 / snapshots / primaryLearningState` first, uses `mainCheckpoint` as a recovery fallback, and only then checks the old localStorage saves. This is read-only; Dungeon never changes SRS state.

## Deck filters

The Camp now offers six explicit run pools:

- **All learned words** — every introduced Core or Mining word from A1 through Burned.
- **Learning phase A1–A4** — only newer vocabulary still in Apprentice.
- **Guru and higher** — familiar vocabulary from G1 through Burned.
- **Core only** — introduced Core vocabulary.
- **Mining only** — introduced personal Mining vocabulary.
- **Starter demo** — the original 20-word test deck with reduced Dungeon rewards.

A source with fewer than three usable words is disabled because a Dungeon run needs at least three distinct cards. The selected source is stored in an active run so refresh/resume uses the same deck again.
