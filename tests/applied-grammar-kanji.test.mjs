import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const cloud = readFileSync(new URL("../cloud.html", import.meta.url), "utf8");
const section = (start, end) => {
  const a = cloud.indexOf(start), b = cloud.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, "Source section missing: " + start);
  return cloud.slice(a, b);
};
const applied = section("      // Read-only question construction; historical grammar SRS IDs/records are unchanged.",
                        "      function makeReviewItem(pointId");
const kanji = section("function kanjiQuestionSet(item, completedReviews=0)",
                      "      function answerQuestion(question, input)");
test("applied grammar builder and Kanji order helper parse", () => {
  new Script(applied);
  new Script(kanji);
});
test("grammar stages use curated early choices, contextual cloze and later full production", () => {
  const env = {};
  runInNewContext(applied + "\nglobalThis.make = appliedGrammarQuestion;", env);
  const point = {
    id:"you-ni-naru",
    formation:[
      {jp:"毎朝、早く起きるようになりました。", de:"Ich stehe inzwischen jeden Morgen früh auf.", highlight:"起きるようになりました"},
      {jp:"忘れ物をしないようになりました。", de:"Ich vergesse inzwischen keine Sachen mehr.", highlight:"しないようになりました"}
    ]
  };
  const before = JSON.stringify(point);
  const early = env.make(point, "meaning", 1, 0);
  assert.equal(early.shown, "毎朝、早く＿＿＿＿。");
  assert.equal(early.translation, point.formation[0].de);
  assert.equal(early.choices.length, 4);
  assert.equal(new Set(Array.from(early.choices)).size, 4);
  assert.ok(early.choices.includes(early.model));
  assert.equal(early.prompt.includes("ようになる"), false);
  const reduced = env.make(point, "form", 4, 1);
  assert.equal(reduced.choices, undefined);
  assert.equal(reduced.model, point.formation[1].highlight);
  assert.equal(env.make(point, "production", 5, 1), null);
  const dictation = env.make(point, "listening", 3, 0);
  assert.equal(dictation.audioDictation, true);
  assert.equal(dictation.model, point.formation[0].jp);
  assert.equal(dictation.translation, point.formation[0].de);
  assert.equal(JSON.stringify(point), before, "Review construction must not modify saved data");
});
test("unvetted grammar distractors are never synthesized automatically", () => {
  const env = {};
  runInNewContext(applied + "\nglobalThis.make = appliedGrammarQuestion;", env);
  const point = {id:"other-point", formation:[{jp:"あいう。",de:"example",highlight:"いう"}]};
  const q = env.make(point,"meaning",1,0);
  assert.equal(q.choices, undefined);
  assert.equal(q.model,"いう");
});
test("Kanji review direction rotates using previous completed records only", () => {
  const env = {
    vocabReadingSpec: () => ({type:"vocabReading"}),
    kanjiReadingSpec: () => ({type:"kanjiReading"}),
    meaningSpec: () => ({type:"meaning"})
  };
  runInNewContext(kanji+"\nglobalThis.order=kanjiQuestionSet;", env);
  const orders=[0,1,2,3].map(count=>Array.from(env.order({},count),q=>q.type));
  assert.deepEqual(orders,[
    ["vocabReading","kanjiReading","meaning"],
    ["kanjiReading","meaning","vocabReading"],
    ["meaning","vocabReading","kanjiReading"],
    ["vocabReading","kanjiReading","meaning"]
  ]);
  assert.match(cloud,/kanjiQuestionSet\(item, Number\(record.correct\|\|0\)\+Number\(record.incorrect\|\|0\)\)/);
});
test("SRS stage calculations and stored reviews are unchanged", () => {
  assert.match(cloud,/skillState.stage = Math.min\(9, Math.max\(1, skillState.stage \+ 1\)\)/);
  assert.match(cloud,/record.stage=Math.min\(9,Number\(record.stage\|\|0\)\+1\)/);
  assert.match(cloud,/function gradeReview\(grade\)/);
});
