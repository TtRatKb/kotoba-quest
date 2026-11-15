import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DAILY_CONTEXTS_V1 as collection} from '../content/daily/contexts-v1.mjs';
import {coreContextCatalog,validateOriginalContexts} from '../scripts/validate-daily-original-contexts.mjs';
import {contextForCard,withDailyContexts,displayContext} from '../daily-contexts.mjs';
import {contextCloze,buildRefresh,isCorrect} from '../daily-engine.mjs';
import {japaneseSegments,readingLexicon} from '../daily-furigana.mjs';
import {KANJI_IDS} from '../daily-kanji-map.mjs';
const catalog=coreContextCatalog();
const cards=collection.records.map(row=>({...catalog.entries.find(e=>e.packEntryId===row.packEntryId),id:row.packEntryId,source:'core',stage:2,dueAt:1234,personalContext:'keep',synonyms:['keep synonym']}));

test('40 original bilingual contexts bind to actual Core identities/senses, with complete explicit Kanji readings',()=>{
 assert.equal(collection.records.length,40);assert.deepEqual(validateOriginalContexts(),[]);
 assert.equal(collection.provenance.origin,'original-ai-authored');assert.equal(collection.review.independentReview,false);
 assert(Object.isFrozen(collection)&&Object.isFrozen(collection.records));
 for(const row of collection.records){
  assert(Object.isFrozen(row)&&Object.isFrozen(row.readings));
  assert(!row.sentence.includes('という言葉'));assert(!row.sourceURL,'no fictitious external source');
  const lexicon=readingLexicon(row.readings),parts=japaneseSegments(row.sentence,lexicon,{});
  assert(parts.filter(p=>/\p{Script=Han}/u.test(p.text)).every(p=>p.reading));
  assert(japaneseSegments(row.sentence,lexicon,{}, {hide:true}).every(p=>!p.reading));
 }
 const row=collection.records.find(r=>r.word==='本'),known={kanjiPilot:{version:4,kanji:{[KANJI_IDS['本']]:{lessonComplete:true,stage:5}}}};
 assert.equal(japaneseSegments('本',readingLexicon(row.readings),known)[0].reading,null);
 assert.equal(japaneseSegments('本',readingLexicon(row.readings),{kanjiPilot:{version:3,kanji:known.kanjiPilot.kanji}})[0].reading,'ほん');
});

test('overlay is exact, Core-only and conservative about saved meanings and missing catalogues',()=>{
 const card=cards.find(c=>c.word==='年齢');assert.equal(contextForCard(card,catalog.entries).word,'年齢');
 for(const changed of [{source:'mining'},{source:'starter'},{packId:'other'},{id:'other',packEntryId:'other'},{reading:'とし'},{word:'歳'},{meanings:['anderer Sinn']}])assert.equal(contextForCard({...card,...changed},catalog.entries),null);
 assert.equal(contextForCard(card,[]),null);
 assert.equal(contextForCard(card,catalog.entries.map(e=>({...e,packEntryId:'other'}))),null);
});

test('personal/original examples and translation-only edits are protected, and pairs never mix',()=>{
 const card=cards[0];
 for(const example of ['水だ。','私の水です。','Ein persönlicher Notizzettel']){
  const [copy]=withDailyContexts([{...card,example,exampleTranslation:'Mein persönlicher Kontext'}],catalog.entries);
  assert.equal(copy.example,example);assert.equal(copy.exampleTranslation,'Mein persönlicher Kontext');assert.equal(copy.dailyContext,null);
 }
 const [original]=withDailyContexts([{...card,example:'冷たい水を飲みます。',exampleTranslation:''}],catalog.entries);
 assert.deepEqual(displayContext(original),{sentence:'冷たい水を飲みます。',translation:'',readings:[],id:null});
 for(const example of ['',card.example]){
  const [personalGerman]=withDailyContexts([{...card,example,exampleTranslation:'Nur meine deutsche Notiz'}],catalog.entries);assert.equal(personalGerman.dailyContext,null);
 }
 const [copy]=withDailyContexts([card],catalog.entries),pair=displayContext(copy);
 assert.equal(pair.sentence,collection.records[0].sentence);assert.equal(pair.translation,collection.records[0].translation);
 assert.notEqual(pair.translation,card.exampleTranslation);assert.equal(copy.example,card.example);
});

test('display-only decoration preserves every synthetic saved field and unrelated domains byte for byte',()=>{
 const save={vocabulary:cards,kanjiPilot:{version:4,kanji:{'test-id':{stage:7,dueAt:99}}},grammar:{keep:1},particlePath:{keep:2},story:{keep:3},mining:[{keep:4}],analytics:{keep:5}};
 const before=JSON.stringify(save),catalogBefore=JSON.stringify(catalog);
 const copies=withDailyContexts(cards,catalog.entries);
 assert(copies.every((copy,i)=>copy!==cards[i]));
 for(let i=0;i<copies.length;i++){const {dailyContext,...rest}=copies[i];assert.deepEqual(rest,cards[i]);assert(dailyContext);}
 for(const day of ['2026-11-15','2026-11-16']){
  const refresh=buildRefresh(copies,day);assert.equal(refresh.tasks.length,8);
  assert(refresh.tasks.every(t=>t.contextId&&t.contextReadings.length&&t.exampleTranslation));
  for(const task of refresh.tasks.filter(t=>t.kind==='cloze'))assert.equal(isCorrect(task,task.reading),true);
 }
 assert.equal(JSON.stringify(save),before);assert.equal(JSON.stringify(catalog),catalogBefore);
});

test('safe clozes use the exact dictionary surface and never generate inflections',()=>{
 const decorated=withDailyContexts(cards,catalog.entries);let count=0;
 for(const card of decorated){const gap=contextCloze(card);if(!gap)continue;count++;assert.equal(gap.answer,card.word);assert.equal(gap.prompt.replace('＿＿',card.word),displayContext(card).sentence);}
 assert.equal(count,24,'keep the existing conservative surface/compound guard; remaining contexts still support recognition/feedback');
});

test('consistency validator rejects identity, reading and duplicate regressions; external candidate gate stays separate',()=>{
 const first=collection.records[0];
 for(const changed of [{word:'間違い'},{targetSense:'anderer Sinn'},{sentence:'水という言葉を覚えました。'},{readings:[]},{translation:''}])assert(validateOriginalContexts({...collection,records:[{...first,...changed}]}).length);
 assert(validateOriginalContexts({...collection,records:[first,first]}).length);
 assert.deepEqual(JSON.parse(readFileSync(new URL('../content/daily/context-candidates.json',import.meta.url),'utf8')),{version:1,records:[]});
 for(const file of ['daily-contexts.mjs','content/daily/contexts-v1.mjs'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/\b(?:localStorage|sessionStorage|indexedDB|firebase|fetch|setDoc|updateDoc|commitReview)\b/);
});
