/* Kotoba Daily – mobile-first preview. In-memory sessions only, never touches storage. */
import { buildRefresh, buildGrammarPreview, isCorrect } from './daily-engine.mjs';
import { availableGuidedPaths, buildGuidedQuest } from './daily-guided.mjs';
import { buildDailyMix } from './daily-mix.mjs';

const root = document.getElementById('dailyRoot');
const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const state = { source: null, save: null, error: '', progressError: '', session: null, index: 0, result: null, answers: [] };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function highlightExample(example, target) {
  const source = String(example || '');
  const word = String(target || '');
  if (!word || !source.includes(word)) return safe(source);
  const pos = source.indexOf(word);
  return `${safe(source.slice(0,pos))}<mark>${safe(word)}</mark>${safe(source.slice(pos+word.length))}`;
}

function home() {
  const learnedCount = state.source?.learned?.length || 0;
  const ready = learnedCount >= 3;
  const personalPaths = availableGuidedPaths(state.save || {});
  const note = state.error
    ? `Der Lernstand konnte nicht geladen werden: ${safe(state.error)}. Die unabhängige Grammatik-Probelektion funktioniert trotzdem.`
    : !ready
      ? 'Für den persönlichen Refresh werden mindestens drei bereits gelernte Wörter benötigt. Öffne Kotoba Quest, um deinen Lernstand zu prüfen. Wir starten keine neuen Lektionen automatisch.'
      : `Es wurden ${learnedCount} bereits gelernte Wörter gefunden. Die Auswahl bevorzugt Wörter aus frühen SRS-Stufen, verändert aber weder deren Stufe noch Fälligkeit.`;
  return `<section class="panel hero">
    <div class="eyebrow">✿ KOTOBA DAILY · PREVIEW</div>
    <h1>Ein bisschen Japanisch.<br>Jeden Tag besser.</h1>
    <p>Kurze Übungen mit echtem Lernziel – ohne einen Berg offener Wiederholungen abarbeiten zu müssen.</p>
  </section>
  <div class="mode-grid">
    <button class="mode" type="button" data-start="daily" ${ready?'':'disabled'}>
      <span class="icon" aria-hidden="true">🌷</span><span><strong>Meine tägliche Quest</strong><small>Deine tägliche Mini-Quest · bekannte Vokabeln, Grammatik oder Partikel und ein eigener Satz · ca. 5 Minuten</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
    <button class="mode" type="button" data-start="refresh" ${ready?'':'disabled'}>
      <span class="icon" aria-hidden="true">🌸</span><span><strong>Daily Refresh</strong><small>8 Aufgaben · Bedeutung, aktive Produktion und Wörter im Kontext · dein gelernter Wortschatz</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
    <button class="mode" type="button" data-start="discovery">
      <span class="icon" aria-hidden="true">✨</span><span><strong>Daily Growth · Probelektion</strong><small>4 Schritte · 〜てしまう verstehen, Nuancen unterscheiden und selbst formulieren</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
  </div>
  <section class="panel"><span class="eyebrow">🧩 LERNEN MIT SYSTEM</span><h2>Geführte Übungen aus deinem Lernstand</h2>
  <p class="muted small">Nur Themen, deren Kotoba-Lektionen bereits abgeschlossen wurden. Wir unterscheiden gezielt ähnliche Strukturen, statt Aufgaben zufällig zu mischen.</p>
  ${personalPaths.length?`<div class="mode-grid">${personalPaths.map(path=>`<button class="mode" type="button" data-guided="${safe(path.id)}"><span class="icon" aria-hidden="true">${path.domain==='grammar'?'📚':'🧩'}</span><span><strong>${safe(path.title)}</strong><small>${safe(path.subtitle)} · ${safe(path.focus)} · kein SRS-Eingriff</small></span><span class="arrow" aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="note">${state.progressError?`Der lokale Lernstand konnte nicht gelesen werden: ${safe(state.progressError)}`:'Für diese erste Auswahl sind noch keine passenden abgeschlossenen Grammatik-/Partikellektionen im lokalen Spielstand nachgewiesen. Die Probelektion oben bleibt verfügbar.'}</div>`}
  </section>
  <div class="note"><strong>${ready?'Dein Lernstand ist da.':'Zur Verfügbarkeit'}</strong> ${note}</div>
  <div class="note"><strong>Datenschutz und Lernfortschritt:</strong> Die App liest lokale Vokabeln sowie die abgeschlossenen Grammatik-/Partikellektionen nur aus dem vorhandenen Kotoba-Spielstand. Antworten bleiben im Arbeitsspeicher und werden weder an Firebase gesendet noch ins SRS geschrieben. Die Auswahl umfasst zunächst einige redaktionell geprüfte Lernziele, nicht den gesamten Kurs. Gespeicherte Streaks, echte SRS-Abschlüsse und Audio folgen in getrennten Schritten.</div>`;
}

function promptCard(task) {
  if (task.kind === 'lesson') {
    return `<section class="panel question"><span class="pill">${safe(task.label)}</span>
      <h1 class="task-jp" lang="ja">${safe(task.prompt)}</h1><p>${safe(task.secondary)}</p>
      <div class="example"><span lang="ja" style="font-size:1.12rem;color:var(--ink)">${safe(task.example)}</span><span>${safe(task.exampleTranslation)}</span></div>
      <p class="muted small">${safe(task.explanation)}</p><div class="actions"><button class="button" type="button" data-next>Verstanden · weiter →</button></div></section>`;
  }
  const answered = Boolean(state.result);
  const isJapanese = task.kind !== 'production' && task.kind !== 'open';
  const content = task.kind === 'context'
    ? highlightExample(task.prompt, task.target)
    : safe(task.prompt);
  let control = '';
  if (task.options) {
    control = `<div class="answers" role="group" aria-label="Antwortmöglichkeiten">${task.options.map((option,i) => {
      const selected = state.result?.response === option;
      const correct = answered && option === task.correct;
      const wrong = answered && selected && !correct;
      return `<button class="answer ${selected?'selected':''} ${correct?'correct':''} ${wrong?'wrong':''}" type="button" data-choice="${i}" ${answered?'disabled':''}><span class="number">${i+1}</span><span>${safe(option)}</span></button>`;
    }).join('')}</div>`;
  } else if (task.kind === 'open') {
    control = `<form class="answer-form" id="dailyAnswerForm"><label for="dailyAnswer">Dein eigener Satz</label>
      <input id="dailyAnswer" name="answer" lang="ja" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Japanisch schreiben …" ${answered?'disabled':''} value="${safe(state.result?.response || '')}">
      ${answered?'':'<button class="button" type="submit">Beispielantwort ansehen</button>'}</form>`;
  } else {
    control = `<form class="answer-form" id="dailyAnswerForm"><label for="dailyAnswer">${task.kind==='production'||task.kind==='cloze'?'Japanisches Wort oder Lesung':'Deutsche Bedeutung'}</label>
      <input id="dailyAnswer" name="answer" ${task.kind==='production'||task.kind==='cloze'?'lang="ja"':''} autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Antwort eintippen …" required ${answered?'disabled':''} value="${safe(state.result?.response || '')}">
      ${answered?'':'<button class="button" type="submit">Antwort prüfen</button>'}</form>`;
  }
  const feedback = answered ? `<div class="feedback ${state.result.correct===false?'error':''}" role="status">
    <strong>${state.result.correct===null?(task.kind==='open'?'Eine mögliche Formulierung':task.kind==='cloze'?'Vergleiche mit dem ursprünglichen Satz':'Nicht eindeutig bewertet – bitte vergleichen'):state.result.correct?'Richtig! ✨':'Noch nicht ganz.'}</strong>
    <p>${safe(task.explanation)}</p>
    ${state.result.correct===false?`<p><b>Erwartete Antwort:</b> ${safe(task.correct || task.explanation)}</p>`:''}
    ${task.kind==='open'?`<div class="example"><span lang="ja">${safe(task.example)}</span></div>`:''}
    ${task.example && task.kind!=='open'?`<div class="example"><span lang="ja">${safe(task.example)}</span>${task.exampleTranslation?`<span>${safe(task.exampleTranslation)}</span>`:''}</div>`:''}
  </div><div class="actions"><button class="button" type="button" data-next>${state.index+1===state.session.tasks.length?'Auswertung ansehen →':'Nächste Aufgabe →'}</button></div>` : '';
  return `<section class="panel question"><span class="pill">${safe(task.label)}</span>
    <p class="task-secondary">${safe(task.secondary)}</p>
    <div class="${isJapanese?'task-jp':'task-de'}" ${isJapanese?'lang="ja"':''}>${content}</div>
    ${task.kind==='context'?`<p class="subtle">Gesuchtes Wort: <span lang="ja">${safe(task.target)}</span></p>`:''}
    ${task.kind==='cloze' && task.exampleTranslation?`<p class="subtle">Satzbedeutung: ${safe(task.exampleTranslation)}</p>`:''}
    ${control}${feedback}</section>`;
}

function active() {
  const session = state.session;
  const i = state.index;
  const task = session.tasks[i];
  const completed = i + (state.result ? 1 : 0);
  const percent = (completed / session.tasks.length) * 100;
  const modeLabel = session.mode==='daily'?'Meine tägliche Quest':session.mode==='refresh'?'Daily Refresh':session.mode==='guided'?(session.domain==='grammar'?'Grammatik · geführte Übung':'Partikel · geführte Übung'):'Daily Growth · Probe';
  return `<div class="status-row"><span class="eyebrow">${modeLabel}</span><span class="muted small">${i+1} / ${session.tasks.length}</span></div>
    <div class="progress" role="progressbar" aria-label="Fortschritt" aria-valuenow="${completed}" aria-valuemin="0" aria-valuemax="${session.tasks.length}"><div style="width:${percent}%"></div></div>
    ${session.mode==='daily'?`<p class="muted small">Lernziel: ${safe(session.growthTitle)} · ${session.growthType==='learned'?'an deinen Lernstand angepasst':'freiwillige neue Probelektion'} · kein SRS-Eingriff</p>`:''}
    ${session.mode==='guided'?`<p class="muted small">Lernziel: ${safe(session.title)} · freies Training ohne SRS-Buchung</p>`:''}
    ${promptCard(task)}<button class="button ghost" type="button" data-home>← Zur Übersicht (ohne Speicherung)</button>`;
}

function summary() {
  const scored = state.answers.filter(answer => answer.correct !== null);
  const correct = scored.filter(answer => answer.correct).length;
  const vocabulary = [...new Set(state.session.tasks
    .filter(task => task.group === 'vocab' || (state.session.mode === 'refresh' && task.reading))
    .map(task => task.explanation))];
  const goal = state.session.growthTitle || (state.session.mode === 'guided' ? state.session.title : state.session.mode === 'discovery' ? '〜てしまう: Bedauern und vollständigen Abschluss unterscheiden' : 'Bekannte Wörter verstehen und aktiv abrufen');
  const transfer = state.answers.find(answer => state.session.tasks.find(task => task.id === answer.taskId)?.kind === 'open');
  return `<section class="panel results"><div class="flower" aria-hidden="true">🌸</div><p class="eyebrow">QUEST ABSOLVIERT</p>
    <h1>${state.session.mode==='daily'?'Deine Daily Quest ist geschafft!':state.session.mode==='refresh'?'Dein Japanisch ist heute in Bewegung!':state.session.mode==='guided'?'Du hast ein Lernziel aktiv trainiert!':'Du hast eine neue Struktur entdeckt!'}</h1>
    <div class="note learned-summary" style="text-align:left"><strong>Das hast du geübt</strong>
      <p>${safe(goal)}</p>
      ${vocabulary.length ? `<ul>${vocabulary.map(word => `<li>${safe(word)}</li>`).join('')}</ul>` : ''}
      ${transfer?.response?.trim() ? `<p>Dein eigener Satz <span class="muted small">(unbewertet)</span>:</p><p lang="ja">${safe(transfer.response)}</p><p class="small">Vergleiche Wortwahl und Struktur mit der Musterlösung. Regelmäßiges Üben zählt – du musst nicht alles sofort können.</p>` : ''}
    </div>
    <div class="score">${correct} / ${scored.length}<small>automatisch bewertete Antworten</small></div>
    <p class="muted">${state.answers.length-scored.length} angeleitete bzw. offene Aufgaben wurden bewusst nicht automatisch bewertet.</p>
    <div class="note" style="text-align:left"><strong>Wichtig:</strong> Diese Vorschau speichert noch keinen Tagesabschluss und keine Streak. Es wurden keine SRS-Einträge, Firebase-Daten oder Life-RPG-Belohnungen verändert.</div>
    <div class="actions"><button class="button" type="button" data-home>Weitere Quest auswählen</button><a class="button secondary" style="text-decoration:none;display:grid;place-items:center" href="./cloud.html">Zurück zu Kotoba Quest</a></div></section>`;
}

function render(focus = false) {
  root.innerHTML = !state.session ? home() : state.index >= state.session.tasks.length ? summary() : active();
  if (focus) { root.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}

function start(mode, pathId = null) {
  const session = mode === 'daily'
    ? buildDailyMix(state.source?.learned || [], state.save || {}, todayKey())
    : mode === 'refresh'
    ? buildRefresh(state.source?.learned || [], todayKey())
    : mode === 'guided' ? buildGuidedQuest(state.save || {}, todayKey(), pathId) : buildGrammarPreview();
  if (!session?.tasks?.length) return;
  state.session = session;
  state.index = 0;
  state.result = null;
  state.answers = [];
  render(true);
}

function answer(response) {
  if (!state.session || state.result) return;
  const task = state.session.tasks[state.index];
  if (task.kind === 'lesson') return;
  const evaluated = isCorrect(task, response);
  // A different free-text translation can be valid: never confidently mark it wrong.
  const correct = evaluated === false && (task.kind === 'production' || task.kind === 'meaning-type') ? null : evaluated;
  state.result = { correct, response: String(response) };
  state.answers.push({ taskId: task.id, correct, response: String(response) });
  render();
  const button = root.querySelector('[data-next]');
  button?.focus({preventScroll:true});
}

function next() {
  if (!state.session) return;
  const task = state.session.tasks[state.index];
  if (task.kind !== 'lesson' && !state.result) return;
  if (task.kind === 'lesson') state.answers.push({taskId:task.id,correct:null});
  state.index++;
  state.result = null;
  render(true);
}

root.addEventListener('click', event => {
  const guidedButton = event.target.closest('[data-guided]');
  if (guidedButton) { start('guided', guidedButton.dataset.guided); return; }
  const startButton = event.target.closest('[data-start]');
  if (startButton) { start(startButton.dataset.start); return; }
  if (event.target.closest('[data-home]')) { state.session = null; state.result = null; render(true); return; }
  if (event.target.closest('[data-next]')) { next(); return; }
  const choice = event.target.closest('[data-choice]');
  if (choice && state.session && !state.result) {
    const task = state.session.tasks[state.index];
    const idx = Number(choice.dataset.choice);
    if (Number.isInteger(idx) && idx >= 0 && idx < (task.options?.length || 0)) answer(task.options[idx]);
  }
});

root.addEventListener('submit', event => {
  if (event.target.id !== 'dailyAnswerForm') return;
  event.preventDefault();
  const input = event.target.querySelector('input');
  answer(input?.value || '');
});

root.addEventListener('keydown', event => {
  if (!state.session || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (state.result && event.key === 'Enter') {
    event.preventDefault();
    next();
    return;
  }
  if (!state.result && /^[1-4]$/.test(event.key)) {
    const task = state.session.tasks[state.index];
    const n = Number(event.key) - 1;
    if (task.options?.[n]) { event.preventDefault(); answer(task.options[n]); }
  }
});

async function init() {
  try {
    if (!window.KotobaDungeonSource?.load) throw new Error('Lesemodul nicht verfügbar');
    state.source = await window.KotobaDungeonSource.load();
  } catch (error) { state.error = String(error?.message || error); }
  try {
    // Direct, read-only view of the exact persisted snapshot; do not normalize or save.
    const snapshot = await window.KotobaDungeonSource?.readSave?.();
    state.save = snapshot?.data || null;
    if (!state.save) state.progressError = 'Kein vollständig lesbarer Kotoba-Spielstand';
  } catch (error) { state.progressError = String(error?.message || error); }
  render();
}
init();
