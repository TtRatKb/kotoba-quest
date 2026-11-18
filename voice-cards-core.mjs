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
