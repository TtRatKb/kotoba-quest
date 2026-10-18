import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext, Script } from "node:vm";

const cloud=readFileSync(new URL("../cloud.html",import.meta.url),"utf8");
const start=cloud.indexOf("      function buildReviewQuestion(item, practiceOnly=false) {",cloud.indexOf("function particlePathBootstrap()"));
const end=cloud.indexOf("      function startReviews(practiceOnly=false, level=null) {",start);
assert.ok(start>=0&&end>start,"particle review constructor must exist");
const source=cloud.slice(start,end);

test("particle question builder parses and assesses usage rather than definition",()=>{
  new Script(source);
  assert.doesNotMatch(source,/Welche Funktion hat die markierte Partikel/);
  assert.match(source,/type:guided\?"choice-particle":"input"/);
});
test("early particle stages have four distinct options; later stages require input",()=>{
  const states={
    function:{stage:1,correct:0,incorrect:0},
    production:{stage:3,correct:0,incorrect:0},
    contrast:{stage:6,correct:1,incorrect:0}
  };
  const point={id:"test-wa",particle:"は",accepted:["は"],distractors:["が","を","も"],
    examples:[{before:[["私","わたし"]],after:[["学生","がくせい"]],de:"Ich bin Studentin."}],
    functions:["Thema"]};
  const helpers={
    pointState:()=>({skills:states}),
    CONTRAST_CASES:[],
    SKILLS:[{id:"function"},{id:"production"},{id:"contrast"}],
    normalizeAnswer:value=>String(value).trim(),
    contrastPoints:()=>[],
    shuffle:values=>[...values]
  };
  runInNewContext(source+"\nglobalThis.build=buildReviewQuestion;",helpers);
  const snapshot=JSON.stringify(states);
  const beginner=helpers.build({point,skill:{id:"function"}});
  assert.equal(beginner.type,"choice-particle");
  assert.equal(beginner.choices.length,4);
  assert.equal(new Set(beginner.choices).size,4);
  assert.deepEqual(Array.from(beginner.accepted),["は"]);
  assert.equal(beginner.example.de,"Ich bin Studentin.");
  assert.doesNotMatch(beginner.prompt,/Thema|Funktion verstehen/);
  const middle=helpers.build({point,skill:{id:"production"}});
  const advanced=helpers.build({point,skill:{id:"contrast"}});
  assert.equal(middle.type,"input");
  assert.equal(advanced.type,"input");
  assert.equal(JSON.stringify(states),snapshot,"questions must not change SRS stages or due dates");
});
test("dashboard offers particle and Kanji access without mutating Kanji SRS",()=>{
  assert.match(cloud,/id:"kqWkKanjiReviews"/);
  assert.match(cloud,/window\.KotobaQuestKanjiPilot\?\.getStats\?\.\(\)\?\.due/);
  assert.match(cloud,/root\.querySelector\("#kqWkKanjiReviews"\).*window\.KotobaQuestKanjiPilot\?\.open/);
  assert.match(cloud,/id:"kqWkParticleReviews".*accessible:true/);
  assert.match(cloud,/window\.KotobaQuestParticlePath\?\.open/);
});
