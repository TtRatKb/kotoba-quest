import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acceptedAnswers, buildRefresh, buildGrammarPreview, checkTyped, eligibleWords, isCorrect } from '../daily-engine.mjs';

const cards = [
  {id:'a',word:'行く',reading:'いく',meanings:['gehen'],stage:1,availableAt:123,example:'学校へ行く。',exampleTranslation:'Zur Schule gehen.'},
  {id:'b',word:'食べる',reading:'たべる',meanings:['essen'],stage:3,availableAt:456,example:'ご飯を食べる。',exampleTranslation:'Reis essen.'},
  {id:'c',word:'見る',reading:'みる',meanings:['sehen'],stage:5,availableAt:789,example:'映画を見る。',exampleTranslation:'Einen Film ansehen.'},
  {id:'d',word:'飲む',reading:'のむ',meanings:['trinken'],stage:2,availableAt:999,example:'水を飲む。',exampleTranslation:'Wasser trinken.'},
  {id:'e',word:'聞く',reading:'きく',meanings:['hören'],stage:4,availableAt:555},
  {id:'f',word:'書く',reading:'かく',meanings:['schreiben'],stage:7,availableAt:null},
  {id:'g',word:'読む',reading:'よむ',meanings:['lesen'],stage:8,availableAt:null},
  {id:'h',word:'話す',reading:'はなす',meanings:['sprechen'],stage:6,availableAt:null}
];

test('only learned vocabulary with usable content is admitted', () => {
  const source = [...cards, {id:'new',word:'泳ぐ',reading:'およぐ',meanings:['schwimmen'],stage:0},
    {id:'broken',word:'foo',reading:'',meanings:['bar'],stage:3}, cards[0]];
  assert.equal(eligibleWords(source).length, cards.length);
  assert.equal(buildRefresh(source, '2026-11-14').eligibleCount, cards.length);
});

test('refresh is deterministic, makes eight questions and does not mutate the SRS save', () => {
  const before = JSON.stringify(cards);
  const a = buildRefresh(cards, '2026-11-14');
  const b = buildRefresh(cards, '2026-11-14');
  assert.deepEqual(a, b);
  assert.equal(a.tasks.length, 8);
  assert(a.tasks.some(x => x.kind === 'production'));
  assert(a.tasks.some(x => x.kind === 'context'));
  assert(a.tasks.every(x => x.scored));
  assert.equal(JSON.stringify(cards), before);
});

test('no false answer options and no invalid grading in recognition', () => {
  const session = buildRefresh(cards, '2026-11-15');
  for (const task of session.tasks) {
    if (!task.options) continue;
    assert(task.options.length >= 3);
    assert.equal(new Set(task.options).size, task.options.length);
    assert(task.options.includes(task.correct));
    assert.equal(isCorrect(task, task.correct), true);
    for (const wrong of task.options.filter(v => v !== task.correct)) assert.equal(isCorrect(task, wrong), false);
  }
});

test('typed production accepts kanji/kana and approved variants, but not random text', () => {
  const card = { ...cards[0], acceptedReadings:['ゆく'], acceptedMeanings:['hingehen'], synonyms:['sich begeben'] };
  const japanese = { kind:'production', accepted:acceptedAnswers(card,'japanese') };
  const german = { kind:'meaning-type', accepted:acceptedAnswers(card,'meaning') };
  assert(checkTyped(japanese,' 行く '));
  assert(checkTyped(japanese,'いく'));
  assert(checkTyped(japanese,'ゆく'));
  assert(checkTyped(german,'HINGEHEN!'));
  assert(checkTyped(german,'sich begeben'));
  assert.equal(checkTyped(japanese,'essen'),false);
});

test('low learned count is blocked instead of silently introducing unknown words', () => {
  const session = buildRefresh(cards.slice(0,2), '2026-11-14');
  assert.equal(session.blocked,true);
  assert.equal(session.tasks.length,0);
});

test('preview grammar introduces a nuance, tests contrast and leaves open production ungraded', () => {
  const preview = buildGrammarPreview();
  assert.deepEqual(preview.tasks.map(x => x.kind),['lesson','choice','choice','open']);
  assert.equal(isCorrect(preview.tasks[1], 'Ein bedauerliches Geschehen'),true);
  assert.equal(isCorrect(preview.tasks[2], 'Vollständiger Abschluss'),true);
  assert.equal(isCorrect(preview.tasks[3], '鍵を忘れてしまった。'),null);
});

test('Daily implementation does not access write APIs for Kotoba, Firestore or Life RPG', () => {
  for (const filename of ['daily-engine.mjs','daily.js','daily.html']) {
    const text = readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text,/\b(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|clear)\s*\(/);
    assert.doesNotMatch(text,/\b(?:setDoc|updateDoc|addDoc|indexedDB\.open|postMessage|writeBridgeState)\s*\(/);
  }
});
