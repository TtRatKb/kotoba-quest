import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const cloud=readFileSync(new URL("../cloud.html",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../grammar/temporal-review-bank-batch2.json",import.meta.url),"utf8"));
function between(a,b) {
  const start=cloud.indexOf(a),end=cloud.indexOf(b,start+a.length);
  assert.ok(start>=0 && end>start,"Missing "+a);
  return cloud.slice(start,end);
}
let qSource=between("// Read-only question construction; historical grammar SRS IDs/records are unchanged.",
  "      function makeReviewItem(pointId");
const pointSource=between("      const POINTS = [","\n      ];")+"\n      ];\nglobalThis.points=POINTS;";
function simulateBankAddition(source,name,nextMarker,additions) {
  const heading="const "+name+" = ";
  const start=source.indexOf(heading);
  const stop=source.indexOf(nextMarker,start);
  assert.ok(start>=0 && stop>start);
  const fragment=source.slice(start,stop);
  const end=fragment.lastIndexOf("\n};");
  assert.ok(end>0);
  const existing=JSON.parse(fragment.slice(heading.length,end+2));
  for(const [id,entries] of Object.entries(additions)) {
    assert.ok(!Object.hasOwn(existing,id),"Bank already connected: "+id);
    existing[id]=entries;
  }
  return source.slice(0,start)+heading+JSON.stringify(existing,null,2)+";"+source.slice(start+end+3);
}
assert.equal(manifest.status,"staged-not-connected");
qSource=simulateBankAddition(qSource,"GUIDED_GRAMMAR_CHOICES",
  "// Explicitly checked orthographic variants",manifest.choices);
qSource=simulateBankAddition(qSource,"VERIFIED_GRAMMAR_ALTERNATES",
  "function appliedGrammarQuestion",manifest.alternates);
const env={},pointsEnv={};
runInNewContext(qSource+"\nglobalThis.build=appliedGrammarQuestion;",env,{timeout:5000});
runInNewContext(pointSource,pointsEnv,{timeout:5000});
const fixture=manifest.choices;
const kana=Object.fromEntries(Object.entries(manifest.alternates)
  .map(([id,examples])=>[id,Object.fromEntries(Object.entries(examples).map(([correct,variants])=>[correct,variants[0]]))]));
const assessSource=between("      function normalizeJapanese(value) {","      function revealReviewAnswer() {");
const grading={};
runInNewContext(assessSource+"\nglobalThis.assess=assessAnswer;",grading,{timeout:5000});

test("staged bank simulates nine contextual MC clozes without changing cloud.html",()=>{
  let count=0;
  for(const [id,examples] of Object.entries(fixture)) {
    const point=pointsEnv.points.find(p=>p.id===id);
    assert.ok(point,"missing point "+id);
    assert.equal(point.formation.length,3,"unexpected formation count for "+id);
    const before=JSON.stringify(point);
    for(const [correct,distractors] of Object.entries(examples)) {
      const index=point.formation.findIndex(f=>f.highlight===correct);
      assert.ok(index>=0,"unmatched answer "+id+" / "+correct);
      const src=point.formation[index];
      assert.equal(src.jp.split(correct).length,2,"ambiguous blank in source sentence");
      for(const stage of [1,2,3,4]) {
        for(const skill of ["meaning","form","production"]) {
          const q=env.build(point,skill,stage,index);
          assert.equal(q.model,correct);
          assert.equal(q.translation,src.de);
          assert.equal(q.explanation,src.note);
          assert.equal(q.shown.replace("＿＿＿＿",q.model),src.jp);
          assert.ok(!q.prompt.includes(correct),"pre-answer prompt leaks answer");
          assert.ok(q.answers.includes(correct));
          if(stage<=2) {
            assert.equal(q.choices.length,4,id+" / "+correct);
            assert.equal(new Set(Array.from(q.choices)).size,4);
            assert.deepEqual(new Set(Array.from(q.choices)),new Set([correct,...distractors]),
              "wrong distractor bank: "+id+" / "+correct);
            assert.equal(q.choices.filter(choice=>choice===correct).length,1);
          } else {
            assert.equal(q.choices,undefined,"typed response expected at stage "+stage);
          }
        }
      }
      count++;
    }
    assert.equal(JSON.stringify(point),before,"review builder must not mutate lesson/progress data");
  }
  assert.equal(count,9);
});

test("eight explicitly checked kana variants pass, unrelated responses fail",()=>{
  let count=0;
  for(const [id,values] of Object.entries(kana)) {
    const point=pointsEnv.points.find(p=>p.id===id);
    for(const [correct,hiragana] of Object.entries(values)) {
      const index=point.formation.findIndex(f=>f.highlight===correct);
      const q=env.build(point,"form",3,index);
      assert.ok(q.answers.includes(hiragana),id+" / "+correct);
      assert.equal(grading.assess(q,"form",hiragana+"。").likely,true);
      assert.equal(grading.assess(q,"form","別の答えです").likely,false);
      count++;
    }
  }
  assert.equal(count,8);
});

test("temporal distractors rotate answer position without changing correctness",()=>{
  const point=pointsEnv.points.find(p=>p.id==="tokoro-da");
  const positions=[0,3,6,9].map(rotation=>{
    const q=env.build(point,"meaning",1,rotation);
    return q.choices.indexOf(q.model);
  });
  assert.equal(new Set(positions).size,4);
});

test("other non-vetted points remain typed-only (no generated distractors)",()=>{
  const point=pointsEnv.points.find(p=>p.id==="uchi-ni");
  const q=env.build(point,"meaning",1,0);
  assert.equal(q.choices,undefined);
});
