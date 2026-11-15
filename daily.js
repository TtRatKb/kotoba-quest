/* Kotoba Daily – mobile-first preview. In-memory sessions only, never touches storage. */
import { buildRefresh, buildGrammarPreview, isCorrect } from './daily-engine.mjs';
import { availableGuidedPaths, buildGuidedQuest } from './daily-guided.mjs';
import { buildDailyMix, buildDailyExtension } from './daily-mix.mjs';
import { convertJapaneseField } from './daily-input.mjs';
import { prepareDailyCards } from './daily-quality.mjs';
import { withDailyContexts } from './daily-contexts.mjs';
import { readingLexicon, japaneseSegments } from './daily-furigana.mjs';
import { buildPlaySession, evaluatePlay, sentenceText, isPair, isPlayTask } from './daily-play.mjs';
import { playCard } from './daily-play-view.mjs';
import { createFeedback } from './daily-feedback.mjs';
import { buildPractice } from './daily-practice.mjs';
import { assessCompletion, localDay } from './daily-completion.mjs';
import { recordDailyCompletion, streakSummary, dailyOverview } from './daily-streak.mjs';

const effects = createFeedback();
const root = document.getElementById('dailyRoot');
const feedbackToggle = document.getElementById('feedbackToggle');
const header = document.querySelector('.header');
const mainApp = new URLSearchParams(window.location.search).get('from') === 'index' ? './index.html' : './cloud.html';
document.querySelector('.back').href = mainApp;
const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const state = { source: null, save: null, error: '', progressError: '', session: null, index: 0, result: null, answers: [], completedDays: [], completion: null, composing: false, practiceOrigin: null, lexicon: readingLexicon([]), play:null };

const todayKey = () => localDay();
const timeLabel = session => `ca. ${session.estimatedMinutes.join('–')} Minuten`;

function japanese(value, {lexicon=state.lexicon,...options} = {}) {
  return japaneseSegments(value, lexicon, state.save, options).map(part => {
    const word = part.reading ? `<ruby>${safe(part.text)}<rp>(</rp><rt>${safe(part.reading)}</rt><rp>)</rp></ruby>` : safe(part.text);
    return part.highlight ? `<mark>${word}</mark>` : word;
  }).join('');
}

