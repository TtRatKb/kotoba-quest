import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {usableContext, prepareDailyCards} from '../daily-quality.mjs';
import {buildRefresh,contextCloze,isCorrect} from '../daily-engine.mjs';
import {readingLexicon,japaneseSegments,knowsKanji} from '../daily-furigana.mjs';
import {KANJI_IDS} from '../daily-kanji-map.mjs';
const card=(id,word,reading,meaning,pos='noun')=>({id,source:'core',word,reading,meanings:[meaning],pos,stage:2});
const places=[card('1','学校','がっこう','Schule'),card('2','大学','だいがく','Universität'),card('3','図書館','としょかん','Bibliothek')];

test('generic examples never become sentence gaps, context prompts or feedback examples',()=>{
 for(const example of ['「年齢」という言葉を覚えました。','年齢という単語を覚えました。','年齢という表現を学びました。']){
  assert.equal(usableContext(example),false);
  const rows=places.map(c=>({...c,example:example.replaceAll('年齢',c.word),exampleTranslation:'Ich habe das Wort gelernt.'}));
  assert.equal(contextCloze(rows[0]),null);
  const before=JSON.stringify(rows), quest=buildRefresh(rows,'2026-11-15');
  assert(quest.tasks.every(t=>!['context','cloze'].includes(t.kind)));
  assert(quest.tasks.every(t=>!t.example&&!t.exampleTranslation));assert.equal(JSON.stringify(rows),before);
 }
 assert(usableContext('学校へ行く。'));
});
test('choices require same known part of speech AND a curated semantic neighbourhood',()=>{
 const distractors=[card('4','読む','よむ','lesen','verb'),card('5','水','みず','Wasser'),card('6','高い','たかい','teuer','i-adj')];
 const rows=[...places,...distractors], quest=buildRefresh(rows,'2026-11-15');
 for(const task of quest.tasks.filter(t=>t.options)){
  assert(task.options.every(answer=>['Schule','Universität','Bibliothek'].includes(answer)));
  assert(isCorrect(task,task.correct));
 }
 assert(quest.tasks.some(t=>t.options));
 const unknown=buildRefresh(places.map(({pos,...c})=>c),'2026-11-15');
 assert(unknown.tasks.every(t=>!t.options),'unknown POS must not silently authorize random distractors');
 const synonym=buildRefresh(places.map(c=>({...c,acceptedMeanings:['Schule','Universität','Bibliothek']})),'2026-11-15');
 assert(synonym.tasks.every(t=>!t.options));
});
test('explicit reading recall hides word-form answers, all other modes keep existing answer semantics',()=>{
 const quest=buildRefresh(places,'2026-11-15'), task=quest.tasks.find(t=>t.readingTask);
 assert(task);assert.equal(task.kind,'production');assert.equal(task.prompt,task.word);
 assert.equal(isCorrect(task,task.reading),true);assert.equal(isCorrect(task,task.word),false);
});
test('POS preparation only decorates copies with exact word/reading identity',()=>{
 const rows=places.map(({pos,...c})=>c), saved={vocabulary:[{...places[0],customContext:'KEEP',stage:7}],kanjiPilot:{kanji:{history:'KEEP'}}};
 const before=JSON.stringify({rows,saved,places});
 const enriched=prepareDailyCards(rows,places,saved);
 assert.equal(enriched[0].pos,'noun');assert.notEqual(enriched[0],rows[0]);assert.equal(JSON.stringify({rows,saved,places}),before);
 assert.equal(prepareDailyCards([{...rows[0],reading:'other'}],places)[0].pos,'');
});
test('only exact current individual Kanji records can suppress ruby; aggregates and incomplete data cannot',()=>{
 const record={stage:5,lessonComplete:true};
 const save={kanjiPilot:{version:4,kanji:{[KANJI_IDS.学]:record}}};
 assert(knowsKanji(save,'学'));
 for(const bad of [null,{}, {kanjiPilot:{stats:{guru:100}}},{kanjiPilot:{version:3,kanji:save.kanjiPilot.kanji}}, {kanjiPilot:{version:4,kanji:{学:record}}}, {kanjiPilot:{version:4,kanji:{[KANJI_IDS.学]:{stage:5}}}}])assert.equal(knowsKanji(bad,'学'),false);
 const reading=readingLexicon(places);
 const segments=japaneseSegments('学校',reading,save);
 assert.equal(segments[0].reading,'がっこう','partial Kanji evidence retains reading');
 assert.equal(japaneseSegments('学校',reading,save,{hide:true})[0].reading,null);
 assert.equal(japaneseSegments('学校',reading,null)[0].reading,'がっこう');
});
test('all known Kanji suppress readings, unknown versions/settings retain them, and ambiguous readings are never guessed',()=>{
 const word=card('a','日本','にほん','Japan');const lexicon=readingLexicon([word]);
 const save={kanjiPilot:{version:4,kanji:Object.fromEntries([...word.word].map(char=>[KANJI_IDS[char],{stage:9,lessonComplete:true}]))}};
 const before=JSON.stringify(save);assert.equal(japaneseSegments(word.word,lexicon,save)[0].reading,null);assert.equal(JSON.stringify(save),before);
 assert(japaneseSegments(word.word,lexicon,{...save,kanjiPilot:{...save.kanjiPilot,settings:{furiganaMode:'always'}}})[0].reading);
 assert(japaneseSegments('生',readingLexicon([{word:'生',reading:'せい'},{word:'生',reading:'なま'}]),{})[0].reading===null);
 assert(japaneseSegments('小学校',readingLexicon(places),{}).every(p=>!p.reading),'no substring reading inside unknown compound');
});
test('canonical Kanji id map agrees with actual source and introduces no normalizer/writer',()=>{
 const cloud=readFileSync(new URL('../cloud.html',import.meta.url),'utf8');
 const start=cloud.indexOf('const KANJI =',cloud.indexOf('function kanjiPilotBootstrap'));
 const end=cloud.indexOf(';\n',start);
 const rows=JSON.parse(cloud.slice(start+'const KANJI ='.length,end));
 assert.deepEqual(KANJI_IDS,Object.fromEntries(rows.map(r=>[r.char,r.id])));
 for(const file of ['daily-furigana.mjs','daily-quality.mjs'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/ensureState\(|normalizeState\(|setItem\(|setDoc\(|postMessage\(/);
});
