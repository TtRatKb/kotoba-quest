/* Offline metadata gate. This does not prove authorship or linguistic quality. */
import {asDayNumber} from '../daily-streak.mjs';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const nonempty=value=>typeof value==='string'&&Boolean(value.trim());
const licenses=new Set(['CC-BY-2.0-FR','CC0-1.0']);
export function validateContextCandidate(row) {
 const issues=[];
 if(!row||typeof row!=='object')return ['record'];
 if(!['packId','packEntryId','word','reading'].every(k=>nonempty(row[k])))issues.push('identity');
 for(const [field,language] of [['sentence','jpn'],['translation','deu']]){
  const part=row[field];
  if(!part||part.language!==language||!nonempty(part.text)||!licenses.has(part.license)||!Array.isArray(part.authors)||!part.authors.length||!part.authors.every(nonempty))issues.push(field+':metadata');
  if(!/^\d+$/.test(String(part?.id||''))||part?.url!==`https://tatoeba.org/en/sentences/show/${part?.id}`)issues.push(field+':source');
 }
 if(row.directTranslationLink!==true)issues.push('translation-link');
 if(row.review?.status!=='approved'||!nonempty(row.review?.reviewer)||asDayNumber(row.review?.date) === null)issues.push('editorial-review');
 if(row.sentence?.text&&!row.sentence.text.includes(row.word))issues.push('target-surface');
 if(row.audio)issues.push('audio-needs-separate-license-review');
 return issues;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=process.argv[2]?resolve(process.argv[2]):new URL('../content/daily/context-candidates.json',import.meta.url);
 const data=JSON.parse(readFileSync(source,'utf8'));
 if(data.version!==1||!Array.isArray(data.records))throw Error('Unknown candidate schema');
 const errors=data.records.flatMap((row,index)=>validateContextCandidate(row).map(issue=>({index,issue})));
 console.log(JSON.stringify({records:data.records.length,approvedMetadata:data.records.length-new Set(errors.map(e=>e.index)).size,errors},null,2));
 process.exitCode=errors.length?1:0;
}
