/* Standalone, read-only speaking-card pilot. No SRS/storage/analytics writes. */
import {buildVoiceDeck,promptFor,solutionFor,acceptsVoiceAnswer} from './voice-cards-core.mjs';

const app=document.getElementById('app');
const SpeechApi=window.SpeechRecognition||window.webkitSpeechRecognition;
const params=new URLSearchParams(window.location.search);
const back=params.get('from')==='index'?'./index.html':'./daily.html';
let learned=[],deck=[],index=0,correct=0,direction='de-jp',typing=false,result=null,recognizer=null,serial=0;

function haltSpeech(){
  serial++;
  if(recognizer){try{recognizer.abort();}catch(_){} recognizer=null;}
  try{window.speechSynthesis?.cancel();}catch(_){}
}
function empty(message){
  haltSpeech();
  app.innerHTML='<div class="top"><a class="back" href="'+back+'" aria-label="Zurück">←</a><span class="title">Kotoba Sprechkarten</span></div><section class="empty"><h1>Sprechkarten</h1><p id="emptyMessage"></p><a class="big-button" href="'+back+'" style="text-decoration:none">Zurück zu Kotoba</a></section>';
  app.querySelector('#emptyMessage').textContent=message;
}
function newDeck(){
  haltSpeech();index=0;correct=0;result=null;typing=false;
  deck=buildVoiceDeck(learned,{direction,limit:8,seed:String(Date.now())});
  if(!deck.length){empty('Noch keine gelernten Vokabeln gefunden. Bitte öffne Kotoba Quest im selben Browser und prüfe dort deinen Lernstand.');return;}
  render();
}
function response(message,kind='',detail=''){
  const el=app.querySelector('#response');
  if(!el)return;
  el.className='response '+kind;
  el.replaceChildren();
  if(message){const title=document.createElement('strong');title.textContent=message;el.appendChild(title);}
  if(detail){const line=document.createElement('span');line.textContent=detail;el.appendChild(line);}
}
function setMainButton(){
  const button=app.querySelector('#microphone');
  if(!button)return;
  if(app.querySelector('#again'))app.querySelector('#again').disabled=Boolean(result?.done);
  if(result?.done){
    button.textContent=index===deck.length-1?'Ergebnis ansehen →':'Nächste Karte →';
    button.classList.remove('listening');button.disabled=false;
  }else{
    button.textContent=recognizer?'● Ich höre zu …':SpeechApi?'🎙 Einsprechen':'Mikrofon nicht verfügbar';
    button.classList.toggle('listening',Boolean(recognizer));
    button.disabled=!SpeechApi;
  }
}
function pass(manual=false){
  if(result?.done)return;
  correct++;
  result={done:true,passed:true};
  response(manual?'Als gewusst markiert ✓':'Richtig erkannt! ✨','good',solutionFor(deck[index]));
  app.querySelector('#manual').hidden=true;
  app.querySelector('#reveal').hidden=true;
  setMainButton();
}
function attempt(text,{spoken=false}={}){
  if(result?.done)return;
  const task=deck[index];
  const accepted=acceptsVoiceAnswer(task,text)|| (task.direction==='de-jp' && Boolean(window.KotobaRomaji) && acceptsVoiceAnswer(task,window.KotobaRomaji.toHiragana(text,true)));
  if(accepted){pass();return;}
  const prefix=spoken?'Erkannt: ':'Deine Eingabe: ';
  response('Noch nicht sicher', 'warn',prefix+text+'. Du kannst es erneut versuchen.');
  app.querySelector('#manual').hidden=!spoken;
}
function showSolution(){
  haltSpeech();result={done:true,passed:false};
  response('Die Lösung lautet:', '',solutionFor(deck[index]));
  app.querySelector('#manual').hidden=true;
  app.querySelector('#reveal').hidden=true;
  setMainButton();
}
function advance(){
  haltSpeech();index++;result=null;typing=false;
  if(index>=deck.length){summary();return;}
  render();
}
function listen(){
  if(result?.done){advance();return;}
  if(recognizer){haltSpeech();setMainButton();return;}
  if(!SpeechApi){response('Mikrofon nicht verfügbar','','Nutze alternativ die Tastatur oder deren Diktierfunktion.');return;}
  const token=++serial;
  try {
    const rec=new SpeechApi();
    rec.lang=deck[index].direction==='de-jp'?'ja-JP':'de-DE';
    rec.interimResults=false;rec.maxAlternatives=5;rec.continuous=false;
    recognizer=rec;
    rec.onresult=event=>{
      if(token!==serial || result?.done)return;
      const options=Array.from(event.results?.[0]||[]).map(value=>value.transcript).filter(Boolean);
      const matching=options.find(value=>acceptsVoiceAnswer(deck[index],value));
      recognizer=null;setMainButton();
      if(options.length)attempt(matching||options[0],{spoken:true});
      else response('Nichts verstanden','','Versuche es noch einmal.');
    };
    rec.onerror=event=>{
      if(token!==serial)return;
      recognizer=null;setMainButton();
      const blocked=['not-allowed','service-not-allowed','audio-capture'].includes(event.error);
      response(blocked?'Mikrofonzugriff nicht möglich':'Leider nichts erkannt','','Versuche es erneut oder gib die Antwort über die Tastatur ein.');
    };
    rec.onend=()=>{
      if(token!==serial)return;
      if(recognizer===rec){recognizer=null;setMainButton();}
    };
    rec.start();setMainButton();response('Ich höre zu …','','Sprich jetzt deine Antwort.');
  } catch(_){
    recognizer=null;setMainButton();
    response('Spracherkennung konnte nicht starten','','Bitte nutze die Tastatur oder versuche es in einem unterstützten Browser.');
  }
}
function pronounce(){
  if(!('speechSynthesis' in window))return;
  const spoken=new SpeechSynthesisUtterance(deck[index].card.word);
  spoken.lang='ja-JP';spoken.rate=.86;
  const voice=window.speechSynthesis.getVoices().find(v=>v.lang?.toLowerCase().startsWith('ja'));
  if(voice)spoken.voice=voice;
  window.speechSynthesis.cancel();window.speechSynthesis.speak(spoken);
}
function render(){
  const task=deck[index],japanese=task.direction==='jp-de';
  app.innerHTML='<div class="top"><a class="back" href="'+back+'" aria-label="Zurück">←</a><span class="title">✿ Kotoba Sprechkarten</span><span style="width:28px" aria-hidden="true"></span></div>'+
    '<div class="tracker"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+deck.length+'" aria-valuenow="'+index+'"><div id="progressFill"></div></div><span class="counter" id="counter"></span></div>'+
    '<div class="settings"><label for="direction">Übungsrichtung</label><select id="direction"><option value="de-jp">Deutsch → Japanisch</option><option value="jp-de">Japanisch → Deutsch</option><option value="mixed">Gemischt</option></select></div>'+
    '<h1>Übersetze das Wort</h1><div class="card-stack"><div class="flashcard"><span class="word" id="word"></span><button id="speak" class="word-audio" type="button" aria-label="Japanisches Wort vorlesen" hidden>♪ Anhören</button></div></div>'+
    '<div id="response" role="status" aria-live="polite" class="response"></div>'+
    '<div class="controls"><button type="button" id="microphone" class="big-button"></button><button type="button" id="again" class="again" aria-label="Antwort erneut versuchen">↻</button></div>'+
    '<form class="input-row" id="answerForm" hidden><input id="typed" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Antwort eintippen"><button type="submit">Prüfen</button></form>'+
    '<div class="actions"><button type="button" class="text-link" id="typeToggle">ANTWORT TIPPEN</button><button type="button" class="text-link" id="reveal">Lösung zeigen</button><button type="button" class="secondary" id="manual" hidden>Ich habe es richtig gesagt</button></div>'+
    '<p class="privacy-note">Nur Probetraining: keine SRS-Änderungen. Mikrofonerkennung kann Audio an den Spracherkennungsdienst deines Browsers senden. Kotoba speichert keine Sprachaufnahmen.</p>';
  app.querySelector('#counter').textContent=(index+1)+'/'+deck.length;
  app.querySelector('#progressFill').style.width=(index/deck.length*100)+'%';
  app.querySelector('#direction').value=direction;
  const word=app.querySelector('#word');
  word.textContent=promptFor(task);
  word.lang=japanese?'ja':'de';
  app.querySelector('#speak').hidden=!japanese;
  app.querySelector('#typed').lang=japanese?'de':'ja';
  app.querySelector('#typed').placeholder=japanese?'Deutsche Bedeutung':'Japanisches Wort';
  app.querySelector('#microphone').addEventListener('click',listen);
  app.querySelector('#again').addEventListener('click',()=>{if(result?.done)return;haltSpeech();result=null;response('');app.querySelector('#manual').hidden=true;app.querySelector('#reveal').hidden=false;setMainButton();});
  app.querySelector('#reveal').addEventListener('click',showSolution);
  app.querySelector('#manual').addEventListener('click',()=>pass(true));
  app.querySelector('#direction').addEventListener('change',event=>{direction=event.target.value;newDeck();});
  app.querySelector('#typeToggle').addEventListener('click',()=>{
    typing=!typing;
    app.querySelector('#answerForm').hidden=!typing;
    app.querySelector('#typeToggle').textContent=typing?'TASTATUR AUSBLENDEN':'ANTWORT TIPPEN';
    if(typing)app.querySelector('#typed').focus();
  });
  app.querySelector('#answerForm').addEventListener('submit',event=>{event.preventDefault();const input=app.querySelector('#typed');attempt(input.value);});
  app.querySelector('#speak').addEventListener('click',pronounce);
  if(!SpeechApi)response('Mikrofon nicht verfügbar','','Du kannst die Tastatur oder die Diktierfunktion deines Handys verwenden.');
  setMainButton();
}
function summary(){
  app.innerHTML='<div class="top"><a class="back" href="'+back+'" aria-label="Zurück">←</a><span class="title">✿ Kotoba Sprechkarten</span></div><section class="summary"><h1>Quest geschafft! ✨</h1><p id="score"></p><p>Diese Übung verändert weder deinen offiziellen SRS-Stand noch deine Tagesstreak.</p><button type="button" id="restart" class="big-button">Noch eine Runde</button><p><a href="'+back+'" style="color:var(--muted)">Zurück</a></p></section>';
  app.querySelector('#score').textContent=correct+' von '+deck.length+' Wörtern erkannt oder als gewusst markiert.';
  app.querySelector('#restart').addEventListener('click',newDeck);
}
window.addEventListener('pagehide',haltSpeech);
async function init(){
  try {
    if(!window.KotobaDungeonSource?.load)throw new Error('Lesemodul fehlt.');
    const source=await window.KotobaDungeonSource.load();
    if(!source?.hasLiveSave){empty('Kein gespeicherter Kotoba-Lernstand in diesem Browser gefunden. Bitte starte die App über denselben Browser und dieselbe Adresse wie Kotoba Quest.');return;}
    learned=source.learned||[];
    newDeck();
  } catch(error){empty('Deine Vokabeln konnten nicht sicher gelesen werden: '+String(error?.message||error));}
}
init();
