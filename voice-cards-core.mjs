/* Optional speaking flashcards: all input and scoring remain in memory.
 * No storage, SRS, cloud, or Life RPG writes.
 */
import {acceptedAnswers,eligibleWords} from './daily-engine.mjs';

const norm = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('de-DE')
  .replace(/[。.!?？！…。、，,;；]+$/gu,'').replace(/\s+/gu,' ');
const jp = value => norm(value).replace(/\s+/gu,'').replace(/[ァ-ヶ]/gu,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60));
function hash(value) {
  let n=2166136261;
  for (const ch of String(value)) n=Math.imul(n ^ ch.charCodeAt(0),16777619)>>>0;
  return n;
}
function shuffle(items,seed) {
  let n=hash(seed)||1;const output=[...items];
  for(let i=output.length-1;i>0;i--){
    n^=n<<13;n^=n>>>17;n^=n<<5;
    const j=Math.floor((n>>>0)/4294967296*(i+1));
    [output[i],output[j]]=[output[j],output[i]];
  }
  return output;
}
const rank = card => Number(card.stage)>=1 && Number(card.stage)<=4 ? 0 : Number(card.stage)<=6 ? 1 : 2;

export function buildVoiceDeck(cards,{direction='de-jp',limit=8,seed='voice-preview'}={}) {
  if(!['de-jp','jp-de','mixed'].includes(direction))return [];
  const ordered=shuffle(eligibleWords(cards),seed).sort((a,b)=>rank(a)-rank(b));
  return ordered.slice(0,Math.max(0,Math.min(12,limit))).map((card,index)=>({
    card,
    direction:direction==='mixed'?(index%2===0?'de-jp':'jp-de'):direction
  }));
}
export function promptFor(task) {
  return task?.direction==='de-jp'
    ? String(task.card.meanings[0]||'')
    : String(task.card.word||'');
}
export function solutionFor(task){
  return task?.direction==='de-jp'
    ? task.card.word+(task.card.reading && task.card.reading!==task.card.word?'（'+task.card.reading+'）':'')
    : task.card.meanings[0];
}
export function acceptsVoiceAnswer(task,spoken) {
  if(!task||!norm(spoken))return false;
  const target=task.direction==='de-jp'?'japanese':'meaning';
  const alternatives=acceptedAnswers(task.card,target);
  const normalize=target==='japanese'?jp:norm;
  return alternatives.some(a=>normalize(a)===normalize(spoken));
}


/* Browser speech transcripts are not proof of pronunciation quality.
 * The recognizer can choose different kanji for the very same spoken sound.
 * Exact known readings count; one-kana approximations only suggest manual review.
 */
