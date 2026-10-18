"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
let source = fs.readFileSync("cloud.html", "utf8");
const sha = crypto.createHash("sha1")
  .update("blob " + Buffer.byteLength(source) + "\0")
  .update(source).digest("hex");
if (sha !== "c254201c2347c2640676c8c4ce9a8985b78f8a93") {
  throw new Error("Cloud changed since inspection; do not patch: " + sha);
}
function once(before, after) {
  const start = source.indexOf(before);
  if (start < 0 || source.indexOf(before, start + before.length) !== -1) {
    throw new Error("Patch anchor absent or ambiguous: " + before.slice(0, 90));
  }
  source = source.slice(0, start) + after + source.slice(start + before.length);
}
const applied = [
"      // Read-only question construction; historical grammar SRS IDs/records are unchanged.",
"      const GUIDED_GRAMMAR_CHOICES = {",
"        'you-ni-naru': {",
"          '起きるようになりました': ['起きるようにしています', '起きることにしました', '起きるつもりです'],",
"          'しないようになりました': ['しないようにしています', 'しないことにしました', 'しないつもりです']",
"        }",
"      };",
"      function appliedGrammarQuestion(point, skillId, stage, rotation) {",
"        const sources = (Array.isArray(point?.formation) ? point.formation : []).filter(source =>",
"          source?.jp && source?.de && source?.highlight &&",
"          String(source.jp).includes(String(source.highlight)) &&",
"          String(source.jp).indexOf(String(source.highlight)) === String(source.jp).lastIndexOf(String(source.highlight))",
"        );",
"        if (!sources.length) return null;",
"        const source = sources[Math.max(0, rotation) % sources.length];",
"        if (skillId === 'listening') {",
"          return { applied:true, audioDictation:true, audio:String(source.jp), model:String(source.jp),",
"            translation:String(source.de), answers:[String(source.jp)],",
"            prompt:'Höre die Aussage und schreibe den japanischen Satz auf. Achte auf die verwendeten Formen.' };",
"        }",
"        if (skillId === 'production' && stage >= 5) return null;",
"        if (!['meaning', 'form', 'production'].includes(skillId)) return null;",
"        const correct = String(source.highlight);",
"        const question = { applied:true, shown:String(source.jp).replace(correct, '＿＿＿＿'),",
"          model:correct, answers:[correct], translation:String(source.de),",
"          prompt:'Ergänze die passende japanische Form für die deutsche Aussage.' };",
"        if (stage <= 2) {",
"          const distractors = GUIDED_GRAMMAR_CHOICES[point.id]?.[correct] || [];",
"          const unique = [...new Set([correct, ...distractors])];",
"          if (unique.length === 4 && unique[0] === correct) {",
"            const shift = Math.max(0, rotation) % 4;",
"            question.choices = [...unique.slice(shift), ...unique.slice(0, shift)];",
"          }",
"        }",
"        return question;",
"      }",
""
].join("\n");
once("      function makeReviewItem(pointId, skillId, practiceOnly = false) {", applied + "      function makeReviewItem(pointId, skillId, practiceOnly = false) {");
const oldVariant = [
"        const variant = ordered.find(question => {",
"          const sentence = grammarQuestionSentence(question, skillId);",
"          return sentence && !used.has(normalizeJapanese(sentence));",
"        }) || ordered[0] || point?.questions?.[skillId]?.[0];"
].join("\n");
const newVariant = [
"        const original = ordered.find(question => {",
"          const sentence = grammarQuestionSentence(question, skillId);",
"          return sentence && !used.has(normalizeJapanese(sentence));",
"        }) || ordered[0] || point?.questions?.[skillId]?.[0];",
"        const rotation = Math.max(0, Number(skillState.rotationIndex || 0)) + Math.max(0, Number(skillState.variantIndex || 0));",
"        const variant = appliedGrammarQuestion(point, skillId, stage, rotation) || original;"
].join("\n");
once(oldVariant, newVariant);
once("      function adaptiveReviewPrompt(question, skillId, difficulty) {",
"      function adaptiveReviewPrompt(question, skillId, difficulty) {\n" +
"        if (question?.applied) return String(question.prompt);\n");
once("renderSupportedSentence({ jp: reviewSentence, de: String(question.model || \"\"), highlight: \"\" }, point.color || \"#6c63d9\")",
"renderSupportedSentence({ jp: reviewSentence, de: String(question.translation || (question.applied ? \"\" : question.model || \"\")), highlight: \"\" }, point.color || \"#6c63d9\")");
once("const productionVocabularyHelp = skill.id === \"production\"",
"const productionVocabularyHelp = skill.id === \"production\" && !question.applied");
once("skill.id === \"form\" && question.translation ?", "question.translation ?");
once("        if (skill.id === \"form\" || skill.id === \"production\") attachJapaneseInput(grammarReviewAnswer);",
[
"        if (skill.id === \"form\" || skill.id === \"production\" || question.applied) attachJapaneseInput(grammarReviewAnswer);",
"        if (question.choices?.length === 4 && grammarReviewAnswer) {",
"          grammarReviewAnswer.hidden = true;",
"          grammarReviewAnswer.style.display = 'none';",
"          const group = document.createElement('div');",
"          group.className = 'grammar-grade-row';",
"          question.choices.forEach((choice, index) => {",
"            const button = document.createElement('button');",
"            button.type = 'button';",
"            button.className = 'secondary';",
"            button.textContent = String(index + 1) + '. ' + choice;",
"            button.addEventListener('click', () => {",
"              if (reviewRevealed) return;",
"              grammarReviewAnswer.value = choice;",
"              revealReviewAnswer();",
"            });",
"            group.appendChild(button);",
"          });",
"          grammarReviewAnswer.before(group);",
"          group.querySelector('button')?.focus();",
"        }"
].join("\n"));
once("        if (question.selfCheck) {\n", [
"        if (question.applied) {",
"          const normalized = normalizeJapanese(answer);",
"          const likely = (question.answers || [question.model]).some(model => normalizeJapanese(model) === normalized);",
"          return { likely, note: likely ? 'Die Form stimmt mit der hinterlegten Lösung überein.' : 'Vergleiche deine Lösung mit dem Satzkontext und der Musterlösung.' };",
"        }",
"        if (question.selfCheck) {",
""
].join("\n"));
once("function kanjiQuestionSet(item) {\n        return [vocabReadingSpec(item), kanjiReadingSpec(item), meaningSpec(item,false)];\n      }",
[
"function kanjiQuestionSet(item, completedReviews=0) {",
"        const questions = [vocabReadingSpec(item), kanjiReadingSpec(item), meaningSpec(item,false)];",
"        const shift = Math.max(0, Math.trunc(Number(completedReviews) || 0)) % questions.length;",
"        return [...questions.slice(shift), ...questions.slice(0, shift)];",
"      }"
].join("\n"));
once("const questions=isKanji?kanjiQuestionSet(item):[meaningSpec(item,true)];",
"const questions=isKanji?kanjiQuestionSet(item, Number(record.correct||0)+Number(record.incorrect||0)):[meaningSpec(item,true)];");
once("        grammarReviewAnswer?.focus();", "        if (!question.choices?.length) grammarReviewAnswer?.focus();");
fs.writeFileSync("cloud.html", source);
console.log("Patched grammar/kanji review prompts only; source bytes:", Buffer.byteLength(source));
