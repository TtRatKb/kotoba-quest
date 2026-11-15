# Daily mobile task shell — 15 November 2026

Task UI now occupies the visual viewport. Progress is above a scrollable task/feedback region; a separate bottom control region contains input/submit or Next. Controls occupy layout space instead of covering content. Safe areas, dynamic viewport resizing and visualViewport offsets are respected. Short-height layout removes decorative header/goal text. Home and summary retain normal scrolling.

Existing task generation, grading, IME guard, keyboard shortcuts, focus handling, day completion and optional practice remain unchanged. After submitting, feedback is scrolled into view inside the content region; Next remains in the bottom dock. No persistence, loading, SRS, cloud or kanji code changed.

Validation: 83 Node tests passed. Synthetic Chromium flows passed at 320×568, 375×667, 390×844, 430×932, 320×360 and 390×320; assertions cover input/dock/Next in viewport, feedback heading visible immediately, all modes, completion, practice, IME guard and no storage access. Reduced height simulates keyboard space; it is not an actual iOS/Android keyboard test. Real devices, safe-area hardware, screenreaders and production cache remain open. Optional reproduction: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-completion.cjs.
