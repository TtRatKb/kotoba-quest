import test from 'node:test';
import assert from 'node:assert/strict';
import { asDayNumber, recordDailyCompletion, streakSummary } from '../daily-streak.mjs';

test('calendar days, DST transitions, leap years and invalid dates', () => {
  assert.equal(asDayNumber('2026-03-29') - asDayNumber('2026-03-28'), 1);
  assert.equal(asDayNumber('2026-10-25') - asDayNumber('2026-10-24'), 1);
  assert.equal(asDayNumber('2024-02-29') - asDayNumber('2024-02-28'), 1);
  for (const day of ['2026-02-29','2026-11-31','2026-13-01','2026-1-1','bad','']) assert.equal(asDayNumber(day), null);
});

test('completions are idempotent, sorted and do not mutate arguments', () => {
  const existing=['2026-11-12'];
  assert.deepEqual(recordDailyCompletion(existing, '2026-11-12'),['2026-11-12']);
  assert.deepEqual(recordDailyCompletion(existing,'2026-11-13'),['2026-11-12','2026-11-13']);
  assert.deepEqual(existing,['2026-11-12']);
});

test('streak is maintained until end of the following day without inventing future progress', () => {
  const days=['2026-11-11','2026-11-12','2026-11-13'];
  assert.deepEqual(streakSummary(days,'2026-11-13'),{current:3,longest:3,doneToday:true,completedDays:3});
  assert.deepEqual(streakSummary(days,'2026-11-14'),{current:3,longest:3,doneToday:false,completedDays:3});
  assert.equal(streakSummary(days,'2026-11-15').current,0);
  assert.equal(streakSummary([...days,'2027-01-01'],'2026-11-14').completedDays,3);
});

test('broken day resets current but longest is preserved', () => {
  assert.deepEqual(streakSummary(['2026-11-10','2026-11-11','2026-11-12','2026-11-14'],'2026-11-14'),{current:1,longest:3,doneToday:true,completedDays:4});
});
