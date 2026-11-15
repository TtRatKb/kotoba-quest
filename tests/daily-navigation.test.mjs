import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('additive navigation points to the Daily page and retains Dungeon', () => {
  const source = readFileSync(new URL('../dungeon-nav.js', import.meta.url), 'utf8');
  assert.match(source, /kotobaDailyNavigation/);
  assert.match(source, /kotobaDungeonNavigation/);
  assert.match(source, /daily\.html/);
  assert.match(source, /dungeon\.html/);
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|setDoc|postMessage)\b/);
});

test('native Daily entries are loaded in both actual host documents, before Firebase initialization',()=>{
  const cloud=readFileSync(new URL('../cloud.html',import.meta.url),'utf8');
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(cloud,/<a id="kqDailyCloudEntry"[^>]+href="\.\/daily.html"/);
  assert.match(index,/<a id="kqDailyIndexEntry"[^>]+href="\.\/daily.html\?from=index"[^>]+target="_top"/);
  for(const html of [cloud,index])assert.match(html,/src="\.\/daily-navigation.js"/);
  assert.match(readFileSync(new URL('../daily.js',import.meta.url),'utf8'),/get\('from'\) === 'index' \? '\.\/index.html' : '\.\/cloud.html'/);
});

test('iframe navigation avoids duplicate host entries without changing learning state',()=>{
  const code=readFileSync(new URL('../daily-navigation.js',import.meta.url),'utf8');
  assert.match(code,/window\.parent\.document\.getElementById\('kqDailyCloudEntry'\)/);
  assert.match(code,/entry\.hidden = true/);
  assert.doesNotMatch(code,/localStorage|sessionStorage|indexedDB|fetch|setDoc|postMessage/);
});
