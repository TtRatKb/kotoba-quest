import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { spawnSync } from "node:child_process";

const cloud = readFileSync(new URL("../cloud.html", import.meta.url), "utf8");
function between(start, end) {
  const from = cloud.indexOf(start);
  const to = cloud.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, "Missing review section: " + start);
  return cloud.slice(from, to);
}
const bank = between("      // Read-only question construction; historical grammar SRS IDs/records are unchanged.",
                     "      function makeReviewItem(pointId");
const pointsSource = between("      const POINTS = [", "\n      ];") + "\n      ];\nglobalThis.points = POINTS;";
const sandbox = {};
runInNewContext(bank + "\nglobalThis.build = appliedGrammarQuestion;", sandbox);
const data = {};
runInNewContext(pointsSource, data, {timeout:5000});
const ids = ["you-ni-naru", "you-ni-suru", "koto-ni-naru", "koto-ni-suru", "naku-naru"];

test("first five grammar points have three vetted MC clozes each", () => {
  assert.ok(data.points.length >= 5);
  let questions = 0;
  const answerSlots = new Set();
  for (const id of ids) {
    const point = data.points.find(item => item.id === id);
    assert.ok(point, id);
    assert.equal(point.formation.length, 3, "unexpected source change: " + id);
    const original = JSON.stringify(point);
    for (let i = 0; i < point.formation.length; i++) {
      const source = point.formation[i];
      const q = sandbox.build(point, "meaning", 1, i);
      assert.equal(q.model, source.highlight);
      assert.equal(q.translation, source.de);
      assert.equal(q.explanation, source.note);
      assert.equal(q.choices.length, 4, "missing curated choices for " + id + " / " + i);
      assert.equal(new Set(Array.from(q.choices)).size, 4);
      assert.ok(q.choices.includes(source.highlight));
      assert.equal(q.shown.replace("＿＿＿＿", source.highlight), source.jp);
      assert.ok(!q.prompt.includes(source.highlight), "prompt must not reveal the answer");
      for (const choice of q.choices) {
        assert.ok(!choice.includes("＿＿＿＿"), "incomplete distractor");
      }
      answerSlots.add(q.choices.indexOf(q.model));
      assert.equal(q.choices.filter(choice => choice === q.model).length, 1);
      const mid = sandbox.build(point, "form", 4, i);
      assert.equal(mid.choices, undefined, "middle levels must require typing");
      assert.equal(mid.model, source.highlight);
      assert.ok(mid.answers.includes(q.model));
      questions++;
    }
    assert.equal(JSON.stringify(point), original, "question construction must not write to progress");
  }
  assert.equal(questions, 15);
  assert.ok(answerSlots.size >= 3, "correct choices should not always occupy the same position");
});

test("answer position rotates without changing the source or correctness", () => {
  const point = data.points.find(item => item.id === "koto-ni-naru");
  const indices = [0,3,6,9].map(rotation => {
    const q = sandbox.build(point, "form", 1, rotation);
    return q.choices.indexOf(q.model);
  });
  assert.equal(new Set(indices).size, 4);
});

test("explicitly vetted hiragana alternatives are graded correctly", () => {
  const q = sandbox.build(data.points.find(item => item.id === "you-ni-naru"), "form", 3, 2);
  assert.equal(q.model, "読めるようになりました");
  assert.ok(q.answers.includes("よめるようになりました"));
  const assess = between("      function normalizeJapanese(value) {", "      function revealReviewAnswer() {");
  const judge = {};
  runInNewContext(assess + "\nglobalThis.assess = assessAnswer;", judge);
  assert.equal(judge.assess(q, "form", "よめるようになりました。").likely, true);
  assert.equal(judge.assess(q, "form", "読めると思います").likely, false);
});

test("unvetted points never acquire generated multiple-choice distractors", () => {
  const point = data.points.find(item => item.id === "uchi-ni");
  assert.ok(point?.formation?.length);
  const q = sandbox.build(point, "form", 1, 0);
  assert.equal(q.choices, undefined);
});

test("context explanation only renders in revealed feedback, never pre-answer", () => {
  const initialRender = between("      function renderReview() {", "      function normalizeJapanese(value) {");
  const feedback = between("      function revealReviewAnswer() {", "      function gradeReview(grade)");
  assert.doesNotMatch(initialRender, /question\.explanation/);
  assert.match(feedback, /question\.applied && question\.explanation/);
  assert.match(feedback, /escapeHtml\(question\.explanation\)/);
  assert.match(cloud, /skillState\.stage = Math\.max\(1, skillState\.stage - 1\)/);
});

test("complete embedded grammar script parses after question and feedback edits", () => {
  const scripts = [...cloud.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const owner = scripts.find(match => match[2].includes("const GUIDED_GRAMMAR_CHOICES ="));
  assert.ok(owner, "expected grammar bootstrap script");
  assert.match(owner[1], /type=["']module/);
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: owner[2], encoding: "utf8", maxBuffer: 12 * 1024 * 1024
  });
  assert.equal(result.status, 0, result.stderr);
});
