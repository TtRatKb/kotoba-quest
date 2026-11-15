// Source-only test harness: never import/boot Cloud, Firebase or storage modules.
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../../',import.meta.url);
export const index=readFileSync(new URL('index.html',root),'utf8');
export const cloud=readFileSync(new URL('cloud.html',root),'utf8');
export const bridge=readFileSync(new URL('sync/kotoba-bridge.js',root),'utf8');
export function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<a)throw Error('Source markers changed: '+start);return source.slice(a,b);}
export function run(code,env,expose){runInNewContext(code+'\n'+expose,env,{timeout:1500});return env;}
export const NOW=2000000000000;
export function fixture(){return {demoMode:false,xp:7,vocabulary:[{id:'fixture-word',packEntryId:'fixture-word',sourceType:'core',word:'行く',reading:'いく',meanings:['gehen'],acceptedReadings:['ゆく'],acceptedMeanings:['hingehen'],synonyms:['sich begeben'],stage:4,availableAt:NOW-1000,guruPassed:false,customContext:'KEEP',srsRevision:99},{id:'fixture-mining',sourceType:'mining',word:'猫',reading:'ねこ',meanings:['Katze'],stage:7,availableAt:NOW+99999,customContext:'KEEP MINING'}],grammar:{points:{'you-ni-naru':{lessonComplete:true,skills:{meaning:{stage:4,dueAt:NOW-1000,correct:1,incorrect:0,rotationIndex:2,variantIndex:3}}}}},particlePath:{points:{'ni-target':{lessonComplete:true,skills:{production:{stage:4,dueAt:NOW-1000,correct:1,incorrect:0}}}},stats:{correct:1,incorrect:0,reviews:1}},kanjiPilot:{version:4,kanji:{'kqk-001':{stage:5,dueAt:NOW+500,lessonComplete:true,customMnemonic:'KEEP KANJI'}}},story:{energy:9},analytics:{accepted:'KEEP'},n4:{progress:[1]},dungeon:{floor:3},bridgeFixture:{pending:['KEEP']}};}
export function clock(){return {now:()=>NOW};}
