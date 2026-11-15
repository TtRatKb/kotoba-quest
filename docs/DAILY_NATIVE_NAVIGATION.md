# Daily entry in the rendered app

Neither index.html nor cloud.html loaded dungeon-nav.js. Index contains a native Dungeon link. Cloud adds extensive enhancements to an index iframe, periodically replaces its desktop navigation, hides that nav on coarse-pointer mobile devices, and renders a separate dock. Therefore inserting Daily only into the old nav is unreliable.

This change adds a static, focusable ✿ Daily anchor in the outer Cloud bar alongside the existing Dungeon entry, independent of Firebase startup and iframe focus mode. Standalone index has its own native nav anchor; when embedded under the Cloud owner it is hidden (and the existing nav rebuilding can remove it). Links navigate at top level. Daily returns directly to index when reached with from=index, otherwise Cloud; only these two local return destinations are allowed. Existing menu groups and Dungeon remain intact. Optional legacy dungeon-nav.js detects native links and avoids adding duplicates/floating buttons.

Validation: existing tests plus two new navigation checks passed. Synthetic browser uses the actual Cloud document, its injected iframe and mobile dock, with Firebase SDK exports stubbed and no real account/network calls; standalone index and top-level round trip tested at 320/375/390/430/1024px. Daily is visible in the host bar, only one entry is visible, and no floating duplicates appear even after manually loading the legacy module. Reproduction: node tests/browser/daily-navigation.cjs (Playwright, /usr/bin/chromium).

Firebase synchronization, real signed-in data, iOS standalone and actual devices remain open. No storage, normalization, SRS, Firebase or bridge logic changed.