const kanaForm=value=>jp(value).replace(/[「」『』（）()[\]｛｝{}]/gu,'').replace(/[\s\u200b-\u200d\ufeff]/gu,'');
const latinKana=(value,toHiragana)=>{
  if(typeof toHiragana!=='function')return '';
  const input=norm(value).replace(/ō/g,'ou').replace(/ū/g,'uu').replace(/ā/g,'aa').replace(/ī/g,'ii').replace(/ē/g,'ee');
  if(!/^[a-z'-]+$/iu.test(input))return '';
  const converted=toHiragana(input,true);
  return /^[\p{Script=Hiragana}ー]+$/u.test(converted)?kanaForm(converted):'';
};
function recognizedKana(value,lexicon,toHiragana) {
  const surface=kanaForm(value);
  if(/^[\p{Script=Hiragana}ー]+$/u.test(surface))return surface;
  const romanized=latinKana(value,toHiragana);
  if(romanized)return romanized;
  // Only use unique readings from our own known vocabulary. Arbitrary kanji
  // are not phonetic and must not be guessed from their written appearance.
  const readings=new Set((Array.isArray(lexicon)?lexicon:[])
    .filter(card=>kanaForm(card?.word)===surface)
    .map(card=>kanaForm(card?.reading))
    .filter(reading=>/^[\p{Script=Hiragana}ー]+$/u.test(reading)));
  return readings.size===1?[...readings][0]:'';
}
function editDistanceOne(a,b) {
  const x=[...a],y=[...b];if(Math.abs(x.length-y.length)>1)return false;
  let i=0,j=0,edits=0;
  while(i<x.length&&j<y.length){
    if(x[i]===y[j]){i++;j++;continue;}
    if(++edits>1)return false;
    if(x.length>y.length)i++;
    else if(x.length<y.length)j++;
    else{i++;j++;}
  }
  return edits+x.length-i+y.length-j===1;
}
export function gradeSpeechCandidates(task,transcripts,{lexicon=[],toHiragana=null}={}) {
  const raw=(Array.isArray(transcripts)?transcripts:[]).filter(value=>typeof value==='string'&&norm(value));
  const empty={match:'none',transcript:raw[0]||'',expectedReading:task?.card?.reading||''};
  if(!task||!raw.length)return empty;
  for(const transcript of raw){
    if(acceptsVoiceAnswer(task,transcript))return {...empty,match:'exact',transcript};
    if(task.direction==='de-jp'){
      const normalized=recognizedKana(transcript,lexicon,toHiragana);
      const allowed=[task.card.word,task.card.reading,...(task.card.acceptedReadings||[])].map(kanaForm).filter(v=>/^[\p{Script=Hiragana}ー]+$/u.test(v));
      if(normalized&&allowed.includes(normalized))return {...empty,match:'exact',transcript};
    }
  }
  if(task.direction==='de-jp'){
    // Only a hint, never an automatic pass: Japanese minimal pairs can differ
    // in one mora (including a long vowel or small kana).
    const targets=[task.card.reading,...(task.card.acceptedReadings||[])]
      .map(kanaForm).filter(value=>/^[\p{Script=Hiragana}ー]+$/u.test(value));
    for(const transcript of raw){
      const heard=recognizedKana(transcript,lexicon,toHiragana);
      if(!heard)continue;
      if(targets.some(expected=>[...expected].length>=4 && [...heard].length>=3 &&
          heard[0]===expected[0] && editDistanceOne(heard,expected)))
        return {...empty,match:'near',transcript};
    }
  }
  return empty;
}


/** A tiny contrast prompt for plausible homophones/mishearings.
 * Known vocabulary readings only: no speculative phonetic decoding of kanji.
 * These are choices about what the learner actually said, not automatic grades.
 */
export function spokenContrastChoices(task,transcript,{lexicon=[],toHiragana=null}={}) {
 if(task?.direction!=='de-jp')return [];
 const heard=recognizedKana(transcript,lexicon,toHiragana);
 if(!heard)return [];
 const candidates=[heard];
 const target=String(task.card?.word||'');
 const expected=recognizedKana(task.card?.reading,lexicon,toHiragana);
 // e.g. お客さん vs 客: honorific お…さん can expose a useful
 // contrast (きゃく / ひゃく) without treating the shortened noun as correct.
 const written=target,reading=String(task.card?.reading||'');
 if(written.startsWith('お')&&written.endsWith('さん')&&reading.startsWith('お')&&reading.endsWith('さん')){
   const base=reading.slice(1,-2);
   if([...base].length>=2&&base!==heard&&editDistanceOne(base,heard))candidates.unshift(base);
 }
 if(expected && expected!==heard && editDistanceOne(expected,heard))candidates.unshift(expected);
 for(const word of lexicon){
   const surface=String(word?.word||'');
   if(!surface || !target.includes(surface) || surface===target)continue;
   const reading=recognizedKana(word?.reading,lexicon,toHiragana);
   if(reading && reading!==heard && [...reading].length>=2 && editDistanceOne(reading,heard) && !candidates.includes(reading))
     candidates.unshift(reading);
   if(candidates.length>=3)break;
 }
 return [...new Set(candidates)].slice(0,3);
}
