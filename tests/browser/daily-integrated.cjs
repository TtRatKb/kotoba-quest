/* Actual Daily UI with synthetic data only; blocks storage and outbound traffic. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const {VISUAL_WORDS}=await import(pathToFileURL(path.join(root,'daily-play.mjs')).href);
 const {buildDailyMix,buildDailyExtension}=await import(pathToFileURL(path.join(root,'daily-mix.mjs')).href);
 const {buildPractice}=await import(pathToFileURL(path.join(root,'daily-practice.mjs')).href);
 const {isCorrect}=await import(pathToFileURL(path.join(root,'daily-engine.mjs')).href);
 const cards=VISUAL_WORDS.map(w=>({id:w.id,word:w.word,reading:w.reading,meanings:[w.meaning],stage:2}));
 const save={particlePath:{points:{'ni-target':{lessonComplete:true},'ga-subject':{lessonComplete:true},'de-action':{lessonComplete:true}}},kanjiPilot:{version:4,kanji:{}}};
 const source=`window.KotobaDungeonSource={load:async()=>({learned:${JSON.stringify(cards)},catalog:${JSON.stringify(cards)}}),readSave:async()=>({data:${JSON.stringify(save)}})};`;
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1),file=path.resolve(root,name);
  if(name==='dungeon-source.js'){res.setHeader('Content-Type','text/javascript');res.end(source);return;}
  if(!file.startsWith(root+'/')||!/\.(html|css|js|mjs|png|webmanifest)$/.test(file)){res.writeHead(404);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [width,height] of (process.env.QUEST_SHORT?[[390,320]]:[[320,568],[375,667],[390,844],[430,932],[320,360],[390,320]])){
   const context=await browser.newContext({viewport:{width,height},timezoneId:'Europe/Berlin',reducedMotion:width===430?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   await context.addInitScript(()=>{
    const ActualDate=Date;window.testNow='2026-11-15T12:00:00Z';window.Date=class extends ActualDate{constructor(...args){super(...(args.length?args:[window.testNow]));}static now(){return new ActualDate(window.testNow).getTime();}};
    window.writes=[];for(const key of ['setItem','removeItem','clear'])Storage.prototype[key]=()=>{window.writes.push(key);throw Error('Unexpected storage mutation');};indexedDB.open=()=>{window.writes.push('idb');throw Error('Unexpected IndexedDB access');};
   });
   const visible=async selector=>{const box=await page.locator(selector).boundingBox();assert(box&&box.y>=-1&&box.y+box.height<=height+1,`${selector} outside ${width}x${height}: ${JSON.stringify(box)}`);};
   const finish=async(session,{skipTransfer=false,ime=false}={})=>{
    for(const task of session.tasks){
     await visible('.session-dock');await visible('#feedbackToggle');
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     if(task.kind==='image-choice'){
      await visible('.picture-grid');assert.equal(await page.locator('[data-choice]').count(),4);
      if(/\p{Script=Han}/u.test(task.target.word))assert(await page.locator('.picture-heading rt').count());
      const wrong=task.options.findIndex(id=>id!==task.correct);
      await page.locator(`[data-choice="${wrong}"]`).press(String(wrong+1));
     }else if(task.kind==='image-matching'){
      await visible('.matching-board');
      for(const pair of task.pairs){
       await page.locator(`[data-match-word="${pair.id}"]`).focus();await page.keyboard.press('Enter');
       await page.locator(`[data-match-image="${pair.id}"]`).press('Enter');
       await page.waitForFunction(id=>!document.querySelector(`[data-match-image="${id}"]`),pair.id);
      }
     }else if(task.kind==='sentence-tiles'){
      assert(await page.locator('.token-bank rt').count(),'unknown sentence Kanji retains ruby');
      const order=[...task.accepted[0]].reverse();
      await page.locator(`[data-token="${order[0]}"]`).press('Enter');
      await page.locator('[data-remove-token="0"]').press('Enter');
      for(const id of order)await page.locator(`[data-token="${id}"]`).press('Enter');
      await visible('[data-check-sentence]');await page.locator('[data-check-sentence]').press('Enter');
      assert.equal(await page.locator('.feedback.error').count(),0);
      assert((await page.locator('.feedback strong').textContent()).includes('mögliche Reihenfolge'));
     }else if(task.kind!=='lesson'){
      if(task.options)await page.locator('[data-choice="0"]').click();
      else{
       const input=page.locator('#dailyAnswer');await visible('#dailyAnswer');
       if(skipTransfer&&task.kind==='open')await page.locator('[data-example]').click();
       else{
        if(ime){await input.dispatchEvent('compositionstart');await input.fill('nenrei');await page.locator('#dailyAnswerForm').evaluate(el=>el.requestSubmit());assert.equal(await page.locator('.feedback').count(),0);await input.dispatchEvent('compositionend');}
        await input.fill(task.kind==='meaning-type'?'Wort':'猫がいます。');await input.press('Enter');
       }
      }
     }
     await visible('[data-next]');
     if(task.kind!=='lesson'){const b=await page.locator('.feedback strong').boundingBox();assert(b.y>=0&&b.y<height,'feedback immediately visible');assert(await page.locator('[data-next]').evaluate(el=>el===document.activeElement));}
     if(width===390&&height===844&&task.kind==='image-choice')await page.screenshot({path:path.join(root,'work/integrated-choice.png')});
     await page.locator('[data-next]').click();
    }
    await page.locator('.results').waitFor();
   };
   await page.goto(origin+'/daily.html');await page.locator('[data-start=daily]').click();
   await page.locator('[data-home]').click();assert(!(await page.locator('.daily-day').textContent()).includes('Heute geübt'));
   const normal=buildDailyMix(cards,save,'2026-11-15');
   await page.locator('[data-start=daily]').click();await finish(normal,{ime:true});
   assert((await page.locator('.completion-note').textContent()).includes('Tagesziel ist erreicht'));
   assert((await page.locator('.results').textContent()).includes('0 offizielle SRS-Reviews'));
   assert((await page.locator('.learned-summary').textContent()).includes('In Bildern wiedererkannt'));
   const score=await page.locator('.score').textContent(),completion=await page.locator('.completion-note').textContent();
   if(width===390&&height===844)await page.screenshot({path:path.join(root,'work/integrated-summary.png'),fullPage:true});
   // Additional work crossing midnight must not earn a second day or replace the original result.
   await page.locator('[data-extend]').click();await page.evaluate(()=>{window.testNow='2026-11-15T23:30:00Z';});
   await finish(buildDailyExtension(normal,cards,save,'2026-11-15'));
   await page.locator('[data-return-extension]').click();assert.equal(await page.locator('.score').textContent(),score);assert.equal(await page.locator('.completion-note').textContent(),completion);assert.equal(await page.locator('[data-extend]').count(),0);
   if(width===390&&height===844){
    const answers=normal.tasks.map(t=>({taskId:t.id,response:(t.kind==='image-choice'?t.options.find(id=>id!==t.correct):t.options?.[0])||'猫がいます。',correct:t.options?(t.kind==='image-choice'?false:isCorrect(t,t.options[0])):null}));
    const retry=buildPractice(normal,answers);assert(retry?.tasks.some(t=>t.kind==='image-choice'));await page.locator('[data-practice]').click();await finish(retry);await page.locator('[data-return]').click();
    assert.equal(await page.locator('.score').textContent(),score);assert.equal(await page.locator('.completion-note').textContent(),completion);
   }
   await page.locator('[data-home]').click();assert.equal(await page.locator('.day-dot.done').count(),1);assert(!(await page.locator('.daily-day').textContent()).includes('Heute geübt'));
   await page.evaluate(()=>{window.testNow='2026-11-15T12:00:00Z';window.dispatchEvent(new Event('focus'));});
   assert.equal(await page.locator('.daily-overview li').count(),7);assert.equal(await page.locator('[aria-current=date] .done').count(),1);
   const short=buildDailyMix(cards,save,'2026-11-15',Date.now(),{length:'short'});
   await page.locator('[data-start=daily-short]').click();await finish(short);
   assert((await page.locator('.completion-note').textContent()).includes('schon erreicht'));await page.locator('[data-home]').click();assert.equal(await page.locator('.day-dot.done').count(),1);
   // Viewing the final model does not qualify, even if all visual tasks were completed.
   await page.reload();await page.locator('[data-start=daily]').click();await finish(normal,{skipTransfer:true});assert((await page.locator('.completion-note').textContent()).includes('Heute ganz ohne Druck'));
   await page.locator('[data-home]').click();assert.equal(await page.locator('.day-dot.done').count(),0);
   assert.deepEqual(await page.evaluate(()=>window.writes),[]);assert.deepEqual(errors,[]);await context.close();
   console.log(`PASS mixed ${width}x${height}: normal/short, visual keyboard/focus, ungraded tiles, day idempotency, extension across midnight, opt-out, no writes`);
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
