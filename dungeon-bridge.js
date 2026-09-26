/* Little Dungeon V0.4: compact, durable, same-origin receipt outbox.
 * NO access to Kotoba SRS save or Life RPG private save. */
(() => {
  'use strict';
  const KEY='kotobaQuestDungeonRewardOutboxV1';
  const MAX=2400;
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x?.schemaVersion===1&&Array.isArray(x.events)?x.events:[];}catch(_){return[];}}
  function publish(event){
    if(!event?.id || !/^kd-[\w-]{8,}:floor[1-4]$/.test(event.id)) return false;
    const entries=read();
    if(entries.some(x=>x.id===event.id)) return false;
    const safe={schemaVersion:1,id:String(event.id),runId:String(event.runId),floor:Number(event.floor),kind:event.kind==='boss'?'boss':'enemy',mode:event.mode==='timed'?'timed':'normal',source:['known','guru','starter'].includes(event.source)?event.source:'known',hits:Math.max(1,Math.min(60,Math.floor(Number(event.hits)||1))),attempts:Math.max(1,Math.min(250,Math.floor(Number(event.attempts)||1))),at:new Date().toISOString()};
    entries.push(safe);
    try{localStorage.setItem(KEY,JSON.stringify({schemaVersion:1,events:entries.slice(-MAX)}));}
    catch(err){console.warn('Dungeon reward outbox was not stored:',err);return false;}
    try{const ch=new BroadcastChannel('life-rpg-kotoba-dungeon-v1');ch.postMessage({type:'receipt-ready',id:safe.id});ch.close();}catch(_){}
    // When opened from Life RPG in another tab, notify the opening page too.
    try{if(window.opener && !window.opener.closed){const target=new URLSearchParams(location.search).get('lifeOrigin');if(target && new URL(target).origin===target)window.opener.postMessage({type:'kotoba-dungeon-receipt-v1',event:safe},target);}}catch(_){}
    return true;
  }
  function download(){const blob=new Blob([JSON.stringify({schemaVersion:1,type:'kotoba-dungeon-receipts-v1',events:read()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='kotoba-dungeon-rewards.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  window.KotobaDungeonBridge={version:1,storageKey:KEY,publish,read,download};
})();
