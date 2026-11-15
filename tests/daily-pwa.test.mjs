import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../kotoba.webmanifest',import.meta.url),'utf8'));
test('Kotoba manifest stays inside the repository scope and starts in Cloud',()=>{
 const base=new URL('https://example.test/kotoba-quest/kotoba.webmanifest');
 const scope=new URL(manifest.scope,base),start=new URL(manifest.start_url,base);
 assert.equal(scope.pathname,'/kotoba-quest/');assert.equal(start.pathname,'/kotoba-quest/cloud.html');
 assert(start.href.startsWith(scope.href));assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){assert(existsSync(new URL('../'+icon.src,import.meta.url)));const bytes=readFileSync(new URL('../'+icon.src,import.meta.url));const [w,h]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);}
});
test('all app entry pages share only Kotoba install metadata, without activating legacy worker',()=>{
 for(const page of ['index.html','cloud.html','daily.html']){
  const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
  assert.match(html,/rel="manifest" href="\.\/kotoba.webmanifest"/);assert.match(html,/apple-touch-icon/);
  assert.doesNotMatch(html,/src="[^\"]*pwa\.js|serviceWorker\.register/);
 }
});
