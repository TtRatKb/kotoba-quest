import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedback} from '../daily-feedback.mjs';
function host({ua='Android',reduced=false,voiceLocal=true}={}){
 const calls={audio:0,tone:0,vibration:[],classes:[],spoken:[],cancel:0};
 const element={classList:{add:n=>calls.classes.push(n),remove:()=>{}}};
 class AudioContext{constructor(){calls.audio++;this.currentTime=0;this.destination={};}async resume(){}suspend(){}async close(){}createOscillator(){calls.tone++;return {frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},start(){},stop(){},disconnect(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}
 const h={document:{hidden:false},navigator:{userAgent:ua,vibrate:duration=>calls.vibration.push(duration)},performance:{now:()=>1000},matchMedia:()=>({matches:reduced}),setTimeout:fn=>fn(),AudioContext,
  speechSynthesis:{getVoices:()=>[{lang:'ja-JP',localService:voiceLocal}],cancel:()=>calls.cancel++,speak:m=>calls.spoken.push(m)},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}}};
 return {h,calls,element};
}
test('feedback starts silent, creates no audio context and performs no haptics without opt-in',async()=>{
 const {h,calls,element}=host(),fx=createFeedback(h);assert.equal(fx.enabled,false);await fx.success(element);assert.equal(calls.audio,0);assert.deepEqual(calls.vibration,[]);assert.equal(fx.speak('猫'),false);
});
test('one shared opt-in enables quiet tone and supported Android haptics; disabling stops both',async()=>{
 const {h,calls,element}=host(),fx=createFeedback(h);fx.setEnabled(true);await fx.success(element);assert.equal(calls.tone,1);assert.deepEqual(calls.vibration,[12]);assert(fx.speak('猫'));assert.equal(calls.spoken[0].lang,'ja-JP');fx.setEnabled(false);await fx.success(element);assert.equal(calls.tone,1);assert.equal(calls.vibration.length,1);fx.dispose();
});
test('iOS never calls vibration even if a shim advertises it, and reduced motion suppresses animation/haptics',async()=>{
 const ios=host({ua:'Mozilla iPhone'}),fx=createFeedback(ios.h);fx.setEnabled(true);await fx.success(ios.element);assert.equal(ios.calls.vibration.length,0);
 const reduce=host({reduced:true}),quiet=createFeedback(reduce.h);quiet.setEnabled(true);await quiet.success(reduce.element);assert.deepEqual(reduce.calls.classes,[]);assert.deepEqual(reduce.calls.vibration,[]);
});
test('missing/remote Japanese voice is not replaced with an unrelated or pretended voice',()=>{
 const {h,calls}=host({voiceLocal:false}),fx=createFeedback(h);fx.setEnabled(true);assert.equal(fx.canSpeak(),false);assert.equal(fx.speak('猫'),false);assert.deepEqual(calls.spoken,[]);
});
test('unsupported audio and hidden documents fail quietly without simulated feedback',async()=>{
 const {h,calls,element}=host({ua:'desktop'});delete h.AudioContext;const fx=createFeedback(h);fx.setEnabled(true);await fx.success(element);assert.equal(calls.audio,0);assert.deepEqual(calls.vibration,[]);h.document.hidden=true;await fx.success(element);assert.equal(calls.audio,0);
});
