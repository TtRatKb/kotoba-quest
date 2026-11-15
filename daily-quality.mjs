/* Read-only exercise metadata and conservative context/distractor policy. */
const text = value => String(value ?? '').normalize('NFKC').trim();
export function usableContext(example) {
  const sentence = text(example);
  return sentence.length >= 5 && sentence.length <= 300 && /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(sentence) &&
    !/という(?:言葉|単語|表現)を(?:覚えました|学びました|勉強しました)/u.test(sentence);
}

// Explicitly curated semantic neighbourhoods, not generated sentence content.
const groups = [
  ['verb',['行く','来る','帰る','入る','出る']],
  ['verb',['食べる','飲む','作る','買う']],
  ['verb',['読む','書く','聞く','話す','見る']],
  ['noun',['学校','大学','図書館','病院','会社']],
  ['noun',['月曜日','火曜日','水曜日','木曜日','金曜日','土曜日','日曜日']],
  ['noun',['父','母','兄','姉','弟','妹']],
  ['i-adj',['大きい','小さい','長い','短い','高い','低い']],
];
function pos(value) {
  const known = {noun:'noun',verb:'verb','i-adj':'i-adj','na-adj':'na-adj',adverb:'adverb',Nomen:'noun','Godan-Verb':'verb','Ichidan-Verb':'verb','unregelmäßiges Verb':'verb','i-Adjektiv':'i-adj'};
  return known[text(value)] || null;
}
export function compatibleDistractor(target, other) {
  const a = pos(target?.pos), b = pos(other?.pos);
  if (!a || a !== b) return false;
  return groups.some(([kind, words]) => kind === a && words.includes(text(target.word)) && words.includes(text(other.word)));
}

export function prepareDailyCards(cards = [], catalog = [], save = {}) {
  const entries = Array.isArray(catalog) ? catalog : [];
  const saved = Array.isArray(save?.vocabulary) ? save.vocabulary : [];
  return (Array.isArray(cards) ? cards : []).filter(card => card && typeof card === 'object').map(card => {
    const identity = row => row?.word === card.word && row?.reading === card.reading;
    const own = saved.find(row => identity(row) && String(row.id || row.packEntryId) === String(card.id));
    const matches = entries.filter(identity);
    const exact = matches.find(row => String(row.packEntryId || row.id) === String(card.id));
    const entry = card.source === 'mining' ? null : exact || (matches.length === 1 ? matches[0] : null);
    return {...card, pos:card.pos || own?.pos || entry?.pos || ''};
  });
}
