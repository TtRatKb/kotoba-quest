// One-time, SHA-guarded and strictly content-only. Never load, modify or migrate user progress.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const file='cloud.html', expected='e42d695140ca02fe2f87518f9f2f5b3797fd97af';
const actual=cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim();
assert.equal(actual,expected,'Unexpected cloud.html base. Stop without editing.');
let content=fs.readFileSync(file,'utf8');
const path='grammar/temporal-review-bank-batch3.json';
const manifest=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(manifest.status,'staged-not-connected');
assert.equal(Object.keys(manifest.choices).length,3);
assert.equal(Object.values(manifest.choices).reduce((n,entries)=>n+Object.keys(entries).length,0),9);
function installMap(name,nextMarker, additions){
  const heading='const '+name+' = ';
  const start=content.indexOf(heading);
  const next=content.indexOf(nextMarker,start);
  assert.ok(start>=0&&next>start,'Missing review bank: '+name);
  const fragment=content.slice(start,next);
  const end=fragment.lastIndexOf('\n};');
  assert.ok(end>0,'Missing map boundary: '+name);
  const old=JSON.parse(fragment.slice(heading.length,end+2));
  for(const [id,entries] of Object.entries(additions)){
    assert.ok(!Object.hasOwn(old,id),'Cannot overwrite existing review bank: '+id);
    old[id]=entries;
  }
  content=content.slice(0,start)+heading+JSON.stringify(old,null,2)+';'+content.slice(start+end+3);
}
installMap('GUIDED_GRAMMAR_CHOICES','// Explicitly checked orthographic variants',manifest.choices);
installMap('VERIFIED_GRAMMAR_ALTERNATES','function appliedGrammarQuestion',manifest.alternates);
const original='E([R("兄", "あに"), R("は"), R("社交的", "しゃこうてき"), R("なの", ""), R("に"), R("、"), R("弟", "おとうと")], [R("静か", "しずか"), R("です")], "Während der ältere Bruder gesellig ist, ist der jüngere dagegen ruhig.")';
const corrected='E([R("兄", "あに"), R("は"), R("弟", "おとうと")], [R("とても", ""), R("厳しい", "きびしい"), R("です")], "Mein älterer Bruder ist seinem jüngeren Bruder gegenüber sehr streng.")';
assert.equal(content.split(original).length,2,'Unmatched or ambiguous particle example; stop.');
content=content.replace(original,corrected);
assert.ok(content.length>5700000);
fs.writeFileSync(file,content,'utf8');
manifest.status='connected';
manifest.description='Nine source-aligned contrastive temporal clozes installed in cloud.html; no progress logic touched.';
fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n','utf8');
console.log('Added 9 temporal clozes, 9 kana variants and corrected one misleading に対して sentence; untouched SRS, storage and Firebase.');
