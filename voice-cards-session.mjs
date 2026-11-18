/* Read-only, per-session speaking practice history.
 * Never touches SRS, Firestore, IndexedDB or localStorage.
 */
const CORRECT=new Set(['correct','recognition-error']);
const OUTCOMES=new Set([...CORRECT,'wrong-word','near-miss','no-answer','not-known','recognition-unclear']);
export function createVoiceSession(deck,{maxAttempts=3}={}) {
 if(!Array.isArray(deck)||!deck.length||!Number.isInteger(maxAttempts)||maxAttempts<2||maxAttempts>5)throw new TypeError('invalid voice session');
 const entries=deck.map((task,index)=>({key:'voice-'+index,task}));
 const records=Object.fromEntries(entries.map(({key})=>[key,{attempts:[],complete:false,mastered:false}]));
 return {entries,queue:entries.map(item=>item.key),records,maxAttempts};
}
export function currentVoiceCard(session) {
 const key=session?.queue?.[0];
 return key?session.entries.find(entry=>entry.key===key)||null:null;
}
export function recordVoiceAttempt(session,{kind,transcript='',spokenReading='',inputMethod='speech'}={}) {
 if(!OUTCOMES.has(kind))throw new TypeError('invalid voice outcome');
 const current=currentVoiceCard(session);
 if(!current)throw new Error('session complete');
 const prev=session.records[current.key];
 const precedingOpposite=session.entries.some(entry=>
   entry.key!==current.key &&
   entry.task.card===current.task.card &&
   entry.task.direction!==current.task.direction &&
   session.records[entry.key]?.attempts?.length>0
 );
 const attempts=[...prev.attempts,{
   kind,transcript:String(transcript).slice(0,180),
   spokenReading:String(spokenReading).slice(0,50),
   direction:current.task.direction,
   firstDirection:current.task.firstDirection!==false,
   otherDirectionPreviouslySeen:precedingOpposite,
   inputMethod:['speech','typing','silence'].includes(inputMethod)?inputMethod:'speech'
 }];
 const mastered=CORRECT.has(kind),complete=mastered||attempts.length>=session.maxAttempts;
 const records={...session.records,[current.key]:{attempts,complete,mastered}};
 const queue=[...session.queue.slice(1),...(complete?[]:[current.key])];
 return {...session,records,queue};
}
export function voiceSummary(session) {
 const records=Object.values(session.records);
 const all=records.flatMap(record=>record.attempts);
 const count=kind=>all.filter(item=>item.kind===kind).length;
 return {
   total:records.length,
   completed:records.filter(record=>record.complete).length,
   mastered:records.filter(record=>record.mastered).length,
   needsPractice:records.filter(record=>record.complete&&!record.mastered).length,
   attempts:all.length,
   wrongWord:count('wrong-word'),
   nearMiss:count('near-miss'),
   noAnswer:count('no-answer'),
   notKnown:count('not-known'),
   recognitionError:count('recognition-error'),
   recognitionUnclear:count('recognition-unclear'),
   firstTry:records.filter(record=>CORRECT.has(record.attempts[0]?.kind)).length,
   byDirection:Object.fromEntries(['de-jp','jp-de'].map(direction=>{
     const matching=session.entries.filter(entry=>entry.task.direction===direction);
     return [direction,{
       cards:matching.length,
       firstTry:matching.filter(entry=>CORRECT.has(session.records[entry.key].attempts[0]?.kind)).length,
       wrong:matching.filter(entry=>['wrong-word','near-miss','not-known','no-answer'].includes(session.records[entry.key].attempts[0]?.kind)).length,
       primed:matching.filter(entry=>session.records[entry.key].attempts[0]?.otherDirectionPreviouslySeen===true).length
     }];
   }))
 };
}
