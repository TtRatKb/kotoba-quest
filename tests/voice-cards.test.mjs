import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVoiceDeck,acceptsVoiceAnswer,promptFor,solutionFor} from '../voice-cards-core.mjs';

const cards=[
 {id:'1',word:'慣れる',reading:'なれる',meanings:['sich gewöhnen an'],stage:2,acceptedReadings:[]},
 {id:'2',word:'静か',reading:'しずか',meanings:['ruhig','still'],stage:5,acceptedMeanings:['leise']},
 {id:'3',word:'きれい',reading:'きれい',meanings:['sauber','schön'],stage:8},
 {id:'4',word:'はじめまして',reading:'はじめまして',meanings:['Schön, dich kennenzulernen'],stage:0}
];
test('flashcards use only learned words without mutating their SRS records',()=>{
 const original=JSON.stringify(cards);
 const a=buildVoiceDeck(cards,{limit:8,seed:'fixed'});
 const b=buildVoiceDeck(cards,{limit:8,seed:'fixed'});
 assert.deepEqual(a,b);assert.equal(a.length,3);
 assert(a.every(task=>task.card.stage>=1));
 assert.equal(JSON.stringify(cards),original);
});
test('German to Japanese accepts kanji, kana and katakana equivalent readings',()=>{
 const task={card:cards[0],direction:'de-jp'};
 assert.equal(promptFor(task),'sich gewöhnen an');
 assert.equal(solutionFor(task),'慣れる（なれる）');
 assert(acceptsVoiceAnswer(task,'慣れる。'));
 assert(acceptsVoiceAnswer(task,'なれる'));
 assert(acceptsVoiceAnswer({card:{...cards[2],word:'キレイ',reading:'きれい'},direction:'de-jp'},'きれい'));
 assert(!acceptsVoiceAnswer(task,'行く'));
});
test('Japanese to German accepts valid meaning synonyms',()=>{
 const task={card:cards[1],direction:'jp-de'};
 assert.equal(promptFor(task),'静か');
 assert(acceptsVoiceAnswer(task,'leise.'));
 assert(acceptsVoiceAnswer(task,'RUHIG'));
 assert(!acceptsVoiceAnswer(task,'laut'));
});
test('mixed mode alternates directions and excludes new/invalid cards',()=>{
 const deck=buildVoiceDeck([...cards,{id:'x',word:'?',reading:'',meanings:['?'],stage:2}],{direction:'mixed'});
 assert.deepEqual(deck.map(item=>item.direction),['de-jp','jp-de','de-jp']);
 assert.deepEqual(buildVoiceDeck(cards,{direction:'unsupported'}),[]);
});
