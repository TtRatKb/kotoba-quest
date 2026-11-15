import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assessCompletion, hasActiveAttempt, localDay } from '../daily-completion.mjs';
import { buildGrammarPreview, buildRefresh } from '../daily-engine.mjs';
import { GUIDED_PATHS, buildGuidedQuest } from '../daily-guided.mjs';
import { buildDailyMix } from '../daily-mix.mjs';
import { recordDailyCompletion, streakSummary } from '../daily-streak.mjs';
import {isPlayTask} from '../daily-play.mjs';

const cards = [
  {id:'1',word:'行く',reading:'いく',meanings:['gehen'],example:'学校へ行く。',stage:2},
  {id:'2',word:'食べる',reading:'たべる',meanings:['essen'],example:'ご飯を食べる。',stage:3},
  {id:'3',word:'見る',reading:'みる',meanings:['sehen'],example:'映画を見る。',stage:5}
];
const attempts = session => session.tasks.map(task => task.kind === 'lesson'
  ? {taskId:task.id, acknowledged:true, correct:null}
  : {taskId:task.id, response: task.options?.[0] || (task.kind === 'meaning-type' ? 'gehen' : task.example || task.reading || '日本語'), activityResponse:isPlayTask(task)?task.options?.[0] || task.pairs?.map(p=>p.id) || task.accepted[0]:undefined, correct:null});

test('all existing modes and both variants qualify by participation, without a minimum score', () => {
  const sessions = [buildGrammarPreview(), buildRefresh(cards, '2026-11-14')];
  for (const path of GUIDED_PATHS) {
    const save = {[path.section]: {points:Object.fromEntries(path.prerequisites.map(id => [id,{lessonComplete:true}]))}};
    for (const day of ['2026-11-14','2026-11-15']) {
      sessions.push(buildGuidedQuest(save, day, path.id), buildDailyMix(cards, save, day));
    }
  }
  for (const session of sessions) {
    const before = JSON.stringify(session);
    const answers = attempts(session);
    assert.deepEqual(assessCompletion(session, answers), {qualified:true, reason:'active-practice'});
    assert.equal(JSON.stringify(session), before);
    assert(answers.every(a => a.correct === null), 'grading is not an eligibility criterion');
  }
});

test('an incomplete, aborted, duplicated or mismatched answer record cannot award a day', () => {
  const session = buildGrammarPreview();
  const answers = attempts(session);
  for (const records of [[], answers.slice(0,-1), [...answers,answers[0]], [answers[0],answers[1],answers[1],answers[3]], [...answers.slice(0,-1),{taskId:'other',response:'日本語'}]]) {
    assert.equal(assessCompletion(session,records).qualified,false);
  }
  assert.equal(assessCompletion(session,[{...answers[0],acknowledged:false},...answers.slice(1)]).qualified,false);
});

test('looking at a model, whitespace, punctuation or a non-Japanese transfer is not active production', () => {
  const session = buildGrammarPreview();
  const answers = attempts(session);
  for (const response of ['', '   ', '\u3000', '。！？', 'I just viewed the answer']) {
    assert.equal(assessCompletion(session,[...answers.slice(0,-1),{...answers.at(-1),response}]).qualified,false);
  }
  assert.equal(assessCompletion(session,[...answers.slice(0,-1),{...answers.at(-1),skipped:true}]).qualified,false);
  assert.equal(hasActiveAttempt({kind:'open'},'鍵を忘れました。'),true);
  assert.equal(hasActiveAttempt({kind:'production'},' いく '),true);
  assert.equal(hasActiveAttempt({kind:'choice',options:['に','で']},'が'),false);
});

test('invalid/too short sessions never qualify and input records remain unchanged', () => {
  const session=buildGrammarPreview(), answers=attempts(session);
  const before=JSON.stringify({session,answers});
  for(const bad of [null,{}, {...session,blocked:true}, {...session,mode:'unknown'}, {...session,tasks:session.tasks.slice(0,2)}, {...session,tasks:[...session.tasks,session.tasks[0]]}]) {
    assert.equal(assessCompletion(bad,answers).qualified,false);
  }
  assert.equal(JSON.stringify({session,answers}),before);
});

test('local calendar days use completion-time timezone, including Berlin midnight and DST', () => {
  assert.equal(localDay(new Date('invalid')),null);
  const url = new URL('../daily-completion.mjs', import.meta.url).href;
  const script = `import {localDay} from ${JSON.stringify(url)};
    console.log(JSON.stringify(['2026-11-14T22:59:59Z','2026-11-14T23:00:00Z','2026-03-28T23:30:00Z','2026-03-29T01:30:00Z','2026-10-24T22:30:00Z','2026-10-25T02:30:00Z'].map(d=>localDay(new Date(d)))));`;
  const days=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ:'Europe/Berlin'},encoding:'utf8'}));
  assert.deepEqual(days,['2026-11-14','2026-11-15','2026-03-29','2026-03-29','2026-10-25','2026-10-25']);
  const first=recordDailyCompletion([],days[0]);
  assert.deepEqual(recordDailyCompletion(first,days[0]),first);
  assert.equal(streakSummary(recordDailyCompletion(first,days[1]),days[1]).current,2);
});

test('completion module never introduces persistence, networking or canonical progress writes', () => {
  const code=readFileSync(new URL('../daily-completion.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(code,/\b(?:localStorage|sessionStorage|indexedDB|fetch|postMessage|setDoc|updateDoc|addDoc|writeBridgeState)\b/);
});
