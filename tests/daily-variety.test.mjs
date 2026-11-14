import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { availableGuidedPaths, buildGuidedQuest, GUIDED_PATHS } from '../daily-guided.mjs';
import { GUIDED_ALT_TASKS, EXTRA_GUIDED_PATHS } from '../daily-guided-variety.mjs';
import { asDayNumber } from '../daily-streak.mjs';
import { isCorrect } from '../daily-engine.mjs';

const completed = (...ids) => Object.fromEntries(ids.map(id => [
  id,{lessonComplete:true,skills:{meaning:{stage:2,dueAt:1},form:{stage:4,dueAt:999999}}}
]));
const saveWith = (section, ids) => ({
  vocabulary:[{id:'core-1',stage:5,availableAt:1000}],
  kanjiPilot:{kanji:{'日':{stage:8,availableAt:123}}},
  [section]:{points:completed(...ids)}
});

test('new contrast courses use actual particle IDs and require BOTH completed lessons',()=>{
  const source=readFileSync(new URL('../cloud.html',import.meta.url),'utf8');
  for(const id of ['kara-source','made-limit','dake-only','shika-negative']){
    assert(source.includes('P("'+id+'"'), 'canonical lesson ID missing: '+id);
  }
  assert.equal(EXTRA_GUIDED_PATHS.length,2);
  const expected={
    'particle-kara-made':['kara-source','made-limit'],
    'particle-dake-shika':['dake-only','shika-negative']
  };
  for(const path of EXTRA_GUIDED_PATHS){
    assert.deepEqual(path.prerequisites, expected[path.id]);
    for(const id of path.prerequisites){
      const onlyOne=saveWith('particlePath',[id]);
      assert(!availableGuidedPaths(onlyOne).some(x=>x.id===path.id));
      assert.equal(buildGuidedQuest(onlyOne,'2026-11-15',path.id)?.id, undefined);
    }
    const both=saveWith('particlePath',path.prerequisites);
    assert(availableGuidedPaths(both).some(x=>x.id===path.id));
    assert.equal(buildGuidedQuest(both,'2026-11-15',path.id)?.id,path.id);
  }
  const aggregate={particlePath:{stats:{lessons:32},points:{'kara-source':{lessonComplete:true}}}};
  assert(!availableGuidedPaths(aggregate).some(x=>x.id==='particle-kara-made'));
});

test('guided quest alternates different reviewed tasks on neighboring calendar days',()=>{
  const save=saveWith('particlePath',['dake-only','shika-negative']);
  const before=JSON.stringify(save);
  const first=buildGuidedQuest(save,'2026-11-14','particle-dake-shika');
  const next=buildGuidedQuest(save,'2026-11-15','particle-dake-shika');
  assert.notEqual(first.variant,next.variant);
  assert.notDeepEqual(first.tasks.slice(1).map(t=>t.prompt),next.tasks.slice(1).map(t=>t.prompt));
  assert.equal(first.tasks[0].prompt,next.tasks[0].prompt);
  assert.equal(first.tasks.at(-1).kind,'open');
  assert.equal(next.tasks.at(-1).kind,'open');
  assert.deepEqual(first,buildGuidedQuest(save,'2026-11-14','particle-dake-shika'));
  assert.deepEqual(next,buildGuidedQuest(save,'2026-11-15','particle-dake-shika'));
  assert.equal(JSON.stringify(save),before);
});

test('alternation follows calendar days even across German DST transitions',()=>{
  const save=saveWith('particlePath',['kara-source','made-limit']);
  for(const [a,b] of [['2026-03-28','2026-03-29'],['2026-10-24','2026-10-25']]){
    assert.equal(asDayNumber(b)-asDayNumber(a),1);
    const first=buildGuidedQuest(save,a,'particle-kara-made');
    const second=buildGuidedQuest(save,b,'particle-kara-made');
    assert.notEqual(first.variant,second.variant);
  }
});

test('every course variant has distinct, supported, unambiguous graded choices and optional open transfer',()=>{
  assert.equal(GUIDED_PATHS.length,7);
  for(const path of GUIDED_PATHS){
    const save=saveWith(path.section,path.prerequisites);
    for(const day of ['2026-11-14','2026-11-15']){
      const quest=buildGuidedQuest(save,day,path.id);
      assert(quest, 'route not selectable: '+path.id);
      assert.equal(quest.id,path.id);
      assert.equal(quest.readOnly,true);
      assert.equal(quest.tasks[0].kind,'lesson');
      assert.equal(quest.tasks.at(-1).kind,'open');
      assert(quest.tasks.some(t=>t.kind==='choice'));
      assert.equal(new Set(quest.tasks.map(t=>t.id)).size,quest.tasks.length);
      for(const task of quest.tasks){
        assert(task.explanation?.length>=20, path.id+'/'+task.id);
        if(task.kind==='choice'){
          assert(task.options.length>=3 && task.options.length<=4,path.id+'/'+task.id);
          assert(task.options.includes(task.correct),path.id+'/'+task.id);
          assert.equal(new Set(task.options).size,task.options.length);
          assert.equal(isCorrect(task,task.correct),true);
          for(const wrong of task.options.filter(x=>x!==task.correct)){
            assert.equal(isCorrect(task,wrong),false,path.id+'/'+task.id+' wrong '+wrong);
          }
        }else if(task.kind==='open'){
          assert(task.example?.length>=5);
          assert.equal(isCorrect(task,task.example),null);
        }
      }
    }
  }
  assert.equal(Object.keys(GUIDED_ALT_TASKS).length,GUIDED_PATHS.length);
});

test('all alternate paths remain read-only and never persist achievements or alter SRS',()=>{
  const save={
    grammar:{points:completed('you-ni-naru','you-ni-suru')},
    particlePath:{points:completed('wa-topic','ga-subject','ni-target','de-action','kara-source','made-limit','dake-only','shika-negative')},
    vocabulary:[{id:'word',stage:9,guruPassed:true,availableAt:null}],
    kanjiPilot:{kanji:{'日':{stage:6}},placementResults:{'日':true}},
    story:{energy:5}
  };
  const before=JSON.stringify(save);
  const available=availableGuidedPaths(save,2000);
  assert(available.length>=5);
  for(const day of ['2026-11-14','2026-11-15']){
    for(const item of available){
      const quest=buildGuidedQuest(save,day,item.id,2000);
      for(const task of quest.tasks){
        if(task.options)for(const option of task.options)isCorrect(task,option);
      }
    }
  }
  assert.equal(JSON.stringify(save),before);
  for(const path of ['daily-guided.mjs','daily-guided-variety.mjs','daily-streak.mjs']){
    const code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.doesNotMatch(code,/\b(?:indexedDB|localStorage|sessionStorage)\s*\.\s*(?:open|setItem|removeItem|clear)\s*\(/);
    assert.doesNotMatch(code,/\b(?:setDoc|updateDoc|addDoc|postMessage|fetch|writeBridgeState|commit-vocabulary-item)\s*\(/);
  }
});
