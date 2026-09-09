import {
  KOTOBA_BRIDGE_MAX_QUEUE,
  KOTOBA_BRIDGE_MAX_RECENT,
  KOTOBA_BRIDGE_SCHEMA_VERSION,
  KOTOBA_BRIDGE_STORAGE_KEY,
  clone,
  objectValue
} from "./kotoba-sync-model.js";

function randomId() {
  try { return crypto.randomUUID(); }
  catch {
    const random = Math.random().toString(36).slice(2);
    return `${Date.now().toString(36)}-${random}`;
  }
}

export function emptyBridgeState() {
  return {
    schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
    installedAt: Date.now(),
    updatedAt: Date.now(),
    pendingEvents: [],
    recentEvents: [],
    seenAnalytics: [],
    processedCommandIds: [],
    checkpoint: null,
    lastSnapshot: null,
    cloud: {
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: "",
      lastSnapshotAt: null
    }
  };
}

export function readBridgeState(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(KOTOBA_BRIDGE_STORAGE_KEY) || "null");
    const base = emptyBridgeState();
    if (!parsed || typeof parsed !== "object") return base;
    return {
      ...base,
      ...parsed,
      schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
      pendingEvents: Array.isArray(parsed.pendingEvents) ? parsed.pendingEvents.slice(-KOTOBA_BRIDGE_MAX_QUEUE) : [],
      recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents.slice(-KOTOBA_BRIDGE_MAX_RECENT) : [],
      seenAnalytics: Array.isArray(parsed.seenAnalytics) ? parsed.seenAnalytics.slice(-600) : [],
      processedCommandIds: Array.isArray(parsed.processedCommandIds) ? parsed.processedCommandIds.map(String).slice(-600) : [],
      cloud: { ...base.cloud, ...objectValue(parsed.cloud) }
    };
  } catch {
    return emptyBridgeState();
  }
}

export function writeBridgeState(state, storage = localStorage) {
  const safe = {
    ...emptyBridgeState(),
    ...state,
    schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
    updatedAt: Date.now(),
    pendingEvents: (Array.isArray(state?.pendingEvents) ? state.pendingEvents : []).slice(-KOTOBA_BRIDGE_MAX_QUEUE),
    recentEvents: (Array.isArray(state?.recentEvents) ? state.recentEvents : []).slice(-KOTOBA_BRIDGE_MAX_RECENT),
    seenAnalytics: (Array.isArray(state?.seenAnalytics) ? state.seenAnalytics : []).slice(-600),
    processedCommandIds: (Array.isArray(state?.processedCommandIds) ? state.processedCommandIds : []).map(String).slice(-600)
  };
  storage.setItem(KOTOBA_BRIDGE_STORAGE_KEY, JSON.stringify(safe));
  return safe;
}

export function createActivityEvent({
  origin = "kotoba",
  type,
  itemId = "",
  skill = "",
  result = "",
  label = "",
  area = "",
  timestamp = Date.now(),
  sessionId = "",
  metadata = {}
} = {}) {
  const at = Number(timestamp) || Date.now();
  return {
    schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
    eventId: `kq-${randomId()}`,
    origin: String(origin || "kotoba"),
    type: String(type || "activity"),
    itemId: String(itemId || ""),
    skill: String(skill || ""),
    result: String(result || ""),
    label: String(label || ""),
    area: String(area || ""),
    timestamp: at,
    sessionId: String(sessionId || ""),
    metadata: clone(objectValue(metadata)),
    createdAt: Date.now()
  };
}

export function enqueueEvent(state, event) {
  if (!event?.eventId) return state;
  const pendingIds = new Set((state.pendingEvents || []).map(item => item?.eventId));
  const recentIds = new Set((state.recentEvents || []).map(item => item?.eventId));
  if (pendingIds.has(event.eventId) || recentIds.has(event.eventId)) return state;
  state.pendingEvents = [...(state.pendingEvents || []), event].slice(-KOTOBA_BRIDGE_MAX_QUEUE);
  state.recentEvents = [...(state.recentEvents || []), event].slice(-KOTOBA_BRIDGE_MAX_RECENT);
  return state;
}

export function markEventsSynced(state, eventIds = []) {
  const synced = new Set(eventIds.map(String));
  state.pendingEvents = (state.pendingEvents || []).filter(event => !synced.has(String(event?.eventId || "")));
  state.cloud = { ...objectValue(state.cloud), lastSuccessAt: Date.now(), lastError: "" };
  return state;
}

export function markCloudError(state, error) {
  state.cloud = {
    ...objectValue(state.cloud),
    lastErrorAt: Date.now(),
    lastError: String(error?.message || error || "Unknown sync error").slice(0, 300)
  };
  return state;
}
