# Particle review quality audit — 2026-10-18

**Scope:** read-only inspection of the 32 existing Particle Path points, their 64 ordinary example sentences, their global accepted forms/distractor pools, and the `buildReviewQuestion` path. No production records, Firebase, IDs, SRS timing or commit API were accessed or changed. This is an editorial audit, **not** proof that every Japanese sentence was reviewed by a native speaker.

## Corrected source-content defect

- **`nitaishite-target`, example 2:** Original `兄は社交的なのに、弟に対して静かです。` could mean that the *older brother* is quiet toward his younger brother, **not** the supplied German sentence asserting the younger brother is quiet. Replaced only the example text with `兄は弟に対してとても厳しいです。` / „Mein älterer Bruder ist seinem jüngeren Bruder gegenüber sehr streng.“ The skill ID, target particle `に対して`, scoring and SRS records remain unchanged. The new phrase explicitly tests a directed attitude.

## Remaining contextual ambiguities (not automatically auto-corrected)

| Priority | Point / example | Why a unique answer is not guaranteed | Safe editorial follow-up |
| --- | --- | --- | --- |
| P1 | `wa-topic` 1: `私＿学生です。` | `私が学生です` is legitimate in an identification/focus context, while `私は` sets the topic. „Ich bin Studentin“ does not distinguish them. | Introduce a clear conversation frame, or provide per-example accepted variants without applying them globally. |
| P1 | `hewa-contrast` 2: `海外＿まだ行ったことがありません。` | `海外には` can naturally replace `海外へは`, with a different focus but compatible meaning. | Add an explicit directional contrast or accept `には` for this example only. |
| P1 | `demo-even` 1: `雨の日＿毎朝走ります。` | `雨の日も` is grammatical, although `でも` more strongly expresses „selbst an Regentagen“. | Clarify the intended nuance in context; do not simply grade all `も` answers as incorrect. |
| P2 | `dewa-contrast` 2: `この店＿カードを使えません。` | Plain `この店で` is also natural without a visible contrasting shop; German says „dagegen“, but Japanese context does not establish it. | Include a contrasting first clause. |
| P2 | `towa-contrast` 2: `幸せ＿何でしょう。` | `幸せとは何でしょう` and `幸せは何でしょう` can both ask about happiness, with different nuance. | Include a definition-specific context or permit both as appropriate. |
| P2 | `niyotte-means` 1: `大雨＿電車が止まりました。` | `大雨で` also expresses the cause naturally. Its presence in a choice pool would create a genuine alternative. | Exclude `で` from this item's scored distractors or accept it contextually. |

## Engineering observations

1. The question builder chooses from `point.distractors` plus nearby-point particle pools, rejecting forms on the **point-wide** `accepted` list. A correct form in another context can thus still appear as an incorrect choice. `e-direction` already accepts both `へ` and `に` at point scope, and the builder excludes the second accepted form from choices.
2. The builder falls back to typed input when it cannot collect three distinct alternatives. This is safer than inventing low-quality options.
3. **Future fix proposal:** add an explicitly curated per-example `accepted` list and per-example allowed `choices` without altering stored skill IDs/stages. Before implementing, test scoring and the Life RPG bridge on isolated fixtures. Do not globally expand accepted lists when the other examples would become incorrect.
4. Automated tests cover structural data integrity, distinct MC choices, exclusion of already accepted variants, and read-only question generation. They **cannot** establish linguistic unambiguity on their own.

**Status:** The one clearly wrong example above is corrected; the remaining flagged prompts require a separate safe editorial pass. Do not close Issue #7 on the basis of this audit.
