import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateContextCandidate} from '../scripts/validate-daily-contexts.mjs';
// Isolated metadata fixture; these IDs/texts do not assert a real Tatoeba record.
const fixture=()=>({packId:'fixture',packEntryId:'fixture-1',word:'本',reading:'ほん',sentence:{id:'1',language:'jpn',text:'本を読みます。',license:'CC-BY-2.0-FR',authors:['fixture-author'],url:'https://tatoeba.org/en/sentences/show/1'},translation:{id:'2',language:'deu',text:'Isolierte Testübersetzung',license:'CC0-1.0',authors:['fixture-translator'],url:'https://tatoeba.org/en/sentences/show/2'},directTranslationLink:true,review:{status:'approved',reviewer:'isolated-test',date:'2026-11-15'}});
test('candidate metadata requires separate attribution/license/source for both languages and editorial approval',()=>{
 assert.deepEqual(validateContextCandidate(fixture()),[]);
 for(const field of ['sentence','translation']){
  const row=fixture();delete row[field].authors;assert(validateContextCandidate(row).includes(field+':metadata'));
  const wrong=fixture();wrong[field].license='unknown';assert(validateContextCandidate(wrong).includes(field+':metadata'));
 }
 const invalidDate=fixture();invalidDate.review.date='2026-02-30';assert(validateContextCandidate(invalidDate).includes('editorial-review'));
 const unchecked=fixture();unchecked.review.status='pending';assert(validateContextCandidate(unchecked).includes('editorial-review'));
 const indirect=fixture();indirect.directTranslationLink=false;assert(validateContextCandidate(indirect).includes('translation-link'));
 const audio=fixture();audio.audio={};assert(validateContextCandidate(audio).includes('audio-needs-separate-license-review'));
});
test('no external sentences or attributed test fixtures are activated in the shipped candidate set',()=>{
 assert.deepEqual(JSON.parse(readFileSync(new URL('../content/daily/context-candidates.json',import.meta.url),'utf8')),{version:1,records:[]});
 assert.doesNotMatch(readFileSync(new URL('../daily.js',import.meta.url),'utf8'),/context-candidates|tatoeba/);
});
