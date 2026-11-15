import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {VISUAL_WORDS,ATLAS,visualVocabulary,buildPlaySession,evaluatePlay,isPair,sentenceText} from '../daily-play.mjs';
import {assessCompletion} from '../daily-completion.mjs';
import {buildPractice} from '../daily-practice.mjs';
const cards=VISUAL_WORDS.map(w=>({id:'fixture-'+w.id,source:'core',word:w.word,reading:w.reading,meanings:[w.meaning],stage:2}));
const save={particlePath:{points:Object.fromEntries(['ni-target','ga-subject','kara-source','made-limit'].map(id=>[id,{lessonComplete:true}]))},grammar:{points:{'you-ni-suru':{lessonComplete:true}}},kanjiPilot:{version:4,kanji:{'kqk-001':{stage:6,customMnemonic:'KEEP'}}},story:{energy:7}};
test('24 concrete original local image cells are uniquely mapped and verified by asset checksum',()=>{
 assert.equal(VISUAL_WORDS.length,24);assert.equal(new Set(VISUAL_WORDS.map(w=>w.id)).size,24);assert.deepEqual(VISUAL_WORDS.map(w=>w.cell),Array.from({length:24},(_,i)=>i));
 for(const group of new Set(VISUAL_WORDS.map(w=>w.group)))assert.equal(VISUAL_WORDS.filter(w=>w.group===group).length,4);
 assert(ATLAS.startsWith('./assets/daily/'));const png=readFileSync(new URL('../'+ATLAS,import.meta.url));assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
 assert.equal(createHash('sha256').update(png).digest('hex'),'de5da0bdc41e1ad9c6ec5b6da5c89473780853a32e16e8b90659b1372b971e60');
});
test('personal image vocabulary requires learned, exact word/reading AND the concrete German sense',()=>{
 assert.equal(visualVocabulary(cards).length,24);
 assert.equal(visualVocabulary(cards.map(c=>({...c,stage:0}))).length,0);
 assert.equal(visualVocabulary([{...cards.find(c=>c.word==='本'),meanings:['Zählwort für lange Gegenstände']}]).length,0);
 assert.equal(visualVocabulary([{...cards[0],reading:'invalid'}]).length,0);
 assert.equal(visualVocabulary([{...cards.find(c=>c.word==='バナナ'),word:'ばなな',reading:'バナナ'}]).length,1);
});
test('new pool supplements existing modes deterministically without save/card mutation',()=>{
 const before=JSON.stringify({cards,save});const session=buildPlaySession(cards,save,'2026-11-15');
 assert.deepEqual(session,buildPlaySession(cards,save,'2026-11-15'));assert.equal(session.mode,'play');assert.equal(session.trainingOnly,true);assert.equal(session.readOnly,true);
 assert.deepEqual(session.tasks.map(t=>t.kind),['image-choice','image-choice','image-matching','sentence-tiles']);assert.equal(new Set(session.tasks.map(t=>t.id)).size,4);
 assert.equal(JSON.stringify({cards,save}),before);assert.equal(buildPractice(session,[]),null);assert.equal(assessCompletion(session,[]).qualified,false);
});
test('image-choice distractors are four distinct objects in the same semantic group',()=>{
 for(const task of buildPlaySession(cards,save,'2026-11-15').tasks.filter(t=>t.kind==='image-choice')){
  assert.equal(task.options.length,4);assert.equal(new Set(task.options).size,4);
  assert(task.options.every(id=>VISUAL_WORDS.find(w=>w.id===id).group===task.target.group));
  assert.equal(evaluatePlay(task,task.correct).correct,true);assert.equal(evaluatePlay(task,task.options.find(id=>id!==task.correct)).correct,false);assert.equal(evaluatePlay(task,'invalid').complete,false);
 }
});
test('matching rejects duplicate, missing and unknown pairs and shuffles image/word sides independently',()=>{
 const task=buildPlaySession(cards,save,'2026-11-15').tasks.find(t=>t.kind==='image-matching');const ids=task.pairs.map(p=>p.id);
 assert.notDeepEqual(task.images,task.words);assert.equal(evaluatePlay(task,ids).correct,true);
 for(const invalid of [ids.slice(1),[ids[0],ids[0],ids[2]],[ids[0],ids[1],'unknown']])assert.equal(evaluatePlay(task,invalid).complete,false);
 assert(isPair(task,ids[0],ids[0]));assert.equal(isPair(task,ids[0],ids[1]),false);assert.equal(isPair(task,'unknown','unknown'),false);
});
test('sentence tiles confirm reviewed variants but never mark other complete orders automatically wrong',()=>{
 const session=buildPlaySession(cards,{particlePath:{points:{'ni-target':{lessonComplete:true},'ga-subject':{lessonComplete:true}}}},'2026-11-15');
 const task=session.tasks.find(t=>t.kind==='sentence-tiles');assert.equal(task.accepted.length,2);
 for(const accepted of task.accepted)assert.equal(evaluatePlay(task,accepted).correct,true);
 const other=[...task.accepted[0]].reverse();assert.deepEqual(evaluatePlay(task,other),{complete:true,correct:null});assert.equal(evaluatePlay(task,other.slice(1)).complete,false);
 assert.equal(sentenceText(task,task.accepted[0]),task.model);
});
test('sentence prerequisites are strict; demo is explicit and never invents lesson completion',()=>{
 for(const missing of [{},{particlePath:{stats:{lessons:100}}},{particlePath:{points:{'ni-target':{lessonComplete:'true'},'ga-subject':{lessonComplete:true}}}}])assert(buildPlaySession(cards,missing).tasks.every(t=>t.kind!=='sentence-tiles'));
 const original={};const demo=buildPlaySession([],original,'2026-11-15',{demo:true});assert.equal(demo.demo,true);assert(demo.tasks.some(t=>t.sample===true));assert.deepEqual(original,{});assert.equal(buildPlaySession([],{}).blocked,true);
});
test('new training and effects modules contain no SRS, storage or external request path',()=>{
 for(const file of ['daily-play.mjs','daily-play-view.mjs','daily-feedback.mjs'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/\b(?:localStorage|sessionStorage|indexedDB|fetch|postMessage|commitVocabularyItemReview|commitExternalReview|setDoc|updateDoc)\b/);
});
