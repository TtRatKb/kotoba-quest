const DB_NAME = "kotobaQuestDurableStorageV1";
const DB_VERSION = 1;
const STORE = "snapshots";
const MAIN_KEY = "mainCheckpoint";
const VAULT_KEY = "progressVault";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB konnte nicht geöffnet werden."));
    request.onblocked = () => reject(new Error("IndexedDB-Upgrade wurde durch einen anderen offenen Kotoba-Quest-Tab blockiert."));
  });
}

function transactionRequest(db, mode, action) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let request;
    try { request = action(store); }
    catch (error) { reject(error); return; }
    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(request?.result);
    };
    tx.onerror = () => {
      if (settled) return;
      settled = true;
      reject(tx.error || request?.error || new Error("IndexedDB-Schreibvorgang fehlgeschlagen."));
    };
    tx.onabort = () => {
      if (settled) return;
      settled = true;
      reject(tx.error || new Error("IndexedDB-Schreibvorgang wurde abgebrochen."));
    };
  });
}

const cloneValue = value => {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
};

const bytesOfText = value => new Blob([String(value || "")]).size;
const bytesOfJson = value => {
  try { return bytesOfText(JSON.stringify(value)); } catch { return 0; }
};

export async function createKotobaDurableStorage({
  storageKey = "kotobaQuestDataV3",
  legacyVaultKey = "kotobaQuestProgressVaultV1"
} = {}) {
  const db = await openDatabase();
  let vaultRecord = null;
  let mainRecord = null;
  let lastError = "";
  let writeChain = Promise.resolve();

  const get = key => transactionRequest(db, "readonly", store => store.get(key));
  const put = record => transactionRequest(db, "readwrite", store => store.put(record));

  try { vaultRecord = await get(VAULT_KEY) || null; } catch (error) { lastError = String(error?.message || error); }
  try { mainRecord = await get(MAIN_KEY) || null; } catch (error) { lastError = String(error?.message || error); }

  // One-time migration of the old, almost-full duplicate progress vault out of
  // localStorage. Remove it only after an IndexedDB round-trip verifies it.
  try {
    const legacyRaw = localStorage.getItem(legacyVaultKey);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed?.data && typeof parsed.data === "object") {
        const legacyUpdatedAt = Number(parsed.updatedAtMs || 0);
        const currentUpdatedAt = Number(vaultRecord?.updatedAtMs || 0);
        if (!vaultRecord || legacyUpdatedAt >= currentUpdatedAt) {
          const candidate = {
            key: VAULT_KEY,
            version: 1,
            updatedAtMs: legacyUpdatedAt || Date.now(),
            data: cloneValue(parsed.data)
          };
          await put(candidate);
          const verified = await get(VAULT_KEY);
          if (verified?.data && typeof verified.data === "object") {
            vaultRecord = verified;
            localStorage.removeItem(legacyVaultKey);
          }
        } else {
          localStorage.removeItem(legacyVaultKey);
        }
      }
    }
  } catch (error) {
    lastError = String(error?.message || error);
    console.warn("Kotoba Quest: alter Progress Vault konnte noch nicht nach IndexedDB migriert werden", error);
  }

  // Seed an IndexedDB emergency checkpoint from the current compact local save.
  try {
    const localRaw = localStorage.getItem(storageKey);
    if (localRaw) {
      JSON.parse(localRaw);
      if (!mainRecord || bytesOfText(localRaw) > 0) {
        const record = { key: MAIN_KEY, version: 1, updatedAtMs: Date.now(), raw: localRaw };
        await put(record);
        mainRecord = record;
      }
    }
  } catch (error) {
    lastError = String(error?.message || error);
    console.warn("Kotoba Quest: initialer IndexedDB-Checkpoint konnte nicht geschrieben werden", error);
  }

  // Best effort: ask the browser to keep this site's data persistent. Browsers
  // may deny this silently; Kotoba Quest still works without it.
  try { await navigator.storage?.persist?.(); } catch {}

  const enqueue = task => {
    writeChain = writeChain
      .catch(() => {})
      .then(task)
      .catch(error => {
        lastError = String(error?.message || error);
        window.dispatchEvent(new CustomEvent("kq-durable-storage-error", { detail:{ message:lastError } }));
        throw error;
      });
    return writeChain;
  };

  const api = {
    version: "1.0",
    dbName: DB_NAME,
    storageKey,
    legacyVaultKey,

    readVaultSync() {
      return vaultRecord?.data && typeof vaultRecord.data === "object" ? cloneValue(vaultRecord.data) : {};
    },

    writeVault(data) {
      if (!data || typeof data !== "object") return Promise.resolve(false);
      const record = { key: VAULT_KEY, version: 1, updatedAtMs: Date.now(), data: cloneValue(data) };
      vaultRecord = record;
      return enqueue(async () => {
        await put(record);
        return true;
      });
    },

    readMainCheckpointSync() {
      return typeof mainRecord?.raw === "string" ? mainRecord.raw : null;
    },

    writeMainCheckpoint(raw) {
      if (typeof raw !== "string" || !raw) return Promise.resolve(false);
      const record = { key: MAIN_KEY, version: 1, updatedAtMs: Date.now(), raw };
      mainRecord = record;
      return enqueue(async () => {
        await put(record);
        window.dispatchEvent(new CustomEvent("kq-durable-main-checkpoint", {
          detail:{ updatedAtMs:record.updatedAtMs, bytes:bytesOfText(raw) }
        }));
        return true;
      });
    },

    async flush() {
      try { await writeChain; return true; }
      catch { return false; }
    },

    async estimate() {
      let browser = null;
      try { browser = await navigator.storage?.estimate?.(); } catch {}
      return {
        mainCheckpointBytes: bytesOfText(mainRecord?.raw || ""),
        progressVaultBytes: bytesOfJson(vaultRecord?.data || {}),
        indexedDbTrackedBytes: bytesOfText(mainRecord?.raw || "") + bytesOfJson(vaultRecord?.data || {}),
        browserUsageBytes: Number(browser?.usage || 0),
        browserQuotaBytes: Number(browser?.quota || 0),
        persisted: await (async () => { try { return Boolean(await navigator.storage?.persisted?.()); } catch { return false; } })(),
        lastError
      };
    },

    getStatus() {
      return {
        version: this.version,
        mainCheckpointBytes: bytesOfText(mainRecord?.raw || ""),
        progressVaultBytes: bytesOfJson(vaultRecord?.data || {}),
        lastError
      };
    },

    async clearLegacyDuplicates() {
      for (const key of [legacyVaultKey, "kotobaQuestDataV1", "kotobaQuestDataV2"]) {
        try { localStorage.removeItem(key); } catch {}
      }
      return true;
    }
  };

  return api;
}
