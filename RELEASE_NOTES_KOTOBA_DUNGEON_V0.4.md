# Kotoba Quest · Little Dungeon V0.4 — Answer Clarity / Camp Balance / Reward Bridge

**Base:** existing Little Dungeon V0.3. This is a repo-root delta. Upload the seven runtime/helper files plus this note to **Kotoba Quest only**. Do NOT delete original `dungeon-source.js` or replace the current `cloud.html`, `index.html`, old PWA, Kotoba SRS source or normal review code with an older snapshot. Export your Kotoba Quest save before updating.

## Gameplay
- Reading input accepts true Kana and Rōmaji including `wakaru` => `わかる`, supported alternative readings and Katakana normalization. The Camp has a persisted **あ Automatisches Hiragana** checkbox (on by default). With this enabled, a non-destructive live Kana preview is shown while typing; the final Japanese input is converted to Hiragana on Enter, without a keyboard change. With it off, Kana and Rōmaji are still accepted by the underlying answer checker. German meaning questions are **not** passed through a Japanese converter. The English/German keyboard stays in place. Partial Rōmaji isn't destructively converted mid-syllable.
- Major, distinct question colours and large task-category chip for reading (blue), meaning (rose), Japanese production (plum), sentence (green). Free input + Enter → Enter loop and optional 1–4 choice mode remain.
- Existing Camp XP/gold/gear from V0.3 persists. Training benefits now have soft diminishing returns (`sqrt` progression) instead of endlessly increasing raw attack by 2 per level. The permanent investment/points are **not** deleted. Even a highly geared player needs at least 3 correct answers against a normal boss, or 4 against a timed boss; grinding helps but never makes a boss a zero-study click.
- Only genuine completed enemy/boss kills create one stable `runId:floor` receipt. No reward for mere button taps, failed questions, starter preview of a question or repeat replay of the same floor; normal enemies yield progress, the boss yields an extra event. Receipts are stored separately in the same-origin `kotobaQuestDungeonRewardOutboxV1` (bounded 2,400 latest events), not in Kotoba vocabulary/SRS. Existing V0.3 victories are NOT fabricated as past receipts.

## Native Kotoba entry (without risking the current 5.8 MB cloud.html)
- `dungeon-nav.js` is an additive navigation/launcher component and remains inactive until loaded by the normal Kotoba page.
- Upload the ZIP first, then open `https://ttratkb.github.io/kotoba-quest/dungeon-nav-installer.html` **after GitHub Pages has deployed it**. Click **Cloud-Einstieg aktualisieren** to download a complete replacement of the **currently deployed** `cloud.html` containing exactly one script tag for this version. Upload that downloaded `cloud.html` to GitHub, replacing the existing file. If you also use the standalone `index.html`, repeat with **Index-Einstieg aktualisieren**. No terminal, no copying a partial code snippet, no wiping vocabulary.
- This browser-local helper only FETCHES same-origin current HTML and downloads the updated file; it does NOT write back to GitHub itself. Do not deploy an older source snapshot from this ZIP.

## Life RPG connection
- First install the **separate Life RPG V0.31.4dh ZIP** into the Life RPG repository and open Life RPG once. Japanese / Connected Japanese study then has a Dungeon entry and reward status. The existing Life RPG SRS/review connection remains unchanged.
- When both apps share a web origin, completed Dungeon kill receipts transfer by same-origin localStorage and are consumed when Life RPG is open/reopened. Different origins cannot read each other's localStorage; in that case use **Siegesbelege exportieren** in the Dungeon Camp and import the JSON in the new Life RPG panel. This is an honest fallback, not a claimed server-side or cross-domain push integration.
- A run can be completed offline and picked up later if the same-origin outbox is still present. Backups of Kotoba vocabulary do NOT include separate Dungeon progress/outbox; do not delete site data. Full personal Safari/Cloud Save cross-device has not been verified.

## QA
- Node VM: actual V0.3-state migration, valid Rōmaji, 3 enemy kills + one boss one-time receipts, reload, overlevelled boss minimum correct-answer count, no SRS save writes.
- Life RPG simulated reward ledger: duplicate guard, boss bonus, malformed/old receipts, 140 successive genuine wins with no coin/XP hard cap, separate existing Kotoba review state, story-energy fractional carry.
- Syntax checks for all JS and installer inline script. Real Safari/iPad and current deployed Cloud page remain a user-device check. Chromium local visual run did not finish reliably in this environment; **do not treat Node mock QA as a real browser acceptance test.**
