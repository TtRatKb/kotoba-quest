/* Curated, optional supplementary training. Never official SRS evidence. */
import {eligibleWords} from './daily-engine.mjs';
export const ATLAS = './assets/daily/objects-v1.png';
const rows = [
 ['cat','猫','ねこ','Katze','animals',['katze','katzen']],
 ['dog','犬','いぬ','Hund','animals',['hund','hunde']],
 ['bird','鳥','とり','Vogel','animals',['vogel','vögel']],
 ['fish','魚','さかな','Fisch','animals',['fisch','fische']],
 ['apple','りんご','りんご','Apfel','fruit',['apfel','äpfel']],
 ['banana','バナナ','ばなな','Banane','fruit',['banane','bananen']],
 ['mandarin','みかん','みかん','Mandarine','fruit',['mandarine','mandarinen']],
 ['grapes','ぶどう','ぶどう','Weintrauben','fruit',['weintraube','weintrauben','traube','trauben']],
 ['bread','パン','ぱん','Brot','food',['brot']],
 ['rice','ご飯','ごはん','gekochter Reis','food',['reis','gekochter reis','reis (gekocht)']],
 ['egg','卵','たまご','Ei','food',['ei','eier']],
 ['cheese','チーズ','ちーず','Käse','food',['käse']],
 ['book','本','ほん','Buch','objects',['buch','bücher']],
 ['pencil','鉛筆','えんぴつ','Bleistift','objects',['bleistift','bleistifte']],
 ['key','鍵','かぎ','Schlüssel','objects',['schlüssel']],
 ['clock','時計','とけい','Uhr','objects',['uhr','uhren']],
 ['car','車','くるま','Auto','transport',['auto','autos','wagen']],
 ['bicycle','自転車','じてんしゃ','Fahrrad','transport',['fahrrad','fahrräder']],
 ['train','電車','でんしゃ','Zug','transport',['zug','züge','elektrischer zug','elektrische bahn']],
 ['airplane','飛行機','ひこうき','Flugzeug','transport',['flugzeug','flugzeuge']],
 ['chair','椅子','いす','Stuhl','furniture',['stuhl','stühle']],
 ['desk','机','つくえ','Schreibtisch','furniture',['schreibtisch','schreibtische']],
 ['bed','ベッド','べっど','Bett','furniture',['bett','betten']],
 ['sofa','ソファ','そふぁ','Sofa','furniture',['sofa','sofas','couch']]
];
export const VISUAL_WORDS = Object.freeze(rows.map(([id,word,reading,meaning,group,meanings],cell)=>Object.freeze({id,word,reading,meaning,group,meanings:Object.freeze(meanings),cell})));
const normalize = value => String(value??'').normalize('NFKC').trim().toLocaleLowerCase('de-DE');
const kana = value => normalize(value).replace(/[ァ-ヶ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0x60));
export function visualVocabulary(cards=[]) {
 const learned=eligibleWords(cards);
 return VISUAL_WORDS.filter(word=>learned.some(card=>kana(card.word)===kana(word.word)&&kana(card.reading)===kana(word.reading)&&
  (Array.isArray(card.meanings)?card.meanings:[]).flatMap(v=>String(v).split(/[;；/]/)).some(meaning=>word.meanings.includes(normalize(meaning)))));
}
function shuffled(values, seed) {
 let n=2166136261;for(const char of String(seed))n=Math.imul(n^char.charCodeAt(0),16777619)>>>0;
 const out=[...values];for(let i=out.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;
}
const templates = [
 {id:'cat-room',section:'particlePath',prerequisites:['ni-target','ga-subject'],cue:'Im Zimmer ist eine Katze.',tokens:['部屋','に','猫','が','います'],accepted:[[0,1,2,3,4],[2,3,0,1,4]],extra:[],model:'部屋に猫がいます。'},
 {id:'study-time',section:'particlePath',prerequisites:['kara-source','made-limit'],cue:'Ich lerne von neun bis zwölf Uhr.',tokens:['九時','から','十二時','まで','勉強します'],accepted:[[0,1,2,3,4]],extra:[],model:'九時から十二時まで勉強します。'},
 {id:'daily-reading',section:'grammar',prerequisites:['you-ni-suru'],cue:'Ich bemühe mich, jeden Tag Japanisch zu lesen.',tokens:['毎日','日本語','を','読む','ようにしています'],accepted:[[0,1,2,3,4],[1,2,0,3,4]],extra:[],model:'毎日日本語を読むようにしています。'}
];
export function buildPlaySession(cards=[],save={},day='preview',{demo=false}={}) {
 const words=demo?[...VISUAL_WORDS]:visualVocabulary(cards),tasks=[];
 for(const target of shuffled(words,day).slice(0,2)){
  const options=shuffled(VISUAL_WORDS.filter(w=>w.group===target.group).map(w=>w.id),day+target.id);
  tasks.push({id:'picture-'+target.id,kind:'image-choice',label:'Das passende Bild',target,options,correct:target.id,explanation:`${target.word}（${target.reading}） bedeutet ${target.meaning}.`});
 }
 const groups=[...new Set(words.map(w=>w.group))];
 const group=shuffled(groups,day+'pairs').find(g=>words.filter(w=>w.group===g).length>=3);
 if(group){const pairs=shuffled(words.filter(w=>w.group===group),day+'match').slice(0,3),images=shuffled(pairs.map(w=>w.id),day+'images');let order=shuffled(pairs.map(w=>w.id),day+'words');if(order.every((id,i)=>id===images[i]))order=[...order.slice(1),order[0]];tasks.push({id:'matching-'+group,kind:'image-matching',label:'Bilder und Wörter verbinden',pairs,images,words:order,explanation:'Ordne jedem Bild sein japanisches Wort zu. Ein gefundener Zusammenhang ist Training, kein SRS-Abschluss.'});}
 const available=templates.filter(t=>t.prerequisites.every(id=>save?.[t.section]?.points?.[id]?.lessonComplete===true));
 const sentence=shuffled(demo?templates.slice(0,1):available,day+'sentence')[0];
 if(sentence){const tokens=sentence.tokens.map((text,i)=>({id:String(i),text}));tasks.push({id:'tiles-'+sentence.id,kind:'sentence-tiles',label:'Satzbausteine',cue:sentence.cue,tokens,bank:shuffled(tokens.map(t=>t.id),day+'tiles'),accepted:sentence.accepted.map(order=>order.map(String)),model:sentence.model,explanation:'Dies ist eine geprüfte Reihenfolge. Andere grammatisch mögliche Reihenfolgen werden nicht automatisch als falsch gewertet.',prerequisites:[...sentence.prerequisites],sample:demo});}
 return {mode:'play',tasks,blocked:!tasks.length,readOnly:true,trainingOnly:true,demo};
}
export function sentenceText(task,ids) {
 return ids.map(id=>task.tokens.find(t=>t.id===id)?.text||'').join('')+'。';
}
export function evaluatePlay(task,response) {
 if(task.kind==='image-choice')return {complete:task.options.includes(response),correct:task.options.includes(response)?response===task.correct:null};
 if(task.kind==='image-matching'){
  const valid=Array.isArray(response)&&response.length===task.pairs.length&&new Set(response).size===task.pairs.length&&response.every(id=>task.pairs.some(p=>p.id===id));
  return {complete:valid,correct:valid?true:null};
 }
 if(task.kind==='sentence-tiles'){
  const valid=Array.isArray(response)&&response.length===task.tokens.length&&new Set(response).size===task.tokens.length&&response.every(id=>task.tokens.some(t=>t.id===id));
  return {complete:valid,correct:valid&&task.accepted.some(order=>order.every((id,i)=>id===response[i]))?true:null};
 }
 return {complete:false,correct:null};
}
export function isPair(task,image,word){return image===word&&task.pairs.some(pair=>pair.id===image);}
