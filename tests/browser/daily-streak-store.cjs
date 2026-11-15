/* Candidate adapter only: local synthetic origin, no Kotoba save or Cloud access. */
const {chromium}=require('playwright');const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const server=http.createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!['daily-streak-store.mjs','daily-streak.mjs'].includes(name)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(root,name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({timezoneId:'Europe/Berlin'}),a=await context.newPage(),b=await context.newPage();
  for(const page of [a,b])await page.goto(origin+'/daily-streak-store.mjs');
  const install=page=>page.evaluate(async()=>{const m=await import('./daily-streak-store.mjs');window.persistence=m.createIndexedDbStreakPersistence(indexedDB);window.store=m.createDailyStreakStore({persistence,scope:'local-profile'});return store.scope;});
  assert.equal(await install(a),'local-profile');await install(b);
  const results=await Promise.all([a.evaluate(()=>store.record('2026-03-29')),b.evaluate(()=>store.record('2026-03-30')),a.evaluate(()=>store.record('2026-03-28'))]);assert(results.every(r=>r.ok));
  assert.deepEqual((await b.evaluate(()=>store.read())).days,['2026-03-28','2026-03-29','2026-03-30']);
  await a.reload();await install(a);assert.deepEqual((await a.evaluate(()=>store.read())).days,['2026-03-28','2026-03-29','2026-03-30']);
  assert.equal((await a.evaluate(()=>store.record('2026-03-30'))).changed,false);
  await a.evaluate(async()=>{const m=await import('./daily-streak-store.mjs');window.accountStore=m.createDailyStreakStore({persistence,scope:'account_test'});await accountStore.record('2026-10-25');});
  assert.deepEqual((await a.evaluate(()=>store.read())).days,['2026-03-28','2026-03-29','2026-03-30']);assert.deepEqual((await a.evaluate(()=>accountStore.read())).days,['2026-10-25']);
  assert.deepEqual(await a.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(await a.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('kotobaDailyCompletionV1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('scopes','readonly'),get=tx.objectStore('scopes').getAll();get.onsuccess=()=>resolve(get.result.map(x=>x.scope).sort());get.onerror=()=>reject(get.error);};q.onerror=()=>reject(q.error);})),['account_test','local-profile']);
  await context.close();console.log('PASS streak candidate: reload, DST calendar days, atomic parallel-tab union, idempotency, scope separation, dedicated database');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
