/* Candidate persistence adapter for Daily-only calendar days.
 * It is deliberately not imported by daily.js until the backup/restore gate passes.
 */
import {asDayNumber, recordDailyCompletion} from './daily-streak.mjs';

export const DAILY_STREAK_DB = 'kotobaDailyCompletionV1';
export const DAILY_STREAK_STORE = 'scopes';
const SCOPE = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

function validScope(scope) {
  if (typeof scope !== 'string' || !SCOPE.test(scope)) throw new TypeError('invalid-scope');
  return scope;
}
export function validateStreakRecord(value,scope) {
  if(value==null)return {ok:true,missing:true,days:[]};
  if (!value || value.version!==1 || value.scope!==scope || !Array.isArray(value.days) ||
      Object.keys(value).some(key=>!['version','scope','days'].includes(key))) return {ok:false,error:'invalid-schema',days:[]};
  if (value.days.some(day=>asDayNumber(day)==null) || new Set(value.days).size!==value.days.length ||
      value.days.some((day,index)=>index>0&&value.days[index-1]>=day)) return {ok:false,error:'invalid-days',days:[]};
  return {ok:true,missing:false,days:[...value.days]};
}

export function createIndexedDbStreakPersistence(indexedDB=globalThis.indexedDB) {
  let databasePromise=null;
  const open=()=>{
    if(!indexedDB?.open)return Promise.reject(Error('storage-unavailable'));
    databasePromise ||= new Promise((resolve,reject)=>{
      let request;
      try { request=indexedDB.open(DAILY_STREAK_DB,1); } catch { reject(Error('storage-open-failed'));return; }
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(DAILY_STREAK_STORE))db.createObjectStore(DAILY_STREAK_STORE,{keyPath:'scope'});};
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
      request.onerror=()=>reject(Error('storage-open-failed'));
      request.onblocked=()=>reject(Error('storage-blocked'));
    }).catch(error=>{databasePromise=null;throw error;});
    return databasePromise;
  };
  return Object.freeze({
    async read(scope){
      validScope(scope);let db;
      try{db=await open();}catch(error){return {ok:false,error:error.message,days:[]};}
      return new Promise(resolve=>{
        let tx,request;
        try{tx=db.transaction(DAILY_STREAK_STORE,'readonly');request=tx.objectStore(DAILY_STREAK_STORE).get(scope);}catch{return resolve({ok:false,error:'storage-read-failed',days:[]});}
        request.onsuccess=()=>resolve(validateStreakRecord(request.result,scope));request.onerror=()=>resolve({ok:false,error:'storage-read-failed',days:[]});tx.onabort=()=>resolve({ok:false,error:'storage-read-failed',days:[]});
      });
    },
    async update(scope,change){
      validScope(scope);if(typeof change!=='function')return {ok:false,error:'invalid-update',days:[]};let db;
      try{db=await open();}catch(error){return {ok:false,error:error.message,days:[]};}
      return new Promise(resolve=>{
        let settled=false,result={ok:false,error:'storage-write-failed',days:[]},tx,store,request;
        const finish=value=>{if(!settled){settled=true;resolve(value);}};
        try{tx=db.transaction(DAILY_STREAK_STORE,'readwrite');store=tx.objectStore(DAILY_STREAK_STORE);request=store.get(scope);}catch{return finish(result);}
        request.onerror=()=>{try{tx.abort();}catch{}};
        request.onsuccess=()=>{
          const current=validateStreakRecord(request.result,scope);
          if(!current.ok){result=current;try{tx.abort();}catch{}return;}
          let next;try{next=change([...current.days]);}catch{result={ok:false,error:'update-failed',days:current.days};try{tx.abort();}catch{}return;}
          if(!Array.isArray(next)||next.some(day=>asDayNumber(day)==null)){result={ok:false,error:'invalid-update',days:current.days};try{tx.abort();}catch{}return;}
          if(next.length===current.days.length&&next.every((day,index)=>day===current.days[index])){result={ok:true,changed:false,days:next};return;}
          result={ok:true,changed:true,days:[...next]};
          try{store.put({version:1,scope,days:[...next]});}catch{result={ok:false,error:'storage-write-failed',days:current.days};try{tx.abort();}catch{}}
        };
        tx.oncomplete=()=>finish(result);tx.onerror=()=>finish({ok:false,error:'storage-write-failed',days:result.days||[]});tx.onabort=()=>finish(result.ok?{ok:false,error:'storage-write-failed',days:[]}:result);
      });
    },
    close(){databasePromise?.then(db=>db.close()).catch(()=>{});databasePromise=null;}
  });
}

export function createDailyStreakStore({persistence,scope='local-profile'}={}) {
  validScope(scope);
  return Object.freeze({
    version:1,scope,
    async read(){if(!persistence?.read)return {ok:false,error:'storage-unavailable',days:[]};try{return await persistence.read(scope);}catch{return {ok:false,error:'storage-read-failed',days:[]};}},
    async record(day){
      if(asDayNumber(day)==null)return {ok:false,error:'invalid-day',days:[]};
      if(!persistence?.update)return {ok:false,error:'storage-unavailable',days:[]};
      try{return await persistence.update(scope,days=>recordDailyCompletion(days,day));}catch{return {ok:false,error:'storage-write-failed',days:[]};}
    }
  });
}
