const DB_NAME = "kotobaQuestDurableStorageV1";
const DB_VERSION = 2;
const STORE = "snapshots";
const PRIMARY_KEY = "primaryLearningState";
const MAIN_KEY = "mainCheckpoint";
const VAULT_KEY = "progressVault";
const META_KEY = "primaryMeta";

// Capture the browser's real Storage methods before Kotoba installs its virtual
// primary-save shim. These helpers are intentionally used only for migration /
// diagnostics so the large Kotoba save never needs to remain in localStorage.
const nativeStorageGet = Storage.prototype.getItem;
const nativeStorageSet = Storage.prototype.setItem;
const nativeStorageRemove = Storage.prototype.removeItem;

function physicalGet(storage, key) {
  try { return nativeStorageGet.call(storage, key); } catch { return null; }
}
function physicalSet(storage, key, value) {
  return nativeStorageSet.call(storage, key, value);
}
function physicalRemove(storage, key) {
  try { nativeStorageRemove.call(storage, key); } catch {}
}

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
const isValidProgress = raw => {
  if (typeof raw !== "string" || !raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed && typeof parsed === "object" && Array.isArray(parsed.vocabulary));
  } catch { return false; }
};

export async function createKotobaDurableStorage({
  storageKey = "kotobaQuestDataV3",
  legacyVaultKey = "kotobaQuestProgressVaultV1"
} = {}) {
  const db = await openDatabase();
  let vaultRecord = null;
  let mainRecord = null;
  let primaryRecord = null;
  let primaryRaw = null;
  let lastError = "";
  let writeChain = Promise.resolve();
  let virtualInstalled = false;
  let migration = { migrated:false, source:"none", removedLegacy:false, verified:false };

  const get = key => transactionRequest(db, "readonly", store => store.get(key));
  const put = record => transactionRequest(db, "readwrite", store => store.put(record));
  const del = key => transactionRequest(db, "readwrite", store => store.delete(key));

  try { vaultRecord = await get(VAULT_KEY) || null; } catch (error) { lastError = String(error?.message || error); }
  try { mainRecord = await get(MAIN_KEY) || null; } catch (error) { lastError = String(error?.message || error); }
  try { primaryRecord = await get(PRIMARY_KEY) || null; } catch (error) { lastError = String(error?.message || error); }

  // First migrate the former almost-full localStorage progress vault. It is a
  // safety copy, not the authoritative main save, so it belongs in IndexedDB.
  try {
    const legacyRaw = physicalGet(localStorage, legacyVaultKey);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed?.data && typeof parsed.data === "object") {
        const legacyUpdatedAt = Number(parsed.updatedAtMs || 0);
        const currentUpdatedAt = Number(vaultRecord?.updatedAtMs || 0);
        if (!vaultRecord || legacyUpdatedAt >= currentUpdatedAt) {
          const candidate = {
            key: VAULT_KEY,
            version: 2,
            updatedAtMs: legacyUpdatedAt || Date.now(),
            data: cloneValue(parsed.data)
          };
          await put(candidate);
          const verified = await get(VAULT_KEY);
          if (verified?.data && typeof verified.data === "object") {
            vaultRecord = verified;
            physicalRemove(localStorage, legacyVaultKey);
          }
        } else {
          physicalRemove(localStorage, legacyVaultKey);
        }
      }
    }
  } catch (error) {
    lastError = String(error?.message || error);
    console.warn("Kotoba Quest: alter Progress Vault konnte noch nicht nach IndexedDB migriert werden", error);
  }

  // PRIMARY STORAGE MIGRATION
  // During the V2 -> V3 migration the real localStorage copy is deliberately
  // treated as authoritative if it is valid, because it was the live save used
  // by the previous release. Only after an IndexedDB write + readback succeeds
  // do we remove it. Future V3 writes are virtual and cannot recreate it.
  try {
    const legacyMainRaw = physicalGet(localStorage, storageKey);
    let candidateRaw = null;
    let source = "none";

    if (isValidProgress(legacyMainRaw)) {
      candidateRaw = legacyMainRaw;
      source = "legacy-localStorage";
    } else if (isValidProgress(primaryRecord?.raw)) {
      candidateRaw = primaryRecord.raw;
      source = "indexeddb-primary";
    } else if (isValidProgress(mainRecord?.raw)) {
      candidateRaw = mainRecord.raw;
      source = "recovery-checkpoint";
    }

    if (candidateRaw) {
      const candidate = {
        key: PRIMARY_KEY,
        version: 3,
        updatedAtMs: Date.now(),
        raw: candidateRaw
      };
      await put(candidate);
      const verified = await get(PRIMARY_KEY);
      if (!verified || verified.raw !== candidateRaw || !isValidProgress(verified.raw)) {
        throw new Error("IndexedDB-Primärspeicher konnte nach der Migration nicht verifiziert werden.");
      }
      primaryRecord = verified;
      primaryRaw = verified.raw;
      migration = { migrated: source === "legacy-localStorage", source, removedLegacy:false, verified:true };

      if (source === "legacy-localStorage") {
        physicalRemove(localStorage, storageKey);
        migration.removedLegacy = physicalGet(localStorage, storageKey) == null;
      } else if (legacyMainRaw && !isValidProgress(legacyMainRaw)) {
        // Invalid stale data must not shadow a valid IndexedDB state later.
        physicalRemove(localStorage, storageKey);
      }
    }

    await put({
      key: META_KEY,
      version: 3,
      updatedAtMs: Date.now(),
      storageMode: "indexeddb-primary",
      migration
    });
    try {
      physicalSet(localStorage, "kotobaQuestStorageMetaV3", JSON.stringify({
        version:3,
        mode:"indexeddb-primary",
        migratedAt:Date.now()
      }));
    } catch {}
  } catch (error) {
    lastError = String(error?.message || error);
    console.error("Kotoba Quest: Primärspeicher-Migration fehlgeschlagen", error);
    // IMPORTANT: on failure the legacy localStorage value is intentionally left
    // untouched. This is the rollback path.
    const legacyMainRaw = physicalGet(localStorage, storageKey);
    if (isValidProgress(legacyMainRaw)) primaryRaw = legacyMainRaw;
    else if (isValidProgress(primaryRecord?.raw)) primaryRaw = primaryRecord.raw;
    else if (isValidProgress(mainRecord?.raw)) primaryRaw = mainRecord.raw;
  }

  // Keep an emergency checkpoint seeded from the chosen primary state.
  try {
    if (isValidProgress(primaryRaw)) {
      const record = { key: MAIN_KEY, version: 2, updatedAtMs: Date.now(), raw: primaryRaw };
      await put(record);
      mainRecord = record;
    }
  } catch (error) {
    lastError = String(error?.message || error);
    console.warn("Kotoba Quest: initialer IndexedDB-Recovery-Checkpoint konnte nicht geschrieben werden", error);
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
        try { window.dispatchEvent(new CustomEvent("kq-durable-storage-error", { detail:{ message:lastError } })); } catch {}
        throw error;
      });
    return writeChain;
  };

  const writePrimary = (raw, { reason = "app" } = {}) => {
    const nextRaw = String(raw || "");
    if (!isValidProgress(nextRaw)) {
      const error = new Error("Kotoba Quest verweigert einen ungültigen Primär-Spielstand.");
      lastError = error.message;
      try { window.dispatchEvent(new CustomEvent("kq-durable-storage-error", { detail:{ message:lastError } })); } catch {}
      return Promise.reject(error);
    }

    // Synchronous callers (the legacy app uses localStorage.setItem) immediately
    // see the new value from memory, while durability is committed in sequence.
    primaryRaw = nextRaw;
    const record = { key: PRIMARY_KEY, version: 3, updatedAtMs: Date.now(), raw: nextRaw, reason };
    primaryRecord = record;
    return enqueue(async () => {
      await put(record);
      const verified = await get(PRIMARY_KEY);
      if (!verified || verified.raw !== nextRaw) throw new Error("IndexedDB-Primärsave konnte nicht verifiziert werden.");
      primaryRecord = verified;
      try {
        window.dispatchEvent(new CustomEvent("kq-primary-storage-persisted", {
          detail:{ updatedAtMs:verified.updatedAtMs, bytes:bytesOfText(nextRaw), reason }
        }));
      } catch {}
      return true;
    });
  };

  const api = {
    version: "3.0",
    dbName: DB_NAME,
    storageKey,
    legacyVaultKey,
    migration,

    readPrimarySync() {
      return isValidProgress(primaryRaw) ? primaryRaw : null;
    },

    writePrimary(raw, options) {
      return writePrimary(raw, options);
    },

    async verifyPrimary() {
      try {
        const record = await get(PRIMARY_KEY);
        return Boolean(record && isValidProgress(record.raw) && record.raw === primaryRaw);
      } catch { return false; }
    },

    installLocalStorageVirtualization(targetWindow = window) {
      if (virtualInstalled) return true;
      const targetStorage = targetWindow.localStorage;
      const proto = targetWindow.Storage?.prototype;
      if (!targetStorage || !proto) return false;

      const currentGet = proto.getItem;
      const currentSet = proto.setItem;
      const currentRemove = proto.removeItem;
      const keyName = storageKey;
      const self = this;

      const wrappedGet = function(key) {
        if (this === targetStorage && String(key) === keyName) return self.readPrimarySync();
        return currentGet.call(this, key);
      };
      const wrappedSet = function(key, value) {
        if (this === targetStorage && String(key) === keyName) {
          const next = String(value ?? "");
          // IndexedDB is async; preserve the synchronous Storage API by updating
          // the in-memory primary immediately and queueing a verified transaction.
          self.writePrimary(next, { reason:"virtual-localStorage" }).catch(error => {
            console.error("Kotoba Quest primary IndexedDB write failed", error);
          });
          return undefined;
        }
        return currentSet.call(this, key, value);
      };
      const wrappedRemove = function(key) {
        if (this === targetStorage && String(key) === keyName) {
          // The primary save may only be cleared through explicit reset/migration
          // logic. Accidental legacy removeItem calls must not destroy progress.
          return undefined;
        }
        return currentRemove.call(this, key);
      };
      wrappedGet.__kqPrimaryVirtual = true;
      wrappedSet.__kqPrimaryVirtual = true;
      wrappedRemove.__kqPrimaryVirtual = true;
      proto.getItem = wrappedGet;
      proto.setItem = wrappedSet;
      proto.removeItem = wrappedRemove;
      virtualInstalled = true;
      return true;
    },

    readVaultSync() {
      return vaultRecord?.data && typeof vaultRecord.data === "object" ? cloneValue(vaultRecord.data) : {};
    },

    writeVault(data) {
      if (!data || typeof data !== "object") return Promise.resolve(false);
      const record = { key: VAULT_KEY, version: 2, updatedAtMs: Date.now(), data: cloneValue(data) };
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
      const record = { key: MAIN_KEY, version: 2, updatedAtMs: Date.now(), raw };
      mainRecord = record;
      return enqueue(async () => {
        await put(record);
        try {
          window.dispatchEvent(new CustomEvent("kq-durable-main-checkpoint", {
            detail:{ updatedAtMs:record.updatedAtMs, bytes:bytesOfText(raw) }
          }));
        } catch {}
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
        primaryBytes: bytesOfText(primaryRaw || ""),
        mainCheckpointBytes: bytesOfText(mainRecord?.raw || ""),
        progressVaultBytes: bytesOfJson(vaultRecord?.data || {}),
        indexedDbTrackedBytes: bytesOfText(primaryRaw || "") + bytesOfText(mainRecord?.raw || "") + bytesOfJson(vaultRecord?.data || {}),
        browserUsageBytes: Number(browser?.usage || 0),
        browserQuotaBytes: Number(browser?.quota || 0),
        persisted: await (async () => { try { return Boolean(await navigator.storage?.persisted?.()); } catch { return false; } })(),
        lastError,
        migration
      };
    },

    getStatus() {
      return {
        version: this.version,
        storageMode: "indexeddb-primary",
        primaryBytes: bytesOfText(primaryRaw || ""),
        mainCheckpointBytes: bytesOfText(mainRecord?.raw || ""),
        progressVaultBytes: bytesOfJson(vaultRecord?.data || {}),
        lastError,
        migration
      };
    },

    async clearLegacyDuplicates() {
      for (const key of [legacyVaultKey, "kotobaQuestDataV1", "kotobaQuestDataV2"]) {
        physicalRemove(localStorage, key);
      }
      // kotobaQuestDataV3 may only be a leftover physical copy from a failed /
      // interrupted old migration. Remove it only when a verified IndexedDB
      // primary exists.
      if (await this.verifyPrimary()) physicalRemove(localStorage, storageKey);
      return true;
    },

    async clearPrimaryForExplicitReset() {
      primaryRaw = null;
      primaryRecord = null;
      await del(PRIMARY_KEY);
      physicalRemove(localStorage, storageKey);
      return true;
    },

    physicalLocalStorageValue(key) {
      return physicalGet(localStorage, key);
    },

    physicalLocalStorageBytes(key) {
      const raw = physicalGet(localStorage, key);
      return raw == null ? 0 : bytesOfText(String(key) + raw) * 2;
    }
  };

  return api;
}
