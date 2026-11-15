/* Offline architecture probes. All mutations are canonical functions on synthetic copies. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {index,cloud,bridge,section,run,fixture,clock,NOW} from './helpers/srs-source.mjs';
const copy=value=>structuredClone(value);
const coreEvaluation=section(index,'    const ROMAJI_TO_HIRAGANA =','    let data = loadData()')+
 section(index,'    function normalizeLatin(','    function requeueQuestion(')+
 section(index,'    function romajiToHiragana(','    function isDue(')+
 section(index,'    function splitMeaningVariants(','    function gradeReview(');
const stageStart=index.indexOf('    const STAGES = [');
const coreStages=index.slice(stageStart,index.indexOf('    const EMBEDDED_CORE_PACK',stageStart));
const outcomes=section(cloud,'  function scheduleReviewOutcome(','  function preserveCoreUnlocks(');
// Locate external helper inside its own bootstrap, not similarly named earlier helpers.
const bootstrap=cloud.slice(cloud.indexOf('    function externalQuickReviewBootstrap()'));
const externalFunctions=section(bootstrap,'      function safeNumber(','      window.KotobaQuestExternalReviewApi =');
function vocabularyEnv(){
 const original=fixture(),data=copy(original),trace=[];
 const env={data,Date:clock(),VERSION:'isolated-probe',reviewSession:{sentinel:true},
  ensureCoreVocabularyContent:()=>trace.push('normalize-called'),findVocabularyItem:id=>data.vocabulary.find(v=>v.id===id),
  finalizeReviewItemIfReady:()=>{trace.push('finalize');return env.apply(data.vocabulary[0],env.reviewSession.errors[data.vocabulary[0].id]),true;}};
 run(coreStages+coreEvaluation+section(index,'    function stageDelay(','    function stageName(')+outcomes+externalFunctions,env,
 'globalThis.apply=applyDirectionalReviewOutcome;globalThis.api={createVocabularySession,evaluateVocabularyAnswer,commitVocabularyItemReview};');
 return {env,trace,data,original};
}

test('actual vocabulary evaluator preserves accepted variants, wrong-type and retry semantics on isolated copies',()=>{
 const {env,data,original}=vocabularyEnv();
 for(const [direction,answer,status] of [['jp-de','hingehen','correct'],['jp-de','sich begeben','correct'],['de-jp','yuku','correct'],['de-jp','gehen','wrongType'],['de-jp','unconvertedq','romajiLeftover']]){
  assert.equal(env.api.evaluateVocabularyAnswer({itemId:'fixture-word',direction,answer}).status,status);
 }
 assert.deepEqual(data,original);
});
test('actual paired outcome keeps stage for one weak direction, demotes both and preserves historical Guru',()=>{
 for(const [errors,stage] of [[{listening:false,production:false},5],[{listening:true,production:false},4],[{listening:true,production:true},3]]){
  const {env,data,original}=vocabularyEnv();env.apply(data.vocabulary[0],errors);
  assert.equal(data.vocabulary[0].stage,stage);assert.deepEqual(data.vocabulary.slice(1),original.vocabulary.slice(1));assert.equal(data.vocabulary[0].customContext,'KEEP');assert(data.vocabulary[0].availableAt>NOW);
  assert.deepEqual({...data,vocabulary:original.vocabulary,xp:original.xp},original,'unrelated records must remain byte-equivalent');
 }
 const {env,data}=vocabularyEnv();data.vocabulary[0].guruPassed=true;env.apply(data.vocabulary[0],{listening:true,production:true});assert.equal(data.vocabulary[0].guruPassed,true);
});
test('existing session produces two required directions but invokes normalization; do not call it from read-only Daily',()=>{
 const {env,trace}=vocabularyEnv();const session=env.api.createVocabularySession({limit:1});
 assert.deepEqual([...session.questions].map(q=>q.direction).sort(),['de-jp','jp-de']);assert(trace.includes('normalize-called'));
});
test('actual commit rejects changed stage, a future due date and a repeated successful commit',()=>{
 const {env,data,trace}=vocabularyEnv();
 assert.equal(env.api.commitVocabularyItemReview({itemId:'fixture-word',expectedStage:2}).code,'stale-review');assert(!trace.includes('finalize'));
 data.vocabulary[0].availableAt=NOW+10000;
 assert.equal(env.api.commitVocabularyItemReview({itemId:'fixture-word',expectedStage:4}).code,'not-due');
 data.vocabulary[0].availableAt=NOW-1000;
 const first=env.api.commitVocabularyItemReview({itemId:'fixture-word',expectedStage:4,errors:{listening:false,production:false}});
 assert.equal(first.committed,true);assert.equal(env.api.commitVocabularyItemReview({itemId:'fixture-word',expectedStage:4}).code,'stale-review');
 assert.deepEqual(env.reviewSession,{sentinel:true});
});
test('BLOCKERS reproduced: vocabulary commit trusts direction flags, omits due/revision token and treats null due as due',()=>{
 const {env,data}=vocabularyEnv();
 data.vocabulary[0].availableAt=null;
 const result=env.api.commitVocabularyItemReview({itemId:'fixture-word',expectedStage:4,expectedDueAt:NOW+9999});
 assert.equal(result.committed,true,'current API accepts without answer transcript and ignores expectedDueAt');
 // A passing characterization test documents the gap; it is not productive approval.
});

const grammarCommit=section(cloud,'      function commitExternalGrammarReview(','      window.KotobaQuestGrammarSupportApi =');
const particleCommit=section(cloud,'      function commitExternalParticleReview(','      window.KotobaQuestParticlePath=');
const gs=cloud.indexOf('      const STAGES = [',cloud.indexOf('function grammarPathBootstrap'));
const stages=cloud.slice(gs,cloud.indexOf('];',gs)+2);
function skillEnv(kind){
 const original=fixture(),data=copy(original),writes=[];
 const grammar=kind==='grammar',pointId=grammar?'you-ni-naru':'ni-target',skillId=grammar?'meaning':'production';
 const env={Date:clock(),POINTS:[{id:pointId,particle:'に'}],SKILLS:[{id:skillId}],grammarState:data.grammar,state:data.particlePath,
  pointState:id=>data.particlePath.points[id],persistGrammar:()=>writes.push('grammar'),persist:()=>writes.push('particle'),recordConfusion:()=>{}};
 run(stages+(grammar?grammarCommit:particleCommit),env,'globalThis.commit='+(grammar?'commitExternalGrammarReview':'commitExternalParticleReview')+';');
 return {env,data,original,writes,args:{pointId,skillId,expectedStage:4,expectedDueAt:NOW-1000}};
}
test('actual grammar/particle commits reject stale tokens and preserve unrelated data; duplicate delivery is rejected',()=>{
 for(const kind of ['grammar','particle']){
  const {env,data,original,writes,args}=skillEnv(kind);
  assert.equal(env.commit({...args,expectedDueAt:NOW-2000}).code,'stale-review');assert.equal(writes.length,0);
  assert.equal(env.commit({...args,grade:'good',correct:true}).committed,true);assert.equal(writes.length,1);
  assert.equal(env.commit({...args,grade:'good',correct:true}).code,'stale-review');assert.equal(writes.length,1);
  assert.deepEqual({...data,[kind==='grammar'?'grammar':'particlePath']:original[kind==='grammar'?'grammar':'particlePath']},original);
 }
});
test('canonical grammar close/bad and particle error behavior is reused, not reimplemented',()=>{
 const close=skillEnv('grammar');close.env.commit({...close.args,grade:'close'});assert.equal(close.data.grammar.points['you-ni-naru'].skills.meaning.stage,4);assert.equal(close.data.grammar.points['you-ni-naru'].skills.meaning.dueAt,NOW+3600000);
 const bad=skillEnv('grammar');bad.env.commit({...bad.args,grade:'bad'});assert.equal(bad.data.grammar.points['you-ni-naru'].skills.meaning.stage,3);
 const particle=skillEnv('particle');particle.env.commit({...particle.args,correct:false,entered:'で'});assert.equal(particle.data.particlePath.points['ni-target'].skills.production.stage,3);assert.equal(particle.data.particlePath.stats.reviews,2);
});

const liveCommit=section(bridge,'async function commitLiveVocabulary(','async function createLiveMixedSession(');
function bridgeEnv({markers=new Set(),failMarker=false,failOutbox=false}={}){
 const calls=[];
 const env={Date:clock(),clone:copy,processedCommand:id=>markers.has(id),waitForLiveReviewApi:async()=>({commitVocabularyItemReview:()=>{calls.push('core-commit');return {ok:true,committed:true,item:{word:'fixture'}};}}),
  rememberCommand:id=>{calls.push('marker');if(failMarker)throw Error('synthetic marker failure');markers.add(id);},
  queueEvent:()=>{calls.push('outbox');if(failOutbox)throw Error('synthetic offline/quota outbox failure');},
  scanProgress:async()=>({snapshot:{fixture:true}}),adoptCurrentRuntimeWithoutEmission:()=>({fixture:true})};
 run(liveCommit,env,'globalThis.commit=commitLiveVocabulary;');return {env,calls,markers};
}
test('existing bridge recognizes persisted command IDs after reload without a second core call',async()=>{
 const first=bridgeEnv();assert.equal((await first.env.commit({commandId:'fixture-command'})).committed,true);
 const reload=bridgeEnv({markers:first.markers});const result=await reload.env.commit({commandId:'fixture-command'});
 assert.equal(result.duplicate,true);assert.deepEqual(reload.calls,[]);
});
test('BLOCKER reproduced: interruption after core commit can precede the durable idempotency marker',async()=>{
 const interrupted=bridgeEnv({failMarker:true});await assert.rejects(interrupted.env.commit({commandId:'fixture'}),/synthetic marker/);
 assert.deepEqual(interrupted.calls,['core-commit','marker']);assert.equal(interrupted.markers.size,0);
});
test('BLOCKER reproduced: outbox failure after marker is not retried on duplicate/offline-to-online delivery',async()=>{
 const offline=bridgeEnv({failOutbox:true});await assert.rejects(offline.env.commit({commandId:'fixture'}),/synthetic offline/);
 const online=bridgeEnv({markers:offline.markers});assert.equal((await online.env.commit({commandId:'fixture'})).duplicate,true);assert.deepEqual(online.calls,[],'no event redelivery is attempted here');
});
test('Daily contains no live SRS calls and Kanji APIs/restore remain outside the probe',()=>{
 const daily=section(cloud,'function kanjiPilotBootstrap','function pastelFuriganaBootstrap');
 assert.match(daily,/ensureState\(/);
 assert.doesNotMatch(readFileSync(new URL('../daily.js',import.meta.url),'utf8'),/commitVocabularyItemReview|commitExternalReview|postMessage\(/);
 const ui=section(index,'function evaluateAnswer','function gradeReview');assert(ui.includes('romajiLeftover'));
});

test('BLOCKER reproduced: particle evaluator trusts client-supplied accepted variants without issued-task proof',()=>{
 const code=section(cloud,'      function evaluateExternalParticleAnswer(','      function commitExternalParticleReview(');
 const env={POINTS:[{id:'ni-target',particle:'に',accepted:['に']}],SKILLS:[{id:'production'}],convertParticleInput:v=>v,normalizeAnswer:v=>v};
 run(code,env,'globalThis.evaluate=evaluateExternalParticleAnswer;');
 assert.equal(env.evaluate({pointId:'ni-target',skillId:'production',answer:'で'}).correct,false);
 assert.equal(env.evaluate({pointId:'ni-target',skillId:'production',answer:'で',task:{accepted:['で']}}).correct,true);
});
