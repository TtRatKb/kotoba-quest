/* Kotoba Dungeon source adapter. READ ONLY access to Kotoba Quest save. */
(() => {
  'use strict';

  const DB_NAME='kotobaQuestDurableStorageV1';
  const STORE='snapshots';
  const PRIMARY_KEY='primaryLearningState';
  const MAIN_KEY='mainCheckpoint';
  const LOCAL_KEYS=['kotobaQuestDataV3','kotobaQuestDataV2','kotobaQuestDataV1'];

  const string=v=>String(v??'').trim();
  const arr=v=>Array.isArray(v)?v:typeof v==='string'?v.split(/[,;]\s*/).filter(Boolean):[];
  const id=v=>string(v?.packEntryId||v?.id);

  function parseSave(raw,key){
    if(typeof raw!=='string'||!raw)return null;
    try{
      const parsed=JSON.parse(raw);
      return parsed&&typeof parsed==='object'&&Array.isArray(parsed.vocabulary)?{key,data:parsed}:null;
    }catch(_){return null;}
  }

  function readLocalSave(){
    for(const key of LOCAL_KEYS){
      try{
        const parsed=parseSave(localStorage.getItem(key),key);
        if(parsed)return parsed;
      }catch(_){}
    }
    return null;
  }

  function readIdbRecord(db,key){
    return new Promise(resolve=>{
      try{
        if(!db.objectStoreNames.contains(STORE)){resolve(null);return;}
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).get(key);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>resolve(null);
        tx.onabort=()=>resolve(null);
      }catch(_){resolve(null);}
    });
  }

  async function readIndexedDbSave(){
    if(!('indexedDB' in window))return null;
    let db=null;
    try{
      db=await new Promise(resolve=>{
        const request=indexedDB.open(DB_NAME);
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>resolve(null);
        request.onblocked=()=>resolve(null);
        request.onupgradeneeded=()=>{
          // Dungeon is read-only. If this database did not exist yet, do not
          // create Kotoba's schema here; the main app will do that itself.
          try{request.transaction.abort();}catch(_){}
        };
      });
      if(!db)return null;
      const primary=await readIdbRecord(db,PRIMARY_KEY);
      const parsedPrimary=parseSave(primary?.raw,'indexeddb-primary');
      if(parsedPrimary)return parsedPrimary;
      const checkpoint=await readIdbRecord(db,MAIN_KEY);
      return parseSave(checkpoint?.raw,'indexeddb-checkpoint');
    }catch(_){return null;}
    finally{try{db?.close();}catch(_){}}
  }

  async function readSave(){
    // Since storage V3 the authoritative Kotoba state lives in IndexedDB.
    // Older/localStorage saves remain a fallback for legacy installs and imports.
    return (await readIndexedDbSave())||readLocalSave();
  }

  function contentIsUsable(v){return !!(string(v?.word)&&string(v?.reading)&&arr(v?.meanings).some(x=>string(x)));}

  // Core catalogue in the same public Kotoba Quest index.html. Parse the literal JSON; never eval app source.
  async function catalog(){
    const res=await fetch('./index.html',{cache:'no-store'});
    if(!res.ok)throw new Error('Core-Katalog ist nicht erreichbar.');
    const page=await res.text();
    const mark='const EMBEDDED_CORE_PACK = ';
    const from=page.indexOf(mark);
    const end=page.indexOf(';\n    const CORE_PACK',from);
    if(from<0||end<from)throw new Error('Die Core-Katalog-Version wurde nicht erkannt.');
    const pack=JSON.parse(page.slice(from+mark.length,end));
    if(!Array.isArray(pack.entries)||pack.entries.length<100)throw new Error('Unvollständiger Core-Katalog.');
    return pack.entries;
  }

  function hydrate(progress,pack){
    const byId=new Map(pack.map((v,i)=>[id(v),v]));
    const byIndex=new Map(pack.map((v,i)=>[Number(v.coreIndex??i),v]));
    const byIdentity=new Map(pack.map(v=>[`${v.word}|${v.reading}`,v]));
    const saved=progress?.data?.vocabulary||[];
    const output=[],seen=new Set();
    for(const v of saved){
      const source=string(v.sourceType)==='mining'?'mining':'core';
      const packItem=source==='core'?(byId.get(id(v))||byIdentity.get(`${v.word}|${v.reading}`)||(v.coreIndex!=null&&Number.isFinite(Number(v.coreIndex))?byIndex.get(Number(v.coreIndex)):null)||null):null;
      const merged=packItem?{...packItem,...v,word:string(v.word)||packItem.word,reading:string(v.reading)||packItem.reading,meanings:arr(v.meanings).length?arr(v.meanings):packItem.meanings}:v;
      const key=id(merged)||`${source}:${merged.word}|${merged.reading}`;
      if(!key||seen.has(key)||!contentIsUsable(merged))continue;
      seen.add(key);
      output.push({
        id:key,
        source,
        word:string(merged.word),
        reading:string(merged.reading),
        meanings:arr(merged.meanings).map(string).filter(Boolean),
        acceptedMeanings:arr(merged.acceptedMeanings).map(string).filter(Boolean),
        synonyms:arr(merged.synonyms).map(string).filter(Boolean),
        meaningAlternatives:arr(merged.meaningAlternatives).map(string).filter(Boolean),
        acceptedReadings:arr(merged.acceptedReadings).map(string).filter(Boolean),
        example:string(merged.example),
        exampleTranslation:string(merged.exampleTranslation),
        stage:Math.max(0,Math.min(9,Number(merged.stage)||0)),
        guruPassed:Boolean(merged.guruPassed)
      });
    }
    return output;
  }

  async function load(){
    const save=await readSave();
    let pack=[];
    let packError='';
    try{pack=await catalog();}catch(err){packError=String(err.message||err);}
    const vocabulary=hydrate(save,pack);
    const learned=vocabulary.filter(v=>v.stage>=1||v.guruPassed);
    const starter=pack.slice(0,20).filter(contentIsUsable).map(v=>({
      id:id(v),source:'starter',word:string(v.word),reading:string(v.reading),meanings:arr(v.meanings).map(string),
      acceptedMeanings:[],synonyms:[],meaningAlternatives:[],acceptedReadings:[],example:string(v.example),
      exampleTranslation:string(v.exampleTranslation),stage:0,guruPassed:false
    }));
    return{vocabulary,learned,starter,catalog:pack,saveKey:save?.key||null,packError,hasLiveSave:!!save,packCount:pack.length};
  }

  window.KotobaDungeonSource={version:2,load,readSave,readLocalSave,readIndexedDbSave,hydrate};
})();
