/* Kotoba Daily – one short, read-only learning route.
 * Builds on the existing vocabulary and guided-quest engines.
 * Never reads or mutates persistence itself.
 */
import { buildRefresh, buildGrammarPreview } from './daily-engine.mjs';
import { buildGuidedQuest } from './daily-guided.mjs';

const copyTask = (task, group) => ({
  ...task,
  id: 'mix-' + group + '-' + task.id,
  options: Array.isArray(task.options) ? [...task.options] : undefined,
  group
});

/**
 * A meaningful daily session: two vocabulary warm-ups, one explanation,
 * alternating application/vocabulary, and a final open transfer sentence.
 * Personal growth is permitted only by recorded lessonComplete prerequisites.
 * If none qualify, the clearly labelled 〜てしまう sample is used.
 */
export function buildDailyMix(cards = [], save = {}, day = 'preview', now = Date.now()) {
  const refresh = buildRefresh(cards, day);
  if (refresh.blocked || refresh.tasks.length === 0) {
    return {
      mode: 'daily', tasks: [], blocked: true,
      reason: 'not-enough-learned-vocabulary',
      eligibleCount: refresh.eligibleCount,
      readOnly: true
    };
  }

  const guided = buildGuidedQuest(save, day, null, now);
  const growth = guided || buildGrammarPreview();
  const isPersonalized = Boolean(guided);
  const growthTasks = growth.tasks;
  const last = growthTasks[growthTasks.length - 1];

  // Keep the complete short lesson; always reserve the final step for transfer.
  if (!growthTasks.length || growthTasks[0].kind !== 'lesson' || last.kind !== 'open') {
    return {
      mode: 'daily', tasks: [], blocked: true,
      reason: 'invalid-growth-lesson',
      eligibleCount: refresh.eligibleCount,
      readOnly: true
    };
  }
  const vocabularyCount = Math.max(3, Math.min(5, 8 - growthTasks.length));
  const vocabulary = refresh.tasks.slice(0, vocabularyCount).map(task => copyTask(task, 'vocab'));
  const lesson = growthTasks.map(task => copyTask(task, 'growth'));

  const steps = vocabulary.splice(0, 2);
  steps.push(lesson[0]);
  const guidedPractice = lesson.slice(1, -1);
  // A little practice in context, not a random wall of one task type.
  while (guidedPractice.length || vocabulary.length) {
    if (guidedPractice.length) steps.push(guidedPractice.shift());
    if (vocabulary.length) steps.push(vocabulary.shift());
  }
  steps.push(lesson[lesson.length - 1]);

  return {
    mode: 'daily',
    title: 'Dein Daily Mix',
    growthTitle: isPersonalized ? guided.title : '〜てしまう entdecken',
    growthType: isPersonalized ? 'learned' : 'sample',
    growthPathId: isPersonalized ? guided.id : null,
    growthReason: isPersonalized ? guided.reason : 'Neue Grammatik als freiwillige Probelektion',
    vocabularyCount,
    eligibleCount: refresh.eligibleCount,
    tasks: steps,
    blocked: false,
    readOnly: true
  };
}
