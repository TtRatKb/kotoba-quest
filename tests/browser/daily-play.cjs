/* Synthetic local prototype smoke; no real user save or outbound requests. */
const {chromium}=require('playwright');const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const {VISUAL_WORDS,buildPlaySession}=await import(pathToFileURL(path.join(root,'daily-play.mjs')).href);
 const cards=VISUAL_WORDS.map(w=>({id:'test-'+w.id,source:'core',word:w.word,reading:w.reading,meanings:[w.meaning],stage:2}));
 const save={vocabulary:cards,particlePath:{points:{'ni-target':{lessonComplete:true},'ga-subject':{lessonComplete:true}}},kanjiPilot:{version:4,kanji:{}}};
 const session=buildPlaySession(cards,save,'2026-11-15');
 const source=`window.KotobaDungeonSource={load:async()=>({learned:${JSON.stringify(cards)},catalog:${JSON.stringify(cards)}}),readSave:async()=>({data:${JSON.stringify(save)}})};`;
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1),file=path.resolve(root,name);
  if(name==='dungeon-source.js'){res.setHeader('Content-Type','text/javascript');res.end(source);return;}
  if(!file.startsWith(root+'/')||!/\.(html|mjs|js|css|png|webmanifest)$/.test(file)){res.writeHead(404);res.end();return;}
  const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':'text/javascript';
  try{res.setHeader('Content-Type',type);res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [width,height] of (process.env.PLAY_SHORT?[[390,320]]:[[320,568],[375,667],[390,844],[430,932],[320,360],[390,320]])){
   const context=await browser.newContext({viewport:{width,height},timezoneId:'Europe/Berlin',reducedMotion:width===430?'reduce':'no-preference'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   await context.addInitScript(()=>{
    const ActualDate=Date;window.Date=class extends ActualDate{constructor(...args){super(...(args.length?args:['2026-11-15T12:00:00Z']));}static now(){return new ActualDate('2026-11-15T12:00:00Z').getTime();}};
    window.writes=[];for(const key of ['setItem','removeItem','clear'])Storage.prototype[key]=()=>{window.writes.push(key);throw Error('Unexpected storage mutation');};indexedDB.open=()=>{window.writes.push('idb');throw Error('Unexpected IndexedDB access');};
   });
   const inView=async(selector)=>{const box=await page.locator(selector).boundingBox();if(box&&box.y+box.height>height+1)await page.screenshot({path:path.join(root,'work/play-overflow.png')});assert(box&&box.y>=-1&&box.y+box.height<=height+1,`${selector} outside ${width}x${height}: ${JSON.stringify(box)}`);};
   await page.goto(origin+'/daily.html');await page.locator('[data-start=play]').click();
   assert.equal(await page.locator('#feedbackToggle').getAttribute('aria-pressed'),'false');
   for(let i=0;i<2;i++){
    const task=session.tasks[i];assert.equal(await page.locator('.picture-card').count(),4);await inView('.picture-grid');await inView('#feedbackToggle');
    await page.locator('.visual-art img').first().evaluate(img=>img.decode());assert.equal(await page.locator('.visual-art img').first().evaluate(img=>img.naturalWidth),1536);
    if(/\p{Script=Han}/u.test(task.target.word))assert(await page.locator('.picture-heading rt').count(),'unknown Kanji must have explicit reading');
    if(width===390&&height===844&&i===0)await page.screenshot({path:path.join(root,'work/play-choice.png')});
    if(i===0){await page.locator('#feedbackToggle').click();assert.equal(await page.locator('#feedbackToggle').getAttribute('aria-pressed'),'true');await page.locator('#feedbackToggle').click();}
    const id=i===0?task.options.find(id=>id!==task.correct):task.correct;await page.locator(`[data-choice="${task.options.indexOf(id)}"]`).click();
    assert.equal(await page.locator('.feedback.error').count(),i===0?1:0);await inView('[data-next]');if(i===0){await page.locator('#feedbackToggle').focus();await page.locator('#feedbackToggle').press('Enter');assert(await page.locator('.feedback').count(),'toggle Enter must not advance');await page.locator('#feedbackToggle').click();}await page.locator('[data-next]').click();
   }
   const matching=session.tasks.find(t=>t.kind==='image-matching');assert.equal(await page.locator('[data-match-image]').count(),3);assert.equal(await page.locator('[data-match-word]').count(),3);await inView('.matching-board');
   if(width===390&&height===844)await page.screenshot({path:path.join(root,'work/play-matching.png')});
   const [a,b]=matching.pairs.map(p=>p.id);await page.locator(`[data-match-image="${a}"]`).click();await page.locator(`[data-match-word="${b}"]`).click();assert((await page.locator('.play-status').textContent()).includes('Noch nicht'));assert.equal(await page.locator('.matched-space').count(),0);
   for(let i=0;i<matching.pairs.length;i++){
    const id=matching.pairs[i].id;
    if(i===0){await page.locator(`[data-match-word="${id}"]`).click();await page.locator(`[data-match-image="${id}"]`).click();}
    else{await page.locator(`[data-match-image="${id}"]`).click();await page.locator(`[data-match-word="${id}"]`).click();}
    if(i<matching.pairs.length-1)await page.waitForFunction(n=>document.querySelectorAll('.matched-space').length===n,(i+1)*2);
    else await page.locator('[data-next]').waitFor();
   }
   await inView('[data-next]');await page.locator('[data-next]').click();
   const tiles=session.tasks.find(t=>t.kind==='sentence-tiles');const first=tiles.bank[0];await page.locator(`[data-token="${first}"]`).click();await page.locator('[data-remove-token="0"]').click();assert.equal(await page.locator('.sentence-line button').count(),0);
   for(const id of tiles.accepted[1]||tiles.accepted[0])await page.locator(`[data-token="${id}"]`).click();
   await inView('[data-check-sentence]');if(width===390&&height===844)await page.screenshot({path:path.join(root,'work/play-sentence.png')});
   await page.locator('[data-check-sentence]').click();assert((await page.locator('.feedback strong').textContent()).includes('Gut erkannt'));await page.locator('[data-next]').click();
   assert((await page.locator('.results').textContent()).includes('3 Paare gefunden'));assert((await page.locator('.results').textContent()).includes('1 weiterer Versuch'));await page.locator('[data-home]').click();assert(!(await page.locator('.daily-day').textContent()).includes('Heute geübt'),'visual training must not credit a day');
   // A second run: unknown complete order is ungraded, and stale pair timers cannot revive an abandoned session.
   await page.locator('[data-start=play-demo]').click();
   for(let i=0;i<2;i++){await page.locator('[data-choice="0"]').click();await page.locator('[data-next]').click();}
   const demo=buildPlaySession([],{},'2026-11-15',{demo:true}),m=demo.tasks.find(t=>t.kind==='image-matching');
   await page.locator(`[data-match-image="${m.pairs[0].id}"]`).click();await page.locator(`[data-match-word="${m.pairs[0].id}"]`).click();await page.locator('[data-home]').click();await page.waitForTimeout(240);assert(await page.locator('[data-start=play]').count());
   if(width===390&&height===844){
    await page.locator('[data-start=play-demo]').click();for(let j=0;j<2;j++){await page.locator('[data-choice="0"]').click();await page.locator('[data-next]').click();}
    for(const pair of m.pairs){await page.locator(`[data-match-image="${pair.id}"]`).click();await page.locator(`[data-match-word="${pair.id}"]`).click();await page.waitForTimeout(200);}
    await page.locator('[data-next]').click();const sentence=demo.tasks.find(t=>t.kind==='sentence-tiles');
    for(const id of [...sentence.accepted[0]].reverse())await page.locator(`[data-token="${id}"]`).click();await page.locator('[data-check-sentence]').click();
    assert.equal(await page.locator('.feedback.error').count(),0);assert((await page.locator('.feedback strong').textContent()).includes('mögliche Reihenfolge'));
    await page.locator('[data-next]').click();assert((await page.locator('.results').textContent()).includes('unbewertet: 1'));
   }
   assert.deepEqual(await page.evaluate(()=>window.writes),[]);assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(`PASS play ${width}x${height}: image choices, pairs, tiles, dock, ruby, opt-in, timer cancellation, no writes`);await context.close();
  }
  // Local asset failures cannot turn into invisible correct answers.
  const context=await browser.newContext();const page=await context.newPage();await page.route('**/assets/daily/objects-v1.png',r=>r.abort());await page.goto(origin+'/daily.html');await page.locator('[data-start=play]').click();await page.locator('[role=alert]').waitFor();assert.equal(await page.locator('.picture-card:disabled').count(),4);await context.close();console.log('PASS missing local image: explicit error, choices disabled');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
