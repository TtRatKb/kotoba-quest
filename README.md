# kotoba-quest
Meine persönliche Vokabel-SRS-App


## V8 Synonym Persistence Repair
- User-approved German translation synonyms are now persisted in `acceptedMeanings`, which is part of the compact Core progress delta and survives IndexedDB/Core rehydration.
- Vocabulary answer validation now accepts built-in meanings plus `acceptedMeanings`, `synonyms`, and `meaningAlternatives`.
- Legacy `vocabularyMeaningOverrides` are restored into the canonical accepted-meaning field on startup.
- Synonyms added from the normal review/placement veto flow are mirrored to the canonical live vocabulary row before save.

## V6 Vocabulary Content & Audio Repair
- Robust Core-2000 rehydration from compact IndexedDB progress via packEntryId/coreIndex/legacy IDs.
- Explicit stable coreIndex persisted for bundled vocabulary.
- Repairs blank Core cards on startup without resetting SRS progress.
- Audio fallback can use reading or word and external pack carries audio aliases.


## V8.1 / V9 synonym validator repair
- Fixes a normalization bug where `makeVocabulary()` discarded `acceptedMeanings`, `synonyms`, and `meaningAlternatives` while rebuilding Core-2000 rows.
- The listening/meaning answer validator already knew how to accept these fields, but they were gone by the time the next queued question was rendered.
- `vocabularyMeaningOverrides` is now also preserved by the base loader.
- Saving a synonym now self-verifies against the exact placement/review validator before showing a success message.

## V10 Runtime hydration / lesson repair
- Fixed a storage-layer regression where the compact IndexedDB/Cloud representation was copied back into the live in-memory vocabulary after every save. That stripped bundled Core rows down to progress-only fields and caused blank lesson cards while audio could still work.
- Core lessons, vocabulary archive rows, normal reviews and the post-lesson checkpoint now defensively rehydrate Core items from the immutable Core-2000 catalogue before rendering.
- Meaning rendering no longer assumes `meanings` is always present, so a damaged/legacy row cannot make “Antwort zeigen” look like a dead button.
- Cloud restore now has a verified localStorage fallback when IndexedDB initialization is unavailable, and a failed “Cloud verwenden” attempt keeps the conflict retryable instead of discarding it.
- Standalone `index.html` no longer crashes when the cloud-only legacy setting controls are absent; this also keeps the direct fallback usable if `cloud.html` compatibility injection ever fails.
- The Life-RPG external vocabulary-review API now rehydrates Core items before exporting a Quick Japanese session, so compact storage rows cannot leak out as blank prompts.


## V11 Core-2000 curriculum rebalance
- Restored the historical Kotoba Quest foundation sequence for Core Levels 1–10 (200 words), beginning with essential verbs such as する, ある, いる, 行く, 来る rather than semantic category blocks.
- Reintroduced 32 foundational items that had accidentally disappeared when the 200-word beta pack was expanded to 2,000 items.
- Rebalanced Levels 11–20 for a gentler transition into lower-intermediate vocabulary.
- Moved 部長 and 課長 out of the opening placement path; they now occur much later instead of around Level 4.
- Retired 32 redundant noun+する duplicate cards to keep the catalogue at exactly 2,000 items; existing progress on those cards migrates to the corresponding base noun.
- Core migration now prefers lexical identity over legacy numeric slots, preventing old progress from attaching to a different word after reordering.
- Existing saves at Core Level 1–10 receive a one-time placement restart at Level 1 so the corrected ordering is assessed cleanly; SRS data itself is preserved and re-mapped.
- `cloud.html` no longer overrides the canonical embedded pack with a stale category-ordered cloud copy.

## V12 Full Core-2000 frequency / pedagogy pass
- Rebalanced Core Levels 21–100 instead of leaving the expansion in thematic blocks. Levels 1–20 from V11 remain unchanged.
- Common time words, discourse adverbs, connectors, everyday expressions, body/home/food/travel vocabulary and frequent actions now appear before specialist terminology.
- Topic cliffs were broken up: later levels mix related material by practical usefulness instead of presenting large blocks such as company hierarchy, vegetables, animals, science, law or adverbs all at once.
- Specialist business, legal, scientific, medical, geographic and low-frequency animal/plant vocabulary is deferred progressively. 部長 and 課長 now sit around the later intermediate range rather than in the opening placement path.
- The catalogue remains exactly 2,000 cards / 100 levels / 20 cards per level and keeps stable pack IDs so existing SRS progress migrates by lexical identity.
- Core order revision is now 3. Existing V11/revision-2 learners who are still within Levels 1–20 keep their current placement untouched. A save that had already crossed into changed Levels 21–100 reopens placement from Level 21 while preserving all SRS progress.
- `cloud.html` continues to defer to the canonical embedded pack so cloud/fresh-browser launches use the same full ordering.
