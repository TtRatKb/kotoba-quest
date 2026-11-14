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
