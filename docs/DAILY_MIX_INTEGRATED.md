# Eine gemischte Daily Quest

## Grundlage und Veröffentlichung

PR #33 wurde vor Beginn geprüft: offen, konfliktfrei, Daily-CI erfolgreich auf `822de263a04e04941e300ebac6f82b03b33240a8`. Mit der bestehenden Merge-Freigabe wurde er als unveränderte Grundlage nach `main` integriert: `7b5ccd5067a5e0a5d71712fa5be30fdf884811a7`. Daily-CI und [GitHub-Pages-Deployment](https://github.com/TtRatKb/kotoba-quest/actions/runs/43721104510) dieses Main-Commits waren erfolgreich. Der direkte Live-Abruf aus der Entwicklungsumgebung wurde mit HTTP 403 blockiert; ein tatsächlicher Smartphone-Livetest ist damit nicht nachgewiesen.

Diese Folgeänderung verwendet die vorhandenen Bildaufgaben, Renderer, Lesungshilfen und Effekte weiter. Keine zweite Implementierung der Übungstypen und keine neuen Bilddaten. Herkunft und Nutzungsbedingungen bleiben in [assets/daily/README.md](../assets/daily/README.md) dokumentiert.

## Sessionplan

- **Normal:** acht Schritte. Ein vollständiger bestehender Grammatik-/Partikelpfad mit Erklärung, Anwendungen und eigenem Transfersatz; passende Bildauswahl, Matching und Satzbau ersetzen einen Teil der Vokabelplätze. Mindestens ein aktiver Wortabruf bleibt erhalten.
- **Kurz:** sechs Schritte. Derselbe vollständige Lernpfad, ein bis drei Vokabelaufgaben und höchstens eine passende spielerische Aufgabe. Auch diese Quest kann einen Tagesabschluss erhalten.
- **Verlängerung:** am Ende freiwillig bis zu drei weitere Aufgaben, einmal pro Quest. Identische Aufgaben aus der ursprünglichen Quest werden ausgelassen. Die ursprüngliche Auswertung bleibt erhalten; die Zusatzrunde erzeugt keinen weiteren Tagesabschluss, auch nicht über Mitternacht. Abbrechen und zur ursprünglichen Auswertung zurückkehren ist jederzeit möglich. Das bisherige gezielte Nachüben bleibt zusätzlich erhalten.

Der Plan wird deterministisch aus Datum und bereits gelesenem Lernstand erzeugt. Bildauswahl und Matching stammen ausschließlich aus dem konservativ geprüften persönlichen Bildwortbestand von #33. Fehlende oder anders formulierte Bedeutungen führen zu einem Fallback auf bestehende Vokabelaufgaben, niemals zur stillen Verwendung der Demo. Satzbau verlangt weiterhin exakt nachgewiesene abgeschlossene Voraussetzungen. Ohne passenden geführten Pfad bleibt die vorhandene ausdrücklich gekennzeichnete Probelektion erhalten.

Anwendungen verschiedener Arten wechseln sich ab. Die vollständige Erklärung bleibt vor ihren Anwendungen; der eigene Transfersatz schließt die Quest ab. Eine normale Quest mit vollständigem Material enthält alle drei spielerischen Arten, ohne eine zusätzliche lange Aufgabenliste zu erzeugen.

Die Zeitangabe wird aus einfachen Gewichten pro Aufgabenart geschätzt (etwa 12 Sekunden für Bildauswahl, 30 für drei Paare, 35 für Satzbau, 55 für eigenen Transfer plus Erklärung und übrige Aufgaben). Das ergibt typischerweise rund 3–5 Minuten normal und rund 2–4 Minuten kurz. Es ist eine Orientierung mit Puffer, kein Timer und kein durch Nutzerdaten validierter Zeitnachweis. Lese-/Eingabetempo kann abweichen.

## Tagesabschluss ist Teilnahme, kein SRS-Nachweis

Die bestehende reine Abschlussprüfung wurde für visuelle Aufgaben innerhalb des Modus `daily` erweitert. Jede Aufgabe muss aktiv bearbeitet werden. Bildantworten müssen zu den tatsächlichen Optionen gehören; Matching braucht alle eindeutigen Paar-IDs; Satzbau braucht sämtliche Token genau einmal. Strukturierte Antwortdaten bleiben ausschließlich im Arbeitsspeicher. Ein bloßer Anzeigetext wie „3 Paare“ ist kein Abschlussnachweis.

Ungeprüfte, aber vollständige Satzreihenfolgen bleiben unbewertet mit Musterlösung und zählen als Teilnahme. Richtigkeit ist keine Mindestbedingung für den Tagesabschluss. Nur die Musterlösung des eigenen Transfersatzes anzusehen oder vorzeitig abzubrechen qualifiziert weiterhin nicht. Tagesabschluss erfolgt höchstens einmal pro lokalem Kalendertag beim tatsächlichen Ende, unverändert mit der vorhandenen Sommer-/Winterzeit-Behandlung.

