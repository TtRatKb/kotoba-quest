/* Kotoba Daily – vetted, read-only guided micro-lessons.
 * Only canonical lessonComplete flags authorize personalized questions.
 * Content is aligned with grammar/particle examples in cloud.html (2026-11-14).
 * This module never performs a storage read or write itself.
 */
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const hasLesson = (save, section, id) => obj(obj(obj(save)[section]).points)[id]?.lessonComplete === true;
const skillRecords = (save, section, id) => Object.values(obj(obj(obj(obj(obj(save)[section]).points)[id]).skills));

export const GUIDED_PATHS = Object.freeze([
  {
    id: 'particle-ni-de',
    domain: 'particle',
    section: 'particlePath',
    prerequisites: ['ni-target', 'de-action'],
    title: 'に oder で? Ort ist nicht gleich Ort',
    subtitle: 'Existenz, Ziel und Handlungsort unterscheiden',
    tasks: [
      {id:'explain',kind:'lesson',label:'Den Unterschied verstehen',
        prompt:'に vs. で',
        secondary:'に zeigt hier, wo etwas existiert, oder einen Zielpunkt. で markiert den Ort, an dem eine Handlung stattfindet. Die Frage ist nicht nur „Wo?“, sondern: Was passiert dort?',
        example:'図書館で勉強します。',
        exampleTranslation:'Ich lerne in der Bibliothek. (Handlung → で)',
        explanation:'Vergleiche: 机の上に本があります。 – Auf dem Tisch liegt ein Buch. (Existenz → に)',scored:false},
      {id:'action',kind:'choice',label:'Handlungsort anwenden',
        prompt:'図書館＿＿勉強します。',secondary:'Ich lerne in der Bibliothek. Welche Partikel passt in die Lücke?',
        options:['で','に','を','が'],correct:'で',
        explanation:'勉強する ist eine Handlung. Die Bibliothek ist ihr Handlungsort, daher で.',scored:true},
      {id:'existence',kind:'choice',label:'Existenzort erkennen',
        prompt:'机の上＿＿本があります。',secondary:'Auf dem Tisch liegt ein Buch. Welche Partikel passt?',
        options:['で','を','に','へ'],correct:'に',
        explanation:'Mit あります wird der Existenzort markiert: 机の上に本があります。 で wäre hier kein geeigneter Ersatz.',scored:true},
      {id:'transfer',kind:'open',label:'Selbst formulieren',prompt:'Ich lerne in der Bibliothek.',
        secondary:'Schreibe den Satz selbst auf Japanisch. Prüfe anschließend die Beispielantwort.',
        example:'図書館で勉強します。',
        explanation:'Hier braucht man で, weil in der Bibliothek eine Handlung stattfindet.',scored:false}
    ]
  },
  {
    id: 'particle-wa-ga',
    domain: 'particle',
    section: 'particlePath',
    prerequisites: ['wa-topic','ga-subject'],
    title: 'は und が – Thema oder Fokus?',
    subtitle: 'Bekannte Themen von neuer Information trennen',
    tasks: [
      {id:'explain',kind:'lesson',label:'Kontext beachten',prompt:'は vs. が',
        secondary:'は setzt einen thematischen Rahmen. が identifiziert oder fokussiert häufig neue Information. Welche Partikel passt, hängt vom Gesprächskontext ab – es gibt keine pauschale „Subjekt = が“-Regel.',
        example:'誰が来ましたか。',exampleTranslation:'Wer ist gekommen? (W-Frage: Fokus auf der gesuchten Person)',
        explanation:'Vergleiche: 私は学生です。 – „Was mich angeht: Ich bin Studentin.“',scored:false},
      {id:'who',kind:'choice',label:'Information erfragen',prompt:'誰＿＿来ましたか。',
        secondary:'Du willst wissen, *wer* gekommen ist. Welche Partikel markiert die gesuchte Person?',
        options:['を','が','で','に'],correct:'が',
        explanation:'Bei 誰が来ましたか ist die gesuchte Person der Fokus. Für diese Frage ist が die normale Wahl.',scored:true},
      {id:'topic',kind:'choice',label:'Gesprächsfokus verstehen',prompt:'私は学生です。',
        secondary:'Welche Rolle spielt は in dieser Äußerung am ehesten?',
        options:['Es markiert das Satzthema.','Es markiert den Ort der Handlung.','Es markiert das direkte Objekt.'],
        correct:'Es markiert das Satzthema.',
        explanation:'Die Aussage wird über 私 getroffen. は bedeutet nicht automatisch, dass 私 grammatisches Subjekt sein muss.',scored:true},
      {id:'transfer',kind:'open',label:'Selbst formulieren',prompt:'Wer ist gekommen?',
        secondary:'Schreibe die japanische Frage. Prüfe danach die mögliche Lösung.',
        example:'誰が来ましたか。',
        explanation:'誰が setzt den Fokus auf die Person, deren Identität noch unbekannt ist.',scored:false}
    ]
  },
  {
    id:'grammar-you-ni',
    domain:'grammar',
    section:'grammar',
    prerequisites:['you-ni-naru','you-ni-suru'],
    title:'ようになる oder ようにする?',
    subtitle:'Erreichte Veränderung von bewusster Bemühung trennen',
    tasks:[
      {id:'explain',kind:'lesson',label:'Den Kernunterschied verstehen',prompt:'〜ようになる / 〜ようにする',
        secondary:'ようになる betont eine Veränderung, deren Ergebnis erreicht wurde. ようにする bezeichnet die bewusste Anstrengung, etwas zu tun oder zu vermeiden. Ähnliche Formen, unterschiedliche Perspektiven.',
        example:'日本語が話せるようになりました。',exampleTranslation:'Ich kann inzwischen Japanisch sprechen. (erreichte Fähigkeit)',
        explanation:'Vergleiche: 毎日日本語を読むようにしています。 – Ich bemühe mich, täglich Japanisch zu lesen.',scored:false},
      {id:'meaning',kind:'choice',label:'Ergebnis erkennen',prompt:'日本語が話せるようになりました。',
        secondary:'Was steht bei dieser Formulierung im Vordergrund?',
        options:['Eine inzwischen erreichte Fähigkeit','Ein bloßer Vorsatz','Eine Anordnung von außen'],
        correct:'Eine inzwischen erreichte Fähigkeit',
        explanation:'〜ようになる benennt hier das Ergebnis einer Veränderung: Früher ging es nicht, inzwischen schon.',scored:true},
      {id:'contrast',kind:'choice',label:'Bewusste Routine wählen',
        prompt:'毎日日本語を読む＿＿＿＿。',
        secondary:'Ich bemühe mich bewusst, jeden Tag Japanisch zu lesen. Welche Form betont diese Bemühung?',
        options:['ようになりました','ようにしています','ことになりました'],
        correct:'ようにしています',
        explanation:'〜ようにしています beschreibt die fortgesetzte bewusste Anstrengung. 〜ようになりました berichtet eher eine eingetretene Veränderung.',scored:true},
      {id:'transfer',kind:'open',label:'Selbst formulieren',prompt:'Ich kann inzwischen Japanisch sprechen.',
        secondary:'Schreibe einen japanischen Satz mit der passenden Struktur.',
        example:'日本語が話せるようになりました。',
        explanation:'話せる ist die Potentialform von 話す; 〜ようになる beschreibt den erreichten neuen Zustand.',scored:false}
    ]
  },
  {
    id:'grammar-you-ni-naru',
    domain:'grammar',
    section:'grammar',
    prerequisites:['you-ni-naru'],
    excludesIfLearned:['you-ni-suru'],
    title:'〜ようになる – Veränderung erkennen',
    subtitle:'Fähigkeiten und neue Gewohnheiten beschreiben',
    tasks:[
      {id:'explain',kind:'lesson',label:'Ergebnis einer Veränderung',
        prompt:'〜ようになる',secondary:'Diese Struktur beschreibt, dass eine Fähigkeit oder Gewohnheit inzwischen möglich beziehungsweise üblich geworden ist.',
        example:'日本語が話せるようになりました。',exampleTranslation:'Ich kann inzwischen Japanisch sprechen.',
        explanation:'Potentialform + ようになる kann ausdrücken, dass eine Fähigkeit neu erworben wurde.',scored:false},
      {id:'meaning',kind:'choice',label:'Bedeutung erfassen',prompt:'毎朝走るようになりました。',
        secondary:'Was bedeutet der Satz?',
        options:['Ich bin dazu übergegangen, jeden Morgen zu laufen.','Ich muss morgen laufen.','Ich wäre gern morgens gelaufen.'],
        correct:'Ich bin dazu übergegangen, jeden Morgen zu laufen.',
        explanation:'Wörterbuchform + ようになる bezeichnet eine veränderte Gewohnheit.',scored:true},
      {id:'transfer',kind:'open',label:'Selbst formulieren',prompt:'Ich kann inzwischen Japanisch sprechen.',
        secondary:'Schreibe den Satz auf Japanisch.',
        example:'日本語が話せるようになりました。',
        explanation:'話せるようになりました beschreibt die neu erreichte Fähigkeit.',scored:false}
    ]
  },
  {
    id:'grammar-you-ni-suru',
    domain:'grammar',
    section:'grammar',
    prerequisites:['you-ni-suru'],
    excludesIfLearned:['you-ni-naru'],
    title:'〜ようにする – Sich bewusst bemühen',
    subtitle:'Vorsätze und angestrebte Gewohnheiten formulieren',
    tasks:[
      {id:'explain',kind:'lesson',label:'Bewusste Bemühung',
        prompt:'〜ようにする',secondary:'Mit 〜ようにする sagst du, dass du aktiv darauf achtest, etwas zu tun oder zu vermeiden.',
        example:'毎日日本語を読むようにしています。',
        exampleTranslation:'Ich versuche, jeden Tag Japanisch zu lesen.',
        explanation:'〜ようにしています zeigt eine fortdauernde bewusste Bemühung.',scored:false},
      {id:'meaning',kind:'choice',label:'Absicht erkennen',prompt:'夜更かししないようにします。',
        secondary:'Was drückt die Aussage aus?',
        options:['Ich werde darauf achten, nicht lange wach zu bleiben.','Ich kann inzwischen nicht mehr schlafen.','Ich bin gestern früh eingeschlafen.'],
        correct:'Ich werde darauf achten, nicht lange wach zu bleiben.',
        explanation:'ない-Form + ようにする bezeichnet eine bewusste Bemühung, etwas zu vermeiden.',scored:true},
      {id:'transfer',kind:'open',label:'Selbst formulieren',prompt:'Ich versuche, jeden Tag Japanisch zu lesen.',
        secondary:'Formuliere den Satz mit 〜ようにしています.',
        example:'毎日日本語を読むようにしています。',
        explanation:'〜ようにしています kann eine andauernde selbstgesteuerte Routine ausdrücken.',scored:false}
    ]
  }
]);

