# Visuelles Daily-Zusatztraining – Prototyp

## Umfang und Einstieg

Die Daily-Übersicht ergänzt die bestehenden Modi um „Mit meinem Lernstand üben“ und eine ausdrücklich freiwillige Demo. Die bisherigen Quest-, Refresh-, Mix-, Grammatik-, Partikel- und Nachübungsmodi bleiben erhalten. Eine kurze Bild-/Satzbau-Session enthält höchstens vier Aufgaben:

- zwei Bildauswahlen mit jeweils vier unterschiedlichen Bildern derselben Bedeutungsgruppe;
- ein Matching mit drei Bild-Wort-Paaren, wenn drei passende gelernte Wörter vorhanden sind;
- eine Satzbauaufgabe, wenn die jeweiligen Grammatik-/Partikellektionen nachweislich abgeschlossen sind.

Fehlen geeignete Inhalte, entfallen diese Aufgaben. Ohne passende Inhalte ist der persönliche Einstieg deaktiviert. Die Demo verwendet den kuratierten Bestand unabhängig vom Lernstand und kennzeichnet ihre Probeaufgabe ausdrücklich. Sie schaltet keine Lektionen frei.

Die Aufgaben ergänzen den verfügbaren Daily-Pool über einen eigenen optionalen Einstieg. Sie werden in diesem Prototyp noch nicht automatisch in die reguläre Tagesquest gemischt. Damit ist ihre Erprobung möglich, ohne die bestehende Tagesabschlussprüfung zu erweitern.

## Material und Bewertung

24 konkrete Wörter in sechs Vierergruppen: Tiere, Obst, Lebensmittel, Gegenstände, Verkehrsmittel und Möbel. `daily-play.mjs` enthält überprüfbare Wort-/Lesungs-/Bedeutungszuordnungen. Persönliche Bildwörter müssen aus dem bestehenden Filter für gelernte Wörter stammen; zusätzlich müssen Schreibweise, Lesung und eine explizit passende deutsche Bedeutung übereinstimmen. So wird beispielsweise 本 als Zählwort nicht zum Buchbild. Diese konservative Auswahl kann geeignete Karten mit anders formulierten Bedeutungen auslassen.

Alle Bilder kommen aus einer lokalen Originalillustration ohne externe Bildabrufe. Herkunft, Raster, Dateiprüfsumme, Nutzungsbedingungen und Einschränkungen stehen in [assets/daily/README.md](../assets/daily/README.md). Die 24 Zellen wurden visuell kontrolliert; reale Nutzerinnen müssen die Eindeutigkeit noch bestätigen. Die PNG-Datei umfasst rund 1,8 MB und wird als gemeinsamer Atlas geladen.

Bildauswahl zeigt ein Wort mit der vorhandenen konservativen Furigana-Logik. Matching mischt beide Seiten unabhängig, erlaubt beide Auswahlrichtungen und blendet gefundene Paare aus. Fehlversuche bleiben als zusätzliche Versuche sichtbar. Bildoptionen besitzen deutsche Beschreibungen für assistive Technik; diese erleichtern dabei zwangsläufig die Aufgabe. Bilder sind kein geeigneter alleiniger Leistungsnachweis.

Satzbausteine verwenden drei bereits im geführten Material vorhandene Satzkontexte. Nur explizit geprüfte Reihenfolgen erhalten eine positive Bewertung. Andere vollständige Reihenfolgen werden **unbewertet mit Musterlösung** angezeigt, niemals pauschal als falsch. Das ist kein allgemeiner japanischer Grammatikprüfer. Bausteine lassen sich einzeln zurücklegen oder vollständig leeren.

## Bedienung und Feedback

Der bestehende mobile Session-Rahmen bleibt bestehen: Fortschritt oben, erreichbare Navigation unten, bei langen Inhalten ein separater Inhalts-Scrollbereich. Für besonders geringe Höhe werden Bildraster kompakter dargestellt. Safe-Area- und Visual-Viewport-Verhalten stammen weiterhin aus der bestehenden Daily-Oberfläche.

