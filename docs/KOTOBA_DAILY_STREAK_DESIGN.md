# Streak: isolierter Speicherentwurf, noch nicht implementiert

Stand: 14.11.2026. Getrennter Folgeschritt nach Integration #21. Diese Änderung aktiviert **keine Persistenz**, Tagesgutschrift oder Streak-Anzeige. Die vorhandene reine Berechnung in daily-streak.mjs bleibt unverändert. Motivation: Start „Meine tägliche Quest“, Fortschrittsbalken berücksichtigt abgegebene Antworten; Abschluss nennt geübte Inhalte und den eigenen unbewerteten Transfersatz. Antworten bleiben im Arbeitsspeicher.

## Einfachstes Modell nach Sicherheitsfreigabe
Ein neuer, ausschließlich Daily gehörender localStorage-Eintrag `kotobaDailyCompletionV1` mit `{version:1, days:["YYYY-MM-DD", ...]}`; nur abgeschlossene lokale Kalendertage, keine Wörter, Antworten, SRS-Zustände, Cloud-IDs, Zeitstempel oder Belohnungen. Kein Lesen/Schreiben über die virtuelle bestehende Speicherlogik. Nicht in vorhandene Backups, Imports, Firebase-Objekte oder Life-RPG-Events einschleusen. Löschen dieses einen Eintrags setzt ausschließlich Daily zurück; kein automatisches Aufräumen, keine Migration bestehender Saves.

Dies ist zunächst ein Entwurf für einen **einzelnen lokalen Browser**, keine geräteübergreifende Synchronisation. Ein anderes Gerät, Origin oder Browserprofil hat einen eigenen Stand. Browserlöschung kann ihn verlieren. Ohne sichere Zuordnung auf gemeinsam verwendeten Geräten würde ein gemeinsamer Eintrag verschiedene Konten vermischen: vor Implementierung entweder ausdrücklich einen browserbezogenen Fortschritt mit verständlicher Anzeige festlegen oder Kontotrennung separat klären. Keine neuen Auth-/Firebase-Abhängigkeiten allein für die Streak hinzufügen.

## Qualifizierender Abschluss
- Ausschließlich abgeschlossene, unveränderte, von den vorhandenen Generatoren erzeugte Sessions mit mindestens drei Schritten und zwei aktiven Aufgaben. Damit qualifiziert auch ein vollständiger kurzer Guided-Pfad aus Erklärung, Anwendung und eigener Transferformulierung. Erklärung lesen oder Start anklicken genügt nicht.
- Alle Schritte genau einmal durchlaufen; eindeutige Zuordnung der Antworten zu Aufgaben; kein Abschluss bei Abbruch, nur geöffneter Musterlösung oder leerer Eingabe. Eine offene Transferaufgabe benötigt einen eigenen nichtleeren japanischen Versuch. Automatische Sprachbeherrschung kann damit nicht nachgewiesen werden.
- Kein Mindestscore, keine perfekten Antworten nötig. Unklare Antworten bleiben unbewertet. Fehler dürfen eine ernsthafte Lernaktivität nicht entwerten.
- Maximal eine Tagesgutschrift unabhängig vom Modus. Keine SRS-Voraussetzung außer bereits gelernten Inhalten bei personalisierten Aufgaben; keine regulären Reviews erledigen oder erzeugen.
- Wachstum bleibt freiwillig. Reines Betrachten einer Probelektion oder Überspringen des eigenen Versuchs soll keinen Abschluss auslösen. Vor Anbindung konkrete UX für „nur Musterlösung ansehen“ und aktive Versuche testen.

## Kalender und Nebenläufigkeit
Lokalen Datumsschlüssel am tatsächlichen Abschluss aus getFullYear/getMonth/getDate ermitteln, nicht aus UTC-toISOString und nicht aus dem Sessionstart. Nach Mitternacht zählt der neue Tag; Sessionauswahl darf beim Start bleiben. Streaks über asDayNumber/recordDailyCompletion/streakSummary berechnen: Datumsteile auf Kalenderordinal abbilden, nie lokale Millisekunden durch 24 Stunden teilen. Bei Ausfall kein Straftext: „Heute ist ein guter Tag zum Weiterlernen.“ Bis Tagesende bleibt die bisherige Serie sichtbar.

