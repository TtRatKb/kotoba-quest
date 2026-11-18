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

/** Mirror the existing core-review first-direction rule, read-only.
 * Correct/incorrect totals must come from the actual saved card, never from
 * a guessed or restored counter.
 */
export function firstVocabularyDirection(card) {
  const id=String(card.packEntryId || card.id || `${card.word || ''}/${card.reading || ''}`);
  let parity=0;
  for(const character of id)parity=(parity+character.codePointAt(0))%2;
  const completed=Math.max(0,Math.trunc(Number(card.correct)||0))
    +Math.max(0,Math.trunc(Number(card.incorrect)||0));
  return (parity+completed)%2===0 ? 'de-jp' : 'jp-de';
}

export function buildVoiceDeck(cards,{direction='de-jp',limit=8,seed='voice-preview'}={}) {
  if(!['de-jp','jp-de','mixed','both'].includes(direction))return [];
  const ordered=shuffle(eligibleWords(cards),seed).sort((a,b)=>rank(a)-rank(b));
  const selected=ordered.slice(0,Math.max(0,Math.min(12,limit)));
  if(direction==='both'){
    // Separate first and second exposures by the entire first block, just as
    // the canonical vocabulary reviews do. Never count one as the other.
    const first=selected.map(card=>({card,direction:firstVocabularyDirection(card),firstDirection:true}));
    // Speech recognition normally needs a separate language model for German
    // and Japanese. Group each pass by language to avoid mic on/off sounds
    // at every card; preserve each word's first-versus-second exposure.
    const firstLang=first[0]?.direction;
    first.sort((a,b)=>Number(a.direction!==firstLang)-Number(b.direction!==firstLang));
    const second=first.map(item=>({
      card:item.card,
      direction:item.direction==='de-jp'?'jp-de':'de-jp',
      firstDirection:false
    }));
    const startSecond=first.at(-1)?.direction;
    second.sort((a,b)=>Number(a.direction!==startSecond)-Number(b.direction!==startSecond));
    // Avoid immediately repeating the same word at the pass boundary.
    if(first.length>1 && second[0]?.card===first.at(-1)?.card){
      const swap=second.findIndex((item,i)=>i>0 && item.direction===second[0].direction && item.card!==first.at(-1).card);
      if(swap>0)[second[0],second[swap]]=[second[swap],second[0]];
    }
    return [...first,...second];
  }
  return selected.map((card,index)=>({
    card,
    direction:direction==='mixed'?(index%2===0?'de-jp':'jp-de'):direction,
    firstDirection:true
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
/* German ASR often inserts articles or confuses long inflected words.
 * Exact optional articles may be accepted; phonetic/typing neighbours only
 * trigger an explicit confirmation, never an automatic correct grade.
 */
const germanSpoken=value=>norm(value)
  .replace(/^[„“"'«»]+|[„“"'«»]+$/gu,'')
  .replace(/^(?:(?:der|die|das|ein|eine|einen|einem|einer)\s+)/u,'')
  .replace(/[.,!?;:]+$/gu,'').trim();
function boundedDistance(a,b,max) {
 const x=[...a],y=[...b];
 if(Math.abs(x.length-y.length)>max)return max+1;
 let prev=Array.from({length:y.length+1},(_,i)=>i);
 let beforePrev=null;
 for(let i=1;i<=x.length;i++){
   const curr=[i];
   for(let j=1;j<=y.length;j++){
     const sub=x[i-1]===y[j-1]?0:1;
     let cost=Math.min(prev[j]+1,curr[j-1]+1,prev[j-1]+sub);
     if(i>1&&j>1&&x[i-1]===y[j-2]&&x[i-2]===y[j-1])
       cost=Math.min(cost,(beforePrev?.[j-2]??Infinity)+1);
     curr[j]=cost;
   }
   if(Math.min(...curr)>max)return max+1;
   beforePrev=prev;prev=curr;
 }
 return prev[y.length];
}
export function gradeGermanSpeech(task,transcripts) {
 const raw=(Array.isArray(transcripts)?transcripts:[]).filter(value=>typeof value==='string'&&norm(value));
 const empty={match:'none',transcript:raw[0]||'',expectedReading:''};
 if(task?.direction!=='jp-de'||!raw.length)return empty;
 const targets=acceptedAnswers(task.card,'meaning').map(germanSpoken).filter(Boolean);
 for(const spoken of raw){
   const value=germanSpoken(spoken);
   if(value&&targets.includes(value))return {...empty,match:'exact',transcript:spoken};
 }
 for(const spoken of raw){
   const value=germanSpoken(spoken);
   if(!value)continue;
   if(targets.some(expected=>{
     if([...value].length<6||[...expected].length<6)return false;
     const max=Math.max([...value].length,[...expected].length)>=9?2:1;
     const close=boundedDistance(value,expected,max)<=max;
     const shared=expected.slice(0,6)===value.slice(0,6) && 
       Math.min(value.length,expected.length)>=8 &&
       Math.abs(value.length-expected.length)<=3;
     return close||shared;
   }))return {...empty,match:'near',transcript:spoken};
 }
 return empty;
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
  if(task.direction==='jp-de')return gradeGermanSpeech(task,raw);
  if(task.direction==='de-jp'){
    // Only a hint, never an automatic pass: Japanese minimal pairs can differ
    // in one mora (including a long vowel or small kana).
    const targets=[task.card.reading,...(task.card.acceptedReadings||[])]
      .map(kanaForm).filter(value=>/^[\p{Script=Hiragana}ー]+$/u.test(value));
    for(const transcript of raw){
      const heard=recognizedKana(transcript,lexicon,toHiragana);
      if(!heard)continue;
      if(targets.some(expected=>[...expected].length>=4 && [...heard].length>=3 &&
          editDistanceOne(heard,expected)))
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