`daily-feedback.mjs` kapselt optionale Effekte. Ton/Haptik ist bei jedem Seitenstart ausgeschaltet; der gemeinsame Schalter verändert nur Arbeitsspeicher. Kurze, leise synthetische Töne entstehen erst nach Aktivierung. Haptik verwendet ausschließlich die native Vibrationsschnittstelle auf unterstützten Android-Browsern. iOS erhält keine simulierten Haptikfunktionen. Reduzierte Animationen unterbinden Bewegung und Haptik. Das visuelle Statusfeedback bleibt ohne Ton verständlich.

Wortaudio ist optional: Nur eine als lokal ausgewiesene japanische Gerätestimme wird verwendet. Fehlt sie oder ist Ton ausgeschaltet, bleibt die Audiotaste deaktiviert. Es gibt keine aufgezeichneten Muttersprachler-Audiodateien und keinen externen Sprachdienst. Der Schalter bleibt während einer Aufgabe unten erreichbar. Tastatur, native Buttons, Fokus nach Paar-/Bausteinauswahl und Statusmeldungen werden unterstützt.

## Daten- und Bestandsschutz

Alle neuen Übungen sind ausschließlich Training. Sie erzeugen keine offiziellen SRS-Reviews, keinen Tagesabschluss, keine Streak-Buchung und keine Life-RPG-Ereignisse. Kein neuer Speicherweg, keine Migration, kein Cloud-Save. Die vorhandenen Speicher-, Synchronisations- und SRS-Module werden nicht verändert. Antworten und Effekte sind flüchtiger UI-Zustand und gehen beim Neuladen verloren.

Die bestehende Tagesquest verwendet unverändert ihre bisherige Abschlussprüfung. Auch eine vollständig richtige Bildsession wird dieser Prüfung nicht als Tagesquest vorgelegt. Ein verspäteter Animationscallback kann eine abgebrochene Session nicht wieder öffnen. Eine fehlende Bilddatei führt zu einer verständlichen Meldung und deaktivierten Bildantworten.

## Prüfung und verbleibende Grenzen

Automatisierte Tests verwenden ausschließlich synthetische Karten, Lernstände und Browserprofile. Die Browserprüfung blockiert neue Speicherzugriffe und externe Requests. Sie prüft 320×568, 375×667, 390×844, 430×932 sowie 320×360 und 390×320 Pixel: Bildraster, Furigana bei unbekannten Kanji, passende/falsche Paare, Bausteine, zulässige Alternative, unbewertete Reihenfolge, Feedbackschalter, feste Navigation, Abschluss ohne Speicherung, abgebrochene Animation und defekte Bilddatei.

Ausführen:

```sh
node --test tests/*.test.mjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-play.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-completion.cjs
```

Die Node-Tests laufen in der bestehenden Daily-CI. Die Browserprogramme sind zusätzliche lokale Prüfungen und werden damit nicht als GitHub-CI-Browsertest ausgegeben.

Prototyp-Prüfstand: 113/113 Node-Tests bestanden; neue Spielaufgaben und bestehende Daily-Abläufe jeweils in allen sechs genannten Chromium-Viewports bestanden. Der separate Test für eine fehlende Bilddatei ist ebenfalls bestanden. GitHub-CI wird zusätzlich am PR-Commit geprüft.

Noch offen: echte iPhones/Android-Geräte, Gerätehaptik und japanische Offline-Stimmen, VoiceOver/TalkBack-Praxistest, reale Bildschirmtastatur in den bestehenden Freitextmodi sowie didaktische Nutzerprüfung aller Bildzuordnungen. Chromium-Viewporttests ersetzen diese Prüfungen nicht. Weitere Satzvarianten und Bildwörter brauchen redaktionelle Prüfung; der gesamte Core-Katalog wird nicht automatisch bebildert.
