# Freiwilliges Nachüben nach der Daily Quest

Funktionsstufe nach #23; vorhandene Generatoren und Antwortbewertung bleiben bestehen.

## Lernfunktion
Nach einer vollständig durchlaufenen Quest erscheint bei Bedarf „Einmal gezielt nachüben“. Eine einzige freiwillige Runde mit maximal drei Aufgaben aus genau dieser Quest: zuerst nachweislich falsche Auswahlantworten, danach eingegebene, automatisch unbewertete Wort-/Satzlückenantworten. Unbekannte Formulierungen werden nicht als Fehler ausgegeben. Richtige Antworten, Erklärungen, offene Transfersätze, leere und übersprungene Eingaben bleiben ausgeschlossen. Identische Aufgaben werden nicht mehrfach angeboten.

Originalfragen werden bewusst erneut abgerufen und mit dem bestehenden Kontextfeedback verglichen. Das ist ein kurzer zweiter Versuch, kein Nachweis langfristiger Beherrschung. Nach dieser Runde entsteht kein weiterer Aufgabensatz. Vollständiger Abschluss oder Abbruch führen auf Wunsch zurück zur unveränderten ursprünglichen Auswertung; das Angebot verschwindet nach einmaligem Start.

## Bestandsschutz
- Nachüben ist keine Voraussetzung für den Tagesabschluss. Es kann weder einen Lerntag erzeugen noch die ursprüngliche Antwortquote oder einen bereits erreichten Tagesabschluss verändern, auch nicht beim Abschluss über Mitternacht.
- Keine zweite SRS-Queue, keine Speicherfunktion, keine regulären Reviews/Fälligkeiten, keine Cloud-/Firebase-/Life-RPG-Schreibpfade. Aufgaben und Auswahloptionen werden kopiert; Originalantworten und Originalauswertung bleiben unverändert.
- Die Tagesabschluss-Vorschau bleibt ausschließlich auf der geöffneten Seite erhalten. Persistente Streak weiterhin bis zur Sicherheitsklärung ausstehend. Produktionsdaten und historischer Kanji-P0 bleiben unberührt.

## Validierung
- `node --test tests/*.test.mjs`: **83/83 erfolgreich**. Neue Regressionen prüfen Begrenzung/Priorität, unbekannte Antworten ohne Falschwertung, Ausschlüsse, unvollständige Datensätze, Duplikate, Kopien und Ausschluss von rekursivem Nachüben/Tagesgutschrift.
- `node --check daily.js && node --check daily-practice.mjs` sowie `git diff --check` erfolgreich.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/daily-completion.cjs`: künstliche Daten, 320/390/768px; neue Runde komplett und abgebrochen, ursprünglicher Score/Tagesabschluss erhalten, kein Nachüben-Loop, keine neue Tagesgutschrift über Mitternacht, kein Überlauf/JS-Fehler/Storage-Zugriff. Vorhandene Modi, Eingaben und Tagesabschlussfälle weiterhin geprüft.
- Echte Smartphones/IME, Screenreader, produktive Datenflüsse sowie direkter Live-/Offline-/Cache-Test bleiben offen. Keine echten Nutzerdaten in den Tests.
