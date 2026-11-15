# Daily → echte SRS-Reviews: ausführbarer Freigabeplan

Stand: 15.11.2026. **Plan, keine produktive Schreibanbindung.** Grundlage ist die [Datenflussanalyse in Draft-PR #32](https://github.com/TtRatKb/kotoba-quest/pull/32), Head `722b8ce838b194c9f4c9e50645e941b705c7f9de`. Dessen zwölf isolierte Charakterisierungstests sind Belege für Grenzen, keine Freigabe für produktive Commits. Die folgenden Schritte haben klare Ergebnisartefakte und Stop-Bedingungen. Kein Schritt wird durch allgemeine Merge-/Deployment-Erlaubnis übersprungen.

## 0. Umfang und Zuständigkeit festhalten

Erster Schreibpilot ausschließlich Vokabeln, danach Grammatik/Partikel jeweils separat. Kanji bleibt lesend; P0-Fortschrittsverlust separat untersuchen. Bildauswahl, Matching, sichtbare Lesungshilfen bei Lesungstests, Satzbau und freie Daily-Texte bleiben zusätzliches Training. Sie liefern keine vollständige Review-Evidenz.

Die Haupt-App bleibt alleinige SRS-Autorität. Vor einem Adapter festlegen, wie Daily eine **einzige bereits zuständige** Haupt-App erreicht: gemeinsamer sichtbarer Host oder ausdrücklich gewählte vertrauenswürdige Schnittstelle. Keine unsichtbare zweite Cloud-Instanz, kein Kopieren der SRS-Engine, kein bloßes Verwenden potenziell normalisierender „Getter“. Ergebnis: kleines Sequenzdiagramm und Verantwortlichkeit für Session, Auswertung, Persistenz, Cloud-Bestätigung und Ereignisse. Ohne diese Entscheidung kein Implementierungsbeginn für Commits.

## 1. Vollständiges, unverändertes Backup sichern und verifizieren

Zuerst alle autoritativen Orte im tatsächlich verwendeten Profil/Konto und in der konkreten App-Version inventarisieren, ohne Loader, Migration oder Wiederherstellung auszulösen. Aus #32 bekannte Prüfliste:

| Ort | Vollständig zu erfassen und abzugleichen |
| --- | --- |
| IndexedDB `kotobaQuestDurableStorageV1`, Store `snapshots` | rohe Records einschließlich `primaryLearningState`, `mainCheckpoint`, `progressVault`, `primaryMeta`; weitere tatsächlich vorhandene Stores/Metadaten inventarisieren |
| localStorage | ursprüngliche Lern-Payloads und alle relevanten Safety-Journals, Backups und partiellen Reviewzustände; keine Keys löschen oder normalisieren |
| Firestore | autoritative Konto-Lern-Payloads, Dokumentversionen/Revisionen und vorhandene Cloud-Backups; keine Schreibtests in Produktion |
| Bridge/Outbox | ausstehende Ereignisse, verarbeitete Command-IDs, Journalstatus, Teilrichtungsstände und Lebenszykluszuordnung |
| Domänen | Core-ID/Pack-Zuordnung, Mining, akzeptierte Varianten, beide Vokabelrichtungen/Fehlerhistorie, Kanji-Einzelzustände, Grammatik, Partikel, N4, Story, Dungeon und Analytics |

Für die Aufnahme zuerst alle beteiligten Tabs/Schreiber in einem nachvollziehbaren ruhenden Zustand sichern bzw. konsistente Snapshot-Grenzen verwenden. Aktuellen Online-/Offline-/Sync- und Pending-Status protokollieren. Wenn Profil und Cloud unterschiedliche Stände haben, beide unverändert sichern; keinen „richtigen“ Stand automatisch darüberkopieren.

Artefakte: verschlüsselte unveränderliche Originalkopien außerhalb des Repositorys; Manifest mit Origin, Browserprofil/Konto-Zuordnung, Aufnahmezeit, App-/Schema-Version, Store/Key/Revision, Bytezahl und SHA-256 jeder Rohdatei. Hashes nach erneutem Lesen prüfen; getrennte Zweitkopie verifizieren. Geheimnisse und Roh-Lerndaten gehören nicht in GitHub, CI-Logs oder PR-Anhänge. Ein App-JSON-Export allein ist kein Vollständigkeitsnachweis.

**Stop:** fehlende autoritative Quelle, nicht lesbarer Record, fortlaufende konkurrierende Änderungen, unklare Cloud-Zuordnung, ungeklärte Backup-Lücke oder Hashabweichung. Vorhandene Daten nicht reparieren, um den Test grün zu machen.

## 2. Wiederherstellung ausschließlich auf isolierten Kopien beweisen

Sauberes eigenes Test-Browserprofil/Origin und separates Firebase-Testprojekt bzw. Emulator verwenden. Produktionszugang technisch sperren. Original-Backups bleiben unverändert; sensible Kopien nur in einer dafür freigegebenen Umgebung verwenden, sonst synthetische Daten. Kein realer Produktivrestore als Test.

Zunächst vollständige Wiederherstellung ohne Featureänderung erproben. Record-genauer Vorher-/Nachher-Vergleich muss IDs, Wörter/Lesungen, Kontexte, Varianten, Stufen, Due-Dates, Revisionen, Fehlerhistorie, Guru-Historie, sämtliche einzelnen Kanji und alle nicht betroffenen Domänen erhalten. Fehlende, zusätzliche oder veränderte Felder separat berichten; keine stillen Sortier-/Normalisierungsannahmen. Den historischen Kanji-P0 nicht durch Aggregate oder erfundene Einzelstände „beheben“.

Artefakte: Restore-Protokoll, Hashvergleich und feldweiser Verlustfreiheitsbericht für alle inventarisierten Quellen. Ein synthetischer Unit-Test ersetzt diesen Nachweis nicht. **Stop:** jede unerklärte Differenz.

## 3. Vertrauenswürdigen Review-Sitzungsvertrag prüfen

Vor Implementierung eines Adapters den bestehenden Haupt-App-APIs einen überprüfbaren Sitzungsvertrag zuordnen. Anforderungen, keine neue SRS-Berechnung:

- Autorität stellt Session und Fragen aus und bindet sie an Origin/Konto, Item-ID, Pack-ID, Richtung/Skill, Aufgabenidentität und akzeptierte Varianten. Daily kann weder Fragen/Varianten noch Erfolgsflags oder Noten als Beweis erfinden.
- Auswahl ausschließlich gültiger tatsächlich fälliger Items. Fehlende/null/ungültige Fälligkeit bleibt unverändert und wird ausgeschlossen. Vollständigen gelesenen Stand mit Stage, Due-Date, Revision und Review-Zyklus festhalten; gleicher Stage allein reicht nicht.
- Vokabeln: beide vorgeschriebenen Richtungen durch den vorhandenen Evaluator bearbeiten. Alle Fehler, „close“, Wrong-Type-/Romaji-Retries und späteren Wiederholungen über die Haupt-App führen. Ein Item wird erst nach dem kanonisch abgeschlossenen Paar committierbar. Keine clientseitig erfundenen Richtungsflags.
- Grammatik/Partikel später separat: Frage, Varianten und kanonisches Evaluierungsergebnis müssen an die ausgegebene Session gebunden sein. Keine beliebigen Client-Noten oder vom Client gewählten akzeptierten Antworten.
- Vor Commit erneut Konto/Session und exakt erwartete Revision/Fälligkeit/Zyklus prüfen. Bei veraltetem Stand verwerfen und den aktuellen Stand neu anzeigen; keine automatische Reparatur und kein direktes Stage-/Due-Setzen.

Artefakt: Vertrag mit Fehlercodes, Zustandsübergängen und isolierten Tests gegen die **tatsächlichen** Evaluierungs-/Commit-Funktionen. #32 zeigt aktuell Lücken bei diesen Bindungen; API-Namen oder erfolgreiche Rückgabewerte reichen nicht. Falls die bestehende Autorität angepasst werden muss, gelten zuerst Schritte 1–2 und ein eigener überprüfbarer PR.

## 4. Dauerhafte Idempotenz und Ereigniserholung nachweisen

Pro Item-Review-Zyklus eine stabile autoritätsgebundene Operation-ID verwenden; nach Reload/Retry dieselbe ID. Ein UI-Doppelklick-Lock ist nur Komfort. Die Autorität muss parallele Tabs und Haupt-App-vs.-Daily-Rennen behandeln und veraltete/mehrfach abgegebene Operationen sicher ablehnen bzw. den bereits bestätigten Ausgang zurückgeben.

Kanonischen SRS-Commit, Idempotenznachweis und ausstehendes Life-RPG-Ereignis entweder atomar oder nachweislich wiederaufnehmbar koordinieren. Bestehende Journale/Outbox wiederverwenden und deren Verhalten belegen, keine zweite parallele Queue. Der aktuelle Ablauf aus #32 hat getrennte Phasen: Core-Commit → Command-Marker → Outbox. Abstürze zwischen diesen Phasen sind ein ungelöstes Prüfthema. Das auf 600 Einträge begrenzte Command-Gedächtnis ist kein dauerhafter Review-Zyklus-Nachweis.

„Erledigt“ erst nach bestätigtem lokal dauerhaftem kanonischen Commit anzeigen. Offline mögliche Cloud-Synchronisation separat als ausstehend kennzeichnen; keinen bestätigten Cloud-Stand vortäuschen. Ereignisse benötigen dieselbe logische Identität bis zum Empfänger, damit Export-Retries keine doppelten XP-/Aktivitätsbuchungen erzeugen. Wiederholte Bestätigung darf ein zuvor verlorenes Ereignis nicht verdecken.

Artefakt: Zustands-/Recovery-Tabelle für jede Durability-Grenze, mit zulässigem Retry und überprüfbarem Ergebnis. **Stop:** ungeklärte Doppelbuchung, verlorenes Review oder verlorenes/dupliziertes verpflichtendes Ereignis.

## 5. Fehler- und Wiederherstellungsmatrix ausführen

Alle Fälle in isolierten realen Browserprofilen, mit eigener IndexedDB und Firebase-Emulator/Testprojekt; nicht nur VM-Spies. Nach jedem Fehler App/Browser neu starten und die gespeicherten Records und Ereignisse vergleichen.

| Fall / injizierter Abbruch | Erwarteter Nachweis |
| --- | --- |
| falsche/nahe Antwort, erneuter Versuch, akzeptierte Lesung/Bedeutung; Fehler in einer oder beiden Richtungen | exakt kanonischer Ausgang einschließlich Abstiegen und Fehlerhistorie; kein Commit vor abgeschlossenem Paar |
| ungültige/future/null Due-Date, unvollständige Lektion, veraltete Revision bei gleichem Stage | unveränderter Datensatz, klarer Ausschluss/Ablehnung |
| Doppelklick, zwei Tabs, Haupt-App committiert gleichzeitig, wiederholte alte Operation nach Command-Retention | höchstens ein SRS-Effekt für denselben Zyklus; kein fälschlich neuer Review |
| Reload/Crash vor Commit, nach Core-Commit vor Marker, nach Marker vor Outbox, nach Outbox vor Bestätigung | reproduzierbare Recovery ohne verlorenen oder doppelten SRS-/Ereigniseffekt |
| Offline vor/während Commit, erneutes Online, Antworttimeout trotz erfolgreichem Commit, Quota-/IDB-/Outbox-Fehler | korrekter Pending-/Fehlerstatus und sicherer Retry; keine erfundene Erfolgsmeldung |
| Account-/Originwechsel, alter wiederhergestellter Snapshot, offene alte Session | keine kontenübergreifende Buchung und keine Wiederverwendung veralteter Berechtigungen |
| Double-Export/Empfänger-Retry, Cloud-Revisionskonflikt | genau ein zulässiger Level-/Aktivitätseffekt; kein stiller Verlust |
| jede zulässige Buchung | nur erwarteter Item-/Journal-/Ereignis-Diff; alle anderen Vokabel-, Kanji- und Domänenrecords identisch |

Artefakte: reproduzierbare Fehler-Injektionspunkte, Laufprotokolle, Record-Diffs und Zählungen je Operation, jeweils vor und nach Neustart/Sync. Tests müssen auch unerwarteten Erfolg und stilles Datenverschwinden erkennen, nicht nur Exceptions erwarten.

## 6. Rollback-Probe und eng begrenzte Schreibfreigabe

Zuerst nur neue Daily-Schreibanbindung deaktivieren können, ohne Daten zu migrieren oder zurückzusetzen. Auf isolierten Kopien alte App-Version, neue bestätigte Reviews, ausstehende Journale und Outbox-Retries zusammen prüfen. Ein alter Backup-Stand darf **nicht** einfach neuere gültige Reviews überschreiben. Datenrestore ist eine separate Entscheidung mit Konfliktanalyse, kein automatischer Deployment-Rollback.

Freigabepaket: geprüfte Backup-Manifeste, Verlustfreiheits-/Restorebericht, kanonischer Sessionvertrag, bestandene Durability-/Nebenläufigkeitsmatrix, dokumentierte Cloud-/Ereignisbestätigung und erprobter Abschalt-/Rollbackpfad. Danach explizite Freigabe für genau Domäne, Host, Umfang und Schreibweg einholen. Erst dann kleiner Vokabelpilot; Grammatik/Partikel jeweils erneute Abnahme. Kanji bleibt weiterhin gesperrt.

## Aktuelle Blockaden und nächste konkrete Entscheidung

Keine vollständigen verifizierten Produktivbackups oder Restore-Nachweise liegen vor. Der Autoritäts-/Hostvertrag ist nicht entschieden; Versions-/Fragenbindung und crashsichere Idempotenz/Outbox-Erholung sind nicht belegt. Dieser PR fügt deshalb nur einen Plan hinzu und importiert keine Commit-APIs. Als nächstes Zuständigkeit/Host und sicheren Backup-Aufnahmeprozess festlegen; ohne das keine produktive Speicheränderung. Dauerhafte Daily-Streaks benötigen daneben die gesonderte Profil-/Kontotrennungs- und Speicherfreigabe.