Die separate Bilddemo und das separate Bildtraining erhalten weiterhin keinen Tagesabschluss. Nachüben und Verlängerung können weder den ursprünglichen Score verändern noch einen neuen Tag verdienen.

Die Abschlussansicht nennt Lernziel, Wörter, Bildverbindungen, Satzbau, eigenen Transfersatz und tatsächliche Teilnahme. Sie nennt ausdrücklich **0 offizielle SRS-Reviews**. Keine Guru-, Level-, Beherrschungs- oder Review-Abbau-Behauptung.

## Streak und Sicherheitsgrenze

Die sichtbare Sieben-Tage-Übersicht berechnet Kalenderdaten rein aus den Tagen der geöffneten Seite. Heute ist markiert, aktive Tage erhalten einen Haken. Die UI kennzeichnet den flüchtigen Zustand ausdrücklich. Nach Reload, Schließen oder in einem anderen Tab ist er nicht vorhanden.

Der [isolierte Speicherentwurf](KOTOBA_DAILY_STREAK_DESIGN.md) bleibt Vorbereitung. **Keine neue Persistenz.** Browserprofil versus Konto, überprüfte vollständige unveränderte Sicherungen, getestete Wiederherstellung auf isolierten Kopien, Nebenläufigkeit/Fehlerbehandlung und die abgegrenzte Schreibfreigabe fehlen weiterhin.

Die [SRS-Analyse aus PR #32](https://github.com/TtRatKb/kotoba-quest/pull/32) wurde gelesen. Deren Blocker gelten unverändert: keine vertrauenswürdige gebundene Review-Transaktion, unzureichend belegte Versions-/Fälligkeitsprüfung und keine nachgewiesene atomare Commit-/Idempotenz-/Outbox-Erholung. Daily importiert weder produktive Commit-APIs noch eine zweite SRS-Engine. Vokabel-, Kanji-, Grammatik-, Partikel-, Cloud-, IndexedDB-, Story- und Life-RPG-Datenflüsse bleiben unverändert. Der historische Kanji-Verlust ist dadurch weder behoben noch als sicher erklärt.

## Mobile Prüfung und Grenzen

Bildraster und Matching orientieren sich bei unterstützten Browsern an der tatsächlichen Höhe des Inhaltsbereichs, einschließlich längerer Lernzielüberschriften; konservative Viewport-Fallbacks bleiben vorhanden. Navigation und Eingaben bleiben im vorhandenen Dock. Lange Erklärungen dürfen im Inhaltsbereich scrollen. Die vorhandenen Safe-Area-, Visual-Viewport-, Furigana-, IME- und Romaji-Regeln werden weiterverwendet. Native Buttons unterstützen Tab/Enter; Enter auf einer anderen fokussierten Schaltfläche darf die Aufgabe nicht versehentlich weiterblättern.

Automatische Tests verwenden ausschließlich künstliche Daten. `tests/daily-integrated.test.mjs` prüft beide Längen über 28 Datumsauswahlen, Voraussetzungen/Fallbacks, strukturierte Abschlüsse, Zusatzrunden und Kalenderübersicht. Die vorhandenen Regressionen bleiben erhalten.

```sh
node --test tests/*.test.mjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-integrated.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-completion.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-play.cjs
```

Browsergrößen: 320×568, 375×667, 390×844, 430×932, 320×360 und 390×320. Der neue Browsertest deckt normale/kurze Quest, Tastatur und Fokus in Bild-/Paar-/Satzbauaufgaben, unbewertete Reihenfolgen, IME-Schutz, Abbruch, Musterlösung ohne Abschluss, Tages-Idempotenz, Übersicht und Verlängerung über Mitternacht ab. Speicherzugriffe und ausgehende Requests sind blockiert. Browserprüfungen laufen lokal; die bestehende GitHub-CI führt die Node-Regressionen aus.

Prüfstand des Folge-PRs: 118/118 Node-Tests erfolgreich. Gemischte Quest, bisherige Daily-Abschlussabläufe und separates Bildtraining jeweils in allen sechs Chromium-Viewports bestanden. Der Bildfehler-Test prüft zusätzlich, dass Zahlentasten die gesperrten Bildantworten nicht umgehen können. Syntaxprüfung und `git diff --check` erfolgreich. Die produktiven Speicher-/SRS-/Cloud-Quelldateien bleiben gegenüber der geprüften Main-Grundlage unverändert.

Offen bleiben reale iPhones/Android-Geräte, native Bildschirmtastatur/Viewport-Verschiebung, VoiceOver/TalkBack, Geräteaudio und Haptik, Nutzerprüfung der Bildsemantik und tatsächlichen Sessiondauer. Ohne passendes gelerntes Material gibt es weniger visuelle Formen. Weitere Bilder und grammatische Varianten verlangen redaktionelle Prüfung.
