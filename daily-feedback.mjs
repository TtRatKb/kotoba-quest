/* Optional, in-memory effects. No storage, network, fake vibration or WebKit workarounds. */
export function createFeedback(host=window) {
 let enabled=false,context=null,last=-Infinity;
 const reduce=()=>Boolean(host.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 function visual(element){if(!element||reduce())return;element.classList.add('daily-success');host.setTimeout(()=>element.classList.remove('daily-success'),220);}
 async function success(element){
  visual(element);
  if(!enabled||host.document?.hidden)return;
  const now=host.performance?.now?.() ?? Date.now();if(now-last<100)return;last=now;
  const android=/Android/i.test(host.navigator?.userAgent||'')&&!/iPhone|iPad|iPod/i.test(host.navigator?.userAgent||'');
  if(android&&!reduce())try{host.navigator?.vibrate?.(12);}catch{}
  if(!host.AudioContext)return;
  try{
   context ||= new host.AudioContext();await context.resume();
   if(!enabled||host.document?.hidden)return;
   const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime;
   oscillator.type='sine';oscillator.frequency.setValueAtTime(660,at);oscillator.frequency.linearRampToValueAtTime(880,at+.055);
   gain.gain.setValueAtTime(.018,at);gain.gain.exponentialRampToValueAtTime(.001,at+.08);
   oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+.09);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }catch{}
 }
 function voice(){return host.speechSynthesis?.getVoices?.().find(v=>/^ja(?:-|$)/i.test(v.lang)&&v.localService===true);}
 return {
  get enabled(){return enabled;},get reducedMotion(){return reduce();},
  setEnabled(value){enabled=Boolean(value);if(!enabled){host.speechSynthesis?.cancel?.();try{void context?.suspend?.();}catch{}}return enabled;},
  success,visual,canSpeak:()=>Boolean(voice()&&host.SpeechSynthesisUtterance),
  speak(text){const v=voice();if(!enabled||!v||!host.SpeechSynthesisUtterance)return false;try{host.speechSynthesis.cancel();const message=new host.SpeechSynthesisUtterance(text);message.voice=v;message.lang='ja-JP';message.rate=.85;host.speechSynthesis.speak(message);return true;}catch{return false;}},
  dispose(){enabled=false;host.speechSynthesis?.cancel?.();try{void context?.close?.();}catch{}context=null;}
 };
}
