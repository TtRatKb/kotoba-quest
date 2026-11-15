/* Daily-only field adapter; the converter is shared with the existing Cloud UI. */
export const isJapaneseField = input => input?.id === 'dailyAnswer' && input.lang === 'ja';

export function convertJapaneseField(input, finalize = false) {
  if (!isJapaneseField(input) || !window.KotobaRomaji) return;
  const convert = value => window.KotobaRomaji.toHiragana(value, finalize).replace(/-/g, 'ー');
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const before = input.value;
  const converted = convert(before);
  if (converted === before) return;
  const from = convert(before.slice(0, start)).length;
  const to = convert(before.slice(0, end)).length;
  input.value = converted;
  input.setSelectionRange?.(from, to, input.selectionDirection || 'none');
}
