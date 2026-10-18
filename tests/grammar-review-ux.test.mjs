import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const cloud=readFileSync(new URL("../cloud.html",import.meta.url),"utf8");
const grammarStart=cloud.indexOf("      function adaptiveReviewPrompt(question, skillId, difficulty)");
const grammarEnd=cloud.indexOf("      function normalizeJapanese(value)",grammarStart);
assert.ok(grammarStart>=0 && grammarEnd>grammarStart);
const renderBlock=cloud.slice(grammarStart,grammarEnd);

test("grammar review renderer still parses",()=>{
  new Script(renderBlock);
});
test("grammar structure is not revealed by initial heading or badge",()=>{
  assert.match(renderBlock,/heading = reviewCurrent\.difficulty === "independent"/);
  assert.doesNotMatch(renderBlock,/heading = difficulty\.heading \|\| point\.title/);
  assert.doesNotMatch(renderBlock,/question\.aspectLabel \|\| difficulty\.badge/);
  assert.match(renderBlock,/escapeHtml\(difficulty\.badge\)/);
});
test("German translation is shown for verified form cloze examples",()=>{
  assert.match(cloud,/translation: item\.de,/);
  assert.match(cloud,/translation: source\.de,/);
  assert.match(renderBlock,/skill\.id === "form" && question\.translation/);
  assert.match(renderBlock,/escapeHtml\(question\.translation\)/);
});
test("Review SRS stage and feedback remain in original APIs",()=>{
  assert.match(cloud,/function gradeReview\(grade\)/);
  assert.match(cloud,/skillState\.stage = Math\.min\(9, Math\.max\(1, skillState\.stage \+ 1\)\)/);
  assert.match(cloud,/skillState\.stage = Math\.max\(1, skillState\.stage - 1\)/);
});
