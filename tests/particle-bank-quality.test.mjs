import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const cloud = readFileSync(new URL("../cloud.html", import.meta.url), "utf8");
const p = cloud.indexOf("function particlePathBootstrap()");
const head = cloud.indexOf("      const R = (surface, reading =", p);
const pointsStart = cloud.indexOf("      const POINTS = [", head);
const pointsEnd = cloud.indexOf("\n      ];", pointsStart);
assert.ok(p >= 0 && head > p && pointsStart > head && pointsEnd > pointsStart);
const env = {};
runInNewContext(cloud.slice(head, pointsEnd) + "\n      ]; globalThis.points=POINTS;", env, {timeout:5000});
const points = env.points;
const builderStart = cloud.indexOf("      function buildReviewQuestion(item, practiceOnly=false) {", p);
const builderEnd = cloud.indexOf("      function startReviews(practiceOnly=false, level=null) {", builderStart);
assert.ok(builderStart>p && builderEnd>builderStart);
const helpers={
  pointState: id=>({skills:{
    function:{stage:1,correct:0,incorrect:0},
    production:{stage:3,correct:0,incorrect:0},
    contrast:{stage:6,correct:0,incorrect:0}
  }}),
  CONTRAST_CASES:[],
  SKILLS:[{id:"function"},{id:"production"},{id:"contrast"}],
  normalizeAnswer: value=>String(value).trim(),
  contrastPoints:()=>[],
  shuffle:values=>[...values]
};
runInNewContext(cloud.slice(builderStart,builderEnd)+"\nglobalThis.build=buildReviewQuestion;",helpers);

test("all 32 particle entries have uniquely identified context and accepted source particle",()=>{
  assert.equal(points.length,32,"particle path IDs unexpectedly changed");
  assert.equal(new Set(points.map(p=>p.id)).size,points.length);
  for(const point of points){
    assert.ok(point.accepted.includes(point.particle),point.id);
    assert.ok(point.examples.length>=2,point.id);
    for(const example of point.examples){
      assert.ok(example.before.length && example.after.length,point.id);
      assert.ok(typeof example.de==="string" && example.de.trim(),point.id);
    }
  }
});

test("particle early choice candidates never include additional accepted answers",()=>{
  let examined=0;
  for(const point of points){
    const before=JSON.stringify(point);
    const q=helpers.build({point,skill:{id:"function"}});
    assert.ok(q,point.id);
    const accepted=new Set(point.accepted.map(String));
    assert.ok(q.accepted.includes(point.particle));
    assert.ok(!q.prompt.includes(point.title),"rule must not be leaked");
    if(q.type==="choice-particle"){
      assert.equal(q.choices.length,4,point.id);
      assert.equal(new Set(Array.from(q.choices)).size,4,point.id);
      for(const choice of q.choices){
        if(choice!==point.particle) assert.ok(!accepted.has(String(choice)),point.id+" / "+choice);
      }
    } else {
      assert.equal(q.type,"input",point.id);
    }
    const advanced=helpers.build({point,skill:{id:"production"}});
    assert.equal(advanced.type,"input",point.id);
    assert.deepEqual(Array.from(advanced.accepted),Array.from(point.accepted),point.id);
    assert.equal(JSON.stringify(point),before,"question builder may not mutate source "+point.id);
    examined++;
  }
  assert.equal(examined,32);
});

test("alternative movement marker is accepted, never presented as wrong MC choice",()=>{
  const point=points.find(p=>p.id==="e-direction");
  assert.deepEqual(Array.from(point.accepted),["へ","に"]);
  const q=helpers.build({point,skill:{id:"function"}});
  assert.ok(q.accepted.includes("に"));
  assert.ok(!q.choices.includes("に"));
});
