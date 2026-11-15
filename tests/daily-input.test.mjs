import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {convertJapaneseField} from '../daily-input.mjs';
const sandbox={window:{}};
runInNewContext(readFileSync(new URL('../japanese-romaji.js',import.meta.url),'utf8'),sandbox);
globalThis.window=sandbox.window;
const kana=window.KotobaRomaji.toHiragana;
test('shared Cloud converter handles normal spelling, small kana, gemination and n',()=>{
 for(const [raw,expected] of [['nenrei','ねんれい'],['gakkou','がっこう'],['konnichiha','こんにちは'],["kin'en",'きんえん'],['kan','かん'],['kann','かん'],['shashin','しゃしん'],['syashin','しゃしん'],['chotto','ちょっと'],['tyotto','ちょっと'],['xya','ゃ'],['la','ぁ'],['ltsu','っ'],['sensei','せんせい'],['ookii','おおきい'],['スーパーと学校','スーパーと学校']])assert.equal(kana(raw,true),expected,raw);
 assert.equal(kana('n'), 'n');assert.equal(kana('nn'),'nn');
});
test('live converted prefixes remain usable while typing, including trailing nn',()=>{
 for(const [raw,expected] of [['nenrei','ねんれい'],['konnichiha','こんにちは'],['gakkou','がっこう'],['kann','かん']]){
  let value='';for(const letter of raw)value=kana(value+letter);
  assert.equal(kana(value,true),expected,raw);
 }
});
test('field adapter preserves Japanese, selections, and German fields',()=>{
 const field={id:'dailyAnswer',lang:'ja',value:'nenrei',selectionStart:6,selectionEnd:6,setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}};
 convertJapaneseField(field);assert.equal(field.value,'ねんれい');assert.equal(field.selectionStart,4);
 field.value='ko-hi-';convertJapaneseField(field,true);assert.equal(field.value,'こーひー');
 field.value='カタカナ・漢字・ひらがな';convertJapaneseField(field);assert.equal(field.value,'カタカナ・漢字・ひらがな');
 field.lang='';field.value='gehen';convertJapaneseField(field,true);assert.equal(field.value,'gehen');
});
test('core converter remains separate and Cloud enhancement reuses shared converter without a second engine',()=>{
 const cloud=readFileSync(new URL('../cloud.html',import.meta.url),'utf8');
 const section=cloud.slice(cloud.indexOf('function systemInteractionConsistencyBootstrap'),cloud.indexOf('function shouldAttach',cloud.indexOf('function systemInteractionConsistencyBootstrap')));
 assert.match(section,/window\.KotobaRomaji\.toHiragana/);assert.doesNotMatch(section,/function convertRun|const MAP/);
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/src="\.\/japanese-romaji.js"/);
});
