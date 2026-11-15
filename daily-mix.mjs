/* Kotoba Daily – one short, read-only learning route.
 * Builds on the existing vocabulary and guided-quest engines.
 * Never reads or mutates persistence itself.
 */
import { buildRefresh, buildGrammarPreview } from './daily-engine.mjs';
import { buildGuidedQuest } from './daily-guided.mjs';
import { buildPlaySession } from './daily-play.mjs';

const seconds = {lesson:35, open:55, production:25, 'meaning-type':20, meaning:12, context:15, cloze:25, choice:15, 'image-choice':12, 'image-matching':30, 'sentence-tiles':35};
const timing = tasks => {
  const total = tasks.reduce((sum, task) => sum + (seconds[task.kind] || 20), 0);
  return {estimatedMinutes:[Math.max(1,Math.floor(total/60)), Math.max(2,Math.ceil(total/60)+1)]};
};
const signature = task => JSON.stringify([task.kind,task.target?.id || task.prompt || task.cue || task.pairs?.map(p=>p.id).sort()]);

const copyTask = (task, group) => ({
  ...task,
  id: 'mix-' + group + '-' + task.id,
  options: Array.isArray(task.options) ? [...task.options] : undefined,
  group
});

/**
 * A bounded daily session: active word recall, one complete learning goal,
 * eligible visual applications between tasks, and a final open transfer.
 * Personal growth is permitted only by recorded lessonComplete prerequisites.
 * If none qualify, the clearly labelled 〜てしまう sample is used.
 */
export function buildDailyMix(cards = [], save = {}, day = 'preview', now = Date.now(), {length='normal'} = {}) {
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
  const short = length === 'short';
  const play = buildPlaySession(cards,save,day).tasks;
  // One of each type, never demo vocabulary in a personal Daily quest.
  const visual = ['image-choice','image-matching','sentence-tiles']
    .map(kind=>play.find(task=>task.kind===kind)).filter(Boolean).slice(0,short?1:3);
  const vocabularyCount = (short?6:8) - growthTasks.length - visual.length;
  // Keep active recall even when pictures replace most vocabulary slots.
  const selectedVocabulary = visual.length || short
    ? [...refresh.tasks.filter(t=>t.kind==='production'||t.kind==='cloze'), ...refresh.tasks.filter(t=>t.kind!=='production'&&t.kind!=='cloze')]
    : refresh.tasks;
  const vocabulary = selectedVocabulary.slice(0, vocabularyCount).map(task => copyTask(task, 'vocab'));
  const lesson = growthTasks.map(task => copyTask(task, 'growth'));

  const steps = vocabulary.splice(0, visual.length || short ? 1 : 2);
  steps.push(lesson[0]);
  const guidedPractice = lesson.slice(1, -1);
  const playful = visual.map(task=>copyTask(task,'play'));
  // A little practice in context, not a random wall of one task type.
  while (guidedPractice.length || vocabulary.length || playful.length) {
    if (playful.length) steps.push(playful.shift());
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
    length:short?'short':'normal',
    ...timing(steps),
    eligibleCount: refresh.eligibleCount,
    tasks: steps,
    blocked: false,
    readOnly: true
  };
}

/** One voluntary continuation; never a new day or official review. */
export function buildDailyExtension(session, cards=[], save={}, day='preview') {
  if(session?.mode!=='daily'||session.blocked)return null;
  const used=new Set(session.tasks.map(signature));
  const play=buildPlaySession(cards,save,day+'-extra').tasks;
  const vocabulary=buildRefresh(cards,day+'-extra').tasks;
  const candidates=[play.find(t=>t.kind==='sentence-tiles'), vocabulary?.find(t=>t.kind==='production'), ...play, ...(vocabulary||[])].filter(Boolean);
  const tasks=[];
  for(const task of candidates){
    const key=signature(task);
    if(used.has(key)||tasks.at(-1)?.kind===task.kind)continue;
    used.add(key);tasks.push(copyTask(task,'extra'));
    if(tasks.length===3)break;
  }
  return tasks.length?{mode:'extension',tasks,readOnly:true,trainingOnly:true,...timing(tasks)}:null;
}
