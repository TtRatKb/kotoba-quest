// One-time, SHA-guarded content edit; never changes SRS, storage, IDs or progress.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const file = 'cloud.html';
const expected = '48aa4ab77754c655e877582247dab7c08d024195';
assert.equal(cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),expected,
  'Unexpected cloud.html base: abort without changes');
let content = fs.readFileSync(file,'utf8');
const guided = {
  "tokoro-da": {
    "作るところです": [
      "作っているところです",
      "作ったところです",
      "作るつもりです"
    ],
    "しているところです": [
      "するところです",
      "したところです",
      "するつもりです"
    ],
    "着いたところです": [
      "着くところです",
      "着く予定です",
      "着いたはずです"
    ]
  },
  "ta-bakari": {
    "来たばかりです": [
      "来るところです",
      "来る予定です",
      "来ている途中です"
    ],
    "食べたばかりなので": [
      "食べるところなので",
      "食べているところなので",
      "食べようと思ったので"
    ],
    "買ったばかりの": [
      "買う予定の",
      "買おうとしている",
      "買いたかった"
    ]
  },
  "saichuu-ni": {
    "している最中です": [
      "し始めるところです",
      "終えたところです",
      "する予定です"
    ],
    "食事の最中に": [
      "食事の直前に",
      "食事の後に",
      "食事が終わった直後に"
    ],
    "発表している最中に": [
      "発表する直前に",
      "発表した後に",
      "発表の準備中に"
    ]
  }
};
const alternates = {
  "tokoro-da": {
    "作るところです": [
      "つくるところです"
    ],
    "着いたところです": [
      "ついたところです"
    ]
  },
  "ta-bakari": {
    "来たばかりです": [
      "きたばかりです"
    ],
    "食べたばかりなので": [
      "たべたばかりなので"
    ],
    "買ったばかりの": [
      "かったばかりの"
    ]
  },
  "saichuu-ni": {
    "している最中です": [
      "しているさいちゅうです"
    ],
    "食事の最中に": [
      "しょくじのさいちゅうに"
    ],
    "発表している最中に": [
      "はっぴょうしているさいちゅうに"
    ]
  }
};
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
