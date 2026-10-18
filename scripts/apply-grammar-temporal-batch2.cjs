// One-time, SHA-guarded content edit; never changes SRS, storage, IDs or progress.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const file = 'cloud.html';
const expected = '48aa4ab77754c655e877582247dab7c08d024195';
assert.equal(cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),expected,
  'Unexpected cloud.html base: abort without changes');
let content = fs.readFileSync(file,'utf8');
const bank = JSON.parse(fs.readFileSync('grammar/temporal-review-bank-batch2.json','utf8'));
assert.equal(bank.status,'staged-not-connected');
const guided = bank.choices;
const alternates = bank.alternates;
function insertIntoMap(name, nextMarker, additions) {
  const heading='const '+name+' = ';
  const start=content.indexOf(heading);
  assert.ok(start>=0, 'Missing '+heading);
  const next=content.indexOf(nextMarker, start);
  assert.ok(next>start,'Missing end marker '+nextMarker);
  const block=content.slice(start,next);
  const end=block.lastIndexOf('\n};');
  assert.ok(end>0,'Unclosed map '+name);
  const old=JSON.parse(block.slice(heading.length,end+2));
  for(const [id,answers] of Object.entries(additions)){
    assert.ok(!Object.hasOwn(old,id),'Existing content must not be overwritten: '+id);
    old[id]=answers;
  }
  content=content.slice(0,start)+heading+JSON.stringify(old,null,2)+';'+content.slice(start+end+3);
}
insertIntoMap('GUIDED_GRAMMAR_CHOICES','// Explicitly checked orthographic variants',guided);
insertIntoMap('VERIFIED_GRAMMAR_ALTERNATES','function appliedGrammarQuestion',alternates);
assert.ok(content.length>5700000 && content.includes('function appliedGrammarQuestion'));
fs.writeFileSync(file,content,'utf8');
console.log('Patched nine temporal grammar MC clozes, plus 8 kana alternatives; no learning state touched.');
