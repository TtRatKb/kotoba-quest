# Kotoba Quest · Little Dungeon V0.1 (spielbarer Prototyp)

**Ziel-Repository: `TtRatKb/kotoba-quest` — NICHT `life-rpg`.** Dies ist ein selbständiger Zusatzmodus für denselben GitHub-Pages-Ursprung, kein Ersatz für `cloud.html`/`index.html` und kein ungeprüfter Eingriff in das bestehende SRS.

## Installation
1. Zur Sicherheit Kotoba-Quest-Backup/Export erstellen.
2. Die fünf neuen Runtime-Dateien aus der ZIP **in das Stammverzeichnis von Kotoba Quest** hochladen; keine bestehenden Dateien ersetzen/löschen.
3. Danach in demselben Browser mit dem bestehenden Kotoba-Spielstand `https://ttratkb.github.io/kotoba-quest/dungeon.html` öffnen. Der Link wird erst NACH dem GitHub-Pages-Upload erreichbar sein.
4. Falls die lokale Kotoba-Sammlung nur kompakt oder noch nicht im Browser verfügbar ist, eine Kotoba-JSON-Exportdatei im Dungeon für **diese Sitzung** einlesen oder die ausdrücklich gekennzeichnete Starter-Proberunde wählen. Nie unbemerkt neue unbekannte Core-Wörter als SRS-gelernt deklarieren.

## Spielelemente
- Drei unbegrenzt zeitfreie Normalgegner; danach ein Boss mit **wahlweise** Zeitfreiheit oder 60-Sekunden-Challenge (Hourglass +10 Sekunden).
- Wort- und Kanji-Lesung als Kana/Rōmaji-Eingabe (wenn Lesung nicht identisch mit Wort ist), Japanisch → Deutsch, Deutsch → Japanisch, Lesung → Schreibweise, Satzlücke **nur wenn ein brauchbarer vorhandener Beispielsatz das Wort tatsächlich enthält**. Multiple Choice für die übrigen Aufgaben; jede falsche Antwort zeigt echte Lesung + Bedeutung an.
- Nach jedem Normalgegner: drei Händlerangebote mit Dungeon-Gold. Ausrüstung ist run-lokal; nicht ausgegebenes Gold kann kleine Extra-Scherben bringen. Drei besiegte Gegner reduzieren die Boss-HP. Zwei permanente Aufrüstungen (HP/Schaden) via Dungeon-Scherben, maximal vier Ränge; Run-Statistik und persönliche Fehlergewichtung bleiben gespeichert.
- Jeder Run ist beliebig wiederholbar; temporäre Ausrüstung und Gold starten neu, dauerhafte Scherben und Aufrüstung bleiben. Aktiver Run wird gespeichert und kann nach Reload weitergehen.

## Datenhoheit und ehrlicher Prototyp-Scope
- Der Dungeon liest `kotobaQuestDataV3` (optional ältere V2/V1) von **derselben Origin** und ergänzt verkürzte Core-Zeilen mit dem tatsächlich in `index.html` eingebetteten 2000er-Core-Katalog. Stable ID, Word, Reading, Meaning, SRS-Stage und vorhandene Mining-Wörter bleiben inhaltliche Grundlage. Der Core-Katalog wird als JSON geparst, nicht als fremdes Skript ausgeführt.
- Die SRS-Engine, Stufen, Fälligkeitsdaten, Review-Journale, Firebase/Firestore-Saves und Kotoba XP werden **nur gelesen bzw. gar nicht angefasst**; Spielstand liegt separat unter `kotobaQuestDungeonV1` im selben Browser/localStorage.
- Keine Life-RPG-Coins, keine Life-RPG-Rewards, keine Cloud-Runsync und kein Cloud-persistenter Dungeon-Fortschritt in V0.1. Das ist bewusst ein lokaler gameplay-first Test, nicht die versprochene endgültige Kopplung. Er ist nicht per Link im bestehenden Kotoba-Menü integriert: Die eigene `dungeon.html` ist der Einstieg.
- Beispiel-Satzlücken nutzen vorhandene von Kotoba eingetragene Sätze; es werden keine erfundenen japanischen Definitionen oder synthetischen Beispielsätze als korrekt behauptet.
- Keine neuen externen Bildassets nötig: Avatar und Bühne sind CSS, Gegner sind Emoji; keine große Asset-Produktion/Animationen erforderlich.

## QA
- 10 Node-V8-Tests: echter Datenadapter mit Pack-Rehydrierung, Read-only SRS, drei Kämpfe und Boss normal/zeitbegrenzt, Fehlerfeedback, Rōmaji/Kana, temporäres Loot, permanente Währung, Run-Restore, alle Fragetypen, inkomplette Core-Zeilen.
- JS-Syntax geprüft; realer 2000-Core-Katalog in der Live-Repository-Version erfolgreich als JSON geparst und seine IDs verifiziert.
- Vollständiger Browser-/Safari-/iPad-Test noch **nicht** durchgeführt: das lokale Chromium-Rendering war in dieser Umgebung technisch nicht startfähig. Bedienung und Datenzugriff mit dem persönlichen Kotoba-Cloud-Save erfordern einen echten Nutzer-/Gerätetest.
