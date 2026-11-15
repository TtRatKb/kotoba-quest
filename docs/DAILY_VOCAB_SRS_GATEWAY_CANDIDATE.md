# Daily-Vokabel-SRS-Gateway — ausführbarer Client, Write-Gate geschlossen

Dieser PR implementiert den Daily-seitigen Vertrag für einen späteren kanonischen Vokabelreview-Host. Er wird nicht von `daily.js` importiert und ist standardmäßig `enabled:false`. Es gibt keine produktiven SRS-Schreibzugriffe.

Der Gateway bewertet, plant und speichert keine Reviews. Er akzeptiert ausschließlich Host-Sessions der Vertragsversion 2 mit Konto-Scope, fälligem Zeitpunkt, erwarteter Revision, Item-/Pack-Identität, Review-Zyklus, zwei festen Richtungen (`jp-de`, `de-jp`) sowie opaken Frage-, Versuch- und Commit-Tokens. Fehlende/null/zukünftige Fälligkeit, eine Richtung, Bild-/Matching-Typen, wechselnde Identität oder Revision und unbestätigte Commits werden abgelehnt.

Antworten gehen unverändert mit den Host-Tokens an die Autorität. Nur die Autorität entscheidet über falsch, nahe Antwort, akzeptierte Variante, Retry und den kanonischen Ausgang. Erst wenn der Host beide Richtungen als akzeptiert und das Item als `ready` ausweist, darf der Gateway denselben stabilen Commit-Token mit erwarteter Revision/Fälligkeit/Zyklus senden. Erfolg erfordert eine Host-Quittung über genau ein offizielles Review und einen deduplizierten Life-RPG-Ereignisstatus. Nach Reload wird die Session beim Host fortgesetzt; der Client erfindet keine lokale Erfolgshistorie.

Der heutige `KotobaQuestExternalReviewApi` erfüllt diesen Vertrag ausdrücklich nicht: #32 zeigt clientvertrauende Richtungsflags, fehlende Due-/Revisions-/Zyklusbindung und getrennte Core-Commit/Command-Marker/Outbox-Phasen. Der Gateway entdeckt oder umhüllt diese Legacy-API daher nicht. Die Haupt-App muss nach vollständigem Backup- und Restore-Nachweis einen eigenen kanonischen V2-Host bereitstellen; dessen Implementierung ist ein späterer, separat freizugebender Speicher-PR.

Tests decken geschlossenes Gate, Legacy-Ablehnung, Fälligkeit/Revision/Zyklus, beide Richtungen, Retry, ungültige spielerische Tasks, veränderte Sessions, Commitquittung, Resume und keine doppelte SRS-/Life-RPG-Wirkung einer synthetischen Autorität ab. Der Modulscan verbietet Grading-/Scheduling-Code, Speicher, Netzwerk und Live-App-Erkennung im Gateway.

Noch blockiert: vollständige unveränderte Produktivbackups samt Hashmanifest/Zweitkopie, record-genauer isolierter Restore einschließlich Kanji, Host-/Origin-Entscheidung, kanonischer V2-Host, crashsichere Idempotenz/Outbox-Erholung in realem Browser/Firebase-Testprojekt und explizite Freigabe dieses konkreten Schreibwegs. Kanji bleibt read-only; Grammatik/Partikel sind nicht Teil dieses Gateways.