Vor Schreiben vorhandene Tage erneut validiert einlesen und vereinigen. Mehrere Tabs benötigen eine serialisierte Read/Union/Write-Operation, z.B. Web Locks. Ohne verfügbare sichere Serialisierung kein stiller konkurrierender Schreibpfad; Unterstützung/Fallback vor Freigabe festlegen. Doppelte Tage deduplizieren. Bei fehlerhaftem JSON, unbekannter Version, Speicherblockade oder Quota-Fehler keine vorhandenen Daten überschreiben und keinen gespeicherten Erfolg behaupten. Bei Uhr-/Zeitzonenwechsel keine historischen Tage umdeuten oder automatisch löschen; Zukunftsdaten nicht zur aktuellen Serie zählen. Offline-Kalenderdaten sind kein manipulationssicherer Nachweis.

## Noch notwendige Sicherheitsklärung
1. Unveränderte vollständige Sicherungen aller autoritativen Lernstände verifizieren, ohne durch diese Entwicklung produktiv zu schreiben; P0-Kanji-Verlust separat behandeln.
2. Speicher-Virtualisierung, Export/Import und Sync nach exakt diesem neuen Schlüssel durchsuchen; nachweisen, dass er nicht erfasst/überschrieben wird. Bestehende Logik dabei nicht ändern.
3. Origin/Browserprofil und Konto-Wechselverhalten festlegen; Zustimmung zum ausdrücklich lokalen Modell einholen, bevor Persistenz umgesetzt wird.
4. Tests nur mit künstlichen Daten: record-genauer unveränderter Vorher-/Nachher-Vergleich für Vokabeln, Kanji, Grammatik, Partikel, Mining, Story, Dungeon und Sync; Schreibzugriffe auf alle bestehenden Keys/Stores abfangen.
5. Abschluss-/Abbruchtests, doppelte Klicks, mehrere Modi/Tabs, Mitternacht, Europe/Berlin-DST (23/25 Stunden), Schaltjahre, ungültige Daten, Uhränderung und Speicherfehler prüfen. Mobile Safari/Android und Shared-Device-Verhalten gesondert prüfen.

Kein Speicher-Adapter ist Teil dieses PRs. Die Voraussetzungen sind noch nicht erfüllt. Das Modell ist bewusst reviewbar, bevor überhaupt ein neuer Schreibpfad entsteht.

## Validierung dieser vorbereitenden Änderung
- 71/71 bestehende und kombinierte Node-Tests bestanden; daily.js-Syntax und diff-Whitespace geprüft.
- Isoliertes Chromium, künstliche Daten, 320/390/768px: alle vier Modi bis zum Abschluss; Fortschritt nach Antworten, konkrete Lernzusammenfassung und eigener Satz geprüft. Kein Überlauf, JS-Fehler oder beobachteter Storage-Schreibzugriff.
- Zusätzlich leere und nicht lesbare künstliche Quellen: persönliche Modi deaktiviert, keine Guided-Freischaltung, Probelektion zugänglich.
- Reale Geräte/IME, produktive Speicherstände und Mehrgeräte-Verhalten weiterhin offen. Der Browser-Test ersetzt den Source-Adapter, prüft also ausdrücklich keine echten IndexedDB/Firebase-Datenflüsse.
- Integration #21: CI erfolgreich auf `261e278b6c2e2b20e4e466c0ecd2c1a04d199b43`, Run 43614757881. Dieser Folgebranch braucht einen eigenen CI-Lauf.


## Fortschreibung: Tagesabschluss ohne Persistenz
Die folgende Funktionsstufe implementiert die Aktivitätsprüfung und die Anzeige eines Tagesziels bzw. einer Serie ausschließlich im Arbeitsspeicher der geöffneten Seite. Alle Schritte müssen bestätigt und alle aktiven Aufgaben selbst versucht werden. Japanische Textaufgaben benötigen einen Versuch in japanischer Schrift; dies prüft Teilnahme, nicht sprachliche Korrektheit oder Beherrschung. Eine reine Musterlösungsansicht qualifiziert nicht. Lokaler Tag wird beim Abschluss bestimmt; erneuter Abschluss am selben Tag bleibt idempotent. Nach Neuladen/Schließen verschwindet die Anzeige; andere Tabs/Geräte teilen sie nicht. Die UI benennt diese Grenze ausdrücklich.

Dies ist keine Umsetzung des oben vorgeschlagenen Speicheradapters. Verifizierte vollständige produktive Backups und die Entscheidung Browserprofil/Kontotrennung fehlen weiterhin. Kein neuer Speicher-Key, keine Synchronisation, keine Änderungen an den vorhandenen Datenflüssen. Die Vorbereitungsfunktionen können später nach Sicherheitsfreigabe angebunden werden.
