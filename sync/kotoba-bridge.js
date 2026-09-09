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

const BRIDGE_VERSION = "2.1.0";
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


const LIVE_REQUEST_TYPE = "life-rpg:kotoba-request";
const LIVE_RESPONSE_TYPE = "kotoba:life-rpg-response";

function liveReviewApi() {
  try { return appWindow()?.KotobaQuestExternalReviewApi || null; }
  catch { return null; }
}

function liveGrammarApi() {
  try { return appWindow()?.KotobaQuestGrammarSupportApi || null; }
  catch { return null; }
}

function liveParticleApi() {
  try { return appWindow()?.KotobaQuestParticlePath || null; }
  catch { return null; }
}

async function waitForLiveReviewApi(timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const api = liveReviewApi();
    if (api?.createVocabularySession && api?.evaluateVocabularyAnswer && api?.commitVocabularyItemReview) return api;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error("Kotoba's live review engine is still loading. Open Kotoba Quest once, then retry Quick Japanese.");
}

async function waitForExtendedReviewApis(timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const vocabulary = liveReviewApi();
    const grammar = liveGrammarApi();
    const particles = liveParticleApi();
    if (vocabulary?.createVocabularySession && grammar?.createExternalSession && particles?.createExternalSession) {
      return { vocabulary, grammar, particles };
    }
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  const vocabulary = liveReviewApi();
  return { vocabulary, grammar: liveGrammarApi(), particles: liveParticleApi() };
}

function adoptCurrentRuntimeWithoutEmission() {
  const runtime = runtimeData();
  const snapshot = buildQuickTrainingSnapshot(runtime);
  const checkpoint = compactRuntimeCheckpoint(runtime);
  bridgeState.checkpoint = checkpoint;
  bridgeState.lastSnapshot = snapshot;
  bridgeState.seenAnalytics = (checkpoint.analyticsEvents || []).map(analyticsFingerprint).filter(Boolean).slice(-600);
  bridgeState = writeBridgeState(bridgeState);
  scheduleCloudSync(80);
  return snapshot;
}

function processedCommand(commandId) {
  const id = String(commandId || "");
  return id && (bridgeState.processedCommandIds || []).includes(id);
}

function rememberCommand(commandId) {
  const id = String(commandId || "");
  if (!id) return;
  bridgeState.processedCommandIds = [...new Set([...(bridgeState.processedCommandIds || []), id])].slice(-600);
  bridgeState = writeBridgeState(bridgeState);
}

async function createLiveVocabularySession(payload = {}) {
  const api = await waitForLiveReviewApi();
  const result = api.createVocabularySession({
    limit: Math.max(1, Math.min(20, Number(payload.limit) || 5)),
    sessionId: String(payload.sessionId || "")
  });
  return clone(result);
}

async function evaluateLiveVocabulary(payload = {}) {
  const api = await waitForLiveReviewApi();
  return clone(api.evaluateVocabularyAnswer({
    itemId: String(payload.itemId || ""),
    direction: String(payload.direction || "jp-de"),
    answer: String(payload.answer || "")
  }));
}

