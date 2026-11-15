import {readFileSync} from 'node:fs';
const files=['storage/kotoba-durable-storage.js','cloud.html','index.html','dungeon-source.js','sync/kotoba-bridge.js'];
const database='kotobaDailyCompletionV1';
const references=files.filter(file=>readFileSync(new URL('../'+file,import.meta.url),'utf8').includes(database));
if(references.length)throw Error(`Daily database unexpectedly captured by existing flows: ${references.join(', ')}`);
const durable=readFileSync(new URL('../storage/kotoba-durable-storage.js',import.meta.url),'utf8');
if(!durable.includes('String(key) === keyName'))throw Error('Primary storage virtualization boundary changed');
console.log(JSON.stringify({database,store:'scopes',references,learningDatabase:'kotobaQuestDurableStorageV1',existingFlows:'unchanged',activation:'disabled'},null,2));
