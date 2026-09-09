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
