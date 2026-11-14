import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPractice} from '../daily-practice.mjs';
import {assessCompletion} from '../daily-completion.mjs';

const choice = id => ({id,kind:'choice',prompt:id,secondary:'Kontext',options:['に','で','を'],correct:'に',explanation:'Ort und Handlung unterscheiden.'});
const text = id => ({id,kind:'cloze',prompt:id,secondary:'gehen',accepted:['行く','いく'],explanation:'学校へ行く。'});

test('one optional round is capped at three, prioritizing definite mistakes before ungraded input', () => {
  const session={mode:'daily',tasks:[text('text'),...['a','b','c','d'].map(choice)]};
  const answers=session.tasks.map(t=>({taskId:t.id,response:t.options?'で':'ゆく',correct:t.options?false:null}));
  const before=JSON.stringify({session,answers});
  const practice=buildPractice(session,answers);
  assert.deepEqual(practice.tasks.map(t=>t.id),['a','b','c']);
  assert.equal(practice.mode,'practice');assert.equal(practice.readOnly,true);
  assert.equal(JSON.stringify({session,answers}),before);
  assert.equal(buildPractice(practice,practice.tasks.map(t=>({taskId:t.id,response:'で',correct:false}))),null,'no recursive practice backlog');
  assert.equal(assessCompletion(practice,practice.tasks.map(t=>({taskId:t.id,response:'に',correct:true}))).qualified,false,'practice can never earn a day');
});

test('ungraded word production is eligible without being reclassified as wrong; copies preserve accepted variants', () => {
  const session={mode:'refresh',tasks:[text('typed'),choice('choice')]};
  const answers=[{taskId:'typed',response:'ゆく',correct:null},{taskId:'choice',response:'に',correct:true}];
  const practice=buildPractice(session,answers);
  assert.deepEqual(practice.tasks.map(t=>t.id),['typed']);
  assert.deepEqual(practice.tasks[0].accepted,['行く','いく']);
  practice.tasks[0].accepted.push('synthetic');
  assert.deepEqual(session.tasks[0].accepted,['行く','いく']);
  assert.equal(answers[0].correct,null);
});

test('correct answers, open transfers, explanations, empty and skipped inputs are excluded', () => {
  const session={mode:'guided',tasks:[choice('correct'),{id:'open',kind:'open'}, {id:'lesson',kind:'lesson'},text('empty'),text('skipped')]};
  const answers=[{taskId:'correct',response:'に',correct:true},{taskId:'open',response:'日本語',correct:null},{taskId:'lesson',acknowledged:true},{taskId:'empty',response:' ',correct:null},{taskId:'skipped',response:'いく',correct:null,skipped:true}];
  assert.equal(buildPractice(session,answers),null);
});

test('unfinished, duplicated, mismatched or blocked sessions do not create a practice round', () => {
  const session={mode:'refresh',tasks:[choice('a'),choice('b')]};
  const answers=[{taskId:'a',response:'で',correct:false},{taskId:'b',response:'で',correct:false}];
  for(const records of [[],answers.slice(0,1),[answers[0],answers[0]],[answers[0],{...answers[1],taskId:'unknown'}]])assert.equal(buildPractice(session,records),null);
  assert.equal(buildPractice({...session,blocked:true},answers),null);
  assert.equal(buildPractice(null,null),null);
  assert.equal(buildPractice({...session,tasks:[null]},[null]),null);
});

test('duplicate prompts are not repeated and option arrays remain isolated', () => {
  const session={mode:'discovery',tasks:[choice('a'),{...choice('a'),id:'b'}]};
  const practice=buildPractice(session,[{taskId:'a',response:'で',correct:false},{taskId:'b',response:'を',correct:false}]);
  assert.equal(practice.tasks.length,1);
  practice.tasks[0].options.reverse();
  assert.deepEqual(session.tasks[0].options,['に','で','を']);
});

test('practice generator has no persistence or external side effects', () => {
  const source=readFileSync(new URL('../daily-practice.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB|fetch|postMessage|setDoc|updateDoc|writeBridgeState)\b/);
});
