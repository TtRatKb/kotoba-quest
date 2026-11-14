/* One optional, bounded follow-up to the current quest. No progress writes. */
const modes = new Set(['daily', 'refresh', 'guided', 'discovery']);
const typed = new Set(['production', 'meaning-type', 'cloze']);

export function buildPractice(session, answers) {
  if (!modes.has(session?.mode) || session.blocked || !Array.isArray(session.tasks) || !Array.isArray(answers)) return null;
  const tasks = session.tasks;
  if (!tasks.length || tasks.some(task => !task || typeof task.id !== 'string') || new Set(tasks.map(task => task.id)).size !== tasks.length) return null;
  const byId = new Map(answers.map(answer => [answer?.taskId, answer]));
  if (answers.length !== tasks.length || byId.size !== tasks.length || tasks.some(task => !byId.has(task.id))) return null;
  const wrong = [], uncertain = [];
  for (const task of tasks) {
    if (task.kind === 'lesson' || task.kind === 'open') continue;
    const answer = byId.get(task.id);
    if (answer.skipped || typeof answer.response !== 'string' || !answer.response.trim()) continue;
    if (Array.isArray(task.options) && task.options.includes(answer.response) && answer.correct === false) wrong.push(task);
    else if (typed.has(task.kind) && !task.options && answer.correct === null) uncertain.push(task);
  }
  const selected = [], seen = new Set();
  for (const task of [...wrong, ...uncertain]) {
    const identity = JSON.stringify([task.kind, task.prompt, task.secondary]);
    if (seen.has(identity)) continue;
    seen.add(identity);
    selected.push({ ...task, options: task.options ? [...task.options] : undefined,
      accepted: task.accepted ? [...task.accepted] : undefined });
    if (selected.length === 3) break;
  }
  return selected.length ? { mode: 'practice', title: 'Einmal gezielt nachüben', tasks: selected, readOnly: true } : null;
}
