import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { availableGuidedPaths, buildGuidedQuest, GUIDED_PATHS } from '../daily-guided.mjs';
import { isCorrect } from '../daily-engine.mjs';

const complete = (...ids) => Object.fromEntries(ids.map(id => [id, {
  lessonComplete:true, lessonCompletedAt:123,
  skills:{ meaning:{stage:2,dueAt:4000}, form:{stage:1,dueAt:9000} }
}]));
const progress = ({grammar={},particles={}}={})=>({
  grammar:{points:grammar}, particlePath:{points:particles},
  kanjiPilot:{kanji:{'日':{stage:7,availableAt:1234}}},
  vocabulary:[{id:'x',word:'日本',stage:5,availableAt:1000}]
});

test('nothing personalized is unlocked by empty, malformed or aggregate-only progress',()=>{
  for(const input of [null,{}, {grammar:{stats:{lessons:50}},particlePath:{stats:{lessons:32}}}, {grammar:{points:{'you-ni-naru':{skills:{form:{stage:9}}}}}}]) {
    assert.deepEqual(availableGuidedPaths(input),[]);
    assert.equal(buildGuidedQuest(input),null);
  }
});

test('only actually completed prerequisites grant guided questions',()=>{
  const save=progress({grammar:complete('you-ni-naru'),particles:complete('ni-target')});
  assert.deepEqual(availableGuidedPaths(save).map(x=>x.id),['grammar-you-ni-naru']);
  const withBoth=progress({grammar:complete('you-ni-naru','you-ni-suru'),particles:complete('ni-target','de-action')});
  const ids=availableGuidedPaths(withBoth).map(x=>x.id);
  assert(ids.includes('grammar-you-ni'));
  assert(ids.includes('particle-ni-de'));
  assert(!ids.includes('grammar-you-ni-naru'));
  assert(!ids.includes('grammar-you-ni-suru'));
});

test('mixed progress is never mutated by lesson selection or response checking',()=>{
  const save=progress({grammar:complete('you-ni-naru','you-ni-suru'),particles:complete('wa-topic','ga-subject')});
  const before=JSON.stringify(save);
  const paths=availableGuidedPaths(save,4500);
  assert(paths.some(p=>p.focus==='Wiederholung hilfreich'));
  const quest=buildGuidedQuest(save,'2026-11-14','grammar-you-ni',4500);
  assert.equal(quest.id,'grammar-you-ni');
  assert.equal(quest.readOnly,true);
  assert.deepEqual(quest.prerequisites,['you-ni-naru','you-ni-suru']);
  for(const question of quest.tasks.filter(t=>t.kind==='choice')){
    assert.equal(isCorrect(question,question.correct),true);
    assert(question.options.includes(question.correct));
    assert.equal(new Set(question.options).size, question.options.length);
    for(const alternative of question.options.filter(a=>a!==question.correct))assert.equal(isCorrect(question,alternative),false);
  }
  assert.equal(isCorrect(quest.tasks.find(x=>x.kind==='open'),'日本語が話せるようになりました。'),null);
  assert.equal(JSON.stringify(save),before);
});

test('all editorial tasks have explicit explanations and no unauthorized SRS actions',()=>{
  assert.equal(new Set(GUIDED_PATHS.map(x=>x.id)).size,GUIDED_PATHS.length);
  for (const path of GUIDED_PATHS) {
    assert(path.prerequisites.length>=1);
    assert(['grammar','particle'].includes(path.domain));
    assert.equal(path.tasks[0].kind,'lesson');
    assert(path.tasks.some(t=>t.kind==='choice'));
    assert(path.tasks.some(t=>t.kind==='open'));
    for (const task of path.tasks) {
      assert(task.explanation?.length>15,path.id+' '+task.id);
      if(task.kind==='choice') {
        assert(task.options?.length>=3);
        assert(task.options.includes(task.correct));
      }
    }
  }
  const source=readFileSync(new URL('../daily-guided.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:setItem|setDoc|updateDoc|removeItem|postMessage|indexedDB|fetch)\s*\(/);
});

test('personalized question routing reads only from the existing save adapter',()=>{
  const source=readFileSync(new URL('../daily.js',import.meta.url),'utf8');
  assert.match(source,/KotobaDungeonSource\?\.readSave\?\.\(\)/);
  assert.match(source,/availableGuidedPaths\(state\.save/);
  assert.match(source,/buildGuidedQuest\(state\.save/);
  assert.doesNotMatch(source,/\b(?:setDoc|updateDoc|addDoc|writeBridgeState|localStorage\.setItem|indexedDB\.open)\s*\(/);
});
