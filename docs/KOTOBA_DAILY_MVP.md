# Kotoba Daily – sichere spielbare Mobile-Vorschau (14.11.2026)

## Lernziel statt bloßer Streak
Kotoba Daily soll motivieren und gleichzeitig echte Sprachkompetenz entwickeln: kurze aktivierende Wiederholung, verständliche Einführung, kontrastive Aufgaben, freie Sprachproduktion und später Transfer in echte Texte und Gespräche. Eine Streak misst regelmäßige Übung, **nicht** Sprachbeherrschung.

## Umfang
- `daily.html`, `daily.css`, `daily.js`: eigenständige, mobile-first Oberfläche (kein Backend, keine neuen SRS- oder Cloud-Schreibpfade).
- `daily-engine.mjs`: achtteiliger **Daily Refresh** aus bereits gelernten Core-/Mining-Wörtern mit Bedeutungswahl, Produktion und Nutzung vorhandener Beispielsätze. Bei fehlenden Kontextbeispielen wird auf Bedeutungsfragen zurückgegriffen. Antworten, die nicht eindeutig als richtig oder falsch bewertet werden können, bleiben unbewertet.
- **Daily Growth – Probelektion** zu 〜てしまう: Erklärung, Bedauern, Kontrast zum vollständigen Abschluss und eigener Satz (manuell zu vergleichen).
- Unveränderter vorhandener `dungeon-source.js` als **read-only** Adapter auf den lokalen Kotoba-Spielstand. Weniger als drei verfügbare Lernwörter blockieren Refresh, Growth bleibt als Demo nutzbar.
- Additive `dungeon-nav.js` zeigt, **sofern dieses Skript in der jeweiligen Oberfläche bereits eingebunden ist**, einen ✿ Kotoba-Daily-Einstieg neben dem bestehenden Dungeon-Link. Es erfolgt keine Änderung an `cloud.html` oder `index.html`. Direkter Seitenzugang: `daily.html`.
- `daily-streak.mjs`: **reine**, DST-sichere Kalender-/Streak-Berechnung und idempotentes Tagesabschlussmodell als Vorbereitung. Noch **keine** persistente Streak, kein zusätzlicher Storage-Key.

## Sicherheitsgrenzen
Die P0-Problematik mit historischen Kanji-SRS-Einzelrecords ist ungeklärt. Es werden **keine** Speicher-, SRS-, Migrations-, Import-, Cloud-, Firebase-, Bridge- oder Life-RPG-Schreibpfade verändert. Die angezeigte Daily-Auswertung bleibt nur im Arbeitsspeicher, bis Datensicherung und echtes Storage-Modell vorliegen. Keine impliziten Tagesabschlüsse, Lebenspunkte, künstlichen Freischaltungen, XP oder SRS-Stufen.

## Tests und Evidenz
- `node --test tests/daily*.test.mjs`: 12 Unit-Tests bestanden (8 ursprünglich/Navigation und vier Streak-Tests; weitere Details im Testlauf).
- Isolierte Chromium/Playwright-Browser-Simulation **mit acht künstlichen Vokabeln**: 320px, 390px, 768px, jeweils acht Refresh- und vier Growth-Schritte erfolgreich; kein horizontaler Überlauf oder JS-Fehler.
- Navigation in simuliertem DOM mit vorhandenem Hauptmenü und Floating-Fallback erfolgreich, auch bei doppelter Skriptausführung keine doppelten Links.
- GitHub CI führt `node --test tests/*.test.mjs` aus. In der Browser-Simulation wurde **kein** echter Lernstand gelesen.
- **Nicht getestet:** tatsächliche Kotoba-Cloud/IndexedDB in Produktion, Safari auf iOS, Android-Geräte, Mehrgeräte-Sync, Cache/Service Worker und reale Antwortqualität aller Bestandskarten.

## Nächste Schritte
1. Live-Einbindung der Navigation und mobile Endgeräte getrennt prüfen; falls `dungeon-nav.js` in `cloud.html` nicht geladen wird, einen **geprüften additiven** Einstieg ergänzen, ohne die große Cloud-Datei ungeprüft umzuschreiben.
2. Ein **isoliertes, transparentes Tagesabschluss-/Streak-Metadatenmodell** erst nach unveränderter vollständiger Sicherung aller autoritativen Daten sowie Prüfung von Origin, Cloud-Konflikten, Idempotenz und Rollback anbinden.
3. Curriculum-Mapping auf echte Vokabel-/Grammatik-/Partikel-Skill-IDs mit Voraussetzungen, geprüften Aufgabenbanken und nachvollziehbarer Lernziel-Diagnostik.
4. Echte SRS-Wiederholungen ausschließlich über existierende freigegebene Commit-APIs, sobald vor- und nachher Datensätze bei Tests verlustfrei bleiben.
5. Authentisches Listening, Lesen, dialogische Produktion und später PWA/Home-Screen-Integration nach Service-Worker-Prüfung.
