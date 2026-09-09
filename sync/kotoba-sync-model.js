export const KOTOBA_BRIDGE_SCHEMA_VERSION = 1;
export const KOTOBA_BRIDGE_STORAGE_KEY = "kotobaQuestBridgeV1";
export const KOTOBA_PROGRESS_STORAGE_KEY = "kotobaQuestDataV3";
export const KOTOBA_BRIDGE_MAX_QUEUE = 500;
export const KOTOBA_BRIDGE_MAX_RECENT = 250;
export const KOTOBA_QUICK_ITEM_LIMIT = 40;

export function clone(value) {
  try { return structuredClone(value); }
  catch {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return value; }
  }
}

export function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function timestamp(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeSourceType(value) {
  return String(value || "").toLowerCase() === "mining" ? "mining" : "core";
}

export function vocabularyId(item) {
  return String(item?.id || item?.packEntryId || `${item?.word || ""}|${item?.reading || ""}`);
}

export function readProgress(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return objectValue(raw);
  try { return objectValue(JSON.parse(String(raw))); }
  catch { return {}; }
}

export function isDue(stage, dueAt, now = Date.now()) {
  const normalizedStage = number(stage);
  const normalizedDueAt = number(dueAt, NaN);
  return normalizedStage > 0 && normalizedStage < 9 && Number.isFinite(normalizedDueAt) && normalizedDueAt <= now;
}

function compactVocabularyItem(item) {
  return {
    itemId: vocabularyId(item),
    source: normalizeSourceType(item?.sourceType),
    word: String(item?.word || ""),
    reading: String(item?.reading || ""),
    meaning: String(item?.meaning || item?.translation || item?.primaryMeaning || ""),
    stage: number(item?.stage),
    dueAt: timestamp(item?.availableAt)
  };
}

function compactSkill(point, skill, source) {
  return {
    itemId: String(point?.id || ""),
    skillId: String(skill?.id || ""),
    source,
    label: String(skill?.label || skill?.id || ""),
    title: String(point?.title || point?.pattern || point?.particle || point?.id || ""),
    pattern: String(point?.pattern || point?.particle || ""),
    stage: number(skill?.stage),
    dueAt: timestamp(skill?.dueAt)
  };
}

export function buildQuickTrainingSnapshot({ rawProgress, grammarProgress = [], particleProgress = [], now = Date.now() } = {}) {
  const progress = readProgress(rawProgress);
  const vocabulary = Array.isArray(progress.vocabulary) ? progress.vocabulary : [];
  const coreAll = vocabulary.filter(item => normalizeSourceType(item?.sourceType) === "core" && isDue(item?.stage, item?.availableAt, now));
  const miningAll = vocabulary.filter(item => normalizeSourceType(item?.sourceType) === "mining" && isDue(item?.stage, item?.availableAt, now));

  const grammarAll = [];
  for (const point of Array.isArray(grammarProgress) ? grammarProgress : []) {
    if (!point?.lessonComplete) continue;
    for (const skill of Array.isArray(point?.skills) ? point.skills : []) {
      if (isDue(skill?.stage, skill?.dueAt, now)) grammarAll.push(compactSkill(point, skill, "grammar"));
    }
  }

  const particleAll = [];
  for (const point of Array.isArray(particleProgress) ? particleProgress : []) {
    if (!point?.lessonComplete) continue;
    for (const skill of Array.isArray(point?.skills) ? point.skills : []) {
      if (isDue(skill?.stage, skill?.dueAt, now)) particleAll.push(compactSkill(point, skill, "particle"));
    }
  }

  const byDue = (left, right) => number(left?.dueAt, Number.MAX_SAFE_INTEGER) - number(right?.dueAt, Number.MAX_SAFE_INTEGER);
  const core = coreAll.map(compactVocabularyItem).sort(byDue).slice(0, KOTOBA_QUICK_ITEM_LIMIT);
  const mining = miningAll.map(compactVocabularyItem).sort(byDue).slice(0, KOTOBA_QUICK_ITEM_LIMIT);
  grammarAll.sort(byDue);
  particleAll.sort(byDue);

  const allDueTimes = [
    ...coreAll.map(item => timestamp(item?.availableAt)),
    ...miningAll.map(item => timestamp(item?.availableAt)),
    ...grammarAll.map(item => timestamp(item?.dueAt)),
    ...particleAll.map(item => timestamp(item?.dueAt))
  ].filter(Boolean);

  return {
    schemaVersion: KOTOBA_BRIDGE_SCHEMA_VERSION,
    source: "kotoba",
    generatedAt: now,
    counts: {
      vocabularyCore: coreAll.length,
      vocabularyMining: miningAll.length,
      grammar: grammarAll.length,
      particles: particleAll.length,
      total: coreAll.length + miningAll.length + grammarAll.length + particleAll.length
    },
    nextDueAt: allDueTimes.length ? Math.min(...allDueTimes) : null,
    queues: {
      vocabularyCore: core,
      vocabularyMining: mining,
      grammar: grammarAll.slice(0, KOTOBA_QUICK_ITEM_LIMIT),
      particles: particleAll.slice(0, KOTOBA_QUICK_ITEM_LIMIT)
    }
  };
}

export function compactRuntimeCheckpoint({ rawProgress, grammarProgress = [], particleProgress = [] } = {}) {
  const progress = readProgress(rawProgress);
  const grammar = {};
  for (const point of Array.isArray(grammarProgress) ? grammarProgress : []) {
    grammar[String(point?.id || "")] = {
      lessonComplete: Boolean(point?.lessonComplete),
      lessonCompletedAt: timestamp(point?.lessonCompletedAt),
      title: String(point?.title || point?.pattern || point?.id || ""),
      skills: Object.fromEntries((Array.isArray(point?.skills) ? point.skills : []).map(skill => [String(skill?.id || ""), {
        label: String(skill?.label || skill?.id || ""),
        stage: number(skill?.stage),
        dueAt: timestamp(skill?.dueAt),
        correct: Math.max(0, number(skill?.correct)),
        incorrect: Math.max(0, number(skill?.incorrect)),
        lastReviewedAt: timestamp(skill?.lastReviewedAt)
      }]))
    };
  }

  const particles = {};
  for (const point of Array.isArray(particleProgress) ? particleProgress : []) {
    particles[String(point?.id || "")] = {
      lessonComplete: Boolean(point?.lessonComplete),
      title: String(point?.title || point?.particle || point?.id || ""),
      particle: String(point?.particle || ""),
      skills: Object.fromEntries((Array.isArray(point?.skills) ? point.skills : []).map(skill => [String(skill?.id || ""), {
        stage: number(skill?.stage),
        dueAt: timestamp(skill?.dueAt),
        correct: Math.max(0, number(skill?.correct)),
        incorrect: Math.max(0, number(skill?.incorrect)),
        lastReviewedAt: timestamp(skill?.lastReviewedAt)
      }]))
    };
  }

  const analyticsEvents = Array.isArray(progress?.studyAnalytics?.events)
    ? progress.studyAnalytics.events.slice(-500).map(event => ({
        at: timestamp(event?.at),
        type: String(event?.type || ""),
        id: String(event?.id || ""),
        label: String(event?.label || ""),
        area: String(event?.area || ""),
        skill: String(event?.skill || ""),
        status: String(event?.status || ""),
        correct: Math.max(0, number(event?.correct)),
        incorrect: Math.max(0, number(event?.incorrect)),
        migrated: Boolean(event?.migrated)
      }))
    : [];

  return { grammar, particles, analyticsEvents };
}

export function analyticsFingerprint(event) {
  return [
    timestamp(event?.at) || 0,
    String(event?.type || ""),
    String(event?.id || ""),
    String(event?.area || ""),
    String(event?.skill || ""),
    String(event?.status || ""),
    Math.max(0, number(event?.correct)),
    Math.max(0, number(event?.incorrect)),
    event?.migrated ? 1 : 0
  ].join("|");
}

export function inferSkillGrade(previous = {}, next = {}) {
  if (number(next.correct) > number(previous.correct)) return "good";
  if (number(next.incorrect) > number(previous.incorrect)) return "bad";
  if (timestamp(next.lastReviewedAt) && timestamp(next.lastReviewedAt) !== timestamp(previous.lastReviewedAt)) return "close";
  return null;
}
