const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "../..");
const port = 4189;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd:root, stdio:"ignore" });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  await wait(500);
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/daily.html`);
    const result = await page.evaluate(async () => {
      const api = await import("/kotoba-backup-export.mjs");
      const exactRaw = JSON.stringify({ vocabulary:[{ id:"inu", stage:7, due:1700000000000 }], grammarProgress:{ demo:{ stage:2 } } });
      const source = {
        database:"kotobaQuestDurableStorageV1",
        storageVersion:"3.0",
        primaryRaw:exactRaw,
        mainCheckpointRaw:exactRaw,
        progressVault:{ vocabulary:[{ id:"inu", stage:7 }] }
      };
      const bundle = await api.createBackupBundle({ durable:source, localStorageEntries:[{ key:"kotobaQuestTestJournal", value:"pending" }], cloud:null });
      const verified = await api.verifyBackupBundle(bundle);
      const restored = JSON.parse(bundle.payloads["durable-storage.json"]);

      const dbName = `kotobaBackupRestoreTest-${crypto.randomUUID()}`;
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("snapshots", { keyPath:"key" });
      const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      await new Promise((resolve, reject) => {
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put({ key:"primaryLearningState", raw:restored.primaryRaw });
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      const restoredRecord = await new Promise((resolve, reject) => {
        const get = db.transaction("snapshots", "readonly").objectStore("snapshots").get("primaryLearningState");
        get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error);
      });
      db.close();
      indexedDB.deleteDatabase(dbName);
      return { valid:verified.valid, exact:restoredRecord.raw === exactRaw, dbName, productionDbUntouched:dbName !== source.database };
    });
    assert.deepEqual({ valid:result.valid, exact:result.exact, productionDbUntouched:result.productionDbUntouched }, { valid:true, exact:true, productionDbUntouched:true });
    console.log("Kotoba backup browser restore isolation: ok");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
})().catch(error => { server.kill("SIGTERM"); console.error(error); process.exitCode = 1; });
