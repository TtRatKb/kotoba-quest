import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVoiceSession,currentVoiceCard,recordVoiceAttempt,voiceSummary} from '../voice-cards-session.mjs';
import {spokenContrastChoices,gradeSpeechCandidates} from '../voice-cards-core.mjs';

const cards=[
 {card:{id:'script',word:'台本',reading:'だいほん',meanings:['Skript'],stage:2},direction:'de-jp'},
 {card:{id:'editing',word:'編集',reading:'へんしゅう',meanings:['Bearbeitung'],stage:4},direction:'de-jp'},
 {card:{id:'customer',word:'お客さん',reading:'おきゃくさん',meanings:['Kunde'],stage:1},direction:'de-jp'}
];

test('wrong word moves to back and returns, correct first-time word is completed',()=>{
 let session=createVoiceSession(cards);
 const original=JSON.stringify(cards);
 session=recordVoiceAttempt(session,{kind:'wrong-word',transcript:'編集'});
 assert.equal(currentVoiceCard(session).task.card.word,'編集');
 assert.deepEqual(session.queue,['voice-1','voice-2','voice-0']);
 session=recordVoiceAttempt(session,{kind:'correct',transcript:'へんしゅう'});
 session=recordVoiceAttempt(session,{kind:'correct',transcript:'おきゃくさん'});
 assert.equal(currentVoiceCard(session).task.card.word,'台本');
 session=recordVoiceAttempt(session,{kind:'correct',transcript:'だいほん'});
 assert.equal(currentVoiceCard(session),null);
 assert.equal(voiceSummary(session).firstTry,2);
 assert.equal(voiceSummary(session).wrongWord,1);
 assert.equal(voiceSummary(session).mastered,3);
 assert.equal(JSON.stringify(cards),original);
});
test('timeout, known different word, near miss and unknown are stored separately',()=>{
 let session=createVoiceSession(cards);
 session=recordVoiceAttempt(session,{kind:'no-answer'});
 session=recordVoiceAttempt(session,{kind:'wrong-word',transcript:'編集'});
 session=recordVoiceAttempt(session,{kind:'near-miss',transcript:'ひゃく',spokenReading:'きゃく'});
 session=recordVoiceAttempt(session,{kind:'not-known'});
 session=recordVoiceAttempt(session,{kind:'recognition-error',transcript:'たいほん'});
 const summary=voiceSummary(session);
 assert.equal(summary.noAnswer,1);
 assert.equal(summary.nearMiss,1);
 assert.equal(summary.wrongWord,1);
 assert.equal(summary.notKnown,1);
 assert.equal(summary.recognitionError,1);
 assert.equal(summary.completed,1);
});
test('repeated failures are capped, never create an endless review loop',()=>{
 let session=createVoiceSession([cards[0]],{maxAttempts:3});
 session=recordVoiceAttempt(session,{kind:'wrong-word'});
 assert.equal(session.queue.length,1);
 session=recordVoiceAttempt(session,{kind:'no-answer'});
 assert.equal(session.queue.length,1);
 session=recordVoiceAttempt(session,{kind:'near-miss'});
 assert.equal(session.queue.length,0);
 assert.deepEqual(voiceSummary(session),{
  total:1,completed:1,mastered:0,needsPractice:1,attempts:3,
  wrongWord:1,nearMiss:1,noAnswer:1,notKnown:0,recognitionError:0,firstTry:0
 });
});
test('unknown outcome or invalid session fails closed',()=>{
 assert.throws(()=>createVoiceSession([]));
 assert.throws(()=>createVoiceSession(cards,{maxAttempts:1}));
 assert.throws(()=>recordVoiceAttempt(createVoiceSession(cards),{kind:'unexpected'}));
});
test('similar word prompts distinguish だいほん vs たいほん and きゃく vs ひゃく without grading them correct',()=>{
 const script=cards[0];
 const customer=cards[2];
 assert.deepEqual(spokenContrastChoices(script,'たいほん'),['だいほん','たいほん']);
 assert.deepEqual(spokenContrastChoices(customer,'百',{lexicon:[{word:'百',reading:'ひゃく'},{word:'客',reading:'きゃく'}]}),['きゃく','ひゃく']);
 assert.equal(gradeSpeechCandidates(script,['たいほん']).match,'near');
 assert.equal(gradeSpeechCandidates(customer,['ひゃく']).match,'none');
 assert.equal(gradeSpeechCandidates(cards[1],['だいほん']).match,'none');
});
test('UI stays entirely outside official SRS and includes one-start timer/retry controls',()=>{
 const source=readFileSync(new URL('../voice-cards.js',import.meta.url),'utf8');
 assert.match(source,/SILENCE_MS=10000/);
 assert.match(source,/recordVoiceAttempt/);
 assert.match(source,/createVoiceSession/);
 assert.match(source,/startListening/);
 assert.match(source,/confirmSpeech/);
 assert.doesNotMatch(source,/(?:localStorage|sessionStorage)\.(?:setItem|removeItem|clear)\s*\(|\.transaction\s*\(|commitVocabulary|writeBatch|addDoc\(/);
});
