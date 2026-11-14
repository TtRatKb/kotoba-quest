import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRefresh, contextCloze, isCorrect } from '../daily-engine.mjs';

const cards=[
  {id:'a',word:'行く',reading:'いく',meanings:['gehen'],stage:2,example:'学校へ行く。',exampleTranslation:'Zur Schule gehen.'},
  {id:'b',word:'食べる',reading:'たべる',meanings:['essen'],stage:3,example:'ご飯を食べる。'},
  {id:'c',word:'見る',reading:'みる',meanings:['sehen'],stage:5,example:'映画を見る。'},
  {id:'d',word:'飲む',reading:'のむ',meanings:['trinken'],stage:6,example:'水を飲む。'},
  {id:'e',word:'読む',reading:'よむ',meanings:['lesen'],stage:7,example:'本を読む。'},
  {id:'f',word:'書く',reading:'かく',meanings:['schreiben'],stage:4,example:'手紙を書く。'},
  {id:'g',word:'聞く',reading:'きく',meanings:['hören'],stage:8,example:'音楽を聞く。'},
  {id:'h',word:'話す',reading:'はなす',meanings:['sprechen'],stage:1,example:'日本語を話す。'}
];

test('only use an exact, unique Japanese word occurrence in a real example',()=>{
  assert.deepEqual(contextCloze(cards[0]),{prompt:'学校へ＿＿。',answer:'行く'});
  assert.equal(contextCloze({...cards[0],example:'大学生です。'}),null);
  assert.equal(contextCloze({...cards[0],word:'学校',example:'小学校へ行く。'}),null);
  assert.equal(contextCloze({...cards[0],word:'大学',example:'大学生です。'}),null);
  assert.equal(contextCloze({...cards[0],example:'行く、行く。'}),null);
  assert.equal(contextCloze({...cards[0],word:'日',example:'日が長い。'}),null);
  assert.equal(contextCloze({...cards[0],example:'行く。'}),null);
  assert.equal(contextCloze({...cards[0],example:'I go.'}),null);
  assert.equal(contextCloze({...cards[0],example:''}),null);
});

test('refresh offers a single purposeful sentence gap when learned examples allow it',()=>{
  const before=JSON.stringify(cards);
  const one=buildRefresh(cards,'2026-11-14');
  assert.deepEqual(one,buildRefresh(cards,'2026-11-14'));
  assert.equal(one.tasks.length,8);
  assert.equal(one.tasks.filter(task=>task.kind==='cloze').length,1);
  assert.equal(one.tasks[2].kind,'cloze');
  const task=one.tasks[2];
  assert.equal(task.prompt.includes(task.correct),false,'word must be hidden before answer');
  assert(task.prompt.includes('＿＿'));
  assert(task.example.includes(task.correct));
  assert.equal(task.options,null);
  assert.equal(task.scored,true);
  assert.equal(isCorrect(task,task.correct),true);
  assert.equal(isCorrect(task,task.reading),true);
  assert.equal(isCorrect(task,'garantiert keine passende Antwort'),null);
  assert.equal(JSON.stringify(cards),before);
});

test('unlearned words never leak into a gap; no examples leave the existing quiz intact',()=>{
  const made=buildRefresh([
    {...cards[0],stage:0},
    {...cards[1],stage:2,example:''},
    {...cards[2],stage:4,example:''},
    {...cards[3],stage:5,example:''}
  ],'2026-11-14');
  assert.equal(made.blocked,false);
  assert(made.tasks.every(task=>task.kind!=='cloze'));
  assert(made.tasks.every(task=>task.prompt !== '学校へ＿＿。'));
  assert.equal(made.eligibleCount,3);
});

test('ambiguous typed response is never labelled false or used for an SRS change',()=>{
  const selected=buildRefresh(cards,'2026-11-14').tasks.find(t=>t.kind==='cloze');
  assert.equal(isCorrect(selected,'食べました'),null);
  assert.equal(isCorrect(selected,''),null);
  const engine=readFileSync(new URL('../daily-engine.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../daily.js',import.meta.url),'utf8');
  for(const source of [engine,ui]){
    assert(!source.includes('localStorage.setItem('));
    assert(!source.includes('indexedDB.open('));
    assert(!source.includes('setDoc('));
    assert(!source.includes('writeBridgeState('));
  }
  assert(ui.includes("task.kind==='cloze'?'Vergleiche mit dem ursprünglichen Satz'"));
  assert(ui.includes("task.kind==='production'||task.kind==='cloze'"));
});
