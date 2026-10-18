import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { Script } from "node:vm";

const changes=JSON.parse(readFileSync("scripts/kq-apply-review-ux-patch.json","utf8"));
const initial=readFileSync("cloud.html","utf8");
const blob=execFileSync("git",["hash-object","cloud.html"],{encoding:"utf8"}).trim();
assert.equal(blob,changes.baseBlob,"Refuse patch: cloud.html changed since source audit");
let result=initial;
for(const {label,before,after} of changes.edits){
  assert.equal(result.split(before).length-1,1,"Source anchor must occur once: "+label);
  result=result.replace(before,after);
}
assert.ok(result.includes("kqWkKanjiReviews"));
assert.ok(result.includes('type:guided?"choice-particle":"input"'));
assert.equal(result.match(/function gradeCurrent\(correct,entered\)/g)?.length,1);
writeFileSync("cloud.html",result,"utf8");
const scripts=[...result.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for(const [,source] of scripts) new Script(source);
console.info("Patched",changes.edits.length,"targeted locations and parsed",scripts.length,"inline scripts");
