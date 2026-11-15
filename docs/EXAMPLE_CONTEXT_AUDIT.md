# Beispielsatz-Ursachenbericht — 15.11.2026

Untersuchte Ausgangsbasis: main nach #24 (`028869e`). Ausschließlich Repository-Inhalte, keine persönlichen Spielstände.

## Befund und Herkunft
Der literale EMBEDDED_CORE_PACK in index.html enthält 2.000 Einträge: **1.968** example-Felder enthalten `という言葉を覚えました`, **32** weitere Einträge enthalten andere, nichtleere Beispielsätze. Keines der example-Felder ist leer. Diese Zählung ist keine sprachliche Qualitätsprüfung.

`年齢` steht als `kc2k-0087` mit `「年齢」という言葉を覚えました。` und `Ich habe den Ausdruck „Alter“ gelernt.` bereits im Katalog. Daily erzeugt diesen Satz nicht. Die 32 nichtgenerischen Katalogsätze (z.B. `今日は何をしますか。` bei する und `机の上に本があります。` bei ある) sind weiterhin vorhanden.

Zusätzlich enthält cloud.html in core2000PackBootstrap/add einen historischen Fallback: fehlendes item.example wird zu `「${item.word}」という言葉を覚えました。`, fehlende Übersetzung zu „Ich habe das Wort … gelernt“. Die aktuelle Funktion injectCore2000Pack gibt html aber unverändert zurück; der aktuelle Loader ruft diese ältere Bootstrap-Funktion nicht auf. Sie ist deshalb nicht mit einem heute aktiven Daily-Generator gleichzusetzen. Welche historischen Saves daraus stammen, lässt sich ohne deren unveränderte Sicherung nicht feststellen.

Die im HTML referenzierten externen content-packs/core-2000/core-pack.js- und audio-Dateien sind in diesem Checkout nicht vorhanden. index.html verwendet dann seinen eingebetteten Katalog. Keine Behauptung über frühere externe oder private Originaldateien möglich.

## Datenfluss und unterschiedliche Prioritäten
1. index.html wählt KOTOBA_EXTERNAL_CORE_PACK, falls ausreichend vorhanden, sonst EMBEDDED_CORE_PACK. coreCatalogHit/hydrateCoreVocabularyItem gleicht Core-Karten über IDs/Identität/Index ab. Dabei haben entry.example und entry.exampleTranslation jeweils Vorrang vor item.example bzw. dessen Übersetzung. Diese bestehende Lade-/Normalisierungslogik wurde nicht verändert. Ein bloßes produktives Austauschen des Katalogs könnte daher persönliche Kontexte beim nächsten Laden beeinflussen; das wäre ohne Sicherung und vollständige Datenflussprüfung keine sichere Inhaltskorrektur.
2. dungeon-source.js catalog liest dagegen den eingebetteten JSON-Katalog aus index.html. hydrate bildet für Core `{...packItem, ...savedCard}`; gespeicherte example/exampleTranslation überschreiben den Katalog, auch wenn sie leer oder generisch sind. Mining-Karten werden ohne Core-Hydrierung übernommen. Daily liest den vorhandenen autoritativen Snapshot über den unveränderten Adapter und erstellt nur flüchtige Aufgaben. Eine neue Katalogdatei allein würde vorhandene generische Saved-Beispiele in Daily daher nicht zuverlässig beheben.
3. Satz und Übersetzung werden bislang feldweise zusammengeführt. Einseitig gesetzte persönliche Felder können so ein nicht zusammengehöriges Paar ergeben. Dies ist eine zu prüfende Bestandslogik, kein in diesem Auftrag vorgenommener Datenfix.
4. index.html sentenceDisplay hat einen weiteren Anzeigeweg: vorbereiteter FILE_SENTENCE_PACK mit Text+Audio, dann ready/audioStored sentenceCache, dann item.example. Diese alternativen Kontexte landen nicht automatisch im Daily-Adapter. Tatoeba-Quellenangaben erscheinen nur aus vorhandenen Metadaten; der Bericht bestätigt weder Erreichbarkeit, Lizenzvollständigkeit noch inhaltliche Qualität fehlender Audio-Artefakte.

## Wer nutzt dieselben Inhalte?
Core-Lektionen und Vokabelreviews in index.html, Kontext-/Satzanzeigen und Audio-Fallbacks verwenden Karten/Katalog bzw. sentenceDisplay. Cloud-Übungsbereiche beziehen ebenfalls CORE_PACK und vorhandene Vokabeln. Dungeon und Daily teilen dungeon-source.js; Refresh, Mix und Nachüben verwenden die daraus gebauten Aufgaben. Grammatik-/Partikel-Daily-Pfade sind dagegen eigenständige kuratierte Definitionen. Eine Änderung des gemeinsamen Katalogs oder der gespeicherten Karte hat deshalb einen wesentlich größeren Wirkungsbereich als nur Daily.

Ob zusätzliche authentische Sätze in einem realen sentenceCache, persönlichen Mining-Kontexten, früheren Backups oder externen Packs existieren, wurde **nicht** geprüft. Aus dem generischen Feld allein folgt kein Beweis für einen endgültigen Verlust früherer Sätze.

## Sichere Ergänzungsstrategie als nächster, eigener Schritt
- Eine neue versionierte, unveränderliche **Anzeige-Sammlung** geprüfter Satz-/Übersetzungspaare anbieten, keine Migration gespeicherter Karten. Schlüssel: Pack-ID + packEntryId und überprüfte Wort/Lesungs-Identität; kein Neuordnen, keine neuen Wort-IDs, keine Änderungen an Stage/dueAt/Synonymen oder SRS-Eigentum.
- Persönliche nichtgenerische Kontexte beibehalten. Ein kuratiertes Paar allenfalls zusätzlich anzeigen oder nur bei fehlendem/exakt bekanntem generischen Fallback verwenden. Satz und Übersetzung atomar auswählen; niemals unabhängig mischen. Zunächst nur eine kleine redaktionell überprüfte Teilmenge.
- Herkunft, Lizenz, überprüfende Person/Datum und zulässige Zielwortform dokumentieren. Selbst verfasste Sätze als solche kennzeichnen. Keine erfundenen Quellenangaben, kein ungeprüfter Massengenerator. Satzlücken nur bei nachweislich passender Oberflächenform verwenden.
- Vor jedem Eingriff in Lade-/Hydrierungs-/Speicherlogik: unveränderte vollständige Backups verifizieren und auf isolierten Kopien record-genau prüfen. Kanji-P0 separat behandeln. Derzeit fehlen reale Backups; deshalb wurden keine Katalog-, Karten- oder Speicheränderungen durchgeführt.
- Sinnvoller kleiner Folgeschritt: generische Vorlagen im Daily-Kontext als ungeeignet erkennen und auf bestehende Bedeutungsaufgaben zurückfallen, statt sie als authentischen Sprachkontext auszugeben. Auch das sollte als getrennte, getestete Aufgabenqualitätsänderung erfolgen.

Reproduzierbare Zählung: `node scripts/audit-example-context.mjs`. Das Skript liest ausschließlich den eingebetteten Repository-Katalog.
