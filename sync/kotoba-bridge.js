import { getApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  KOTOBA_BRIDGE_SCHEMA_VERSION,
  KOTOBA_PROGRESS_STORAGE_KEY,
  analyticsFingerprint,
  buildQuickTrainingSnapshot,
  clone,
  compactRuntimeCheckpoint,
  inferSkillGrade,
  objectValue,
  readProgress,
  timestamp
} from "./kotoba-sync-model.js";
import {
  createActivityEvent,
  enqueueEvent,
  markCloudError,
  markEventsSynced,
  readBridgeState,
  writeBridgeState
} from "./kotoba-events.js";

const BRIDGE_VERSION = "1.0.0";
const appFrame = document.getElementById("appFrame");
let bridgeState = readBridgeState();
let currentUser = null;
let db = null;
let auth = null;
let scanTimer = null;
let syncTimer = null;
let iframeCleanup = null;
let parentStorageInstalled = false;
let cloudSyncInFlight = false;
let sessionWindow = { id: "", lastAt: 0, category: "" };

function progressRaw() {
  return localStorage.getItem(KOTOBA_PROGRESS_STORAGE_KEY) || "{}";
}

function appWindow() {
  try { return appFrame?.contentWindow || null; }
  catch { return null; }
}

function runtimeData() {
  const win = appWindow();
  let grammarProgress = [];
  let particleProgress = [];
  try { grammarProgress = win?.KotobaQuestGrammarSupportApi?.getGrammarProgress?.() || []; } catch {}
  try { particleProgress = win?.KotobaQuestParticlePath?.getProgress?.() || []; } catch {}
  return {
    rawProgress: progressRaw(),
    grammarProgress: Array.isArray(grammarProgress) ? grammarProgress : [],
    particleProgress: Array.isArray(particleProgress) ? particleProgress : []
  };
}