function home() {
  const learnedCount = state.source?.learned?.length || 0;
  const ready = learnedCount >= 3;
  const playAvailable = buildPlaySession(state.source?.learned || [],state.save || {},todayKey()).tasks.length;
  const personalPaths = availableGuidedPaths(state.save || {});
  const streak = streakSummary(state.completedDays, todayKey());
  const preview = ready ? buildDailyMix(state.source.learned,state.save || {},todayKey()) : null;
  const shortPreview = ready ? buildDailyMix(state.source.learned,state.save || {},todayKey(),Date.now(),{length:'short'}) : null;
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
  <section class="note daily-day" aria-label="Dein Tagesziel"><strong>${streak.doneToday ? 'Heute geübt ✓' : 'Dein Tagesziel: eine kurze aktive Quest'}</strong>
    <p>${streak.current ? `${streak.current} ${streak.current === 1 ? 'Lerntag' : 'Lerntage'} in Folge. ` : ''}${streak.doneToday ? 'Für heute ist dein Tagesziel erreicht. Weitere Übungen sind freiwillig.' : 'Ein eigener Versuch zählt – perfekte Antworten sind nicht nötig.'}</p>
    <span class="muted small">Vorschau: Tagesabschluss und Serie bleiben nur auf dieser geöffneten Seite erhalten. Nach Neuladen oder Schließen sind sie weg; keine Synchronisation.</span>
    <ol class="daily-overview" aria-label="Deine letzten sieben Kalendertage auf dieser geöffneten Seite">${dailyOverview(state.completedDays,todayKey()).map(day=>`<li ${day.today?'aria-current="date"':''}><span>${day.label}</span><span class="day-dot ${day.done?'done':''}" aria-label="${day.day}: ${day.done?'aktiv geübt':day.today?'heute noch offen':'kein Abschluss auf dieser Seite'}">${day.done?'✓':'·'}</span></li>`).join('')}</ol>
  </section>
  <div class="mode-grid">
    <button class="mode" type="button" data-start="daily" ${ready?'':'disabled'}>
      <span class="icon" aria-hidden="true">🌷</span><span><strong>Meine tägliche Quest</strong><small>Abwechslungsreicher Mix · bekannte Wörter, passende Bilder, Grammatik und ein eigener Satz · ${preview?.tasks.length?timeLabel(preview):'ca. 3–5 Minuten'}</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
    <button class="mode" type="button" data-start="daily-short" ${ready?'':'disabled'}><span class="icon" aria-hidden="true">🌱</span><span><strong>Heute eine kurze Quest</strong><small>Ein vollständiges Lernziel in 6 Schritten · ${shortPreview?.tasks.length?timeLabel(shortPreview):'ca. 2–3 Minuten'} · zählt ebenfalls als Tagesabschluss</small></span><span class="arrow" aria-hidden="true">›</span></button>
    <button class="mode" type="button" data-start="refresh" ${ready?'':'disabled'}>
      <span class="icon" aria-hidden="true">🌸</span><span><strong>Daily Refresh</strong><small>8 Aufgaben · Bedeutung, aktive Produktion und Wörter im Kontext · dein gelernter Wortschatz</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
    <button class="mode" type="button" data-start="discovery">
      <span class="icon" aria-hidden="true">✨</span><span><strong>Daily Growth · Probelektion</strong><small>4 Schritte · 〜てしまう verstehen, Nuancen unterscheiden und selbst formulieren</small></span><span class="arrow" aria-hidden="true">›</span>
    </button>
  </div>
  <section class="panel"><span class="eyebrow">🎨 VISUELL & SPIELERISCH</span><h2>Mit Bildern und Bausteinen üben</h2><p class="small muted">Bildauswahl, Paare und Satzbau · freiwilliges Zusatztraining, keine SRS-Reviews und kein zusätzlicher Tagesabschluss.</p>
    <div class="actions"><button class="button" type="button" data-start="play" ${playAvailable?'':'disabled'}>Mit meinem Lernstand üben</button><button class="button secondary" type="button" data-start="play-demo">Kuratiertes Probetraining ansehen</button></div>
    ${playAvailable?'':'<p class="small muted">Noch keine passenden gelernten Bildwörter oder abgeschlossenen Satzbau-Voraussetzungen gefunden. Die freiwillige Demo bleibt zugänglich.</p>'}
  </section>
  <section class="panel"><span class="eyebrow">🧩 LERNEN MIT SYSTEM</span><h2>Geführte Übungen aus deinem Lernstand</h2>
  <p class="muted small">Nur Themen, deren Kotoba-Lektionen bereits abgeschlossen wurden. Wir unterscheiden gezielt ähnliche Strukturen, statt Aufgaben zufällig zu mischen.</p>
  ${personalPaths.length?`<div class="mode-grid">${personalPaths.map(path=>`<button class="mode" type="button" data-guided="${safe(path.id)}"><span class="icon" aria-hidden="true">${path.domain==='grammar'?'📚':'🧩'}</span><span><strong>${safe(path.title)}</strong><small>${safe(path.subtitle)} · ${safe(path.focus)} · kein SRS-Eingriff</small></span><span class="arrow" aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="note">${state.progressError?`Der lokale Lernstand konnte nicht gelesen werden: ${safe(state.progressError)}`:'Für diese erste Auswahl sind noch keine passenden abgeschlossenen Grammatik-/Partikellektionen im lokalen Spielstand nachgewiesen. Die Probelektion oben bleibt verfügbar.'}</div>`}
  </section>
  <div class="note"><strong>${ready?'Dein Lernstand ist da.':'Zur Verfügbarkeit'}</strong> ${note}</div>
  <div class="note"><strong>Datenschutz und Lernfortschritt:</strong> Die App liest lokale Vokabeln sowie die abgeschlossenen Grammatik-/Partikellektionen nur aus dem vorhandenen Kotoba-Spielstand. Antworten bleiben im Arbeitsspeicher und werden weder an Firebase gesendet noch ins SRS geschrieben. Die Auswahl umfasst zunächst einige redaktionell geprüfte Lernziele, nicht den gesamten Kurs. Dauerhaft gespeicherte Streaks brauchen weiterhin eine getrennte Sicherheitsfreigabe.</div>`;
}

function promptCard(task) {
  const taskJapanese = (value,options={}) => japanese(value,{...options,...(task.contextReadings?{lexicon:readingLexicon(task.contextReadings)}:{})});
  if (isPlayTask(task)) return playCard(task,state.play,state.result,{safe,japanese:taskJapanese,word:item=>taskJapanese(item.word,{lexicon:readingLexicon([item])}),canSpeak:effects.canSpeak(),enabled:effects.enabled,isLast:state.index+1===state.session.tasks.length});
  if (task.kind === 'lesson') {
    return `<section class="panel question"><span class="pill">${safe(task.label)}</span>
      <h1 class="task-jp" lang="ja">${taskJapanese(task.prompt)}</h1><p>${safe(task.secondary)}</p>
      <div class="example"><span lang="ja" style="font-size:1.12rem;color:var(--ink)">${taskJapanese(task.example)}</span><span>${safe(task.exampleTranslation)}</span></div>
      <p class="muted small">${safe(task.explanation)}</p><div class="actions"><button class="button" type="button" data-next>Verstanden · weiter →</button></div></section>`;
  }
  const answered = Boolean(state.result);
  const isJapanese = task.readingTask || (task.kind !== 'production' && task.kind !== 'open');
  const content = task.target && task.kind !== 'cloze'
    ? taskJapanese(task.prompt, {target:task.target})
    : isJapanese ? taskJapanese(task.prompt, {hide:task.readingTask && !answered}) : safe(task.prompt);
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
      <input id="dailyAnswer" name="answer" lang="ja" inputmode="text" enterkeyhint="done" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Romaji oder Japanisch …" ${answered?'disabled':''} value="${safe(state.result?.response || '')}">
      ${answered?'':'<button class="button" type="submit">Meinen Versuch vergleichen</button><button class="button secondary" type="button" data-example>Nur Musterlösung ansehen</button>'}</form>`;
  } else {
    control = `<form class="answer-form" id="dailyAnswerForm"><label for="dailyAnswer">${task.readingTask?'Lesung in Kana oder Romaji':task.kind==='production'||task.kind==='cloze'?'Japanisches Wort oder Lesung':'Deutsche Bedeutung'}</label>
      <input id="dailyAnswer" name="answer" ${task.kind==='production'||task.kind==='cloze'?'lang="ja" inputmode="text" enterkeyhint="done"':''} autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Antwort eintippen …" required ${answered?'disabled':''} value="${safe(state.result?.response || '')}">
      ${answered?'':'<button class="button" type="submit">Antwort prüfen</button>'}</form>`;
  }
  const feedback = answered ? `<div class="feedback ${state.result.correct===false?'error':''}" role="status">
    <strong>${state.result.skipped?'Musterlösung zum Anschauen':state.result.correct===null?(task.kind==='open'?'Eine mögliche Formulierung':task.kind==='cloze'?'Vergleiche mit dem ursprünglichen Satz':'Nicht eindeutig bewertet – bitte vergleichen'):state.result.correct?'Richtig! ✨':'Noch nicht ganz.'}</strong>
    <p>${safe(task.explanation)}</p>
    ${state.result.correct===false?`<p><b>Erwartete Antwort:</b> ${safe(task.correct || task.explanation)}</p>`:''}
    ${task.kind==='open'?`<div class="example"><span lang="ja">${taskJapanese(task.example)}</span></div>`:''}
    ${task.example && task.kind!=='open'?`<div class="example"><span lang="ja">${taskJapanese(task.example)}</span>${task.exampleTranslation?`<span>${safe(task.exampleTranslation)}</span>`:''}</div>`:''}
  </div><div class="actions"><button class="button" type="button" data-next>${state.index+1===state.session.tasks.length?'Auswertung ansehen →':'Nächste Aufgabe →'}</button></div>` : '';
  return `<section class="panel question"><span class="pill">${safe(task.label)}</span>
    <p class="task-secondary">${safe(task.secondary)}</p>
    <div class="${isJapanese?'task-jp':'task-de'}" ${isJapanese?'lang="ja" inputmode="text" enterkeyhint="done"':''}>${content}</div>
    ${task.target?`<p class="subtle">Gesuchtes Wort: <span lang="ja">${taskJapanese(task.target)}</span></p>`:''}
    ${task.kind==='cloze' && task.exampleTranslation?`<p class="subtle">Satzbedeutung: ${safe(task.exampleTranslation)}</p>`:''}
    ${control}${feedback}</section>`;
}

function active() {
  const session = state.session;
  const i = state.index;
  const task = session.tasks[i];
  const completed = i + (state.result ? 1 : 0);
  const percent = (completed / session.tasks.length) * 100;
  const modeLabel = session.mode==='extension'?'Freiwillig weiterlernen':session.mode==='play'?'Bilder & Satzbau · Training':session.mode==='practice'?'Freiwillig nachüben':session.mode==='daily'?'Meine tägliche Quest':session.mode==='refresh'?'Daily Refresh':session.mode==='guided'?(session.domain==='grammar'?'Grammatik · geführte Übung':'Partikel · geführte Übung'):'Daily Growth · Probe';
  return `<div class="session-top"><div class="status-row"><span class="eyebrow">${modeLabel}</span><span class="muted small">${i+1} / ${session.tasks.length}</span></div>
    <div class="progress" role="progressbar" aria-label="Fortschritt" aria-valuenow="${completed}" aria-valuemin="0" aria-valuemax="${session.tasks.length}"><div style="width:${percent}%"></div></div>
    ${session.mode==='daily'?`<p class="muted small">${session.length==='short'?'Kurze Quest':'Daily Mix'} · ${timeLabel(session)} · ${safe(session.growthTitle)} · ${session.growthType==='learned'?'bekanntes Lernziel':'freiwillige Probelektion'} · kein SRS-Eingriff</p>`:''}
    ${session.mode==='extension'?'<p class="muted small">Dein Tagesziel bleibt erhalten. Diese zusätzlichen Übungen sind freiwillig, ohne weitere Tagesgutschrift oder SRS-Buchung.</p>':''}
    ${session.mode==='play'?`<p class="muted small">${session.demo?'Freiwillige Demo mit kuratierten Wörtern – kein gespeicherter Lernnachweis.':'Aus geeigneten gelernten Wörtern und nachgewiesenen Lektionen.'}</p>`:''}
    ${session.mode==='practice'?'<p class="muted small">Einmal erneut abrufen und mit dem Feedback vergleichen. Unklare Texteingaben sind keine festgestellten Fehler.</p>':''}
    ${session.mode==='guided'?`<p class="muted small">Lernziel: ${safe(session.title)} · freies Training ohne SRS-Buchung</p>`:''}
    </div><div class="session-content">${promptCard(task)}</div><div class="session-dock" aria-label="Antwort und Navigation"><div class="session-control"></div><div class="session-exit-row">${session.mode==='extension'?'<button class="button ghost" type="button" data-return-extension>← Zur Quest-Auswertung</button>':session.mode==='practice'?'<button class="button ghost" type="button" data-return>← Zurück zu deiner Quest-Auswertung</button>':'<button class="button ghost" type="button" data-home>← Übersicht</button>'}<span class="effects-slot"></span></div></div>`;
}

function practiceSummary() {
  const scored = state.answers.filter(answer => answer.correct !== null);
  return `<section class="panel results"><div class="flower" aria-hidden="true">🌱</div><p class="eyebrow">FREIWILLIG NACHGEÜBT</p>
    <h1>Einmal bewusst wieder abgerufen.</h1>
    <p>Du hast ${state.session.tasks.length} ${state.session.tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} noch einmal bearbeitet.</p>
    <p>${scored.length ? `${scored.filter(answer => answer.correct).length} von ${scored.length} automatisch bewerteten Antworten waren richtig.` : 'Diese Texteingaben werden nicht automatisch benotet.'} ${state.answers.length - scored.length} Antworten bleiben zum eigenen Vergleich unbewertet.</p>
    <div class="note">Deine ursprüngliche Quest-Auswertung und dein Tagesabschluss bleiben erhalten. Aus dieser Übung entsteht keine weitere Aufgabenliste. Du kannst für heute aufhören.</div>
    <div class="actions"><button class="button" type="button" data-return>Zurück zu deiner Quest-Auswertung</button><button class="button secondary" type="button" data-home>Zur Übersicht</button></div></section>`;
}

function playSummary() {
  const pictures=state.answers.filter(a=>a.kind==='image-choice');
  const pairs=state.answers.filter(a=>a.kind==='image-matching');
  const tiles=state.answers.filter(a=>a.kind==='sentence-tiles');
  const extra=pairs.reduce((n,a)=>n+a.attemptErrors,0);
  return `<section class="panel results"><div class="flower" aria-hidden="true">🌱</div><p class="eyebrow">ZUSATZTRAINING BEENDET</p><h1>Mit Bildern und Sprache verbunden.</h1>
    ${pictures.length?`<p>${pictures.filter(a=>a.correct===true).length} / ${pictures.length} Bilder richtig zugeordnet.</p>`:''}
    ${pairs.length?`<p>${pairs.reduce((n,a)=>n+a.pairCount,0)} Paare gefunden · ${extra} ${extra===1?'weiterer Versuch':'weitere Versuche'}.</p>`:''}
    ${tiles.length?`<p>Geprüfte Satzlösungen: ${tiles.filter(a=>a.correct===true).length}. Zum eigenen Vergleich unbewertet: ${tiles.filter(a=>a.correct===null).length}.</p>`:''}
    <div class="note">${state.session.demo?'Diese Demo markiert keine Wörter oder Lektionen als gelernt. ':''}SRS, reguläre Reviews und dein Tagesabschluss bleiben unverändert. Es wird nichts gespeichert.</div>
    <div class="actions"><button class="button" type="button" data-home>Zur Übersicht</button></div></section>`;
}

function summary() {
  if (state.session.mode === 'extension') return `<section class="panel results"><div class="flower" aria-hidden="true">🌿</div><h1>Ein bisschen weitergelernt.</h1><p>${state.answers.length} zusätzliche Aufgaben aktiv bearbeitet. Dein ursprüngliches Tagesziel bleibt erhalten.</p><p class="muted">Zusatztraining · keine offiziellen SRS-Reviews · keine weitere Tagesgutschrift</p><button class="button" type="button" data-return-extension>Zurück zu deiner Quest-Auswertung</button></section>`;
  if (state.session.mode === 'play') return playSummary();
  if (state.session.mode === 'practice') return practiceSummary();
  const practice = !state.practiceOrigin && buildPractice(state.session, state.answers);
  const scored = state.answers.filter(answer => answer.correct !== null);
  const correct = scored.filter(answer => answer.correct).length;
  const vocabulary = [...new Set(state.session.tasks
    .filter(task => task.group === 'vocab' || (state.session.mode === 'refresh' && task.reading))
    .map(task => task.explanation))];
  const goal = state.session.growthTitle || (state.session.mode === 'guided' ? state.session.title : state.session.mode === 'discovery' ? '〜てしまう: Bedauern und vollständigen Abschluss unterscheiden' : 'Bekannte Wörter verstehen und aktiv abrufen');
  const transfer = state.answers.find(answer => state.session.tasks.find(task => task.id === answer.taskId)?.kind === 'open');
  const visualTasks = state.session.tasks.filter(isPlayTask);
  const visualWords = [...new Set(visualTasks.flatMap(task=>task.target?.word?[task.target.word]:task.pairs?.map(pair=>pair.word)||[]))];
  const extension = state.session.mode==='daily' && !state.extensionUsed && buildDailyExtension(state.session,state.source?.learned || [],state.save || {},todayKey());
  return `<section class="panel results"><div class="flower" aria-hidden="true">🌸</div><p class="eyebrow">${state.completion?.qualified ? 'AKTIV GEÜBT' : 'ÜBUNG ANGESEHEN'}</p>
    <h1>${!state.completion?.qualified?'Deine Übung ist abgeschlossen.':state.session.mode==='daily'?'Deine Daily Quest ist geschafft!':state.session.mode==='refresh'?'Dein Japanisch ist heute in Bewegung!':state.session.mode==='guided'?'Du hast ein Lernziel aktiv trainiert!':'Du hast eine neue Struktur entdeckt!'}</h1>
    <div class="note learned-summary" style="text-align:left"><strong>Das hast du geübt</strong>
      <p>${safe(goal)}</p>
      ${vocabulary.length ? `<ul>${vocabulary.map(word => `<li>${safe(word)}</li>`).join('')}</ul>` : ''}
      ${visualWords.length?`<p>In Bildern wiedererkannt und verbunden: <span lang="ja">${visualWords.map(word=>japanese(word)).join('・')}</span>.</p>`:''}
      ${visualTasks.some(task=>task.kind==='sentence-tiles')?'<p>Wörter und Partikeln zu einem Satz verbunden und mit einer geprüften Reihenfolge verglichen.</p>':''}
      ${transfer?.response?.trim() ? `<p>Dein eigener Satz <span class="muted small">(unbewertet)</span>:</p><p lang="ja">${safe(transfer.response)}</p><p class="small">Vergleiche Wortwahl und Struktur mit der Musterlösung. Regelmäßiges Üben zählt – du musst nicht alles sofort können.</p>` : ''}
    </div>
    <div class="score">${correct} / ${scored.length}<small>automatisch bewertete Antworten</small></div>
    <p class="muted">${state.answers.length-scored.length} angeleitete bzw. offene Aufgaben wurden bewusst nicht automatisch bewertet.</p>
    ${state.session.mode==='daily'?`<p class="small">${state.answers.filter(a=>!a.acknowledged&&!a.skipped).length} eigene Aufgabenversuche · ${state.answers.filter(a=>a.kind==='image-matching').reduce((n,a)=>n+a.pairCount,0)} Bild-Wort-Paare verbunden · 0 offizielle SRS-Reviews. Teilnahme ist kein Nachweis von Beherrschung.</p>`:''}
    <div class="note completion-note" role="status" style="text-align:left"><strong>${state.completion?.qualified ? state.completion.alreadyDone ? 'Dein Tagesziel war heute schon erreicht.' : 'Dein Tagesziel ist erreicht! 🌷' : 'Heute ganz ohne Druck.'}</strong>
      <p>${state.completion?.qualified ? 'Eine vollständig bearbeitete Quest mit eigenen Versuchen zählt. Weitere Quests am selben Tag erhöhen die Serie nicht.' : 'Musterlösungen anzusehen ist willkommen. Für den Tagesabschluss braucht es eigene Antwortversuche in allen aktiven Aufgaben, bei japanischen Aufgaben auf Japanisch. Die sprachliche Richtigkeit wird dafür nicht vorausgesetzt.'}</p>
      <p class="small">Vorschau: Der Tagesabschluss bleibt nur auf dieser geöffneten Seite erhalten und verschwindet beim Neuladen oder Schließen. Keine Synchronisation. SRS und Cloud-Lernstand bleiben unverändert.</p>
    </div>
    ${practice ? `<div class="note practice-offer"><strong>Noch einen Gedanken festigen?</strong><p>Freiwillig ${practice.tasks.length} ${practice.tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} aus dieser Quest erneut abrufen – falsche Auswahlantworten und unklare Texteingaben. Das ist keine zusätzliche Tagespflicht.</p><button class="button secondary" type="button" data-practice>Einmal gezielt nachüben</button></div>` : ''}
    ${extension?`<div class="note extension-offer"><strong>Für heute darf es genug sein.</strong><p>Wenn du noch Lust hast: ${extension.tasks.length} weitere Aufgaben · ${timeLabel(extension)}. Dein Tagesziel hängt nicht davon ab.</p><button class="button secondary" type="button" data-extend>Freiwillig weiterlernen</button></div>`:''}
    <div class="actions"><button class="button" type="button" data-home>Weitere Quest auswählen</button><a class="button secondary" style="text-decoration:none;display:grid;place-items:center" href="${mainApp}">Zurück zu Kotoba Quest</a></div></section>`;
}

function render(focus = false) {
  root.setAttribute('aria-live',isPlayTask(state.session?.tasks[state.index])?'off':'polite');
  root.innerHTML = !state.session ? home() : state.index >= state.session.tasks.length ? summary() : active();
  const inTask = Boolean(state.session && state.index < state.session.tasks.length);
  document.body.classList.toggle('in-session', inTask);
  root.classList.toggle('session-root', inTask);
  if (inTask) {
    const control = root.querySelector('.session-control');
    const card = root.querySelector('.question');
    const form = card.querySelector('.answer-form');
    const actions = card.querySelector('.actions');
    if (form && !state.result) control.appendChild(form);
    else form?.remove();
    if (actions) control.appendChild(actions);
    if (state.result) {
      card.classList.add('answered');
      const content = root.querySelector('.session-content');
      const feedback = root.querySelector('.feedback');
      content.scrollTop += feedback.getBoundingClientRect().top - content.getBoundingClientRect().top;
    }
  }
  (inTask ? root.querySelector('.effects-slot') : header).appendChild(feedbackToggle);
  updateEffectsControls();
  if (focus) { root.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}

function start(mode, pathId = null) {
  const session = mode === 'play' || mode === 'play-demo'
    ? buildPlaySession(state.source?.learned || [],state.save || {},todayKey(),{demo:mode==='play-demo'})
    : mode === 'daily' || mode === 'daily-short'
    ? buildDailyMix(state.source?.learned || [], state.save || {}, todayKey(),Date.now(),{length:mode==='daily-short'?'short':'normal'})
    : mode === 'refresh'
    ? buildRefresh(state.source?.learned || [], todayKey())
    : mode === 'guided' ? buildGuidedQuest(state.save || {}, todayKey(), pathId) : buildGrammarPreview();
  if (!session?.tasks?.length) return;
  state.practiceOrigin = null;
  state.extensionUsed = false;
  state.extensionOrigin = null;
  state.play = freshPlayState();
  state.session = session;
  state.index = 0;
  state.result = null;
  state.answers = [];
  state.completion = null;
  state.composing = false;
  render(true);
}

function startPractice() {
  if (!state.session || state.index !== state.session.tasks.length || state.practiceOrigin) return;
  const practice = buildPractice(state.session, state.answers);
  if (!practice) return;
  state.practiceOrigin = { session: state.session, index: state.index, answers: state.answers, completion: state.completion };
  state.session = practice;
  state.index = 0;
  state.answers = [];
  state.result = null;
  state.play = freshPlayState();
  state.composing = false;
  render(true);
}

function returnFromPractice() {
  if (!state.practiceOrigin) return;
  const original = state.practiceOrigin;
  state.session = original.session;
  state.index = original.index;
  state.answers = original.answers;
  state.completion = original.completion;
  // Keep the origin marker until another quest starts: offer at most once.
  state.result = null;
  state.composing = false;
  render(true);
}

function startExtension() {
  if(state.session?.mode!=='daily'||state.index!==state.session.tasks.length||state.extensionUsed)return;
  const session=buildDailyExtension(state.session,state.source?.learned || [],state.save || {},todayKey());
  if(!session)return;
  state.extensionOrigin={session:state.session,index:state.index,answers:state.answers,completion:state.completion};
  state.extensionUsed=true;state.session=session;state.index=0;state.answers=[];state.result=null;state.play=freshPlayState();state.composing=false;render(true);
}
function returnFromExtension() {
  if(!state.extensionOrigin)return;
  Object.assign(state,state.extensionOrigin);state.extensionOrigin=null;state.result=null;state.play=freshPlayState();render(true);
}

function answer(response, skipped = false) {
  if (!state.session || state.result || state.composing) return;
  const task = state.session.tasks[state.index];
  if (!task || task.kind === 'lesson') return;
  if (isPlayTask(task) && state.play.assetFailed) return;
  if (!skipped && !String(response).trim()) {
    const input = root.querySelector('#dailyAnswer');
    input?.setCustomValidity('Schreibe erst einen eigenen Versuch oder wähle „Nur Musterlösung ansehen“.');
    input?.reportValidity();
    return;
  }
  const playResult = isPlayTask(task) ? evaluatePlay(task,response) : null;
  if (playResult && !playResult.complete) return;
  const evaluated = playResult ? playResult.correct : isCorrect(task, response);
  // A different free-text translation can be valid: never confidently mark it wrong.
  const correct = evaluated === false && (task.kind === 'production' || task.kind === 'meaning-type') ? null : evaluated;
  const displayed = task.kind==='sentence-tiles' ? sentenceText(task,response) : task.kind==='image-matching' ? `${response.length} Paare` : String(response);
  state.result = { correct, response:displayed, skipped };
  state.answers.push({taskId:task.id,kind:task.kind,correct,response:displayed,activityResponse:isPlayTask(task)?(Array.isArray(response)?[...response]:response):undefined,skipped,pairCount:task.pairs?.length||0,attemptErrors:state.play?.errors||0});
  render();
  if (correct===true && task.kind!=='image-matching') void effects.success(root.querySelector('.feedback'));
  const button = root.querySelector('[data-next]');
  button?.focus({preventScroll:true});
}

function next() {
  if (!state.session || state.index >= state.session.tasks.length) return;
  const task = state.session.tasks[state.index];
  if (task.kind !== 'lesson' && !state.result) return;
  if (task.kind === 'lesson') state.answers.push({taskId:task.id,correct:null,acknowledged:true});
  state.index++;
  state.result = null;
  state.play = freshPlayState();
  if (state.index === state.session.tasks.length && !['practice','play','extension'].includes(state.session.mode)) {
    const completion = assessCompletion(state.session, state.answers);
    const day = todayKey(); // Credit the local calendar day of finishing, not starting.
    const alreadyDone = state.completedDays.includes(day);
    if (completion.qualified) state.completedDays = recordDailyCompletion(state.completedDays, day);
    state.completion = { ...completion, day, alreadyDone };
  }
  render(true);
}

function freshPlayState(){return {image:null,word:null,matched:[],tokens:[],errors:0,note:'',busy:false,assetFailed:false};}
function focusPlay(selector){root.querySelector(selector)?.focus({preventScroll:true});}
function handlePlayClick(event){
  if(!isPlayTask(state.session?.tasks[state.index])||state.result)return false;
  const task=state.session.tasks[state.index],play=state.play;
  if(event.target.closest('[data-listen]')){effects.speak(task.target.word);return true;}
  const image=event.target.closest('[data-match-image]'),word=event.target.closest('[data-match-word]');
  if(image||word){
    if(play.busy||play.assetFailed)return true;
    const id=image?image.dataset.matchImage:word.dataset.matchWord;
    if(play.matched.includes(id))return true;
    if(image)play.image=id;else play.word=id;
    if(play.image&&play.word){
      if(isPair(task,play.image,play.word)){
        const id=play.image,session=state.session,index=state.index;
        play.matched.push(id);play.busy=true;play.note='Paar gefunden!';
        root.querySelectorAll(`[data-match-image="${id}"],[data-match-word="${id}"]`).forEach(el=>{el.classList.add('pair-found');el.disabled=true;});
        void effects.success(root.querySelector(`[data-match-word="${id}"]`));
        window.setTimeout(()=>{
          if(state.session!==session||state.index!==index||state.play!==play)return;
          play.busy=false;play.image=null;play.word=null;
          if(play.matched.length===task.pairs.length)answer([...play.matched]);
          else {render();focusPlay('[data-match-image]');}
        },effects.reducedMotion?0:180);
      }else{
        play.errors++;play.image=null;play.word=null;play.note='Noch nicht dieses Paar. Probiere eine andere Verbindung.';render();focusPlay('[data-match-image]');
      }
    }else{render();focusPlay(image?`[data-match-image="${id}"]`:`[data-match-word="${id}"]`);}
    return true;
  }
  const token=event.target.closest('[data-token]'),remove=event.target.closest('[data-remove-token]');
  if(token){const id=token.dataset.token;if(task.tokens.some(t=>t.id===id)&&!play.tokens.includes(id))play.tokens.push(id);render();focusPlay('[data-token]:not(:disabled),[data-check-sentence]');return true;}
  if(remove){play.tokens.splice(Number(remove.dataset.removeToken),1);render();focusPlay('[data-token]:not(:disabled)');return true;}
  if(event.target.closest('[data-clear-sentence]')){play.tokens=[];render();focusPlay('[data-token]');return true;}
  if(event.target.closest('[data-check-sentence]')){answer([...play.tokens]);return true;}
  return false;
}
function updateEffectsControls(){
  const toggle=feedbackToggle;
  toggle.textContent=`Ton/Haptik: ${effects.enabled?'an':'aus'}`;toggle.setAttribute('aria-pressed',String(effects.enabled));
  root.querySelectorAll('[data-listen]').forEach(button=>{button.disabled=!effects.enabled||!effects.canSpeak();});
}
feedbackToggle.addEventListener('click',()=>{effects.setEnabled(!effects.enabled);updateEffectsControls();});
window.speechSynthesis?.addEventListener?.('voiceschanged',updateEffectsControls);
window.addEventListener('pagehide',()=>effects.dispose());
root.addEventListener('error',event=>{
 if(!isPlayTask(state.session?.tasks[state.index])||!event.target.matches?.('.visual-art img')||state.play.assetFailed)return;
 state.play.assetFailed=true;render();
},true);

root.addEventListener('click', event => {
  if (handlePlayClick(event)) return;
  const guidedButton = event.target.closest('[data-guided]');
  if (guidedButton) { start('guided', guidedButton.dataset.guided); return; }
  const startButton = event.target.closest('[data-start]');
  if (startButton) { start(startButton.dataset.start); return; }
  if (event.target.closest('[data-home]')) { state.session = null; state.result = null; state.practiceOrigin = null; render(true); return; }
  if (event.target.closest('[data-practice]')) { startPractice(); return; }
  if (event.target.closest('[data-return]')) { returnFromPractice(); return; }
  if (event.target.closest('[data-extend]')) { startExtension(); return; }
  if (event.target.closest('[data-return-extension]')) { returnFromExtension(); return; }
  if (event.target.closest('[data-next]')) { next(); return; }
  if (event.target.closest('[data-example]')) { answer('', true); return; }
  const choice = event.target.closest('[data-choice]');
  if (choice && state.session && !state.result) {
    const task = state.session.tasks[state.index];
    const idx = Number(choice.dataset.choice);
    if (Number.isInteger(idx) && idx >= 0 && idx < (task.options?.length || 0)) answer(task.options[idx]);
  }
});

root.addEventListener('compositionstart', () => { state.composing = true; });
root.addEventListener('compositionend', () => { state.composing = false; });
root.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  if (!state.composing && !event.isComposing) convertJapaneseField(event.target);
});

// Keep a still-open page honest after midnight or returning from the background.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !state.session) render(); });
window.addEventListener('focus', () => { if (!state.session) render(); });
function refreshAtMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  window.setTimeout(() => {
    if (!state.session) render();
    refreshAtMidnight();
  }, midnight - now + 50);
}
refreshAtMidnight();

root.addEventListener('submit', event => {
  if (event.target.id !== 'dailyAnswerForm') return;
  event.preventDefault();
  const input = event.target.querySelector('input');
  if (!state.composing) convertJapaneseField(input, true);
  answer(input?.value || '');
});

root.addEventListener('keydown', event => {
  if (!state.session || state.index >= state.session.tasks.length || state.composing || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest?.('#feedbackToggle,[data-listen]')) return;
  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (tag === 'BUTTON' && event.key==='Enter' && !event.target.closest('[data-next]')) return;
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
  state.source = state.source ? {...state.source, learned:withDailyContexts(prepareDailyCards(state.source.learned, state.source.catalog, state.save),state.source.catalog)} : null;
  state.lexicon = readingLexicon([...(state.source?.catalog || []),...(state.source?.learned || [])]);
  render();
}
init();

// iOS may resize only the visual viewport when the keyboard opens.
function updateViewport() {
  const viewport = window.visualViewport;
  if (viewport && viewport.scale !== 1) return;
  document.documentElement.style.setProperty('--app-height', `${viewport?.height || window.innerHeight}px`);
  document.documentElement.style.setProperty('--app-top', `${viewport?.offsetTop || 0}px`);
}
window.visualViewport?.addEventListener('resize', updateViewport);
window.visualViewport?.addEventListener('scroll', updateViewport);
window.addEventListener('resize', updateViewport);
updateViewport();
