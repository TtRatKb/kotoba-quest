import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildVoiceDeck,acceptsVoiceAnswer,gradeSpeechCandidates,promptFor,solutionFor} from '../voice-cards-core.mjs';

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

test('the optional entry point reads via Dungeon source and cannot write progress',()=>{
 const html=readFileSync(new URL('../voice-cards.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../voice-cards.js',import.meta.url),'utf8');
 const daily=readFileSync(new URL('../daily.js',import.meta.url),'utf8');
 assert.match(html,/dungeon-source\.js/);
 assert.match(html,/voice-cards\.js/);
 assert.match(daily,/href="\.\/voice-cards\.html"/);
 assert.doesNotMatch(js,/(?:localStorage|sessionStorage)\.(?:setItem|removeItem|clear)\s*\(|\.transaction\s*\(|\.commitVocabulary|\.save\s*\(/);
});


test('speech recognition recognizes correct alternative even if its first guess is wrong',()=>{
 const task={card:{id:'colleague',word:'同僚',reading:'どうりょう',meanings:['Kollege'],stage:2},direction:'de-jp'};
 assert.deepEqual(gradeSpeechCandidates(task,['同様','同僚']).match,'exact');
 assert.equal(gradeSpeechCandidates(task,['ドウリョウ']).match,'exact');
 assert.equal(gradeSpeechCandidates(task,['どうりょう。']).match,'exact');
 assert.equal(gradeSpeechCandidates(task,['同量'],{lexicon:[{word:'同量',reading:'どうりょう'}]}).match,'exact');
});
test('recognized close pronunciation offers confirmation but never passes automatically',()=>{
 const task={card:{id:'colleague',word:'同僚',reading:'どうりょう',meanings:['Kollege'],stage:2},direction:'de-jp'};
 const near=gradeSpeechCandidates(task,['どりょう']);
 assert.equal(near.match,'near');
 assert.equal(near.transcript,'どりょう');
 assert.equal(gradeSpeechCandidates(task,['どうりょ']).match,'near');
 assert.equal(gradeSpeechCandidates(task,['むりょう']).match,'none');
 assert.equal(gradeSpeechCandidates(task,['りょう']).match,'none');
 assert.equal(gradeSpeechCandidates(task,['同じ']).match,'none');
 assert.equal(gradeSpeechCandidates(task,['同じ'],{lexicon:[{word:'同じ',reading:'おなじ'}]}).match,'none');
});
test('romanized speech recognition alternatives can be converted with the existing adapter',()=>{
 const task={card:{word:'同僚',reading:'どうりょう',meanings:['Kollege'],stage:2},direction:'de-jp'};
 const toHiragana=value=>({'douryou':'どうりょう','doryou':'どりょう'}[value]??value);
 assert.equal(gradeSpeechCandidates(task,['douryou'],{toHiragana}).match,'exact');
 assert.equal(gradeSpeechCandidates(task,['doryou'],{toHiragana}).match,'near');
});
test('short Japanese words and typed answers stay strictly checked',()=>{
 const task={card:{word:'猫',reading:'ねこ',meanings:['Katze'],stage:2},direction:'de-jp'};
 assert.equal(gradeSpeechCandidates(task,['ねご']).match,'none');
 assert.equal(gradeSpeechCandidates(task,['ねこ']).match,'exact');
 assert.equal(acceptsVoiceAnswer(task,'ねご'),false);
 assert.equal(gradeSpeechCandidates({card:cards[1],direction:'jp-de'},['leise','rauschen']).match,'exact');
 assert.equal(gradeSpeechCandidates({card:cards[1],direction:'jp-de'},['leiseee']).match,'none');
});
