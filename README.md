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
