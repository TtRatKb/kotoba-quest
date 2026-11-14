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


## Nächster Ausbauschritt: Read-only Guided Practice (14.11.2026)
- Neue Datei `daily-guided.mjs`: kuratierte, kurze Übungspfade, deren Voraussetzungen direkt mit den **vorhandenen** `grammar.points[ID].lessonComplete` und `particlePath.points[ID].lessonComplete` abgeglichen werden. Die Datensätze werden nur über den unveränderten `KotobaDungeonSource.readSave()` im lokalen, autoritativen Snapshot gelesen; kein zusätzlicher Speicherort, keine `normalizeState`- oder Migrationsaufrufe.
- Erste **didaktisch überprüfbare** Kontrastlektionen: は/が, に/で, ようになる/ようにする. Die beiden よう-Einzelpfade werden nur angeboten, wenn die jeweilige einzelne Lektion bekannt, die Vergleichslektion aber noch nicht gelernt wurde.
- Jede geführte Einheit hat eine Erklärung, konkrete Kontextentscheidungen, Kontrastfeedback und einen offenen Transfersatz. Freie japanische Antworten sind bewusst **nicht automatisch benotet**; alle Übungen sind freiwilliges Training und reduzieren keine SRS-Wiederholungen.
- Wenn der gespeicherte Fortschritt keine passende nachgewiesene Lektion enthält, gibt es **keine erfundene Freischaltung**: Die vorhandene Grammatik-Probelektion bleibt separat zugänglich.
- Bei mehreren verfügbaren Themen zeigt Daily alle geprüften Pfade an. Für künftige Empfehlungen wird ausschließlich lesend anhand fälliger Skill-Intervalle priorisiert; die Priorität bedeutet **keinen** SRS-Commit.
- Testabdeckung: Lehrnachweis, vollständige Paar-Voraussetzungen, Vorher-/Nachher-Identität des gesamten Spielstands, Korrektheit eindeutiger Antworten und Schreibpfadschutz. Kein Live-Zugriff auf echte Nutzerdaten.
- **Begrenzung:** Noch kein Vollkurs und keine dynamische Extraktion beliebiger Aufgaben aus `cloud.html`. Nur diese bewusst kuratierten Lernziele gelten als unterstützt. Als Nächstes weitere geprüfte Fragenbanken ergänzen und eventuell den lokalen Streak-Metadatenbereich nach separater Datensicherung anbinden.

## Alltagsdialoge und wechselnde Grammatik-/Partikelquests (14.11.2026)
- **Zwei zusätzliche kuratierte Kontrastpfade:** `から` gegen `まで` (Anfang und Ende von Zeitspannen) sowie `だけ` gegen `しか〜ない` (neutrales „nur“ versus erforderliche Negation). Quellenabgleich gegen die echten Particle-Path-IDs in `cloud.html`: `kara-source`, `made-limit`, `dake-only`, `shika-negative`.
- **Zwei Aufgabensätze je Pfad:** Die bisherigen fünf Guided-Quests sowie die zwei neuen Pfade verfügen über getrennte, redaktionell formulierte Anwendungsszenarien und offene Transfersätze. Pro Tag wird anhand eines DST-sicheren Kalenderwerts entweder Variante A oder B angezeigt; bei gleichem Tag und Lernstand bleibt die Variante stabil.
- Aufgabenarten: Lücken in japanischen Alltagssätzen, Gesprächsfragen und Bedeutungsentscheidungen mit gezieltem Kontrastfeedback. Die Einführung bleibt erhalten, die nachfolgenden Fragen wechseln. Dialogzeilen bleiben durch `white-space:pre-line` lesbar.
- **Keine erfundene Freischaltung:** Individuelle Guided-Quests bleiben nur verfügbar, wenn **alle** vorhandenen `lessonComplete === true`-Flags ihrer Voraussetzungen im maßgeblichen Save stehen. Bei fehlender Evidenz bleiben sie gesperrt.
- **Keine zusätzliche Last:** Maximal die bisherige Pfadlänge (je 3–4 Schritte), keine automatisch hinzugenommenen SRS-Karten; wechselnde Antworten werden nicht persistent gespeichert.
- **Schutzmaßnahmen:** Keine Änderungen an `cloud.html`, `index.html`, IndexedDB, Firebase, Kanji, Life RPG oder den SRS-Commit-APIs. Varianten sind reine Definitionsdaten; Auswahl und Auswertung sind unverändert read-only.
- Neue Tests prüfen Freischaltungsbedingungen und echte Curriculum-IDs, Fragequalität, unveränderte Spielstände, Dateirotation inkl. DST, unbenotete freie Produktion sowie das Fehlen von Schreibpfaden. Produktiver Browser-/Smartphone-Test steht weiterhin aus.

## Nächste Schritte
1. Live-Einbindung der Navigation und mobile Endgeräte getrennt prüfen; falls `dungeon-nav.js` in `cloud.html` nicht geladen wird, einen **geprüften additiven** Einstieg ergänzen, ohne die große Cloud-Datei ungeprüft umzuschreiben.
2. Ein **isoliertes, transparentes Tagesabschluss-/Streak-Metadatenmodell** erst nach unveränderter vollständiger Sicherung aller autoritativen Daten sowie Prüfung von Origin, Cloud-Konflikten, Idempotenz und Rollback anbinden.
3. Curriculum-Mapping auf echte Vokabel-/Grammatik-/Partikel-Skill-IDs mit Voraussetzungen, geprüften Aufgabenbanken und nachvollziehbarer Lernziel-Diagnostik.
4. Echte SRS-Wiederholungen ausschließlich über existierende freigegebene Commit-APIs, sobald vor- und nachher Datensätze bei Tests verlustfrei bleiben.
5. Authentisches Listening, Lesen, dialogische Produktion und später PWA/Home-Screen-Integration nach Service-Worker-Prüfung.