async function commitLiveVocabulary(payload = {}) {
  const commandId = String(payload.commandId || "");
  if (!commandId) throw new Error("Quick Japanese commit is missing its command ID.");
  const api = await waitForLiveReviewApi();

  if (processedCommand(commandId)) {
    const snapshot = (await scanProgress({ reason: "external-review-retry", forceSnapshot: true })).snapshot;
    return {
      ok: true,
      committed: true,
      duplicate: true,
      commandId,
      item: clone(api.getItem?.(String(payload.itemId || "")) || null),
      snapshot: clone(snapshot)
    };
  }

  const result = api.commitVocabularyItemReview({
    itemId: String(payload.itemId || ""),
    expectedStage: payload.expectedStage == null ? null : Number(payload.expectedStage),
    errors: {
      listening: Boolean(payload.errors?.listening),
      production: Boolean(payload.errors?.production)
    }
  });

  if (!result?.ok || !result?.committed) return clone(result);

  // Persist the command marker before exporting an event. If the browser retries
  // the same command after a reload, Kotoba's SRS can never be advanced twice.
  rememberCommand(commandId);

  queueEvent({
    origin: "life-rpg",
    type: "vocab-review",
    itemId: String(payload.itemId || ""),
    skill: "paired",
    result: "completed",
    label: String(result.item?.word || payload.itemId || "Vocabulary"),
    area: String(result.source || "core") === "mining" ? "mining" : "vocabulary",
    sessionId: String(payload.sessionId || ""),
    timestamp: Date.now(),
    metadata: {
      commandId,
      stageBefore: Number(result.stageBefore || 0),
      stageAfter: Number(result.stageAfter || 0),
      dueAt: result.dueAt == null ? null : Number(result.dueAt),
      errors: clone(result.errors || {})
    }
  });

  const snapshot = adoptCurrentRuntimeWithoutEmission();
  return { ...clone(result), commandId, snapshot: clone(snapshot) };
}


async function createLiveMixedSession(payload = {}) {
  const limitTotal = Math.max(1, Math.min(15, Number(payload.limit) || 5));
  const sessionIdValue = String(payload.sessionId || `life-rpg-mixed-${Date.now().toString(36)}`);
  const apis = await waitForExtendedReviewApis();
  const vocabRaw = apis.vocabulary?.createVocabularySession
    ? apis.vocabulary.createVocabularySession({ limit: limitTotal, sessionId: `${sessionIdValue}-vocab` })
    : { items: [], questions: [] };
  const grammarRaw = apis.grammar?.createExternalSession
    ? apis.grammar.createExternalSession({ limit: limitTotal, sessionId: `${sessionIdValue}-grammar` })
    : { tasks: [] };
  const particleRaw = apis.particles?.createExternalSession
    ? apis.particles.createExternalSession({ limit: limitTotal, sessionId: `${sessionIdValue}-particles` })
    : { tasks: [] };

  const vocabTasks = (vocabRaw.items || []).map(item => ({
    kind: "vocab",
    taskId: `vocab:${item.itemId}`,
    item: clone(item),
    questions: (vocabRaw.questions || []).filter(q => String(q.itemId) === String(item.itemId)).map(clone)
  }));
  const grammarTasks = (grammarRaw.tasks || []).map(task => ({ kind: "grammar", taskId: task.taskId, task: clone(task) }));
  const particleTasks = (particleRaw.tasks || []).map(task => ({ kind: "particle", taskId: task.taskId, task: clone(task) }));

  // A gentle mixed-study rhythm: vocabulary gets the largest share, while due
  // grammar and particle skills are guaranteed room when they exist.
  const queues = { vocab: vocabTasks, grammar: grammarTasks, particle: particleTasks };
  const order = ["vocab", "grammar", "vocab", "particle", "vocab", "grammar", "particle"];
  const tasks = [];
  let cursor = 0;
  while (tasks.length < limitTotal && Object.values(queues).some(queue => queue.length)) {
    const key = order[cursor % order.length];
    cursor += 1;
    const queue = queues[key];
    if (queue?.length) tasks.push(queue.shift());
    if (cursor > 200) break;
  }
  for (const key of ["vocab", "grammar", "particle"]) {
    while (tasks.length < limitTotal && queues[key].length) tasks.push(queues[key].shift());
  }

  return {
    version: "mixed-v1",
    sessionId: sessionIdValue,
    createdAt: Date.now(),
    tasks,
    counts: {
      vocabulary: tasks.filter(task => task.kind === "vocab").length,
      grammar: tasks.filter(task => task.kind === "grammar").length,
      particles: tasks.filter(task => task.kind === "particle").length,
      total: tasks.length
    },
    snapshot: clone(bridgeState.lastSnapshot || buildQuickTrainingSnapshot(runtimeData()))
  };
}

