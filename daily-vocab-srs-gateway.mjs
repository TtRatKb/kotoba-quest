/* Candidate client for a future canonical vocabulary authority.
 * No grading, scheduling, persistence or live API discovery lives here.
 * daily.js does not import this module while the write safety gate is closed.
 */
const DIRECTIONS=['de-jp','jp-de'];
const token=value=>typeof value==='string'&&value.length>=8&&value.length<=500;
const revision=value=>(typeof value==='string'&&value.length>0)||(typeof value==='number'&&Number.isFinite(value));
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);

export function validateVocabularySession(value,{now=Date.now(),previous=null}={}){
 const fail=error=>({ok:false,error});
 if(!plain(value)||value.contractVersion!==2||!token(value.sessionId)||!token(value.accountScope)||!Array.isArray(value.items)||value.items.length<1||value.items.length>5)return fail('invalid-session');
 const ids=new Set(),cycles=new Set();
 for(const item of value.items){
  if(!plain(item)||!token(item.itemId)||!token(item.packEntryId)||!token(item.cycleToken)||!token(item.commitToken)||!revision(item.expectedRevision)||!Number.isFinite(item.expectedDueAt)||item.expectedDueAt>now||!['in-progress','ready','committed'].includes(item.state)||!Array.isArray(item.directions)||item.directions.length!==2)return fail('invalid-item');
  if(ids.has(item.itemId)||cycles.has(item.cycleToken))return fail('duplicate-item');ids.add(item.itemId);cycles.add(item.cycleToken);
  const directionIds=item.directions.map(direction=>direction?.id).sort();if(directionIds.some((id,index)=>id!==DIRECTIONS[index]))return fail('invalid-directions');
  for(const direction of item.directions)if(!plain(direction)||!token(direction.questionToken)||!token(direction.attemptToken)||!['pending','retry','accepted'].includes(direction.state)||typeof direction.prompt!=='string'||!direction.prompt)return fail('invalid-direction');
  const accepted=item.directions.filter(direction=>direction.state==='accepted').length;
  if((item.state==='in-progress'&&accepted===2)||(item.state==='ready'&&accepted!==2)||(item.state==='committed'&&(accepted!==2||!validReceipt(item.receipt,item))))return fail('invalid-state');
 }
 if(previous){
  if(value.sessionId!==previous.sessionId||value.accountScope!==previous.accountScope||value.items.length!==previous.items.length)return fail('session-changed');
  for(const oldItem of previous.items){const item=value.items.find(entry=>entry.itemId===oldItem.itemId);if(!item||['packEntryId','cycleToken','commitToken','expectedRevision','expectedDueAt'].some(key=>item[key]!==oldItem[key]))return fail('item-changed');}
 }
 return {ok:true,session:value};
}
function validReceipt(receipt,item){return plain(receipt)&&['committed','already-committed'].includes(receipt.status)&&receipt.itemId===item.itemId&&receipt.cycleToken===item.cycleToken&&revision(receipt.newRevision)&&receipt.officialReviewCount===1&&['recorded','pending','not-applicable'].includes(receipt.lifeRpgEventStatus);}

export function createDailyVocabularyGateway({authority,enabled=false,now=()=>Date.now()}={}){
 let session=null,busy=false;
 const unavailable=()=>({ok:false,error:enabled?'authority-unavailable':'write-gate-closed'});
 const compatible=()=>enabled&&authority?.contractVersion===2&&['createDailyVocabularySession','resumeDailyVocabularySession','evaluateDailyVocabularyAnswer','commitDailyVocabularyItem'].every(name=>typeof authority[name]==='function');
 const accept=(next,previous=session)=>{const checked=validateVocabularySession(next,{now:now(),previous});if(!checked.ok)return checked;session=structuredClone(checked.session);return {ok:true,session:structuredClone(session)};};
 const call=async operation=>{if(busy)return {ok:false,error:'operation-in-progress'};busy=true;try{return await operation();}catch{return {ok:false,error:'authority-failed'};}finally{busy=false;}};
 return Object.freeze({
  get enabled(){return enabled;},get session(){return session?structuredClone(session):null;},
  async start({limit=3}={}){if(!compatible())return unavailable();if(!Number.isInteger(limit)||limit<1||limit>5)return {ok:false,error:'invalid-limit'};return call(async()=>accept(await authority.createDailyVocabularySession({limit}),null));},
  async resume(sessionId){if(!compatible())return unavailable();if(!token(sessionId))return {ok:false,error:'invalid-session-id'};return call(async()=>accept(await authority.resumeDailyVocabularySession({sessionId}),session&&session.sessionId===sessionId?session:null));},
  async answer({itemId,directionId,answer}={}){
   if(!compatible())return unavailable();if(!session)return {ok:false,error:'no-session'};const item=session.items.find(entry=>entry.itemId===itemId),direction=item?.directions.find(entry=>entry.id===directionId);
   if(!item||!direction||item.state==='committed'||direction.state==='accepted')return {ok:false,error:'invalid-task'};if(typeof answer!=='string'||!answer.normalize('NFKC').trim())return {ok:false,error:'empty-answer'};
   return call(async()=>accept(await authority.evaluateDailyVocabularyAnswer({sessionId:session.sessionId,accountScope:session.accountScope,itemId,directionId,cycleToken:item.cycleToken,questionToken:direction.questionToken,attemptToken:direction.attemptToken,answer}),session));
  },
  async commit(itemId){
   if(!compatible())return unavailable();if(!session)return {ok:false,error:'no-session'};const item=session.items.find(entry=>entry.itemId===itemId);if(!item||item.state!=='ready'||item.directions.some(direction=>direction.state!=='accepted'))return {ok:false,error:'not-ready'};
   return call(async()=>{const result=await authority.commitDailyVocabularyItem({sessionId:session.sessionId,accountScope:session.accountScope,itemId:item.itemId,packEntryId:item.packEntryId,cycleToken:item.cycleToken,commitToken:item.commitToken,expectedRevision:item.expectedRevision,expectedDueAt:item.expectedDueAt});const accepted=accept(result.session,session);if(!accepted.ok)return accepted;const committed=session.items.find(entry=>entry.itemId===itemId);return committed?.state==='committed'&&validReceipt(committed.receipt,committed)?{ok:true,receipt:structuredClone(committed.receipt),session:structuredClone(session)}:{ok:false,error:'commit-unconfirmed'};});
  }
 });
}
