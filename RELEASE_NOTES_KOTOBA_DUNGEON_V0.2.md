# Kotoba Quest – Little Dungeon V0.2 · Keyboard Flow & UI Polish

**Base:** V0.1 already installed. ZIP root contains four complete replacement files (`dungeon.html`, `dungeon.css`, `dungeon.js`, `dungeon-engine.js`) plus this note. Upload them into the **Kotoba Quest repository root**, replacing the V0.1 versions. Keep the original `dungeon-source.js` (read-only adapter) unchanged. The standard Kotoba Quest `index.html`, `cloud.html`, PWA and all Life RPG files are not part of this update. Reload `dungeon.html` after GitHub Pages deploys the changes.

## Keyboard-first controls
- Home: **Enter** starts the selected deck (mouse and existing deck radios remain available).
- Multiple choice: **1/2/3/4** directly answers; **Enter** on the feedback continues. Alternately **arrow keys** highlight a choice and **Enter** answers it. A Tab-focused button still responds to native Enter normally.
- Free reading: focus immediately moves into the text field; type Kana or Rōmaji and press **Enter** to submit, then **Enter** to continue. IME composition is not treated as a separate keyboard shortcut.
- Loot: **1/2/3** buys the respective offer when affordable; **4** skips. Arrow keys highlight an offer and Enter confirms. If the highlighted offer is unaffordable, Enter safely skips rather than buying impossible gear.
- Boss: **1** starts normal, **2** the optional timed challenge; arrows and Enter work, default Enter selects untimed.
- Run end: **Enter** or **1** starts a new run; **2** returns to camp. Help modal closes with Enter/Escape. Existing mouse/touch buttons are preserved. No automatic skipping of the correct-answer explanation.

## Visual pass
- Correct actual floor labels rather than literal `${n}` placeholders.
- Compact arena, spacing, clean response cards with visible shortcuts, focused keyboard selection, damage/impact cues and combo counter.
- Replace old CSS puppet with a standalone *inline vector UI avatar* (stylized fantasy figure, not an approved Life RPG canon portrait). No generated collage, photo, remote asset, or animation pack needed.
- Mobile text entry becomes a stacked layout to avoid horizontal overflow. Reduced-motion preference disables new effects.

## Compatibility / economy
- Dungeon storage key `kotobaQuestDungeonV1` and schema stay unchanged; previous runs, Dungeon gold/shards and permanent perks remain intact.
- Guru-only decks retain their selected source when resuming an in-progress run. Older saved `known`/`starter` sources still work.
- Same original `dungeon-source.js` reads Core/Mining information without editing the canonical Kotoba local SRS state. No SRS XP, stage, review-date or Life RPG reward changes; no cross-app integration is claimed.

## QA
- JS syntax and complete local scripted Chromium session: keyboard start, answer+Enter flow, **3 normal battles + 3 loot phases + normal boss + run end**, original Kotoba source snapshot unchanged; recovery of Guru run across a reloaded session; native Enter on focused button; arrows + Enter buying gear and starting 60-second boss; mobile 390px render without horizontal overflow; no runtime exceptions.
- Tests used a locally injected representative Kotoba deck and isolated browser storage. They do **not** prove the user's actual Safari/MacBook save/cloud state; please test on the target device after making a Kotoba backup.
