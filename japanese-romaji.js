/* Shared pure converter extracted from systemInteractionConsistencyBootstrap. */
(() => {
"use strict";
      const MAP = {
        kya:"きゃ",kyu:"きゅ",kyo:"きょ",gya:"ぎゃ",gyu:"ぎゅ",gyo:"ぎょ",sha:"しゃ",shu:"しゅ",sho:"しょ",sya:"しゃ",syu:"しゅ",syo:"しょ",ja:"じゃ",ji:"じ",ju:"じゅ",jo:"じょ",jya:"じゃ",jyu:"じゅ",jyo:"じょ",cha:"ちゃ",chu:"ちゅ",cho:"ちょ",cya:"ちゃ",cyu:"ちゅ",cyo:"ちょ",nya:"にゃ",nyu:"にゅ",nyo:"にょ",hya:"ひゃ",hyu:"ひゅ",hyo:"ひょ",bya:"びゃ",byu:"びゅ",byo:"びょ",pya:"ぴゃ",pyu:"ぴゅ",pyo:"ぴょ",mya:"みゃ",myu:"みゅ",myo:"みょ",rya:"りゃ",ryu:"りゅ",ryo:"りょ",she:"しぇ",che:"ちぇ",je:"じぇ",tsa:"つぁ",tsi:"つぃ",tse:"つぇ",tso:"つぉ",fa:"ふぁ",fi:"ふぃ",fe:"ふぇ",fo:"ふぉ",fyu:"ふゅ",ti:"てぃ",di:"でぃ",wi:"うぃ",we:"うぇ",va:"ゔぁ",vi:"ゔぃ",vu:"ゔ",ve:"ゔぇ",vo:"ゔぉ",shi:"し",chi:"ち",tsu:"つ",dzu:"づ",ka:"か",ki:"き",ku:"く",ke:"け",ko:"こ",ga:"が",gi:"ぎ",gu:"ぐ",ge:"げ",go:"ご",sa:"さ",si:"し",su:"す",se:"せ",so:"そ",za:"ざ",zi:"じ",zu:"ず",ze:"ぜ",zo:"ぞ",ta:"た",te:"て",to:"と",da:"だ",de:"で",do:"ど",na:"な",ni:"に",nu:"ぬ",ne:"ね",no:"の",ha:"は",hi:"ひ",hu:"ふ",fu:"ふ",he:"へ",ho:"ほ",ba:"ば",bi:"び",bu:"ぶ",be:"べ",bo:"ぼ",pa:"ぱ",pi:"ぴ",pu:"ぷ",pe:"ぺ",po:"ぽ",ma:"ま",mi:"み",mu:"む",me:"め",mo:"も",ya:"や",yu:"ゆ",yo:"よ",ra:"ら",ri:"り",ru:"る",re:"れ",ro:"ろ",wa:"わ",wo:"を",xa:"ぁ",xi:"ぃ",xu:"ぅ",xe:"ぇ",xo:"ぉ",xya:"ゃ",xyu:"ゅ",xyo:"ょ",xtsu:"っ",ltsu:"っ",a:"あ",i:"い",u:"う",e:"え",o:"お"
      };
      // Additional spellings already supported by the core vocabulary input.
      Object.assign(MAP, {la:"ぁ",li:"ぃ",lu:"ぅ",le:"ぇ",lo:"ぉ",lya:"ゃ",lyu:"ゅ",lyo:"ょ",xtu:"っ",ltu:"っ",tya:"ちゃ",tyu:"ちゅ",tyo:"ちょ",dya:"ぢゃ",dyu:"ぢゅ",dyo:"ぢょ"});
      const KEYS = Object.keys(MAP).sort((a,b)=>b.length-a.length);
      function convertRun(run, finalize=false) {
        const source=String(run||"").toLowerCase();let result="",index=0;
        while(index<source.length){const tail=source.slice(index),first=tail[0];
          if(tail.startsWith("n'")){result+="ん";index+=2;continue;}
          if(first==="n"){
            if(tail.length===1){result+=finalize?"ん":"n";index++;continue;}
            if(tail.startsWith("nn")){if(tail.length===2&&!finalize){result+="nn";index+=2;continue;}result+="ん";index+=tail.length===2?2:1;continue;}
            if(!/[aeiouy]/.test(tail[1])){result+="ん";index++;continue;}
          }
          if(tail.length>=2&&tail[0]===tail[1]&&/[bcdfghjklmpqrstvwxyz]/.test(first)&&first!=="n"){result+="っ";index++;continue;}
          const key=KEYS.find(candidate=>tail.startsWith(candidate));
          if(key){result+=MAP[key];index+=key.length;}else{result+=source[index];index++;}
        }
        return result;
      }
      function toHiragana(value, finalize=false) {
        const source=String(value||"");
        return source.replace(/[A-Za-z']+/g,(run,offset)=>convertRun(run,finalize||offset+run.length<source.length));
      }

window.KotobaRomaji = Object.freeze({toHiragana});
})();
