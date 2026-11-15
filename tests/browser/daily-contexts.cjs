/* Local synthetic Core cards; verifies the actual display overlay in Daily. */
const {chromium}=require('playwright');const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const load=name=>import(pathToFileURL(path.join(root,name)).href);
 const {DAILY_CONTEXTS_V1:collection}=await load('content/daily/contexts-v1.mjs');
 const {coreContextCatalog}=await load('scripts/validate-daily-original-contexts.mjs');
 const {withDailyContexts}=await load('daily-contexts.mjs');const {buildRefresh}=await load('daily-engine.mjs');
 const catalog=coreContextCatalog().entries.filter(e=>collection.records.some(r=>r.packEntryId===e.packEntryId));
 const cards=catalog.map(e=>({...e,id:e.packEntryId,source:'core',stage:2}));
 const session=buildRefresh(withDailyContexts(cards,catalog),'2026-11-15');
 const source=`window.fixtureCards=${JSON.stringify(cards)};window.KotobaDungeonSource={load:async()=>({learned:window.fixtureCards,catalog:${JSON.stringify(catalog)}}),readSave:async()=>({data:{vocabulary:window.fixtureCards,kanjiPilot:{version:4,kanji:{}}}})};`;
 const server=http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1),file=path.resolve(root,name);
  if(name==='dungeon-source.js'){res.setHeader('Content-Type','text/javascript');res.end(source);return;}
  if(!file.startsWith(root+'/')||!/\.(html|mjs|js|css|png|webmanifest)$/.test(file)){res.writeHead(404);res.end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[320,360],[390,320]]){
   const context=await browser.newContext({viewport:{width,height},timezoneId:'Europe/Berlin'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   await context.addInitScript(()=>{
    const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-11-15T12:00:00Z']));}static now(){return new RealDate('2026-11-15T12:00:00Z').getTime();}};
    window.writes=[];for(const key of ['setItem','removeItem','clear'])Storage.prototype[key]=()=>{window.writes.push(key);throw Error('Unexpected storage mutation');};indexedDB.open=()=>{window.writes.push('idb');throw Error('Unexpected IDB access');};
   });
   await page.goto(origin+'/daily.html');await page.locator('[data-start=refresh]').click();
   const visible=async selector=>{const b=await page.locator(selector).boundingBox();assert(b&&b.y>=-1&&b.y+b.height<=height+1,`${selector} outside ${width}x${height}: ${JSON.stringify(b)}`);};
   const plain=selector=>page.locator(selector).evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('rt,rp').forEach(node=>node.remove());return copy.textContent;});
   for(const task of session.tasks){
    assert(task.contextId);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await visible('.session-dock');
    if(task.readingTask)assert.equal(await page.locator('.task-jp rt').count(),0);
    if(task.kind==='cloze'){assert((await plain('.question')).includes(task.prompt));assert(await page.locator('.task-jp rt').count());}
    if(task.options)await page.locator('[data-choice="0"]').click();else{await visible('#dailyAnswer');await page.locator('#dailyAnswer').fill(task.kind==='meaning-type'?'Wort':task.reading);await page.locator('#dailyAnswer').press('Enter');}
    assert((await plain('.feedback')).includes(task.example));assert((await plain('.feedback')).includes(task.exampleTranslation));assert(!(await plain('.feedback')).includes('という言葉'));
    assert(await page.locator('.feedback rt').count(),'explicit readings on contextual feedback');await visible('[data-next]');const heading=await page.locator('.feedback strong').boundingBox();assert(heading.y>=0&&heading.y<height);
    if(width===390&&height===844&&task.kind==='cloze')await page.screenshot({path:path.join(root,'work/context-feedback.png')});
    await page.locator('[data-next]').click();
   }
   await page.locator('.results').waitFor();assert((await page.locator('.completion-note').textContent()).includes('Tagesziel ist erreicht'));
   assert.deepEqual(await page.evaluate(()=>window.fixtureCards),cards,'source objects unchanged');assert.deepEqual(await page.evaluate(()=>window.writes),[]);assert.deepEqual(errors,[]);
   console.log(`PASS contexts ${width}x${height}: exact pairs, safe cloze, contextual ruby, reading-task hide/restore, feedback/dock, no writes/mutation`);await context.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
