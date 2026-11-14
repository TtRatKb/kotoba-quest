/* Optional browser regression: requires Playwright; uses only synthetic data. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const assets=new Set(['daily.html','daily.css','daily.js','daily-engine.mjs','daily-mix.mjs','daily-guided.mjs','daily-guided-variety.mjs','daily-streak.mjs','daily-completion.mjs']);
const cards=[['行く','いく','gehen','学校へ行く。'],['食べる','たべる','essen','ご飯を食べる。'],['見る','みる','sehen','映画を見る。']].map(([word,reading,meaning,example],i)=>({id:String(i),word,reading,meanings:[meaning],example,stage:2}));
const source=`window.KotobaDungeonSource={load:async()=>({learned:${JSON.stringify(cards)}}),readSave:async()=>({data:{particlePath:{points:{'ni-target':{lessonComplete:true},'de-action':{lessonComplete:true}}}}})};`;
(async()=>{
 let browser;
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(name==='dungeon-source.js'){res.setHeader('Content-Type','text/javascript');res.end(source);return;}
  if(!assets.has(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript');
  try{res.end(await fs.readFile(path.join(root,name)));}catch{res.writeHead(500);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const executablePath=process.env.CHROMIUM_EXECUTABLE;
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']});
  const url=`http://127.0.0.1:${server.address().port}/daily.html`;
  for(const width of [320,390,768]){
   const context=await browser.newContext({viewport:{width,height:844},timezoneId:'Europe/Berlin'});
   const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(()=>{
    // Fixed synthetic clock, mutable without reloading the in-memory state.
    const RealDate=Date;window.testNow='2026-11-14T22:55:00Z';
    window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[window.testNow]));}static now(){return new RealDate(window.testNow).getTime();}};
    window.writes=[];
    for(const method of ['setItem','removeItem','clear'])Storage.prototype[method]=()=>{window.writes.push(method);throw Error('Unexpected Storage write')};
    indexedDB.open=()=>{window.writes.push('indexedDB');throw Error('Unexpected IndexedDB access')};
   });
   await page.goto(url);await page.locator('[data-start=discovery]').waitFor();
   const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
   const home=async()=>{await page.locator('[data-home]').click();await noOverflow();};
   const start=async(mode='discovery')=>page.locator(`[data-start=${mode}]`).click();
   const finish=async({skip=false,ime=false,midnight=false}={})=>{
    let steps=0;
    while(!await page.locator('.results').count()){
     await noOverflow();
     const input=page.locator('#dailyAnswer');
     if(await input.count()){
      if(skip){await page.locator('[data-example]').click();}
      else{
       await input.fill('   ');await page.locator('form button[type=submit]').click();
       assert.equal(await page.locator('.feedback').count(),0,'whitespace must not advance');
       await input.fill('鍵を忘れてしまった。');
       if(ime){
        await input.dispatchEvent('compositionstart');await page.locator('#dailyAnswerForm').evaluate(el=>el.requestSubmit());
        assert.equal(await page.locator('.feedback').count(),0,'IME submit must be ignored');
        await input.dispatchEvent('compositionend');
       }
       await input.press('Enter');
      }
      assert(await page.locator('.feedback').count());
     }else if(await page.locator('[data-choice]').count())await page.locator('[data-choice]').last().click();
     if(midnight&&await page.locator('.feedback').count()&&await page.locator('[data-next]').textContent()==='Auswertung ansehen →')await page.evaluate(()=>{window.testNow='2026-11-14T23:01:00Z';});
     await page.locator('[data-next]').click();steps++;assert(steps<=8);
    }
    await noOverflow();return steps;
   };
   // Aborting and looking at a model do not earn a day.
   await start();await page.locator('[data-next]').click();await home();
   assert(!(await page.locator('.daily-day').textContent()).includes('Heute geübt'));
   await start();assert.equal(await finish({skip:true}),4);
   assert((await page.locator('.completion-note').textContent()).includes('Heute ganz ohne Druck'));
   await home();assert(!(await page.locator('.daily-day').textContent()).includes('Heute geübt'));
   // Active attempts earn one day even with wrong choices; IME remains editable.
   await start();await finish({ime:true});
   assert((await page.locator('.completion-note').textContent()).includes('Dein Tagesziel ist erreicht'));
   await home();assert((await page.locator('.daily-day').textContent()).includes('1 Lerntag in Folge'));
   // A second active quest is idempotent, while all old modes remain usable.
   await start();await finish();assert((await page.locator('.completion-note').textContent()).includes('schon erreicht'));await home();
   for(const mode of ['daily','refresh']){await start(mode);assert.equal(await finish(),8);await home();}
   // Finishing across midnight credits the new date, not the start date.
   await start();await finish({midnight:true});await home();
   assert((await page.locator('.daily-day').textContent()).includes('2 Lerntage in Folge'));
   await page.locator('[data-guided="particle-ni-de"]').click();assert.equal(await finish(),4);await home();
   // No completion survives reloading, and no storage adapter was touched.
   await page.reload();await page.locator('.daily-day').waitFor();
   assert(!(await page.locator('.daily-day').textContent()).includes('Heute geübt'));
   assert.deepEqual(await page.evaluate(()=>window.writes),[]);assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: active day, opt-out, abort, duplicates, midnight, all modes, IME guard, no writes/overflow`);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
