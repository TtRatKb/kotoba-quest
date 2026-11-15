const FORMAT = "kotoba-quest-backup-v1";

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

export async function sha256(text, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.subtle) throw new Error("SHA-256 ist in diesem Browser nicht verfügbar.");
  const bytes = new TextEncoder().encode(String(text));
  const digest = await cryptoApi.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function byteLength(text) {
  return new TextEncoder().encode(String(text)).byteLength;
}

export function collectKotobaLocalStorage(storage) {
  const entries = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !/^(kotobaQuest|kq)/i.test(key)) continue;
    const value = storage.getItem(key);
    if (value != null) entries.push({ key, value });
  }
  return entries.sort((left, right) => left.key.localeCompare(right.key));
}

export function collectDurableSnapshot(durableStorage) {
  if (!durableStorage) throw new Error("Kotobas lokaler Primärspeicher ist noch nicht bereit.");
  return {
    database: String(durableStorage.dbName || "kotobaQuestDurableStorageV1"),
    storageVersion: String(durableStorage.version || "unknown"),
    primaryRaw: durableStorage.readPrimarySync?.() || null,
    mainCheckpointRaw: durableStorage.readMainCheckpointSync?.() || null,
    progressVault: durableStorage.readVaultSync?.() || {}
  };
}

export async function createBackupBundle({
  durable,
  localStorageEntries,
  cloud = null,
  accountScope = "local-profile",
  createdAt = new Date().toISOString(),
  origin = globalThis.location?.origin || "unknown"
}) {
  const payloads = {
    "durable-storage.json": canonicalJson(durable),
    "kotoba-local-storage.json": canonicalJson(localStorageEntries),
    "cloud-learning-state.json": canonicalJson(cloud)
  };
  const files = [];
  for (const name of Object.keys(payloads).sort()) {
    files.push({ name, bytes: byteLength(payloads[name]), sha256: await sha256(payloads[name]) });
  }
  const manifestCore = { format: FORMAT, version: 1, createdAt, origin, accountScope, files };
  return {
    manifest: { ...manifestCore, manifestSha256: await sha256(canonicalJson(manifestCore)) },
    payloads
  };
}

export async function verifyBackupBundle(bundle) {
  const errors = [];
  if (bundle?.manifest?.format !== FORMAT || bundle?.manifest?.version !== 1) errors.push("Unbekanntes Sicherungsformat.");
  const manifestCore = bundle?.manifest ? Object.fromEntries(Object.entries(bundle.manifest).filter(([key]) => key !== "manifestSha256")) : null;
  if (!manifestCore || await sha256(canonicalJson(manifestCore)) !== bundle.manifest?.manifestSha256) errors.push("Hash des Manifests stimmt nicht.");
  for (const file of bundle?.manifest?.files || []) {
    const payload = bundle?.payloads?.[file.name];
    if (typeof payload !== "string") { errors.push(`${file.name} fehlt.`); continue; }
    if (byteLength(payload) !== file.bytes) errors.push(`${file.name}: Dateigröße stimmt nicht.`);
    if (await sha256(payload) !== file.sha256) errors.push(`${file.name}: SHA-256 stimmt nicht.`);
  }
  return { valid: errors.length === 0, errors };
}

export function downloadBackupBundle(bundle, documentApi = document, urlApi = URL) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const href = urlApi.createObjectURL(blob);
  const link = documentApi.createElement("a");
  const date = String(bundle.manifest.createdAt || "backup").slice(0, 10);
  link.href = href;
  link.download = `kotoba-quest-backup-${date}.json`;
  link.click();
  setTimeout(() => urlApi.revokeObjectURL(href), 0);
}
