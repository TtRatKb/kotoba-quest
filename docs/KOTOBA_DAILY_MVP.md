# Kotoba Daily – sichere erste spielbare Vorschau (2026-11-14)

## Ziel und didaktische Leitlinie

Kotoba Daily soll **nicht** bloß Streaks erzeugen: Das langfristige Produktziel ist ein lernzielorientierter, mobile-first Japanischkurs mit verständlicher Einführung, kontrastiven Aufgaben, aktiver Produktion, Wiederabruf und Anwendung in neuen Kontexten. Eine Streak ist nur ein Motivator und niemals ein Sprachkompetenz-Nachweis.

## Umfang dieser PR

- Neue unabhängige Seite `daily.html` mit mobiler Ansicht, achtteiliger **Daily Refresh**-Sitzung und vierteiliger **Daily Growth**-Probelektion zu `〜てしまう`.
- `daily-engine.mjs`: deterministische Tagesauswahl aus **bereits gelernten** Core-/Mining-Vokabeln; Aufgabentypen Bedeutungswahl, produktive Eingabe, Bedeutungswahl im echten vorhandenen Beispielsatz; bekannte zulässige Bedeutungen/Lesungen werden berücksichtigt; unbekannte freie Varianten werden zum manuellen Vergleich gestellt statt sicher als falsch gewertet.
- `daily.js`/`daily.css`: auf Smartphones gut bedienbare Oberfläche, schrittweise Erklärung, eindeutige Korrektur, Abschlussübersicht; für freie Sätze ausdrücklich keine falsche automatische Bewertung.
- Bestehendes `dungeon-source.js` als **unveränderter, nur lesender Adapter** auf Kotobas lokales IndexedDB-Save. `cloud.html`, `index.html`, `storage/*`, `sync/*` und bestehende SRS-Algorithmen bleiben unangetastet.
- Kein neuer Storage-Key, keine Cloud-Synchronisation, keine persistente Streak, keine SRS-Buchung und kein Life-RPG-Reward. Erledigte Aufgaben existieren nur im Arbeitsspeicher und verfallen beim Neuladen.
- Kein künstliches Freischalten unbekannter Wörter: Bei weniger als drei lernbaren Wörtern ist Refresh deaktiviert. Growth funktioniert als ausdrücklich **beispielhafte neue Lektion** trotzdem.
- Eigenständiger Einstieg über `daily.html`; noch keine Navigation in `cloud.html` eingebaut. Direkte URL erst nach Merge und GitHub-Pages-Deployment verfügbar.

## Wichtigste Grenzen

1. Die Growth-Lektion ist statisch und **nicht** mit Grammatik-Fortschritt synchronisiert. Ihr Inhalt ist ein didaktisch ausgearbeiteter Entwurf, kein vollständiger Grammatik-Curriculum-Motor.
2. Die Kontextübung testet bislang **das fokussierte Wort im Beispielsatz**, nicht vollständiges Leseverständnis. Bei fehlendem brauchbarem Beispielsatz wird eine Bedeutungsfrage verwendet.
3. Kein Audio, kein Spracherkennen, kein Romaji→Kana-Eingabeconverter, keine echte Fälligkeitspriorisierung; Auswahl verwendet nur die gelesene SRS-Stufe.
4. Die generierte Daily-Sitzung ist getrennt vom autoritativen SRS. Echte Review-Abschlüsse erst nach Analyse und verlustsicheren Tests der bestehenden Commit-APIs.
5. Reale Browser-, iOS-/Android- und Firebase-Livetests wurden nicht ausgeführt. Unit-Tests decken reine Aufgabenlogik und Schreibschutz ab. Vor Freigabe auf Geräten testen.

## Weiterer Ausbau (separate Schritte)

1. **Sicheres Daily-Metadatenmodell** für Tagesabschluss/Streak mit überprüfter idempotenter Speicherung, Geräte-/Zeitzonenwechseln, Offline-Synchronisation und Backup-/Recovery-Tests.
2. **Curriculum-Mapping** mit vorhandenen Grammatik-/Partikel-Skill-IDs, Voraussetzungen, freigegebenem Aufgabenpool, erst danach adaptive Auswahl.
3. **Optionale echte SRS-Reviews** nur mit existierenden geprüften Review-Commit-APIs; nur nach vollständigen fachlichen Prüfschritten, Stage/Due-Tests und Nutzerfreigabe. Kein selbstgeschriebener SRS-Commit.
4. **Listening/Reading/Produktion** sinnvoll erweitern; Audio und mehrdeutige freie Antworten mit präziser Bewertung oder selbstkritischer Offenlegung fehlender Bewertbarkeit.
5. Integration in Navigation und PWA nach separat geprüftem Service Worker / Cache / GitHub-Pages-Origin.

## Tests

`node --test tests/daily-engine.test.mjs`

Bevor die Seite auf `main` landet: bestehende Regressionstests, manuelle Smoke-Tests in einer isolierten Kopie mit ausschließlich nicht-produktiven Daten, mobile Responsiveness und ausbleibende SRS-/IndexedDB-Writes bestätigen.
