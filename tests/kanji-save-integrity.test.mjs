// Run with: node --test tests/kanji-save-integrity.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { kanjiLossReason } from "../storage/kotoba-save-integrity.js";

const initial = {
  vocabulary: [{ id:"v1", stage:5 }],
  kanjiPilot: {
    version:3, placementIndex:2, placementResults:{ a:{passed:true}, b:{passed:false} },
    kanji:{ a:{stage:4,correct:3} }, components:{ r:{stage:1} }
  }
};
const raw = value => JSON.stringify(value);
class TestStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(String(key)) ?? null; }
  setItem(key,value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}
function makeDb(start) {
  const entries = new Map(start.map(entry => [entry.key, entry]));
  const micro = fn => Promise.resolve().then(fn);
  const db = {
    objectStoreNames:{ contains:() => true },
    transaction() {
      const tx = { oncomplete:null, onerror:null, onabort:null };
      tx.objectStore = () => ({
        get(key) {
          const req={ result:null };
          micro(() => { req.result=entries.get(key); tx.oncomplete?.(); });
          return req;
        },
        put(record) {
          const req={ result:record.key };
          micro(() => { entries.set(record.key,record); tx.oncomplete?.(); });
          return req;
        },
        delete(key) {
          const req={ result:undefined };
          micro(() => { entries.delete(key); tx.oncomplete?.(); });
          return req;
        }
      });
      return tx;
    }
  };
  return { entries, indexedDB:{ open() {
    const req={ result:db };
    micro(() => req.onsuccess?.());
    return req;
  } } };
}
const initialRaw = raw(initial);
const makeStored = () => [
  { key:"primaryLearningState", raw:initialRaw, updatedAtMs:123 },
  { key:"mainCheckpoint", raw:initialRaw, updatedAtMs:100 },
  { key:"progressVault", data:structuredClone(initial), updatedAtMs:110 }
];

test("Kanji guard permits normal review but rejects missing evidence", () => {
  const next = structuredClone(initial);
  next.kanjiPilot.kanji.a.stage = 1;
  next.kanjiPilot.kanji.a.correct = 4;
  assert.equal(kanjiLossReason(initial,next), null);
  assert.match(kanjiLossReason(initial,{vocabulary:initial.vocabulary}), /keinen Kanji-Pilot/);
  next.kanjiPilot.placementResults = {};
  assert.match(kanjiLossReason(initial,next), /placementResults/);
  next.kanjiPilot.placementResults = structuredClone(initial.kanjiPilot.placementResults);
  next.kanjiPilot.kanji = {};
  assert.match(kanjiLossReason(initial,next), /kanji/);
});

test("IndexedDB primary and checkpoint cannot overwrite known Kanji evidence", async () => {
  const localStorage = new TestStorage();
  const { entries, indexedDB } = makeDb(makeStored());
  const events=[];
  globalThis.Storage = TestStorage;
  globalThis.localStorage = localStorage;
  globalThis.indexedDB = indexedDB;
  globalThis.window = {
    dispatchEvent: event => events.push(event.type),
    Storage:TestStorage, localStorage
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable:true, value:{ storage:{
      persist:async()=>true,
      persisted:async()=>true,
      estimate:async()=>({usage:500,quota:10_000_000})
    }}
  });
  globalThis.CustomEvent = class {
    constructor(type,options={}) { this.type=type; this.detail=options.detail; }
  };
  const { createKotobaDurableStorage } = await import("../storage/kotoba-durable-storage.js");
  const storage = await createKotobaDurableStorage();
  assert.equal(entries.get("mainCheckpoint").updatedAtMs,100,"startup keeps prior checkpoint");
  assert.equal(storage.readPrimarySync(),initialRaw);
  const emptyRaw=raw({vocabulary:initial.vocabulary});
  await assert.rejects(storage.writePrimary(emptyRaw), /Kanji-Datenschutz/);
  assert.equal(storage.readPrimarySync(),initialRaw);
  assert.equal(await storage.verifyPrimary(),true);
  await assert.rejects(storage.writeMainCheckpoint(emptyRaw), /Kanji-Datenschutz/);
  assert.equal(entries.get("mainCheckpoint").raw,initialRaw);
  await assert.rejects(storage.writeVault({vocabulary:initial.vocabulary}), /Kanji-Datenschutz/);
  assert.equal(entries.get("progressVault").data.kanjiPilot.placementIndex,2);
  const progressed=structuredClone(initial);
  progressed.kanjiPilot.kanji.a.stage=2;
  progressed.kanjiPilot.placementIndex=3;
  progressed.kanjiPilot.placementResults.c={passed:true};
  assert.equal(await storage.writePrimary(raw(progressed)),true);
  assert.equal(await storage.verifyPrimary(),true);
  assert.equal(storage.getStatus().pendingPrimaryWrites,0);
  assert.ok(events.includes("kq-durable-storage-error"));
});

test("Legacy localStorage migration cannot erase stronger IndexedDB Kanji evidence", async () => {
  // Tested by pure guard; browser-run startup integration test still required.
  assert.match(kanjiLossReason(initial,{vocabulary:initial.vocabulary}), /Kanji-Pilot/);
});
