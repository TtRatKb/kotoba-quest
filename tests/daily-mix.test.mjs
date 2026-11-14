import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDailyMix } from '../daily-mix.mjs';
import { isCorrect } from '../daily-engine.mjs';

const cards = [
  {id:'a',word:'行く',reading:'いく',meanings:['gehen'],stage:1,example:'学校へ行く。'},
  {id:'b',word:'食べる',reading:'たべる',meanings:['essen'],stage:3,example:'ご飯を食べる。'},
  {id:'c',word:'見る',reading:'みる',meanings:['sehen'],stage:5,example:'映画を見る。'},
  {id:'d',word:'飲む',reading:'のむ',meanings:['trinken'],stage:2,example:'水を飲む。'},
  {id:'e',word:'聞く',reading:'きく',meanings:['hören'],stage:4,example:'音楽を聞く。'},
  {id:'f',word:'書く',reading:'かく',meanings:['schreiben'],stage:7,example:'手紙を書く。'},
  {id:'g',word:'読む',reading:'よむ',meanings:['lesen'],stage:8,example:'本を読む。'},
  {id:'h',word:'話す',reading:'はなす',meanings:['sprechen'],stage:6,example:'日本語を話す。'}
];
const complete = (...ids) => Object.fromEntries(ids.map(id=>[id,{
  lessonComplete:true,skills:{meaning:{stage:2,dueAt:1000}}
}]));

test('a meaningful daily quest combines known vocabulary, one licensed learning goal and open transfer',()=>{
  const save={
    particlePath:{points:complete('ni-target','de-action')},
    vocabulary:[{id:'untouched',stage:7,availableAt:3000}],
    kanjiPilot:{kanji:[{id:'日',stage:4}]}
  };
  const before=JSON.stringify({cards,save});
  const session=buildDailyMix(cards,save,'2026-11-14',2000);
  assert.equal(session.mode,'daily');
  assert.equal(session.readOnly,true);
  assert.equal(session.blocked,false);
  assert.equal(session.tasks.length,8);
  assert.equal(session.growthType,'learned');
  assert.equal(session.growthPathId,'particle-ni-de');
  assert.equal(session.vocabularyCount,4);
  assert.deepEqual(session.tasks.slice(0,3).map(t=>t.group),['vocab','vocab','growth']);
  assert.equal(session.tasks[2].kind,'lesson');
  assert.equal(session.tasks.at(-1).kind,'open');
  assert.equal(session.tasks.filter(t=>t.group==='vocab').length,4);
  assert.equal(session.tasks.filter(t=>t.group==='growth').length,4);
  assert(session.tasks.some(t=>t.kind==='production'));
  assert(session.tasks.some(t=>t.kind==='context'));
  assert.equal(new Set(session.tasks.map(t=>t.id)).size,session.tasks.length);
  assert.equal(JSON.stringify({cards,save}),before);
});

test('without proven completed grammar or particle lessons Daily explicitly gives a sample, not an invented unlock',()=>{
  const save={grammar:{points:{'you-ni-naru':{skills:{form:{stage:8}}}}},particlePath:{stats:{lessons:32}}};
  const session=buildDailyMix(cards,save,'2026-11-14',2000);
  assert.equal(session.growthType,'sample');
  assert.equal(session.growthPathId,null);
  assert.equal(session.growthTitle,'〜てしまう entdecken');
  assert.equal(session.tasks.length,8);
  assert.equal(session.tasks.at(-1).kind,'open');
  assert(session.tasks.some(t=>t.prompt==='〜てしまう'));
});

test('single completed grammar prerequisite produces a 3-step personalized path and five vocabulary tasks',()=>{
  const save={grammar:{points:complete('you-ni-naru')}};
  const session=buildDailyMix(cards,save,'2026-11-14',2000);
  assert.equal(session.growthType,'learned');
  assert.equal(session.growthPathId,'grammar-you-ni-naru');
  assert.equal(session.vocabularyCount,5);
  assert.equal(session.tasks.length,8);
  assert.equal(session.tasks.at(-1).kind,'open');
});

test('requires previously learned vocabulary; never falls back to new SRS cards',()=>{
  for (const few of [[],cards.slice(0,2),[{...cards[0],stage:0}]]) {
    const session=buildDailyMix(few,{},'2026-11-14',2000);
    assert.equal(session.blocked,true);
    assert.equal(session.tasks.length,0);
    assert.equal(session.reason,'not-enough-learned-vocabulary');
  }
});

test('same day and save produce identical mix; different days do not require persistent records',()=>{
  const save={particlePath:{points:complete('wa-topic','ga-subject')}};
  const first=buildDailyMix(cards,save,'2026-11-14',2000);
  assert.deepEqual(first,buildDailyMix(cards,save,'2026-11-14',2000));
  const changed=buildDailyMix(cards,save,'2026-11-15',2000);
  assert.equal(changed.tasks.length,8);
  assert.deepEqual(changed.tasks.map(t=>t.kind),first.tasks.map(t=>t.kind));
});

test('choice answers are unambiguous; open production is never automatically awarded',()=>{
  const quest=buildDailyMix(cards,{particlePath:{points:complete('ni-target','de-action')}},'2026-11-14',2000);
  for(const task of quest.tasks.filter(t=>t.kind==='choice')){
    assert(task.options.includes(task.correct));
    assert.equal(isCorrect(task,task.correct),true);
    for(const wrong of task.options.filter(answer=>answer!==task.correct)){
      assert.equal(isCorrect(task,wrong),false);
    }
  }
  assert.equal(isCorrect(quest.tasks.at(-1),quest.tasks.at(-1).example),null);
});

test('daily mixed route contains no local or remote write path',()=>{
  const module=readFileSync(new URL('../daily-mix.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../daily.js',import.meta.url),'utf8');
  assert.doesNotMatch(module,/\b(?:localStorage|sessionStorage|indexedDB|fetch|postMessage|setDoc|updateDoc|addDoc|removeItem|setItem|commit-vocabulary-item)\b/);
  assert.match(ui,/data-start="daily"/);
  assert.match(ui,/buildDailyMix\(state\.source\?\.learned/);
  assert.doesNotMatch(ui,/\b(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|clear)\s*\(/);
});
