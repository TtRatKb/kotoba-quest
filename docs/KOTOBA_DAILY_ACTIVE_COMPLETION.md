# Aktive Tagesquest — Funktionsstufe nach #22

## Verhalten
- Startseite zeigt Tagesziel, nach qualifizierendem Abschluss „Heute geübt“ und aufeinanderfolgende Lerntage. Der Stand existiert **nur auf dieser geöffneten Seite**, nicht nach Neuladen/Schließen, nicht in anderen Tabs/Geräten. Die Grenze steht direkt an der Anzeige und im Abschlussfeedback.
- Ein vollständiger bestehender Daily Mix, Refresh, Guided-Pfad oder eine aktiv bearbeitete Probelektion kann zählen. Alle Aufgaben brauchen einen eigenen Versuch, Erklärungen eine Bestätigung. Mindestens drei Gesamtschritte und zwei aktive Aufgaben erlauben auch die kurzen Guided-Einheiten. Fehler und unbewertete eigene Antworten sind erlaubt; es gibt keinen Mindestscore. Japanische Textaufgaben benötigen japanische Schrift; das ist kein automatischer Sprachnachweis.
- „Meinen Versuch vergleichen“ und „Nur Musterlösung ansehen“ sind getrennt. Anschauen bleibt freiwillig und erlaubt, erzeugt aber keinen Tagesabschluss. Leere/Whitespace-Eingaben werden vor dem Vergleichen mit einem Hinweis abgefangen.
- Abschlusszeit bestimmt den lokalen Kalendertag; wiederholte Quests am selben Tag geben keinen weiteren Lerntag. Startseite aktualisiert sich bei lokalem Mitternachtstimer, Fokuswechsel und Rückkehr aus dem Hintergrund. Bereits offene Aufgaben werden dabei nicht ersetzt.
- Japanische IME-Komposition verhindert verfrühtes Absenden; nach Ende der Komposition funktioniert Enter wieder. Tastenkürzel nach der Zusammenfassung greifen nicht auf eine nicht mehr vorhandene Aufgabe zu.

## Bestandsschutz
`daily-completion.mjs` ist eine reine Aktivitätsprüfung. Anzeige nutzt die vorhandenen reinen Funktionen in daily-streak.mjs. Nur flüchtige UI-Felder werden verändert. Keine neue SRS-Queue, keine SRS-Einträge oder Fälligkeiten, keine XP/Life-RPG-Events. Source-Adapter, Storage, Firebase, Sync, Kanji und Kernapp bleiben unverändert. Keine produktiven Daten gelesen, gesichert oder verändert; der Kanji-P0 bleibt offen.

Persistente Streak weiterhin ausstehend: siehe KOTOBA_DAILY_STREAK_DESIGN.md. Weder Sicherungsnachweis noch Browserprofil-/Kontoentscheidung werden durch diese Stufe ersetzt.

## Prüfevidenz
- `node --test tests/*.test.mjs`: **77/77 erfolgreich**. Neue Tests für alle vorhandenen Modi und A/B-Pfade, fehlende/doppelte/übersprungene Antworten, eigene japanische Versuche, Unveränderlichkeit, lokale Mitternacht, Berliner DST und Tages-Idempotenz.
- `node --check daily.js && node --check daily-completion.mjs` und `git diff --check` erfolgreich.
- Optionaler reproduzierbarer Browsertest: `CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-completion.cjs` (Playwright + Chromium erforderlich; keine neue App-Abhängigkeit). Eigener lokaler HTTP-Server, ausschließlich künstlicher Source-Adapter; Storage-Schreibmethoden und IndexedDB-Zugriff werden abgefangen.
- Chromium **320/390/768px**: Aktivitätsabschluss, bewusste Musterlösungsansicht ohne Gutschrift, Abbruch, Mehrfachabschluss, alle vier Modi, Abschluss über Mitternacht, IME-Submit-Guard, Enter, Whitespace-Hinweis, kein Überlauf/JS-Fehler/Speicherzugriff. Nach Neuladen kein gespeicherter Abschluss.
- Vorhandener Browser-Smoke mit leeren/unlesbaren künstlichen Quellen ebenfalls erfolgreich.
- Offen: echte iOS-/Android-Tastaturen und IMEs, reale Geräte/Screenreader, produktive Datenflüsse und Offline-/Cache-Verhalten. Synthetische Kompositionsereignisse sind kein echter IME-Gerätetest.
