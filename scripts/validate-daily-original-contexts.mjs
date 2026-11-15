/* Repository-only consistency gate, not a native-speaker or authorship proof. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DAILY_CONTEXTS_V1} from '../content/daily/contexts-v1.mjs';
import {usableContext} from '../daily-quality.mjs';
import {japaneseSegments,readingLexicon} from '../daily-furigana.mjs';
export function coreContextCatalog(){
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),marker='const EMBEDDED_CORE_PACK = ';
 const start=html.indexOf(marker),end=html.indexOf(';\n    const CORE_PACK',start);
 if(start<0||end<0)throw Error('Core catalogue marker missing');
 return JSON.parse(html.slice(start+marker.length,end));
}
export function validateOriginalContexts(collection=DAILY_CONTEXTS_V1,catalog=coreContextCatalog()){
 const issues=[],seen=new Set(),sentences=new Set();
 if(collection.version!==1||collection.packId!==catalog.id||collection.provenance?.origin!=='original-ai-authored'||collection.review?.status!=='self-reviewed'||collection.review?.independentReview!==false)issues.push('collection-metadata');
 for(const row of collection.records){
  const fail=reason=>issues.push(`${row.id}: ${reason}`);
  const entry=catalog.entries.find(e=>e.packEntryId===row.packEntryId);
  if(!entry||entry.word!==row.word||entry.reading!==row.reading||!entry.meanings.includes(row.targetSense))fail('catalog-identity/sense');
  if(seen.has(row.id)||seen.has(row.packEntryId))fail('duplicate-identity');seen.add(row.id);seen.add(row.packEntryId);
  if(!usableContext(row.sentence)||row.sentence.split(row.word).length!==2)fail('unique-target-surface');
  if(sentences.has(row.sentence))fail('duplicate-sentence');sentences.add(row.sentence);
  if(typeof row.translation!=='string'||row.translation.trim().length<10||!/[äöüÄÖÜßA-Za-z]/u.test(row.translation))fail('german-translation');
  if(!Array.isArray(row.readings)||row.readings.some(r=>!row.sentence.includes(r.word)||!/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(r.reading)))fail('explicit-readings');
  const segments=japaneseSegments(row.sentence,readingLexicon(row.readings),{});
  if(segments.some(part=>/\p{Script=Han}/u.test(part.text)&&!part.reading))fail('uncovered-kanji');
 }
 return issues;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const issues=validateOriginalContexts();console.log(JSON.stringify({collection:DAILY_CONTEXTS_V1.id,records:DAILY_CONTEXTS_V1.records.length,issues},null,2));process.exitCode=issues.length?1:0;
}
