# Daily-Streak-Speicheradapter — Kandidat, noch nicht aktiviert

Stand 15.11.2026. Dieser PR implementiert den zuvor beschriebenen kleinen Adapter und seine Tests. `daily.js` importiert ihn bewusst noch nicht. Damit gibt es weiterhin **keinen produktiven neuen Schreibzugriff**, bis die dokumentierte Backup-/Restore-Grenze erfüllt und der konkrete lokale Scope freigegeben ist.

## Vertrag

- Ausschließlich eigene IndexedDB `kotobaDailyCompletionV1`, Store `scopes`, mit `{version:1,scope,days:["YYYY-MM-DD",…]}`. Keine Antworten, Wörter, Stufen, Due-Dates, Benutzer-E-Mails, Cloud-IDs, Belohnungen oder Zeitstempel.
- Scope ist obligatorisch und streng begrenzt. Unterschiedliche Scopes haben getrennte Records und werden nie zusammengeführt. Der vorgesehene erste UI-Scope wäre `local-profile`: browser-/originbezogen, nicht konto- oder geräteübergreifend. Daily hat derzeit keine verlässliche Konto-ID. Auf gemeinsam genutzten Browserprofilen ist dieser Scope daher **nicht kontogetrennt**; genau deshalb bleibt die UI-Anbindung gesperrt.
- Jeder Abschluss nutzt eine einzelne IndexedDB-Readwrite-Transaktion: aktuellen Record lesen, gültigen Tag vereinigen und denselben Record schreiben. Transaktionen auf demselben Store serialisieren parallele Tabs. Doppelte Abschlüsse sind idempotent und erzeugen keinen zweiten Write.
- Unbekannte Version, abweichender Scope, Zusatzfelder, unsortierte/doppelte/ungültige Tage oder kaputtes JSON werden nicht migriert oder überschrieben. Storage-, Quota-, Lock- und Verify-Fehler melden keinen gespeicherten Erfolg.
- Die UI muss nach eigenem Commit neu lesen; eine spätere Cross-Tab-Anzeige kann BroadcastChannel nur als Aktualisierungssignal verwenden. Der persistierte IndexedDB-Record bleibt der Nachweis.

## Isolation vom Lernstand

Die neue Datenbank ist getrennt von der autoritativen Lerndatenbank `kotobaQuestDurableStorageV1`. Das Audit prüft, dass ihr Name in `cloud.html`, `index.html`, `dungeon-source.js`, dem Durable-Storage-Modul und der Life-RPG-Bridge nicht referenziert wird. Dieser PR ändert keine dieser Dateien. Export/Import, Firebase und Life RPG erfassen die Streak nicht. Sie darf daher nicht als synchronisiert oder als Bestandteil eines Lernstand-Backups dargestellt werden.

Die reine Tagesabschlussprüfung bleibt die einzige Quelle eines späteren `record(day)`-Aufrufs. Der Adapter entscheidet nicht, ob eine Quest aktiv abgeschlossen wurde. Die bestehende Prüfung verlangt vollständige eigene Versuche und vergibt maximal einen Tag; Musterlösung/Abbruch qualifizieren nicht. Dieser PR verbindet beide Teile noch nicht.

## Nachweise in diesem PR

- Node: Reload/Rekonstruktion, ein Tag höchstens einmal, drei gleichzeitige Tab-ähnliche Operationen, getrennte Scopes, kaputte/alte/fremde Records, Quota/Read/Verify/Lock-Fehler und Storage-Events.
- Echtes isoliertes Chromium: zwei Seiten desselben lokalen Origins schreiben gleichzeitig in serialisierten IndexedDB-Transaktionen; Union bleibt nach Reload erhalten. DST-Kalendertage und ein zweiter Scope bleiben getrennt. localStorage bleibt leer und ausschließlich die beiden erwarteten Scope-Records existieren.
- Statisches Isolation-Audit gegen die unveränderten produktiven Speicher-/Cloud-/Bridge-Dateien.

Diese Tests verwenden nur künstliche Tage und einen temporären Test-Origin. Sie beweisen nicht, dass ein produktives Browserprofil vollständig gesichert oder wiederherstellbar ist.

## Noch fehlend vor Aktivierung

1. Vollständige unveränderte Sicherung aller autoritativen Lernstandorte des tatsächlich verwendeten Profils/Kontos mit Hashmanifest und verifizierter Zweitkopie gemäß [SRS-Sicherheitsplan](DAILY_SRS_SAFETY_PLAN.md). Rohdaten bleiben außerhalb von GitHub.
2. Wiederherstellung dieser Kopien in isoliertem Profil/Testprojekt und record-genauer Vergleich aller Domänen, besonders einzelner Kanji. Keine Produktivwiederherstellung als Test.
3. Produktentscheidung: ausdrücklich `local-profile` akzeptieren (gemeinsame Browsernutzer teilen die Streak), oder Daily eine verlässlich und read-only bereitgestellte pseudonyme Kontobindung geben. Ein Konto-Scope darf nicht aus E-Mail/Anzeigename oder ungesichertem Queryparameter entstehen.
4. Reale Safari-/Android-Prüfung von IndexedDB-Blockade/Privatmodus, mehreren Tabs und Quota-/Versionsfehlern. Bei fehlender Datenbankunterstützung bleibt die Streak flüchtig und meldet ehrlich, dass sie nicht gespeichert wurde.
5. Danach eigener Aktivierungs-PR: Adapter importieren, beim Start lesen, nur nach `assessCompletion(...).qualified` schreiben, Fehler freundlich anzeigen, Scope/Local-only klar kennzeichnen und Browser-Reload/Tab-/Mitternachtstests wiederholen.

Da weder produktive Backups noch isolierte Restore-Berichte in dieser Arbeitsumgebung vorliegen, ist die Aktivierung nach der ausdrücklichen Aufgabenregel derzeit blockiert. Der Adapter ist ausführbarer Code statt weiterer allgemeiner Konzeption; der verbleibende Gate ist konkret und überprüfbar.
