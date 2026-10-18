import { readFileSync, writeFileSync } from "node:fs";

const path = "cloud.html";
let source = readFileSync(path, "utf8");
if (source.includes("const VERIFIED_GRAMMAR_ALTERNATES = ")) {
  console.log("Grammar patch already present; no additional changes.");
  process.exit(0);
}
const choices = {
  "you-ni-naru": {
    "起きるようになりました": [
      "起きるようにしています",
      "起きることにしました",
      "起きるつもりです"
    ],
    "しないようになりました": [
      "しないようにしています",
      "しないことにしました",
      "しないつもりです"
    ],
    "読めるようになりました": [
      "読めるはずです",
      "読めるかもしれません",
      "読めると思います"
    ]
  },
  "you-ni-suru": {
    "歩くようにします": [
      "歩くことにしました",
      "歩くことになりました",
      "歩くつもりです"
    ],
    "見ないようにします": [
      "見ないことにしました",
      "見なくなりました",
      "見ないつもりです"
    ],
    "読むようにしています": [
      "読むようになりました",
      "読むことにしました",
      "読むつもりです"
    ]
  },
  "koto-ni-naru": {
    "働くことになりました": [
      "働くことにしました",
      "働く予定です",
      "働くつもりです"
    ],
    "参加しないことになりました": [
      "参加しないことにしました",
      "参加しない予定です",
      "参加しないつもりです"
    ],
    "食べないことになっています": [
      "食べないことにしています",
      "食べないようにしています",
      "食べなくなりました"
    ]
  },
  "koto-ni-suru": {
    "勉強することにします": [
      "勉強することになりました",
      "勉強するつもりです",
      "勉強するようになりました"
    ],
    "出かけないことにします": [
      "出かけないことになりました",
      "出かけないつもりです",
      "出かけないかもしれません"
    ],
    "しないことにしています": [
      "しないことになっています",
      "しないようにしています",
      "しなくなりました"
    ]
  },
  "naku-naru": {
    "見なくなりました": [
      "見ないことにしました",
      "見ないようにしています",
      "見られなくなりました"
    ],
    "怖くなくなりました": [
      "怖くありません",
      "怖くないはずです",
      "怖くないと思います"
    ],
    "静かではなくなりました": [
      "静かではありません",
      "静かではないかもしれません",
      "静かではないはずです"
    ]
  }
};
const alternates = {
  "you-ni-naru": {
    "起きるようになりました": [
      "おきるようになりました"
    ],
    "読めるようになりました": [
      "よめるようになりました"
    ]
  },
  "you-ni-suru": {
    "歩くようにします": [
      "あるくようにします"
    ],
    "見ないようにします": [
      "みないようにします"
    ],
    "読むようにしています": [
      "よむようにしています"
    ]
  },
  "koto-ni-naru": {
    "働くことになりました": [
      "はたらくことになりました"
    ],
    "参加しないことになりました": [
      "さんかしないことになりました"
    ],
    "食べないことになっています": [
      "たべないことになっています"
    ]
  },
  "koto-ni-suru": {
    "勉強することにします": [
      "べんきょうすることにします"
    ],
    "出かけないことにします": [
      "でかけないことにします"
    ]
  },
  "naku-naru": {
    "見なくなりました": [
      "みなくなりました"
    ],
    "怖くなくなりました": [
      "こわくなくなりました"
    ],
    "静かではなくなりました": [
      "しずかではなくなりました"
    ]
  }
};

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(label + " does not occur exactly once; refusing to change cloud.html");
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}
const bankStart = "      const GUIDED_GRAMMAR_CHOICES = {";
const functionStart = "      function appliedGrammarQuestion(point, skillId, stage, rotation) {";
const from = source.indexOf(bankStart);
const to = source.indexOf(functionStart, from);
if (from < 0 || to < 0 || source.indexOf(bankStart, from + 1) !== -1) {
  throw new Error("Grammar builder boundary is missing or ambiguous");
}
const bank =
  "      // Context-vetted: all three distractors are grammatical but do not convey the German meaning.\n" +
  "      // No automatic conjugation or distractor synthesis.\n" +
  "      const GUIDED_GRAMMAR_CHOICES = " + JSON.stringify(choices, null, 2) + ";\n" +
  "      // Explicitly checked orthographic variants, without broad fuzzy matches.\n" +
  "      const VERIFIED_GRAMMAR_ALTERNATES = " + JSON.stringify(alternates, null, 2) + ";\n";
source = source.slice(0, from) + bank + source.slice(to);

replaceOnce(
  "        const question = { applied:true, shown:String(source.jp).replace(correct, '＿＿＿＿'),\n" +
  "          model:correct, answers:[correct], translation:String(source.de),\n" +
  "          prompt:'Ergänze die passende japanische Form für die deutsche Aussage.' };",
  "        const question = { applied:true, shown:String(source.jp).replace(correct, '＿＿＿＿'),\n" +
  "          model:correct, answers:[correct, ...(VERIFIED_GRAMMAR_ALTERNATES[point.id]?.[correct] || [])],\n" +
  "          translation:String(source.de), explanation:String(source.note || ''),\n" +
  "          prompt:'Ergänze die passende japanische Form für die deutsche Aussage.' };",
  "applied grammar question"
);

replaceOnce(
  "            const shift = Math.max(0, rotation) % 4;\n" +
  "            question.choices = [...unique.slice(shift), ...unique.slice(0, shift)];",
  "            // Avoid always putting the correct answer first on initial reviews.\n" +
  "            const key = String(point.id) + '|' + correct + '|' + skillId;\n" +
  "            const seed = [...key].reduce((sum, character) => sum + character.codePointAt(0), 0);\n" +
  "            const shift = (seed + Math.max(0, rotation)) % 4;\n" +
  "            question.choices = [...unique.slice(shift), ...unique.slice(0, shift)];",
  "guided choice order"
);
const explanation = "$" +
  '{question.applied && question.explanation ? \`<div class="grammar-review-explanation" style="margin-top:10px"><strong>Warum?</strong> ' +
  "$" + '{escapeHtml(question.explanation)}</div>\` : ""}';
const feedbackNeedle =
  '            <div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--kq-wash,#f4efff)"><span class="small muted">Geprüfte Struktur</span>';
replaceOnce(feedbackNeedle, "            " + explanation + "\n" + feedbackNeedle, "post-answer grammar explanation");

if (source.length < 5_000_000 ||
    (Object.values(choices).reduce((n, entry) => n + Object.keys(entry).length, 0) !== 15)) {
  throw new Error("Unexpected loss of cloud.html contents or reviewed choices");
}
writeFileSync(path, source, "utf8");
console.log("Updated cloud.html with 15 curated grammar contexts and review feedback; no SRS or storage changes.");