function sessionId(category, at = Date.now()) {
  const normalized = String(category || "study");
  if (!sessionWindow.id || sessionWindow.category !== normalized || at - sessionWindow.lastAt > 5 * 60 * 1000) {
    sessionWindow = {
      id: `kq-session-${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      lastAt: at,
      category: normalized
    };
  } else {
    sessionWindow.lastAt = at;
  }
  return sessionWindow.id;
}

function queueEvent(payload) {
  const at = Number(payload?.timestamp) || Date.now();
  const category = payload?.area || payload?.type || "study";
  const event = createActivityEvent({ ...payload, timestamp: at, sessionId: payload?.sessionId || sessionId(category, at) });
  enqueueEvent(bridgeState, event);
  bridgeState = writeBridgeState(bridgeState);
  scheduleCloudSync(250);
  try { window.dispatchEvent(new CustomEvent("kotoba-bridge-event", { detail: clone(event) })); } catch {}
  return event;
}

function mapAnalyticsEvent(event) {
  if (!event || event.migrated) return null;
  const common = {
    timestamp: timestamp(event.at) || Date.now(),
    itemId: String(event.id || ""),
    label: String(event.label || ""),
    area: String(event.area || "")
  };
  if (event.type === "vocab-review-direction") {
    return {
      ...common,
      type: "vocab-review",
      skill: String(event.skill || ""),
      result: String(event.status || ""),
      metadata: { directional: true }
    };
  }
  if (event.type === "vocab-lesson") return { ...common, type: "vocab-lesson", result: "completed" };
  if (event.type === "import") return { ...common, type: "mining-import", result: "added" };
  return null;
}

function emitNewAnalyticsEvents(nextCheckpoint) {
  const seen = new Set(bridgeState.seenAnalytics || []);
  const nextSeen = [...seen];
  for (const event of nextCheckpoint.analyticsEvents || []) {
    const fingerprint = analyticsFingerprint(event);
    if (!fingerprint || seen.has(fingerprint)) continue;
    nextSeen.push(fingerprint);
    const mapped = mapAnalyticsEvent(event);
    if (mapped) queueEvent(mapped);
  }
  bridgeState.seenAnalytics = nextSeen.slice(-600);
}

function compareSkillGroup(previousGroup = {}, nextGroup = {}, type, area) {
  for (const [pointId, point] of Object.entries(nextGroup || {})) {
    if (!Object.prototype.hasOwnProperty.call(previousGroup || {}, pointId)) continue;
    const previousPoint = objectValue(previousGroup?.[pointId]);
    if (!previousPoint.lessonComplete && point?.lessonComplete) {
      queueEvent({
        type: type === "grammar-review" ? "grammar-lesson" : "particle-lesson",
        itemId: pointId,
        label: String(point?.title || point?.particle || pointId),
        area,
        result: "completed",
        timestamp: timestamp(point?.lessonCompletedAt) || Date.now()
      });
    }
    for (const [skillId, skill] of Object.entries(objectValue(point?.skills))) {
      const previousSkill = objectValue(previousPoint?.skills?.[skillId]);
      const nextReviewedAt = timestamp(skill?.lastReviewedAt);
      const previousReviewedAt = timestamp(previousSkill?.lastReviewedAt);
      if (!nextReviewedAt || nextReviewedAt === previousReviewedAt) continue;
      const grade = inferSkillGrade(previousSkill, skill);
      if (!grade) continue;
      queueEvent({
        type,
        itemId: pointId,
        skill: skillId,
        result: grade,
        label: String(point?.title || point?.particle || pointId),
        area,
        timestamp: nextReviewedAt,
        metadata: {
          stageBefore: Number(previousSkill?.stage || 0),
          stageAfter: Number(skill?.stage || 0),
          dueAt: timestamp(skill?.dueAt)
        }
      });
    }
  }
}

function establishBaseline(checkpoint, snapshot) {
  bridgeState.checkpoint = checkpoint;
  bridgeState.lastSnapshot = snapshot;
  bridgeState.seenAnalytics = (checkpoint.analyticsEvents || []).map(analyticsFingerprint).filter(Boolean).slice(-600);
  bridgeState = writeBridgeState(bridgeState);
}

async function scanProgress({ reason = "change", forceSnapshot = false } = {}) {
  clearTimeout(scanTimer);
  const runtime = runtimeData();
  const snapshot = buildQuickTrainingSnapshot(runtime);
  const checkpoint = compactRuntimeCheckpoint(runtime);

  if (!bridgeState.checkpoint) {
    establishBaseline(checkpoint, snapshot);
    scheduleCloudSync(300);
    return { initialized: true, snapshot: clone(snapshot) };
  }

  const previous = objectValue(bridgeState.checkpoint);
  emitNewAnalyticsEvents(checkpoint);
  compareSkillGroup(objectValue(previous.grammar), objectValue(checkpoint.grammar), "grammar-review", "grammar");
  compareSkillGroup(objectValue(previous.particles), objectValue(checkpoint.particles), "particle-review", "particles");

  bridgeState.checkpoint = checkpoint;
  const previousSnapshotString = JSON.stringify(bridgeState.lastSnapshot?.counts || {});
  const nextSnapshotString = JSON.stringify(snapshot?.counts || {});
  bridgeState.lastSnapshot = snapshot;
  bridgeState = writeBridgeState(bridgeState);
  if (forceSnapshot || previousSnapshotString !== nextSnapshotString || reason === "change") scheduleCloudSync(350);
  return { initialized: false, snapshot: clone(snapshot) };
}

function scheduleScan(delay = 120, options = {}) {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => scanProgress(options).catch(error => console.warn("Kotoba Bridge scan failed", error)), delay);
}

function installStorageTrigger(targetWindow, marker) {
  if (!targetWindow?.Storage?.prototype) return () => {};
  const proto = targetWindow.Storage.prototype;
  const current = proto.setItem;
  if (current?.[marker]) return () => {};
  const wrapped = function(key, value) {
    const output = current.apply(this, arguments);
    if (String(key) === KOTOBA_PROGRESS_STORAGE_KEY) scheduleScan(100, { reason: "change" });
    return output;
  };
  Object.defineProperty(wrapped, marker, { value: true });
  wrapped.__kqBridgeOriginal = current;
  proto.setItem = wrapped;
  return () => {
    if (proto.setItem === wrapped) proto.setItem = current;
  };
}

function attachIframeTriggers() {
  iframeCleanup?.();
  iframeCleanup = null;
  const win = appWindow();
  if (!win) return;
  const cleanStorage = installStorageTrigger(win, "__kqBridgeIframeWrapped");
  const dirty = () => scheduleScan(60, { reason: "change" });
  try { win.addEventListener("kotoba-progress-dirty", dirty); } catch {}
  iframeCleanup = () => {
    cleanStorage();
    try { win.removeEventListener("kotoba-progress-dirty", dirty); } catch {}
  };
  scheduleScan(250, { reason: "iframe-load", forceSnapshot: true });
}

function installParentStorageTrigger() {
  if (parentStorageInstalled) return;
  parentStorageInstalled = true;
  installStorageTrigger(window, "__kqBridgeParentWrapped");
}

function eventCollection(uid) {
  return collection(db, "users", uid, "bridgeEvents");
}

function eventDocument(uid, eventId) {
  return doc(db, "users", uid, "bridgeEvents", eventId);
}

function snapshotDocument(uid) {
  return doc(db, "users", uid, "bridgeState", "quickTraining");
}

function metaDocument(uid) {
  return doc(db, "users", uid, "bridgeState", "meta");
}

async function syncPendingEvents() {
  if (!currentUser || !db || !navigator.onLine || cloudSyncInFlight) return;
  cloudSyncInFlight = true;
  try {
    const pending = [...(bridgeState.pendingEvents || [])];
    const syncedIds = [];
    for (const event of pending) {
      await setDoc(eventDocument(currentUser.uid, event.eventId), {
        ...event,
        cloudSyncedAt: serverTimestamp()
      }, { merge: true });
      syncedIds.push(event.eventId);
    }
    if (syncedIds.length) markEventsSynced(bridgeState, syncedIds);

    const quickSnapshot = bridgeState.lastSnapshot || buildQuickTrainingSnapshot(runtimeData());
    await setDoc(snapshotDocument(currentUser.uid), {
      ...quickSnapshot,
      bridgeVersion: BRIDGE_VERSION,
      updatedAt: serverTimestamp()
    }, { merge: true });
    bridgeState.cloud = { ...objectValue(bridgeState.cloud), lastSnapshotAt: Date.now(), lastSuccessAt: Date.now(), lastError: "" };

    await setDoc(metaDocument(currentUser.uid), {
      schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
      bridgeVersion: BRIDGE_VERSION,
      source: "kotoba",
      updatedAt: serverTimestamp(),
      lastLocalUpdateAt: Date.now()
    }, { merge: true });
    bridgeState = writeBridgeState(bridgeState);
  } catch (error) {
    markCloudError(bridgeState, error);
    bridgeState = writeBridgeState(bridgeState);
    if (String(error?.code || "").includes("permission-denied")) {
      console.info("Kotoba Bridge: Firestore bridge paths are not permitted yet. Local queue remains safe until rules are updated.");
    } else {
      console.warn("Kotoba Bridge cloud sync failed", error);
    }
  } finally {
    cloudSyncInFlight = false;
  }
}

function scheduleCloudSync(delay = 300) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncPendingEvents(), delay);
}

async function recentCloudEvents(max = 50) {
  if (!currentUser || !db) return [];
  const capped = Math.max(1, Math.min(100, Number(max) || 50));
  const rows = await getDocs(query(eventCollection(currentUser.uid), orderBy("timestamp", "desc"), limit(capped)));
  return rows.docs.map(row => row.data());
}

async function initializeFirebaseBridge() {
  for (let attempt = 0; attempt < 40 && !getApps().length; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!getApps().length) {
    console.warn("Kotoba Bridge: Firebase app was not initialized by cloud.html; cloud sync stays unavailable.");
    return;
  }
  const app = getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  onAuthStateChanged(auth, user => {
    currentUser = user || null;
    if (currentUser) scheduleCloudSync(150);
  });
}

function publicStatus() {
  return {
    version: BRIDGE_VERSION,
    schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
    signedIn: Boolean(currentUser),
    online: navigator.onLine,
    pendingEvents: bridgeState.pendingEvents?.length || 0,
    recentEvents: bridgeState.recentEvents?.length || 0,
    lastCloudSuccessAt: bridgeState.cloud?.lastSuccessAt || null,
    lastCloudError: bridgeState.cloud?.lastError || ""
  };
}

window.KotobaQuestBridge = {
  version: BRIDGE_VERSION,
  schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
  getQuickTrainingSnapshot: () => clone(bridgeState.lastSnapshot || buildQuickTrainingSnapshot(runtimeData())),
  refreshQuickTrainingSnapshot: async () => (await scanProgress({ reason: "api", forceSnapshot: true })).snapshot,
  getPendingActivityEvents: () => clone(bridgeState.pendingEvents || []),
  getRecentActivityEvents: () => clone(bridgeState.recentEvents || []),
  getRecentCloudActivityEvents: recentCloudEvents,
  syncNow: async () => { await scanProgress({ reason: "manual", forceSnapshot: true }); await syncPendingEvents(); return publicStatus(); },
  getStatus: publicStatus,
  // V1 is intentionally read-only from the Life RPG perspective. A future bridge
  // version will expose a server-validated review submission contract here.
  reviewWriteBackAvailable: false
};

installParentStorageTrigger();
appFrame?.addEventListener("load", attachIframeTriggers);
window.addEventListener("online", () => { scheduleScan(50, { reason: "online", forceSnapshot: true }); scheduleCloudSync(100); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleScan(120, { reason: "visible", forceSnapshot: true }); });

initializeFirebaseBridge().catch(error => console.warn("Kotoba Bridge Firebase initialization failed", error));
if (appFrame?.contentWindow) setTimeout(attachIframeTriggers, 250);
scheduleScan(500, { reason: "startup", forceSnapshot: true });