async function evaluateLiveGrammar(payload = {}) {
  const api = liveGrammarApi();
  if (!api?.evaluateExternalAnswer) throw new Error("Kotoba's grammar review bridge is not ready yet.");
  return clone(api.evaluateExternalAnswer({
    pointId: String(payload.pointId || ""),
    skillId: String(payload.skillId || ""),
    answer: String(payload.answer || ""),
    question: payload.question && typeof payload.question === "object" ? clone(payload.question) : null
  }));
}

async function commitLiveGrammar(payload = {}) {
  const commandId = String(payload.commandId || "");
  if (!commandId) throw new Error("Grammar review commit is missing its command ID.");
  const api = liveGrammarApi();
  if (!api?.commitExternalReview) throw new Error("Kotoba's grammar review bridge is not ready yet.");
  if (processedCommand(commandId)) return { ok:true, committed:true, duplicate:true, commandId, snapshot:clone(bridgeState.lastSnapshot || buildQuickTrainingSnapshot(runtimeData())) };
  const result = api.commitExternalReview({
    pointId: String(payload.pointId || ""), skillId: String(payload.skillId || ""), grade: String(payload.grade || "bad"),
    expectedStage: payload.expectedStage == null ? null : Number(payload.expectedStage),
    expectedDueAt: payload.expectedDueAt == null ? null : Number(payload.expectedDueAt)
  });
  if (!result?.ok || !result?.committed) return clone(result);
  rememberCommand(commandId);
  const snapshot = adoptCurrentRuntimeWithoutEmission();
  queueEvent({
    origin:"life-rpg", type:"grammar-review", itemId:String(payload.pointId || ""), skill:String(payload.skillId || ""), result:String(result.grade || payload.grade || "good"),
    label:String(result.title || result.pattern || payload.pointId || "Grammar"), area:"grammar", sessionId:String(payload.sessionId || ""), timestamp:Date.now(),
    metadata:{ commandId, stageBefore:Number(result.stageBefore || 0), stageAfter:Number(result.stageAfter || 0), dueAt:result.dueAt == null ? null : Number(result.dueAt) }
  });
  return { ...clone(result), commandId, snapshot:clone(snapshot) };
}

async function evaluateLiveParticle(payload = {}) {
  const api = liveParticleApi();
  if (!api?.evaluateExternalAnswer) throw new Error("Kotoba's particle review bridge is not ready yet.");
  return clone(api.evaluateExternalAnswer({ pointId:String(payload.pointId || ""), skillId:String(payload.skillId || ""), answer:String(payload.answer || ""), task:payload.task ? clone(payload.task) : null }));
}

async function commitLiveParticle(payload = {}) {
  const commandId = String(payload.commandId || "");
  if (!commandId) throw new Error("Particle review commit is missing its command ID.");
  const api = liveParticleApi();
  if (!api?.commitExternalReview) throw new Error("Kotoba's particle review bridge is not ready yet.");
  if (processedCommand(commandId)) return { ok:true, committed:true, duplicate:true, commandId, snapshot:clone(bridgeState.lastSnapshot || buildQuickTrainingSnapshot(runtimeData())) };
  const result = api.commitExternalReview({
    pointId:String(payload.pointId || ""), skillId:String(payload.skillId || ""), correct:Boolean(payload.correct), entered:String(payload.entered || ""),
    expectedStage:payload.expectedStage == null ? null : Number(payload.expectedStage), expectedDueAt:payload.expectedDueAt == null ? null : Number(payload.expectedDueAt)
  });
  if (!result?.ok || !result?.committed) return clone(result);
  rememberCommand(commandId);
  const snapshot = adoptCurrentRuntimeWithoutEmission();
  queueEvent({
    origin:"life-rpg", type:"particle-review", itemId:String(payload.pointId || ""), skill:String(payload.skillId || ""), result:result.correct ? "good" : "bad",
    label:String(result.title || result.particle || payload.pointId || "Particle"), area:"particles", sessionId:String(payload.sessionId || ""), timestamp:Date.now(),
    metadata:{ commandId, stageBefore:Number(result.stageBefore || 0), stageAfter:Number(result.stageAfter || 0), dueAt:result.dueAt == null ? null : Number(result.dueAt), entered:String(result.entered || "") }
  });
  return { ...clone(result), commandId, snapshot:clone(snapshot) };
}

