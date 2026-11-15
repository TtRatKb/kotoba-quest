/* Kotoba Daily · pure, read-only exercise generation. No storage/SRS writes. */

import { usableContext, compatibleDistractor } from './daily-quality.mjs';
import { displayContext } from './daily-contexts.mjs';

const clean = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
const list = value => Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
const key = value => clean(value).toLocaleLowerCase('de-DE').replace(/[.!?。！？，、]+$/u, '');

export function acceptedAnswers(card, direction = 'japanese') {
  return direction === 'japanese'
    ? [...new Set([card.word, card.reading, ...list(card.acceptedReadings)].map(key).filter(Boolean))]
    : [...new Set([...list(card.meanings), ...list(card.acceptedMeanings), ...list(card.synonyms), ...list(card.meaningAlternatives)].map(key).filter(Boolean))];
}

export function checkTyped(task, input) {
  return (task.accepted || []).includes(key(input));
}

export function eligibleWords(cards = []) {
  if (!Array.isArray(cards)) return [];
  const seen = new Set();
  return cards.filter(card => {
    if (!card || !(Number(card.stage) >= 1 || card.guruPassed === true)) return false;
    if (!clean(card.word) || !clean(card.reading) || !list(card.meanings).length) return false;
    const identity = `${clean(card.source || card.sourceType)}:${clean(card.id || card.packEntryId || `${card.word}|${card.reading}`)}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function hash(value) {
  let number = 2166136261;
  for (const char of String(value)) {
    number ^= char.charCodeAt(0);
    number = Math.imul(number, 16777619);
  }
  return number >>> 0;
}

function shuffle(items, seed) {
  let random = hash(seed) || 1;
  const next = () => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return (random >>> 0) / 4294967296; };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function primaryMeaning(card) { return list(card.meanings)[0]; }

/** Only mask an exact, unique surface form from an existing card example.
 * Conservatively reject potential Kanji/Katakana compounds and sentence-only words.
 * Never morph or generate Japanese grammar; the learner reconstructs the source form.
 */
export function contextCloze(card) {
  const word = clean(card?.word);
  const sentence = clean(displayContext(card).sentence);
  if ([...word].length < 2 || !usableContext(sentence) || !primaryMeaning(card || {})) return null;
  const start = sentence.indexOf(word);
  if (start < 0 || sentence.indexOf(word, start + 1) >= 0) return null;
  const before = sentence.slice(0, start);
  const after = sentence.slice(start + word.length);
  const context = before + after;
  if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(context)) return null;
  // A substring of a longer Kanji/Katakana compound is not a trustworthy word gap.
  if (/[\p{Script=Han}\p{Script=Katakana}]/u.test(before.at(-1) || '') ||
      /[\p{Script=Han}\p{Script=Katakana}]/u.test(after[0] || '')) return null;
  return { prompt: before + '＿＿' + after, answer: word };
}

function optionsFor(card, candidates, seed) {
  const correct = primaryMeaning(card);
  const used = new Set([key(correct)]);
  const alternatives = shuffle(candidates, seed).filter(other => {
    if (other === card || !compatibleDistractor(card, other)) return false;
    const label = primaryMeaning(other);
    if (!label || used.has(key(label))) return false;
    // Never offer a distractor that is also an accepted meaning for the target.
    if (acceptedAnswers(card, 'meaning').includes(key(label))) return false;
    if (acceptedAnswers(other, 'meaning').some(answer => acceptedAnswers(card, 'meaning').includes(answer))) return false;
    used.add(key(label));
    return true;
  }).slice(0, 3).map(primaryMeaning);
  return alternatives.length >= 2 ? shuffle([correct, ...alternatives], seed + '|choices') : null;
}

function createVocabularyTask(card, type, all, seed, index) {
  const word = clean(card.word);
  const reading = clean(card.reading);
  const meaning = primaryMeaning(card);
  const pair = displayContext(card);
  const context = clean(pair.sentence);
  const contextMeta = {contextId:pair.id,contextReadings:pair.id?pair.readings:undefined};
  const hasExample = context && (context.includes(word) || context.includes(reading));
  const cloze = type === 'cloze' ? contextCloze(card) : null;
  if (cloze) return {
    id: `vocab-${index}`,
    ...contextMeta,
    kind: 'cloze',
    label: 'Satzlücke ergänzen',
    prompt: cloze.prompt,
    secondary: `Welches bereits gelernte Wort bedeutet „${meaning}“? Ergänze die Lücke mit dem Wort oder seiner Lesung.`,
    target: '',
    word, reading,
    options: null,
    correct: word,
    accepted: acceptedAnswers(card, 'japanese'),
    explanation: `Gesucht war 「${word}」（${reading}） – ${meaning}. Weitere passende Formulierungen werden nicht automatisch als falsch bewertet.`,
    example: context,
    exampleTranslation: context ? clean(pair.translation) : '',
    scored: true
  };
  if (type === 'reading' && /\p{Script=Han}/u.test(word)) return {
    id: `vocab-${index}`, ...contextMeta, kind:'production', readingTask:true, label:'Lesung abrufen',
    prompt:word, word, reading, secondary:'Wie liest du dieses Wort? Tippe seine Lesung in Kana oder Romaji.',
    options:null, correct:reading, accepted:[reading,...list(card.acceptedReadings)].map(key),
    explanation:`「${word}」（${reading}） – ${meaning}`, example:context,
    exampleTranslation:context ? clean(pair.translation) : '', scored:true
  };
  const options = optionsFor(card, all, `${seed}|${index}`);
  const isContext = type === 'context' && Boolean(hasExample);
  const effectiveType = type === 'production' ? 'production' : options ? (isContext ? 'context' : 'meaning') : 'meaning-type';
  return {
    id: `vocab-${index}`,
    ...contextMeta,
    kind: effectiveType,
    label: isContext ? 'Wort im Kontext' : type === 'production' ? 'Aktiv anwenden' : 'Bedeutung verstehen',
    prompt: type === 'production' ? meaning : isContext ? context : word,
    secondary: type === 'production' ? 'Wie heißt das auf Japanisch?' : isContext ? 'Was bedeutet das hervorgehobene Wort?' : 'Was bedeutet dieses Wort?',
    target: isContext ? word : '',
    word, reading,
    options: effectiveType === 'production' || effectiveType === 'meaning-type' ? null : options,
    correct: meaning,
    accepted: acceptedAnswers(card, type === 'production' ? 'japanese' : 'meaning'),
    explanation: `「${word}」（${reading}） – ${meaning}`,
    example: context || '',
    exampleTranslation: context ? clean(pair.translation) : '',
    scored: true
  };
}

/** Stable per-day session, chosen only from the already-learned vocabulary supplied by the source. */
export function buildRefresh(cards, dateKey = 'preview') {
  const learned = eligibleWords(cards);
  if (learned.length < 3) return { mode: 'refresh', tasks: [], eligibleCount: learned.length, blocked: true };
  const apprentice = shuffle(learned.filter(x => Number(x.stage) <= 4 && Number(x.stage) >= 1), `${dateKey}|apprentice`);
  const familiar = shuffle(learned.filter(x => !(Number(x.stage) <= 4 && Number(x.stage) >= 1)), `${dateKey}|familiar`);
  const arranged = [];
  const recent = new Set();
  const pool = [apprentice, familiar];
  for (let i = 0; i < 8; i++) {
    const preferred = i % 3 === 2 ? 1 : 0;
    const pickFrom = [pool[preferred], pool[1-preferred]];
    let selected = null;
    for (const subset of pickFrom) {
      const found = subset.find(card => !recent.has(card));
      if (found) { selected = found; subset.splice(subset.indexOf(found), 1); break; }
    }
    if (!selected) {
      // Reuse when the learner has fewer than eight words, but avoid immediate repeats.
      const fallback = shuffle(learned.filter(card => card !== arranged.at(-1)), `${dateKey}|repeat|${i}`);
      selected = fallback[0] || learned[0];
    }
    arranged.push(selected);
    recent.add(selected);
  }
  // Prefer one safe, exact sentence gap if a suitable learned example exists.
  // Keep the later context-meaning task: variety instead of eight text entries.
  if (!contextCloze(arranged[2])) {
    const gapIndex = arranged.findIndex((card, index) => index !== 2 && contextCloze(card));
    if (gapIndex >= 0) [arranged[2], arranged[gapIndex]] = [arranged[gapIndex], arranged[2]];
  }
  const order = ['meaning', 'production', 'cloze', 'meaning', 'reading', 'context', 'production', 'meaning'];
  return {
    mode: 'refresh',
    tasks: arranged.map((card, index) => createVocabularyTask(card, order[index], learned, dateKey, index)),
    eligibleCount: learned.length,
    blocked: false
  };
}

/** Curated introductory example, deliberately separate from any canonical grammar SRS. */
export function buildGrammarPreview() {
  return {
    mode: 'discovery',
    tasks: [
      {
        id: 'intro', kind: 'lesson', label: 'Neues entdecken', prompt: '〜てしまう',
        secondary: 'Diese Form kann eine abgeschlossene Handlung ausdrücken. Je nach Kontext schwingt auch Bedauern mit.',
        explanation: '忘れてしまった bedeutet in diesem Kontext: „(leider) vergessen“. Das しまう allein bedeutet nicht immer Bedauern.',
        example: '宿題を家に忘れてしまった。',
        exampleTranslation: 'Ich habe die Hausaufgaben (leider) zu Hause vergessen.',
        scored: false
      },
      {
        id: 'nuance', kind: 'choice', label: 'Bedeutung erkennen',
        prompt: '大事な書類をなくしてしまった。', secondary: 'Was vermittelt 〜てしまった hier?',
        options: ['Eine künftige Absicht', 'Ein bedauerliches Geschehen', 'Eine höfliche Bitte'],
        correct: 'Ein bedauerliches Geschehen',
        explanation: 'Der Sprecher hat ein wichtiges Dokument verloren und bedauert das Geschehene.', scored: true
      },
      {
        id: 'contrast', kind: 'choice', label: 'Nuancen unterscheiden',
        prompt: 'もう宿題を全部やってしまったから、遊べる。', secondary: 'Welche Lesart steht hier im Vordergrund?',
        options: ['Vollständiger Abschluss', 'Ein Verbot', 'Eine Vermutung'],
        correct: 'Vollständiger Abschluss',
        explanation: 'Hier steht im Vordergrund, dass die Hausaufgaben vollständig erledigt sind. Bedauern ist nicht notwendig.', scored: true
      },
      {
        id: 'open', kind: 'open', label: 'Selbst formulieren',
        prompt: 'Du hast deinen Schlüssel leider vergessen.',
        secondary: 'Formuliere einen passenden Satz auf Japanisch. Es kann mehrere richtige Lösungen geben.',
        example: '鍵を忘れてしまった。',
        explanation: 'Das ist eine mögliche Lösung, keine automatische Bewertung. „鍵“ (かぎ) bedeutet Schlüssel.',
        scored: false
      }
    ]
  };
}

export function isCorrect(task, response) {
  if (task.kind === 'cloze') return checkTyped(task, response) ? true : null;
  if (task.kind === 'production' || task.kind === 'meaning-type') return checkTyped(task, response);
  if (task.kind === 'choice' || task.kind === 'context' || task.kind === 'meaning') return key(task.correct) === key(response);
  return null;
}
