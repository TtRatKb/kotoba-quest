import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cloud = readFileSync(new URL("../cloud.html", import.meta.url), "utf8");
function between(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, "Missing source section: " + start);
  return text.slice(from, to);
}

test("embedded vocabulary app JavaScript parses", () => {
  const scripts = [...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  new Script(scripts.at(-1)[1]);
});

test("reintroduced legacy menu buttons stay hidden while modern navigation is installed", () => {
  assert.match(index, /\.nav\[data-kq-ia-version\] > button:not\(\[data-kq-main-group\]\) \{ display:none !important; \}/);
  assert.match(cloud, /nav\.dataset\.kqIaVersion = VERSION/);
});

test("changing vocabulary prompts cancels stale autoplay before it can speak", () => {
  const timers = new Map();
  const spoken = [];
  let nextId = 0;
  const sandbox = {
    window: { speechSynthesis: { cancel() {} } },
    data: { audioAutoplay: true },
    preloadItemAudio() {},
    playItemAudio(item) { spoken.push(item.id); },
    setTimeout(callback) { const id = ++nextId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  runInNewContext(`let audioRequestToken = 0, pendingAutoplayTimer = null, currentNativeAudio = null;
    ${between(index, "    function stopAudioPlayback()", "    function remoteHumanWordUrl")}
    ${between(index, "    function autoplayJapanese(item)", "    const REUSABLE_AUDIO_LICENSE")}
    globalThis.audioApi = { stopAudioPlayback, autoplayJapanese };`, sandbox);
  const { autoplayJapanese, stopAudioPlayback } = sandbox.audioApi;

  autoplayJapanese({ id: "old", reading: "あ" });
  stopAudioPlayback();
  autoplayJapanese({ id: "current", reading: "い" });
  assert.equal(timers.size, 1);
  for (const callback of [...timers.values()]) callback();
  assert.deepEqual(spoken, ["current"]);

  assert.match(index, /function renderReview\(\) \{\s*\/\/ A new prompt invalidates delayed or playing audio/);
  assert.match(index, /function renderPlacement\(\) \{\s*\/\/ A new prompt invalidates delayed or playing audio/);
  assert.match(index, /function renderLesson\(\) \{\s*\/\/ A new prompt invalidates delayed or playing audio/);
});

test("sentence practice ignores stale or hidden autoplay callbacks", () => {
  const oldQuestion = { spec: { jp: "古い" } };
  const current = { spec: { jp: "新しい" } };
  const session = { questions: [oldQuestion, current], index: 1 };
  const spoken = [];
  let visible = true;
  const sandbox = {
    session,
    window: { speechSynthesis: {} },
    document: { getElementById: () => ({ classList: { contains: () => visible } }) },
    currentQuestion: () => session.questions[session.index],
    speechSynthesis: { cancel() {}, getVoices: () => [], speak: utterance => spoken.push(utterance.text) },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    clearTimeout() {}
  };
  const code = `let audioUtterance = null;
    ${between(cloud, "      let practiceAutoplayTimer = null;", "      function grammarBadge")}
    globalThis.practiceAudio = { playPracticeAudio, stopAudio };`;
  new Script(code);
  runInNewContext(code, sandbox);
  sandbox.practiceAudio.playPracticeAudio(oldQuestion);
  assert.deepEqual(spoken, []);
  sandbox.practiceAudio.playPracticeAudio(current);
  assert.deepEqual(spoken, ["新しい"]);
  visible = false;
  sandbox.practiceAudio.playPracticeAudio(current);
  assert.deepEqual(spoken, ["新しい"]);
  assert.match(cloud, /generation !== practiceAudioGeneration \|\| currentQuestion\(\) !== question/);
  assert.match(cloud, /function renderPractice\(\) \{\s*stopAudio\(\)/);
});