async function handleLiveRequest(action, payload = {}) {
  if (action === "ping") {
    const api = await waitForLiveReviewApi();
    const grammar = liveGrammarApi();
    const particles = liveParticleApi();
    return {
      ok: true,
      bridgeVersion: BRIDGE_VERSION,
      reviewApiVersion: String(api.version || ""),
      reviewWriteBackAvailable: true,
      reviewWriteBackKinds: { vocabulary:true, grammar:Boolean(grammar?.createExternalSession && grammar?.commitExternalReview), particles:Boolean(particles?.createExternalSession && particles?.commitExternalReview) },
      status: clone(api.getStatus?.() || {})
    };
  }
  if (action === "create-mixed-session") return createLiveMixedSession(payload);
  if (action === "create-vocabulary-session") return createLiveVocabularySession(payload);
  if (action === "evaluate-vocabulary") return evaluateLiveVocabulary(payload);
  if (action === "commit-vocabulary-item") return commitLiveVocabulary(payload);
  if (action === "evaluate-grammar") return evaluateLiveGrammar(payload);
  if (action === "commit-grammar-review") return commitLiveGrammar(payload);
  if (action === "evaluate-particle") return evaluateLiveParticle(payload);
  if (action === "commit-particle-review") return commitLiveParticle(payload);
  if (action === "refresh-snapshot") return clone((await scanProgress({ reason: "life-rpg", forceSnapshot: true })).snapshot);
  throw new Error(`Unsupported Kotoba live-bridge action: ${String(action || "")}`);
}

window.addEventListener("message", event => {
  const bridgeMode = new URLSearchParams(location.search).get("lifeRpgBridge") === "1";
  if (!bridgeMode || window.parent === window || event.source !== window.parent || event.origin !== location.origin) return;
  const message = event.data;
  if (!message || message.type !== LIVE_REQUEST_TYPE || !message.requestId) return;
  Promise.resolve(handleLiveRequest(String(message.action || ""), message.payload || {}))
    .then(result => event.source?.postMessage({
      type: LIVE_RESPONSE_TYPE,
      requestId: String(message.requestId),
      ok: true,
      result: clone(result)
    }, event.origin))
    .catch(error => event.source?.postMessage({
      type: LIVE_RESPONSE_TYPE,
      requestId: String(message.requestId),
      ok: false,
      error: String(error?.message || error || "Kotoba live bridge failed.").slice(0, 500)
    }, event.origin));
});

function publicStatus() {
  return {
    version: BRIDGE_VERSION,
    schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
    signedIn: Boolean(currentUser),
    online: navigator.onLine,
    pendingEvents: bridgeState.pendingEvents?.length || 0,
    recentEvents: bridgeState.recentEvents?.length || 0,
    processedCommands: bridgeState.processedCommandIds?.length || 0,
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
  createLiveVocabularySession,
  evaluateLiveVocabulary,
  commitLiveVocabulary,
  createLiveMixedSession,
  evaluateLiveGrammar,
  commitLiveGrammar,
  evaluateLiveParticle,
  commitLiveParticle,
  reviewWriteBackAvailable: true
};

installParentStorageTrigger();
appFrame?.addEventListener("load", attachIframeTriggers);
window.addEventListener("online", () => { scheduleScan(50, { reason: "online", forceSnapshot: true }); scheduleCloudSync(100); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleScan(120, { reason: "visible", forceSnapshot: true }); });

initializeFirebaseBridge().catch(error => console.warn("Kotoba Bridge Firebase initialization failed", error));
if (appFrame?.contentWindow) setTimeout(attachIframeTriggers, 250);
scheduleScan(500, { reason: "startup", forceSnapshot: true });
