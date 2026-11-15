import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const marker='const EMBEDDED_CORE_PACK = ';
const start=source.indexOf(marker)+marker.length;
const end=source.indexOf(';\n    const CORE_PACK',start);
if(start<marker.length || end<start)throw Error('Embedded catalogue marker not found');
const entries=JSON.parse(source.slice(start,end)).entries;
const generic=entries.filter(x=>String(x.example||'').includes('という言葉を覚えました'));
console.log(JSON.stringify({total:entries.length,generic:generic.length,otherNonempty:entries.filter(x=>x.example&&!generic.includes(x)).length,missing:entries.filter(x=>!x.example).length,age:entries.filter(x=>x.word==='年齢').map(({packEntryId,word,example,exampleTranslation})=>({packEntryId,word,example,exampleTranslation}))},null,2));
