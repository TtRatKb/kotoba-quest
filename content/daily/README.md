# Daily-Anzeigesammlung: Originalkontexte v1

`contexts-v1.mjs` enthält 40 neue japanische Sätze mit jeweils einer zusammengehörigen deutschen Übersetzung und expliziten kontextbezogenen Lesungen. Sie sind für Kotoba Quest von OpenAI ChatGPT verfasst, nicht aus Tatoeba, Lehrbüchern oder einem Korpus übernommen. Es sind plausible Alltagssätze, keine belegten Zitate oder aufgezeichneten Äußerungen realer Personen. Die Autorenschaft wird nicht als menschlich ausgegeben.

Herkunft, Datum, Version und Prüfart stehen im Sammlungsobjekt. Es gelten die für den erzeugenden Account anwendbaren [OpenAI-Ausgabebedingungen](https://openai.com/policies/terms-of-use/) einschließlich gegebenenfalls regionaler/Geschäftsbedingungen. Es wird keine fremde CC-Lizenz, Exklusivität, Public-Domain-Eigenschaft oder universelle Urheberrechtsgarantie behauptet. Diese Sammlung erhebt keine Tatoeba-Attributionsansprüche und enthält kein Audio. `context-candidates.json` bleibt die leere, weiterhin streng geprüfte Vorbereitungsdatei für mögliche spätere lizenzierte Fremdquellen.

## Sprachliche Prüfung

Alle 40 Paare wurden beim Verfassen und in einem zweiten sprachlichen Durchgang durch denselben KI-Assistenten auf reale Zielwortverwendung, Satzbau, Partikeln, Tempus/Aspekt, intendierte Bedeutung, deutsche Entsprechung und die angegebenen Lesungen geprüft. Dies ist eine **sprachliche Selbstprüfung**, keine unabhängige muttersprachliche Abnahme. `independentReview:false` ist absichtlich Teil der Metadaten. Eine unabhängige japanisch-deutsche redaktionelle Prüfung bleibt offen; automatische Tests können Natürlichkeit und Übersetzungsrichtigkeit nicht beweisen.

Situationen: Schule, Bahnhof/Zug, Freundschaften, Familie, Arbeit, Tagesablauf, Wetter, Einkaufen, Telefon, Reisen, Wohnen und Lesen. Neben einfachen Hauptsätzen kommen Bitten, Fragen, Gründe, zeitliche Bedingungen, Relativsätze, Absichten, Gegensätze und begleitende Handlungen vor. Nicht jeder Satz ist grammatisch Anfängerstoff; er ist Kontexttraining für gelernte Vokabeln und schaltet keine Grammatiklektion frei.

Gezielt geprüft wurden unter anderem: 先生 als Lehrer und 聞く als Fragen; 電話に出る als ans Telefon gehen; 教室 im Kurssinn; 写真 mit 撮る; die Zweck-/Vorbereitungsnuance von 置いておく; つもり als Absicht; 安いのに als Gegensatz. Nicht im Japanischen festgelegte deutsche Artikel, Geschlecht oder Singular/Plural sind Übersetzungsentscheidungen, keine zusätzlichen Abfragekriterien.

## Datenvertrag und Verwendung

- Unveränderliche Version 1 mit eigenen Satz-IDs; Wort-IDs sind die **bestehenden** Core-IDs. Jeder Datensatz bindet Pack, Core-ID, Schreibweise, Lesung und Zielbedeutung. Neue Satz-IDs sind keine neuen Vokabel- oder SRS-Items.
- Die Daily-Anzeige verwendet einen Kontext nur bei exakter Core-Zuordnung und passender gespeicherter Bedeutung. Mining, unbekannte IDs, fehlender Katalog und abweichende Identitäten erhalten keinen Ersatz.
- Persönliche/nichtgenerische japanische Beispiele bleiben bevorzugt, auch ungewöhnlich kurze Texte. Eine vom Katalog abweichende deutsche Übersetzung sperrt den Aufsatz ebenfalls, damit ein einseitiger persönlicher Kontext nicht verdeckt wird.
- Nur fehlende oder bekannte generische japanische Vorlagen dürfen das zusätzliche vollständige Paar verwenden. Der Aufsatz ändert **niemals** `example` oder `exampleTranslation` einer Karte, auch nicht auf der flüchtigen Kopie. Ausschließlich neue `dailyContext`-Anzeigemetadaten werden ergänzt. Japanisch und Deutsch werden atomar gewählt; keine feldweise Mischung.
- Bereits vorhandene gute Beispiele werden weder ersetzt noch mit neuen deutschen Übersetzungen kombiniert. Der gemeinsame Core-Katalog, gespeicherte Daten und der vorhandene Source-Adapter bleiben unverändert. Andere Lernbereiche erhalten keine automatische Datenänderung.
- Die vorhandene konservative Satzlückenprüfung bleibt erhalten: **24 von 40** Kontexten eignen sich unmittelbar für exakte Lücken. Einzeichenwörter und vorsichtig abgelehnte angrenzende Kanji bleiben bei Erkennung, Verständnis und Beispiel-Feedback. Es werden keine Verbformen generiert oder automatisch zurückkonjugiert.
- Lesungen gelten pro Kontext und werden mit dem bestehenden Furigana-Renderer und tatsächlichen Kanji-Voraussetzungen verarbeitet. Unbekannte/unvollständige Kanji-Daten behalten die Hilfe; nur explizite Lesungsaufgaben verbergen sie im Prompt. Keine globalen Lesungseinträge überschreiben mehrdeutige Kataloglesungen.

## Qualitäts- und Regressionstore

`node scripts/validate-daily-original-contexts.mjs` prüft gegen den tatsächlichen eingebetteten Core-Katalog: 40 eindeutige Zuordnungen, Zielbedeutung, genau eine wörtliche Zielform, getrennte Übersetzung, nichtgenerische Kontexte und vollständige explizite Kanji-Lesungsabdeckung bei unbekanntem Fortschritt. Die Prüfung ist keine semantische oder rechtliche Zertifizierung.

`tests/daily-original-contexts.test.mjs` ergänzt Fälle für falsche Identitäten/Bedeutungen, Mining, fehlendes Material, persönliche/übersetzungsseitige Kontexte, unveränderte synthetische SRS-/Kanji-/Domänendaten, sichere Lücken und bekannte/unbekannte Kanji. Der neue Browserlauf `tests/browser/daily-contexts.cjs` prüft echte UI-Ausgabe, zusammengehörige Paare, Furigana, Feedback und Dock in sechs Smartphone-/reduzierten Viewports. Alle Daten dabei sind synthetisch; produktive Profile werden nicht geöffnet.

Weitere Inhalte erhalten eine neue überprüfbare Version bzw. gezielte redaktionelle Änderung. Keine automatische Massenanreicherung, kein Netzabruf, keine produktive Migration und keine offiziellen SRS-Buchungen.

Prüfstand: 124/124 Node-Tests bestanden; Sammlungskonsistenz ohne Befunde. Neue Kontextanzeige, gemischte Quest und bisherige Daily-Abschluss-/IME-/Nachübungsabläufe jeweils bei 320×568, 375×667, 390×844, 430×932, 320×360 und 390×320 in isoliertem Chromium erfolgreich. Der historische Katalogaudit bleibt unverändert bei 2.000 Einträgen, davon 1.968 generische und 32 andere Beispiele. Reale Smartphones, native Tastaturen und unabhängige Sprachprüfung bleiben offen. GitHub-CI führt Node-Tests und Sammlungsvalidator aus; Browserläufe sind lokale Prüfungen.
