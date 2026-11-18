/* Kotoba speaking flashcards: continuous, optional, in-memory-only review.
 * No changes to canonical SRS/storage, cloud, kanji or Life RPG.
 */
import {buildVoiceDeck,promptFor,solutionFor,acceptsVoiceAnswer,gradeSpeechCandidates,spokenContrastChoices} from './voice-cards-core.mjs';
import {createVoiceSession,currentVoiceCard,recordVoiceAttempt,voiceSummary} from './voice-cards-session.mjs';

const app=document.getElementById('app');
const SpeechApi=window.SpeechRecognition||window.webkitSpeechRecognition;
const back=new URLSearchParams(window.location.search).get('from')==='index'?'./index.html':'./daily.html';
const SILENCE_MS=10000;
let learned=[],lexicon=[],direction='de-jp',session=null,phase='intro',rec=null,token=0;
let silenceTimer=null,autoTimer=null,speechStarted=false,pending=null,recognitionOptions=[],lastRecognition='',repeatStartCount=0;
const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const task=()=>currentVoiceCard(session)?.task;
const node=selector=>app.querySelector(selector);

function clearTimers(){
  if(silenceTimer!==null)clearTimeout(silenceTimer);
  if(autoTimer!==null)clearTimeout(autoTimer);
  silenceTimer=null;autoTimer=null;
}
function stopMic(){
  ++token;
  const active=rec;rec=null;
  if(active){try{active.abort();}catch(_){}}
}
function stopAll(){clearTimers();stopMic();try{window.speechSynthesis?.cancel();}catch(_){}}
function titleBar(){
 return '<div class="top"><a class="back" href="'+back+'" aria-label="Zurück">←</a><span class="title">✿ Kotoba Sprechkarten</span><span style="width:28px" aria-hidden="true"></span></div>';
}
function intro(){
 stopAll();phase='intro';session=null;
 app.innerHTML=titleBar()+
 '<section class="intro-panel"><div class="intro-mark" aria-hidden="true">🎙️</div>'+
 '<h1>Sprechkarten</h1><p>Einmal auf Los tippen, dann die Karten nacheinander einsprechen. Nach etwa 10 Sekunden Stille oder einem falschen Wort kommt die Lösung – und die Karte später erneut.</p>'+
 '<label for="direction">Übungsrichtung</label><select id="direction"><option value="de-jp">Deutsch → Japanisch</option><option value="jp-de">Japanisch → Deutsch</option><option value="mixed">Gemischt</option></select>'+
 '<button class="big-button start-button" id="start">Los! ✨</button>'+
 '<p class="privacy-note">Die Karten verwenden deinen gelernten Wortschatz, ohne SRS oder Cloud zu verändern. Ergebnisse bleiben nur in dieser geöffneten Runde. Spracherkennung kann Audiodaten an den Dienst deines Browsers übertragen.</p></section>';
 node('#direction').value=direction;
 node('#direction').addEventListener('change',e=>direction=e.target.value);
 node('#start').addEventListener('click',startRound);
}
function startRound(){
 stopAll();
 const deck=buildVoiceDeck(learned,{direction,limit:8,seed:String(Date.now())});
 if(!deck.length){empty('Noch keine gelernten Wörter in diesem Browser gefunden. Bitte Kotoba Quest hier öffnen und deinen Lernstand prüfen.');return;}
 session=createVoiceSession(deck,{maxAttempts:3});
 pending=null;repeatStartCount=0;
 showCard(true);
}
function empty(message){
 stopAll();phase='empty';
 app.innerHTML=titleBar()+'<section class="empty"><h1>Keine Sprechkarten</h1><p id="emptyText"></p><a href="'+back+'" class="secondary" style="text-decoration:none">Zurück zu Kotoba Quest</a></section>';
 node('#emptyText').textContent=message;
}
function baseCard(){
 const entry=currentVoiceCard(session),item=entry?.task;
 if(!item){summary();return false;}
 const stats=voiceSummary(session),index=stats.completed;
 const value=promptFor(item),japanese=item.direction==='jp-de';
 app.innerHTML=titleBar()+
 '<div class="tracker"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+stats.total+'" aria-valuenow="'+index+'"><div style="width:'+Math.round(index/stats.total*100)+'%"></div></div><span class="counter">'+stats.completed+'/'+stats.total+'</span></div>'+
 '<div class="status-bar"><span>'+ (session.records[entry.key].attempts.length?'🔁 Wiederholung':'🎯 Neues Wort') +'</span><span>Fehlerhafte Karten kommen zurück</span></div>'+
 '<h1>Übersetze das Wort</h1>'+
 '<div class="card-stack" id="stack"><div class="flashcard" id="flashcard"><span class="word" id="word"></span><button type="button" class="word-audio" id="hear" hidden aria-label="Japanisches Wort anhören">♪ Anhören</button></div></div>'+
 '<div id="response" class="response" role="status" aria-live="polite"></div>'+
 '<div id="countdown" class="countdown" hidden><span id="countdownFill"></span></div>'+
 '<div id="controls"><div class="controls"><button type="button" id="microphone" class="big-button">🎙 Jetzt sprechen</button><button type="button" id="repeat" class="again" aria-label="Nochmals einsprechen">↻</button></div>'+
 '<div class="actions"><button class="text-link" type="button" id="typing">ANTWORT TIPPEN</button><button class="text-link" type="button" id="dontKnow">Weiß nicht</button><button class="text-link" type="button" id="pause">Pause</button></div>'+
 '<form id="answerForm" class="input-row" hidden><input id="typed" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"><button type="submit">Prüfen</button></form></div>'+
 '<p class="privacy-note">Sprechtraining · keine Änderungen an SRS und Kanji-Fortschritt</p>';
 node('#word').textContent=value;
 if(japanese)node('#word').lang='ja';
 const hear=node('#hear');hear.hidden=!japanese;
 hear.addEventListener('click',()=>say(item.card.word));
 node('#microphone').addEventListener('click',()=>{if(phase==='listening')return;startListening();});
 node('#repeat').addEventListener('click',startListening);
 node('#typing').addEventListener('click',()=>{
   clearTimers();stopMic();phase='typing';
   node('#answerForm').hidden=false;node('#countdown').hidden=true;
   node('#response').textContent='Schreibe die Antwort oder nutze die Diktierfunktion deiner Tastatur.';
   node('#typed').focus();updateButtons();
 });
 node('#dontKnow').addEventListener('click',()=>feedback('not-known','','Ich wusste es nicht.'));
 node('#pause').addEventListener('click',pause);
 node('#answerForm').addEventListener('submit',e=>{
   e.preventDefault();
   const value=node('#typed').value;
   if(!value.trim())return;
   const correct=acceptsVoiceAnswer(task(),value)||
     (task()?.direction==='de-jp'&&Boolean(window.KotobaRomaji)&&acceptsVoiceAnswer(task(),window.KotobaRomaji.toHiragana(value,true)));
   feedback(correct?'correct':'wrong-word',value,'Antwort eingetippt');
 });
 return true;
}
function updateButtons(){
 const mic=node('#microphone');
 if(!mic)return;
 mic.textContent=phase==='listening'?'● Ich höre zu …':phase==='typing'?'🎙 Mikrofon verwenden':SpeechApi?'🎙 Einsprechen':'Mikrofon nicht verfügbar';
 mic.classList.toggle('listening',phase==='listening');
 mic.disabled=phase==='listening'||!SpeechApi;
 node('#repeat').disabled=phase==='listening'||!SpeechApi;
}
function message(title,detail='',kind=''){
 const el=node('#response');if(!el)return;
 el.className='response '+kind;el.replaceChildren();
 const strong=document.createElement('strong');strong.textContent=title;el.append(strong);
 if(detail){const span=document.createElement('span');span.textContent=detail;el.append(span);}
}
function showCard(auto=false){
 stopAll();
 pending=null;recognitionOptions=[];lastRecognition='';repeatStartCount=0;
 phase='ready';
 if(!baseCard())return;
 updateButtons();
 if(auto)startListening();
 else message('Bereit', 'Tippe auf das Mikrofon, um zu sprechen.');
}
function countSilent(){
 const el=node('#countdown');if(!el)return;
 el.hidden=false;
 const fill=node('#countdownFill');
 fill.style.animation='none';void fill.offsetWidth;fill.style.animation='countdown 10s linear forwards';
 if(silenceTimer!==null)clearTimeout(silenceTimer);
 silenceTimer=setTimeout(()=>{
   silenceTimer=null;
   if(phase!=='listening'||speechStarted)return;
   feedback('no-answer','','10 Sekunden ohne Antwort');
 },SILENCE_MS);
}
function startListening(){
 if(!session||!task())return;
 clearTimers();stopMic();
 if(!SpeechApi){phase='ready';message('Mikrofon nicht verfügbar','Nutze die Tastatur oder die Diktierfunktion deines Handys.','warn');updateButtons();return;}
 phase='listening';speechStarted=false;
 node('#answerForm').hidden=true;
 const current=++token;let recognition;
 try{
   recognition=new SpeechApi();
   recognition.lang=task().direction==='de-jp'?'ja-JP':'de-DE';
   recognition.interimResults=false;recognition.maxAlternatives=10;recognition.continuous=false;
   rec=recognition;
   recognition.onspeechstart=()=>{
     if(token!==current)return;
     speechStarted=true;
     if(silenceTimer!==null)clearTimeout(silenceTimer);silenceTimer=null;
     node('#countdown').hidden=true;
   };
   recognition.onresult=event=>{
     if(token!==current||phase!=='listening')return;
     const alternatives=Array.from(event.results?.[0]||[]).map(x=>x.transcript).filter(Boolean);
     stopMic();clearTimers();
     node('#countdown').hidden=true;
     recognitionOptions=alternatives;lastRecognition=alternatives[0]||'';
     if(!alternatives.length){phase='ready';message('Nichts erkannt','Tippe erneut auf das Mikrofon.','warn');updateButtons();return;}
     const opts={lexicon,toHiragana:window.KotobaRomaji?.toHiragana};
     const top=gradeSpeechCandidates(task(),alternatives.slice(0,1),opts);
     const all=gradeSpeechCandidates(task(),alternatives,opts);
     const contrasting=spokenContrastChoices(task(),alternatives[0],opts);
     if(top.match==='exact'){feedback('correct',top.transcript,'Direkt erkannt');return;}
     if(all.match==='exact'||top.match==='near'||contrasting.length>1){
       confirmSpeech(all.match==='exact'?'Auch eine mögliche richtige Erkennung dabei':top.match==='near'?'Sehr ähnlich erkannt':'Zwei ähnlich klingende Wörter',contrasting,alternatives[0]);
       return;
     }
     feedback('wrong-word',alternatives[0],'Nicht als Zielwort erkannt');
   };
   recognition.onerror=e=>{
     if(token!==current||phase!=='listening')return;
     stopMic();clearTimers();
     node('#countdown').hidden=true;
     const blocked=['not-allowed','service-not-allowed','audio-capture'].includes(e.error);
     phase='ready';
     message(blocked?'Mikrofonzugriff prüfen':'Erkennung hat nicht funktioniert',
       'Das wird nicht als falsche Antwort gezählt. Du kannst erneut tippen oder die Tastatur nutzen.','warn');
     updateButtons();
   };
   recognition.onend=()=>{
     if(token!==current||phase!=='listening')return;
     rec=null;
     // Browser stopped without a transcript. Do not falsely score silence.
     if(repeatStartCount<1&&!speechStarted){
       repeatStartCount++;
       setTimeout(()=>{if(token===current&&phase==='listening')startListening();},150);
     }else{
       clearTimers();phase='ready';
       node('#countdown').hidden=true;
       message('Erkennung beendet','Bitte noch einmal auf das Mikrofon tippen. Diese Karte wird nicht als Fehler gewertet.','warn');
       updateButtons();
     }
   };
   recognition.start();
   updateButtons();
   countSilent();
   message('Ich höre zu …','Antworte jetzt. Nach 10 Sekunden ohne Sprache erscheint die Lösung.');
 }catch(_){
   stopMic();clearTimers();phase='ready';
   node('#countdown').hidden=true;
   message('Automatisches Mikrofon nicht möglich','Tippe auf Einsprechen. Manche iPhone-Browser verlangen für jede Karte einen eigenen Tipp.','warn');
   updateButtons();
 }
}
function say(text){
 if(!window.speechSynthesis)return;
 try{
   window.speechSynthesis.cancel();
   const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ja-JP';utterance.rate=.87;
   const voice=window.speechSynthesis.getVoices().find(v=>v.lang?.toLowerCase().startsWith('ja'));
   if(voice)utterance.voice=voice;
   window.speechSynthesis.speak(utterance);
 }catch(_){}
}
function confirmSpeech(title,choices,heard){
 stopMic();clearTimers();phase='confirm';
 node('#countdown').hidden=true;
 const target=task(),answer=solutionFor(target);
 message(title, 'Die Spracherkennung schrieb: '+heard,'warn');
 const zone=node('#controls');zone.replaceChildren();
 const prompt=document.createElement('p');prompt.className='confirmation-title';prompt.textContent='Was hast du tatsächlich gesagt?';
 zone.append(prompt);
 const add=(label,callback,style='secondary')=>{
  const b=document.createElement('button');b.type='button';b.className=style;b.textContent=label;b.addEventListener('click',callback);zone.append(b);
 };
 add('Die richtige Lösung: '+answer,()=>feedback('recognition-error',heard,'Von dir als korrekt bestätigt'),'confirmation-choice');
 const expected=String(target.card.reading||'');
 for(const reading of choices){
   if(reading===expected)continue;
   add('Ich sagte: '+reading,()=>feedback('near-miss',heard,'Aussprache/ähnlicher Begriff: '+reading),'confirmation-choice');
 }
 add('Ein ganz anderes Wort',()=>feedback('wrong-word',heard,'Anderes Wort gesprochen'),'confirmation-choice');
 add('Ich bin nicht sicher',()=>feedback('near-miss',heard,'Unsicher bei der Erkennung'),'text-link');
}
function feedback(kind,transcript='',note=''){
 if(!task()||phase==='feedback'||phase==='swiping')return;
 stopAll();
 pending={kind,transcript,spokenReading:note};
 phase='feedback';
 const correct=['correct','recognition-error'].includes(kind);
 message(correct?'Richtig! ✨':kind==='no-answer'?'Keine Antwort':kind==='near-miss'?'Fast – das üben wir nochmal':'Die richtige Lösung:',correct?(solutionFor(task())):(solutionFor(task())+' · kommt später noch einmal'),correct?'good':'warn');
 node('#countdown').hidden=true;
 node('#controls').replaceChildren();
 const actions=node('#controls');actions.className='feedback-actions';
 const next=document.createElement('button');next.type='button';next.className='next';next.textContent='Weiter →';next.addEventListener('click',advance);actions.append(next);
 if(kind==='correct'){
   const b=document.createElement('button');b.type='button';b.className='text-link';b.textContent='Das habe ich nicht gesagt';b.addEventListener('click',()=>{
     pending.kind='wrong-word';message('Anderes Wort gesagt',solutionFor(task())+' · kommt später noch einmal','warn');b.remove();
   });actions.append(b);
 }else if(kind==='wrong-word'){
   const b=document.createElement('button');b.type='button';b.className='text-link';b.textContent='Doch, richtig gesagt (Erkennungsfehler)';b.addEventListener('click',()=>{
     pending.kind='recognition-error';message('Von dir bestätigt ✓',solutionFor(task()),'good');b.remove();
   });actions.append(b);
 }
 const listen=document.createElement('button');listen.type='button';listen.className='text-link';listen.textContent='♪ Lösung anhören';listen.addEventListener('click',()=>say(task().card.word));actions.append(listen);
 autoTimer=setTimeout(advance,correct?1450:2600);
}
function advance(){
 if(phase!=='feedback')return;
 clearTimers();phase='swiping';
 node('#flashcard')?.classList.add('swipe-away');
 autoTimer=setTimeout(()=>{
   autoTimer=null;
   if(phase!=='swiping')return;
   session=recordVoiceAttempt(session,pending);
   pending=null;
   if(currentVoiceCard(session))showCard(true);
   else summary();
 },350);
}
function pause(){
 stopAll();phase='paused';
 message('Pause','Tippe auf Fortsetzen, wenn du bereit bist.');
 node('#countdown').hidden=true;
 node('#controls').innerHTML='<button type="button" class="big-button" id="resume">Fortsetzen ▶</button>';
 node('#resume').addEventListener('click',()=>{showCard(true);});
}
function summary(){
 stopAll();phase='done';
 const stats=voiceSummary(session),lines=[];
 for(const entry of session.entries){
   const record=session.records[entry.key];
   const first=record.attempts[0]?.kind||'';
   const firstText={correct:'Direkt richtig','recognition-error':'Erkennung korrigiert','wrong-word':'Falsches Wort','near-miss':'Fast richtig / unklar','no-answer':'Keine Antwort','not-known':'Nicht gewusst'}[first]||'–';
   lines.push('<li><span>'+safe(promptFor(entry.task))+'</span><small>'+safe(firstText)+' · '+(record.mastered?'am Ende richtig':'weiter üben')+'</small></li>');
 }
 app.innerHTML=titleBar()+
 '<section class="summary"><h1>Runde geschafft! ✨</h1>'+
 '<p>'+stats.mastered+' von '+stats.total+' Wörtern schließlich richtig · '+stats.firstTry+' beim ersten Versuch.</p>'+
 '<div class="summary-grid"><span>Falsches Wort</span><strong>'+stats.wrongWord+'</strong><span>Fast / unsicher</span><strong>'+stats.nearMiss+'</strong><span>Keine Antwort</span><strong>'+stats.noAnswer+'</strong><span>Nicht gewusst</span><strong>'+stats.notKnown+'</strong><span>Erkennung korrigiert</span><strong>'+stats.recognitionError+'</strong><span>Noch weiter üben</span><strong>'+stats.needsPractice+'</strong></div>'+
 '<h2>Deine Karten</h2><ul class="result-cards">'+lines.join('')+'</ul>'+
 '<p class="privacy-note">Auswertung nur für diese Runde. Es wurden keine echten SRS-Stufen verändert oder Lernantworten dauerhaft gespeichert.</p>'+
 '<button type="button" id="restart" class="big-button">Noch eine Runde</button><button type="button" id="home" class="secondary">Zur Auswahl</button></section>';
 node('#restart').addEventListener('click',startRound);
 node('#home').addEventListener('click',intro);
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden && ['listening','ready','typing','confirm'].includes(phase)){pause();}
});
window.addEventListener('pagehide',stopAll);
async function init(){
 try{
   if(!window.KotobaDungeonSource?.load)throw new Error('Lesemodul nicht verfügbar');
   const source=await window.KotobaDungeonSource.load();
   if(!source?.hasLiveSave){empty('Hier wurde kein Kotoba-Lernstand gefunden. Bitte verwende denselben Browser und dieselbe Adresse wie für Kotoba Quest.');return;}
   learned=source.learned||[];lexicon=[...(source.catalog||[]),...learned];
   if(!learned.length){empty('Noch keine gelernten Wörter gefunden.');return;}
   intro();
 }catch(error){empty('Lernstand konnte nicht sicher gelesen werden: '+String(error?.message||error));}
}
init();
