/* Rendering aid only: never call Kanji getters/normalizers that may recover saves. */
import { KANJI_IDS } from './daily-kanji-map.mjs';
const han = value => /\p{Script=Han}/u.test(value || '');
const validReading = value => typeof value === 'string' && /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(value);

// Small editorial glossary for existing guided examples, not inferred on/kun readings.
const glossary = {宿題:'しゅくだい',図書館:'としょかん',勉強:'べんきょう',机:'つくえ',上:'うえ',本:'ほん',公園:'こうえん',遊びます:'あそびます',部屋:'へや',猫:'ねこ',誰:'だれ',来ました:'きました',先生:'せんせい',学生:'がくせい',日本語:'にほんご',話せる:'はなせる',毎日:'まいにち',読む:'よむ',練習:'れんしゅう',漢字:'かんじ',読める:'よめる',忘れない:'わすれない',忘れて:'わすれて',大事:'だいじ',書類:'しょるい',全部:'ぜんぶ',鍵:'かぎ',九時:'くじ',五時:'ごじ',働きます:'はたらきます',授業:'じゅぎょう',十二時:'じゅうにじ',水:'みず',飲みました:'のみました',店:'みせ',一つ:'ひとつ',残って:'のこって',飲みませんでした:'のみませんでした',最近:'さいきん',早く:'はやく',起きる:'おきる',夜更かし:'よふかし',甘い:'あまい',食べすぎない:'たべすぎない',八時:'はちじ',十時:'じゅうじ',午後:'ごご',六時:'ろくじ',開いて:'あいて',買いました:'かいました',お茶:'おちゃ'};

export function knowsKanji(save, character) {
  const state = save?.kanjiPilot;
  if (state?.version !== 4 || state.settings?.furiganaMode === 'always' || !state.kanji || Array.isArray(state.kanji)) return false;
  const record = state.kanji[KANJI_IDS[character]];
  return Boolean(KANJI_IDS[character] && record?.lessonComplete === true && !record.placement &&
    Number.isInteger(record.stage) && record.stage >= 5 && record.stage <= 9);
}

export function readingLexicon(rows = []) {
  const readings = new Map();
  for (const {word, reading} of [...Object.entries(glossary).map(([word,reading])=>({word,reading})),...(Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object') : [])]) {
    if (typeof word !== 'string' || !han(word) || !validReading(reading)) continue;
    if (!readings.has(word)) readings.set(word,new Set());
    readings.get(word).add(reading);
  }
  const byFirst = new Map();
  for (const [word, values] of readings) {
    if (values.size !== 1) continue; // Do not guess among competing readings.
    const item = {text:word, reading:[...values][0]};
    const first = [...word][0];
    if (!byFirst.has(first)) byFirst.set(first,[]);
    byFirst.get(first).push(item);
  }
  for (const items of byFirst.values()) items.sort((a,b)=>b.text.length-a.text.length);
  return byFirst;
}

export function japaneseSegments(value, lexicon, save, {hide = false, target = ''} = {}) {
  const source = String(value ?? '');
  const output = [];
  for (let i=0;i<source.length;) {
    const items = lexicon.get(source[i]) || [];
    const match = items.find(item => source.startsWith(item.text,i) &&
      !(han(source[i-1]) && han(item.text[0])) &&
      !(han(item.text.at(-1)) && han(source[i+item.text.length])));
    const word = match?.text || (target && source.startsWith(target,i) ? target : String.fromCodePoint(source.codePointAt(i)));
    const characters = [...word].filter(han);
    const reading = !hide && match && characters.some(char=>!knowsKanji(save,char)) ? match.reading : null;
    output.push({text:word,reading,highlight:word===target});
    i+=word.length;
  }
  return output;
}
