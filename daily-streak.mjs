/* Pure day-based streak math for Kotoba Daily. No writes, no implicit migration. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function asDayNumber(day) {
  if (typeof day !== 'string' || !ISO_DAY.test(day)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const millis = Date.UTC(year, month - 1, date);
  const check = new Date(millis);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== date) return null;
  return Math.floor(millis / 86_400_000);
}

export function recordDailyCompletion(days, day) {
  if (asDayNumber(day) == null) return [...new Set((Array.isArray(days) ? days : []).filter(d => asDayNumber(d) != null))].sort();
  return [...new Set([...(Array.isArray(days) ? days : []), day].filter(d => asDayNumber(d) != null))].sort();
}

export function streakSummary(days, today) {
  const target = asDayNumber(today);
  if (target == null) return { current: 0, longest: 0, doneToday: false, completedDays: 0 };
  const numbers = [...new Set((Array.isArray(days) ? days : []).map(asDayNumber).filter(n => n != null && n <= target))].sort((a,b) => a-b);
  const completed = new Set(numbers);
  let longest = 0, run = 0, previous = null;
  for (const number of numbers) {
    run = previous === number - 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = number;
  }
  const doneToday = completed.has(target);
  let current = 0;
  let day = doneToday ? target : target - 1;
  while (completed.has(day)) { current += 1; day -= 1; }
  return {current, longest, doneToday, completedDays:numbers.length};
}

// Seven calendar days ending today. Prepared for persistence, but purely in memory.
export function dailyOverview(days, today) {
  const end=asDayNumber(today);
  if(end==null)return [];
  const completed=new Set((Array.isArray(days)?days:[]).filter(day=>asDayNumber(day)!=null));
  return Array.from({length:7},(_,i)=>{
    const ordinal=end-6+i, date=new Date(ordinal*86_400_000);
    const day=date.toISOString().slice(0,10);
    return {day,label:['So','Mo','Di','Mi','Do','Fr','Sa'][date.getUTCDay()],done:completed.has(day),today:ordinal===end};
  });
}