/** No curriculum advancement is inferred from level counters, badges or aggregate statistics. */
export function availableGuidedPaths(save, now = Date.now()) {
  const result = [];
  for(const path of GUIDED_PATHS) {
    if (!path.prerequisites.every(id => hasLesson(save, path.section, id))) continue;
    if ((path.excludesIfLearned || []).some(id => hasLesson(save,path.section,id))) continue;
    const skills = path.prerequisites.flatMap(id => skillRecords(save,path.section,id));
    const due = skills.some(skill =>
      Number(skill?.stage) >= 1 && Number(skill?.stage) < 9 &&
      skill?.dueAt != null && Number.isFinite(Number(skill.dueAt)) && Number(skill.dueAt) <= now
    );
    const weakest = skills.reduce((value,skill)=> {
      const stage = Number(skill?.stage);
      return Number.isFinite(stage) && stage >= 1 ? Math.min(value, stage) : value;
    }, 9);
    result.push({
      id:path.id,domain:path.domain,title:path.title,subtitle:path.subtitle,
      focus:due?'Wiederholung hilfreich':weakest<=4?'Noch in der Lernphase':'Bereits gelernt',
      priority:due?2:weakest<=4?1:0
    });
  }
  return result;
}

export function buildGuidedQuest(save, day = 'preview', chosenId = null, now = Date.now()) {
  const available = availableGuidedPaths(save,now);
  if (!available.length) return null;
  const eligible = chosenId ? available.find(item=>item.id === chosenId) : null;
  // Stable per-day rotation among equally urgent options; never invent a lesson.
  const rotate = String(day).split('').reduce((hash,char)=>((hash*31+char.charCodeAt(0))>>>0),0);
  const highest = Math.max(...available.map(item=>item.priority));
  const recommended = available.filter(item=>item.priority===highest).sort((a,b)=>a.id.localeCompare(b.id));
  const pick = eligible || recommended[rotate % recommended.length];
  const template = GUIDED_PATHS.find(path=>path.id===pick.id);
  return {
    mode:'guided',id:template.id,title:template.title,domain:template.domain,
    reason:pick.focus,prerequisites:[...template.prerequisites],
    tasks:template.tasks.map(task=>({...task,options:task.options?[...task.options]:undefined})),
    readOnly:true
  };
}
