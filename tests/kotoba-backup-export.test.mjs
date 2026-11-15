import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  collectDurableSnapshot,
  collectKotobaLocalStorage,
  createBackupBundle,
  verifyBackupBundle
} from "../kotoba-backup-export.mjs";

function fakeStorage(values) {
  const entries = Object.entries(values);
  return { length: entries.length, key: index => entries[index]?.[0] ?? null, getItem: key => values[key] ?? null };
}

test("export includes only Kotoba data and preserves exact strings", async () => {
  const primaryRaw = JSON.stringify({ vocabulary:[{ id:"neko", stage:4 }], kanjiPilot:{ 猫:2 } });
  const durable = collectDurableSnapshot({
    dbName:"isolated-test-db", version:"3.0",
    readPrimarySync:() => primaryRaw,
    readMainCheckpointSync:() => primaryRaw,
    readVaultSync:() => ({ vocabulary:[{ id:"neko", stage:4 }] })
  });
  const local = collectKotobaLocalStorage(fakeStorage({
    kotobaQuestReviewCommitJournalV1:"{\"token\":\"abc\"}",
    kqLifeRpgOutboxV1:"pending-event",
    unrelatedSecret:"must-not-export"
  }));
  const bundle = await createBackupBundle({ durable, localStorageEntries:local, cloud:{ raw:primaryRaw, hash:"host-hash" }, createdAt:"2026-11-15T10:00:00.000Z", origin:"https://example.test" });
  assert.equal((await verifyBackupBundle(bundle)).valid, true);
  assert.equal(JSON.parse(bundle.payloads["durable-storage.json"]).primaryRaw, primaryRaw);
  assert.deepEqual(JSON.parse(bundle.payloads["kotoba-local-storage.json"]).map(entry => entry.key), ["kotobaQuestReviewCommitJournalV1", "kqLifeRpgOutboxV1"]);
});

test("isolated restore reconstructs learning state byte-for-byte", async () => {
  const source = { database:"test", storageVersion:"3", primaryRaw:"{\"vocabulary\":[]}", mainCheckpointRaw:"{\"vocabulary\":[]}", progressVault:{ storyReader:{ chapter:3 } } };
  const bundle = await createBackupBundle({ durable:source, localStorageEntries:[], cloud:null });
  const restored = JSON.parse(bundle.payloads["durable-storage.json"]);
  assert.equal(canonicalJson(restored), canonicalJson(source));
  assert.equal(restored.primaryRaw, source.primaryRaw);
});

test("tampering is detected before restore", async () => {
  const bundle = await createBackupBundle({ durable:{ primaryRaw:"original" }, localStorageEntries:[], cloud:null });
  bundle.payloads["durable-storage.json"] = "changed";
  const result = await verifyBackupBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /SHA-256|Dateigröße/);
});
