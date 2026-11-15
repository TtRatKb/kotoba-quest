import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDailyMix,buildDailyExtension} from '../daily-mix.mjs';
import {VISUAL_WORDS,isPlayTask} from '../daily-play.mjs';
import {assessCompletion} from '../daily-completion.mjs';
import {dailyOverview,recordDailyCompletion} from '../daily-streak.mjs';

const cards=VISUAL_WORDS.map(w=>({id:w.id,word:w.word,reading:w.reading,meanings:[w.meaning],stage:2}));
const save={particlePath:{points:Object.fromEntries(['ni-target','ga-subject','de-action'].map(id=>[id,{lessonComplete:true}]))},kanjiPilot:{version:4,kanji:{}},story:{keep:'unchanged'}};
const attempts=session=>session.tasks.map(task=>task.kind==='lesson'?{taskId:task.id,acknowledged:true,correct:null}:{taskId:task.id,correct:null,response:task.kind==='meaning-type'?'Wort':task.options?.[0]||'日本語',activityResponse:isPlayTask(task)?task.options?.[0]||task.pairs?.map(p=>p.id)||[...task.accepted[0]].reverse():undefined});

test('normal and short mix are bounded, varied, deterministic and preserve a complete licensed learning goal',()=>{
 const before=JSON.stringify({cards,save});
 for(let d=1;d<=28;d++)for(const length of ['normal','short']){
  const day=`2026-11-${String(d).padStart(2,'0')}`,mix=buildDailyMix(cards,save,day,123,{length});
  assert.deepEqual(mix,buildDailyMix(cards,save,day,123,{length}));
  assert.equal(mix.tasks.length,length==='normal'?8:6);
  assert.equal(mix.tasks.at(-1).kind,'open');assert(mix.tasks.some(t=>t.kind==='lesson'));
  assert(mix.tasks.some(t=>t.group==='vocab'&&['production','cloze'].includes(t.kind)));
  assert.equal(mix.growthType,'learned');
  const kinds=mix.tasks.map(t=>t.kind);
  if(length==='normal')for(const kind of ['image-choice','image-matching','sentence-tiles'])assert(kinds.includes(kind));
  for(let i=2;i<kinds.length;i++)assert(!(kinds[i]===kinds[i-1]&&kinds[i]===kinds[i-2]),'no three consecutive identical task types');
  assert(mix.estimatedMinutes[0]>=1&&mix.estimatedMinutes[1]<=5);
  assert(assessCompletion(mix,attempts(mix)).qualified,'ungraded/wrong but complete participation counts');
 }
 assert.equal(JSON.stringify({cards,save}),before);
});

test('missing visual material falls back to existing vocabulary/grammar; no demo or implicit unlock',()=>{
 const nonVisual=cards.slice(0,3).map((c,i)=>({...c,word:['行く','見る','飲む'][i],reading:['いく','みる','のむ'][i],meanings:[['gehen','sehen','trinken'][i]]}));
 for(const length of ['normal','short']){
  const mix=buildDailyMix(nonVisual,{particlePath:{points:{'ni-target':{lessonComplete:1},'ga-subject':{lessonComplete:true}}}},'day',0,{length});
  assert(!mix.tasks.some(isPlayTask));assert.equal(mix.growthType,'sample');assert.equal(mix.tasks.length,length==='short'?6:8);
 }
 const wrongSense=cards.map(c=>({...c,meanings:['abstrakte andere Bedeutung']}));
 assert(!buildDailyMix(wrongSense,{},'day').tasks.some(isPlayTask));
 assert.equal(buildDailyMix(cards.slice(0,2),save).blocked,true);
});

test('day completion requires actual structured visual attempts, all pairs and all unique sentence tokens',()=>{
 const mix=buildDailyMix(cards,save,'day'),answers=attempts(mix);
 for(const task of mix.tasks.filter(isPlayTask)){
  const index=mix.tasks.indexOf(task);
  const bad=task.kind==='image-choice'?['invalid',null]:[[],['0','0'],null,'3 Paare'];
  for(const activityResponse of bad){const changed=answers.map((a,i)=>i===index?{...a,activityResponse}:a);assert(!assessCompletion(mix,changed).qualified);}
  assert(!assessCompletion(mix,answers.map((a,i)=>i===index?{...a,skipped:true}:a)).qualified);
 }
 assert(!assessCompletion(mix,answers.slice(0,-1)).qualified);
 assert(!assessCompletion({...mix,mode:'play'},answers).qualified);
 assert(!assessCompletion(mix,answers.map(a=>({...a,activityResponse:undefined}))).qualified);
});

test('voluntary extension is bounded supplementary practice, preserves input, and cannot credit a day',()=>{
 const mix=buildDailyMix(cards,save,'day'),before=JSON.stringify({mix,cards,save});
 const extra=buildDailyExtension(mix,cards,save,'day');
 assert(extra&&extra.tasks.length<=3);assert(extra.trainingOnly&&extra.readOnly);
 assert(!assessCompletion(extra,attempts(extra)).qualified);
 assert.equal(buildDailyExtension(extra,cards,save,'day'),null);
 assert.equal(JSON.stringify({mix,cards,save}),before);
 assert.equal(new Set(extra.tasks.map(t=>t.id)).size,extra.tasks.length);
});

test('seven-day overview uses calendar days across leap years and DST, idempotently and without persistence',()=>{
 for(const today of ['2026-03-29','2026-10-25','2024-03-01']){
  const days=recordDailyCompletion([],today),week=dailyOverview(days,today);
  assert.equal(week.length,7);assert.equal(week.at(-1).day,today);assert(week.at(-1).today&&week.at(-1).done);
  assert.equal(week.filter(d=>d.done).length,1);assert.equal(new Set(week.map(d=>d.day)).size,7);
  assert.deepEqual(dailyOverview(recordDailyCompletion(days,today),today),week);
 }
 assert(dailyOverview([],'2024-03-01').some(d=>d.day==='2024-02-29'));
 assert.deepEqual(dailyOverview([],'bad'),[]);
 for(const file of ['daily-mix.mjs','daily-completion.mjs','daily-streak.mjs'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/\b(?:localStorage|indexedDB|firebase|setDoc|updateDoc|commitReview)\b/);
});
