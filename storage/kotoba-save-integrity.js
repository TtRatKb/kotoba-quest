// Pure save-integrity check. It must not mutate either save or infer missing SRS records.
// A deliberate placement migration/reset requires its own explicit, backed-up workflow.
export function kanjiLossReason(beforeValue, afterValue) {
  const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const decode = value => {
    if (typeof value !== "string") return asObject(value);
    try { return asObject(JSON.parse(value)); } catch { return {}; }
  };
  const before = asObject(decode(beforeValue).kanjiPilot);
  const after = asObject(decode(afterValue).kanjiPilot);
  const beforeResults = asObject(before.placementResults);
  const beforeKanji = asObject(before.kanji);
  const beforeComponents = asObject(before.components);
  const progressed = Boolean(
    before.placementComplete ||
    Number(before.placementIndex || 0) > 0 ||
    Object.keys(beforeResults).length ||
    Object.values(beforeKanji).some(item => Number(item?.stage || 0) > 0 || item?.placement) ||
    Object.values(beforeComponents).some(item => Number(item?.stage || 0) > 0)
  );
  if (!progressed) return null;
  if (!Object.keys(after).length) return "Der neue Spielstand enthält keinen Kanji-Pilot-Zustand.";
  if (before.placementComplete && !after.placementComplete) return "Ein abgeschlossener Kanji-Standorttest würde zurückgesetzt.";
  if (Number(after.placementIndex || 0) < Number(before.placementIndex || 0)) return "Der Kanji-Standorttest würde zurückspringen.";
  for (const field of ["placementResults", "kanji", "components"]) {
    const previousItems = asObject(before[field]);
    const currentItems = asObject(after[field]);
    for (const id of Object.keys(previousItems)) {
      if (!Object.prototype.hasOwnProperty.call(currentItems, id))
        return "Kanji-Fortschrittseintrag aus " + field + " würde verschwinden.";
      if (field !== "placementResults" &&
          Number(previousItems[id]?.stage || 0) > 0 &&
          Number(currentItems[id]?.stage || 0) === 0)
        return "Gelernter " + field + "-Eintrag würde auf Stufe 0 zurückfallen.";
    }
  }
  return null;
}
