/* Evidence for a Daily activity, independent of persistence and SRS. */
const modes = new Set(['daily', 'refresh', 'guided', 'discovery']);
const kinds = new Set(['lesson', 'meaning', 'context', 'choice', 'production', 'meaning-type', 'cloze', 'open']);

export function localDay(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// This establishes participation, never grammatical correctness or mastery.
export function hasActiveAttempt(task, response) {
  if (typeof response !== 'string') return false;
  const text = response.normalize('NFKC').trim();
  if (!text || !/[\p{L}\p{N}]/u.test(text)) return false;
  if (Array.isArray(task?.options)) return task.options.includes(response);
  if (['production', 'cloze', 'open'].includes(task?.kind)) {
    return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text);
  }
  return task?.kind === 'meaning-type';
}

/** Called only when the UI reaches the end, never when showing an answer. */
export function assessCompletion(session, answers) {
  const tasks = session?.tasks;
  const failed = reason => ({ qualified: false, reason });
  if (!modes.has(session?.mode) || session.blocked || !Array.isArray(tasks) || tasks.length < 3 || tasks.length > 8) return failed('invalid-session');
  if (tasks.some(task => !task || typeof task.id !== 'string' || !task.id || !kinds.has(task.kind)) || new Set(tasks.map(task => task.id)).size !== tasks.length) return failed('invalid-session');
  if (!Array.isArray(answers) || answers.length !== tasks.length) return failed('incomplete');
  const byId = new Map(answers.map(answer => [answer?.taskId, answer]));
  if (byId.size !== tasks.length || tasks.some(task => !byId.has(task.id))) return failed('incomplete');
  let active = 0;
  for (const task of tasks) {
    const answer = byId.get(task.id);
    if (task.kind === 'lesson') {
      if (answer.acknowledged !== true) return failed('incomplete');
    } else {
      if (answer.skipped || !hasActiveAttempt(task, answer.response)) return failed('viewed-only');
      active++;
    }
  }
  // A complete three-step Guided lesson includes explanation, application and
  // original transfer. Longer sessions retain every generator-provided task.
  return active >= 2 ? { qualified: true, reason: 'active-practice' } : failed('too-short');
}
