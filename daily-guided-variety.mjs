/* Extra Kotoba Daily curriculum: vetted, fixed mini-tasks.
 * These definitions contain NO persistence, generated grammar or SRS logic.
 * Every lesson is gated by existing canonical completed-lesson IDs.
 */
const choice = (id, label, prompt, secondary, options, correct, explanation) =>
  ({ id, kind:'choice', label, prompt, secondary, options, correct, explanation, scored:true });
const open = (id, prompt, secondary, example, explanation) =>
  ({ id, kind:'open', label:'Selbst formulieren', prompt, secondary, example, explanation, scored:false });

export const EXTRA_GUIDED_PATHS = Object.freeze([
  {
    id: 'particle-kara-made',
    domain: 'particle',
    section: 'particlePath',
    prerequisites: ['kara-source','made-limit'],
    title: 'から oder まで? Anfang und Ende',
    subtitle: 'Zeitliche Ausgangspunkte und Endpunkte sicher benennen',
    tasks: [
      { id:'explain',kind:'lesson',label:'Zeitspannen verstehen',
        prompt:'から vs. まで',
        secondary:'から benennt einen Beginn beziehungsweise Ausgangspunkt. まで markiert einen Endpunkt. Zusammen kann man damit einen Zeitraum abgrenzen.',
        example:'九時から五時まで働きます。',
        exampleTranslation:'Ich arbeite von neun bis fünf Uhr.',
        explanation:'Der Beginn steht vor から; das Ende vor まで. Nicht mit der Frist までに verwechseln.',scored:false },
      choice('start','Anfang erkennen','授業は九時＿＿十二時までです。',
        'Der Unterricht ist von neun bis zwölf Uhr. Welche Partikel markiert den Anfang?',
        ['から','まで','で','へ'],'から',
        '九時から十二時まで beschreibt den Zeitraum von neun bis zwölf Uhr.'),
      choice('end','Endpunkt erkennen','今日は五時＿＿働きます。',
        'Ich arbeite heute bis fünf Uhr und höre dann auf. Welche Partikel markiert das Ende?',
        ['まで','から','で','へ'],'まで',
        '五時まで bedeutet bis fünf Uhr. まで markiert hier das Ende der Arbeitszeit.'),
      open('transfer','Ich lerne von neun Uhr bis zwölf Uhr.',
        'Formuliere den vollständigen Satz auf Japanisch und vergleiche ihn anschließend.',
        '九時から十二時まで勉強します。',
        '九時から ist der Anfang, 十二時まで der Endpunkt. Auch weitere natürliche Sätze sind möglich.')
    ]
  },
  {
    id: 'particle-dake-shika',
    domain: 'particle',
    section: 'particlePath',
    prerequisites: ['dake-only','shika-negative'],
    title: 'だけ oder しか? Zweimal „nur“',
    subtitle: 'Neutrale Begrenzung und die erforderliche Negation unterscheiden',
    tasks: [
      { id:'explain',kind:'lesson',label:'Positiv oder negativ?',
        prompt:'だけ vs. しか〜ない',
        secondary:'だけ kann mit bejahter Verbform neutral begrenzen. しか braucht eine verneinte Verbform: Wasser allein ist nicht das Kriterium, die Satzstruktur entscheidet.',
        example:'水だけ飲みました。',
        exampleTranslation:'Ich habe nur Wasser getrunken. (だけ mit bejahter Form)',
        explanation:'Vergleiche: 水しか飲みませんでした。– Ich habe nichts außer Wasser getrunken.',scored:false },
      choice('positive','Bejahte Form lesen','今日は水＿＿飲みました。',
        'Heute habe ich nur Wasser getrunken. Welche Begrenzung passt zur bejahten Verbform?',
        ['だけ','しか','まで','から'],'だけ',
        'だけ verbindet sich hier mit 飲みました. しか verlangt eine verneinte Form.'),
      choice('negative','Negation erkennen','この店には一つ＿＿残っていません。',
        'Es ist nur ein einziges Exemplar übrig. Welche Form gehört zur Negation?',
        ['しか','だけ','まで','から'],'しか',
        '一つしか残っていません bedeutet, dass nicht mehr als eines übrig ist.'),
      open('transfer','Ich habe nur Wasser getrunken – nutze しか.',
        'Achte auf die passende negative Verbform. Vergleiche danach den Beispielsatz.',
        '水しか飲みませんでした。',
        'しか verbindet sich mit 飲みませんでした. Die deutsche Gesamtbedeutung ist trotzdem „nur“.')
    ]
  }
]);

// Alternate everyday scenarios. The original explanation is retained;
// no "new" canonical lesson or progress record is created.
export const GUIDED_ALT_TASKS = Object.freeze({
  'particle-ni-de': [
    choice('park','Handlungsort im Alltag','公園＿＿遊びます。',
      'Ich spiele im Park. Welche Partikel markiert den Ort der Handlung?',
      ['で','に','が','を'],'で',
      '遊ぶ ist hier die Handlung, die im Park stattfindet. Dafür steht で.'),
    choice('cat','Existenz im Zimmer','部屋＿＿猫がいます。',
      'Im Zimmer ist eine Katze. Welche Partikel markiert den Ort ihrer Existenz?',
      ['に','で','を','へ'],'に',
      '猫がいます drückt aus, dass die Katze dort ist. Der Existenzort steht mit に.'),
    open('transfer-alt','Im Zimmer ist eine Katze.',
      'Formuliere selbst auf Japanisch. Prüfe danach eine mögliche Lösung.',
      '部屋に猫がいます。',
      'いる mit belebtem Subjekt nutzt に für den Ort des Seins.')
  ],
  'particle-wa-ga': [
    choice('who-answer','Fokus in der Antwort','A：誰が来ましたか。\nB：田中さん＿＿来ました。',
      'A fragt: Wer ist gekommen? B nennt die gesuchte Person. Welche Partikel passt?',
      ['が','は','を','で'],'が',
      '田中さんが来ました identifiziert in dieser Antwort die erfragte Person.'),
    choice('topic','Thema einer Aussage','田中さんは先生です。',
      'Was leistet は hier vor allem?',
      ['Es setzt 田中さん als Gesprächsthema.','Es markiert einen Handlungsort.','Es markiert ein direktes Objekt.'],
      'Es setzt 田中さん als Gesprächsthema.',
      'Mit は wird eine Aussage über 田中さん getroffen. Die Interpretation hängt vom Kontext ab.'),
    open('transfer-alt','Wer ist gekommen?',
      'Schreibe die Frage auf Japanisch.',
      '誰が来ましたか。',
      'Bei der Wer-Frage wird die gesuchte Person gewöhnlich mit が markiert.')
  ],
  'grammar-you-ni': [
    choice('result','Neue Fähigkeit','練習して、漢字が読めるようになりました。',
      'Was hat sich verändert?',
      ['Ich kann inzwischen Kanji lesen.','Ich will ab morgen Kanji lernen.','Ich habe beschlossen, nicht mehr zu lesen.'],
      'Ich kann inzwischen Kanji lesen.',
      '読めるようになりました beschreibt eine bereits erreichte Fähigkeit.'),
    choice('effort','Bewusstes Verhalten','忘れない＿＿＿＿。',
      'Ich achte bewusst darauf, es nicht zu vergessen. Welche Ergänzung drückt eine fortlaufende Bemühung aus?',
      ['ようにしています','ようになりました','ことになりました'],'ようにしています',
      '忘れないようにしています betont die bewusste fortgesetzte Bemühung.'),
    open('transfer-alt','Ich achte darauf, jeden Tag zu üben.',
      'Formuliere eine bewusste Routine mit ようにしています.',
      '毎日練習するようにしています。',
      '毎日練習するようにしています beschreibt eine absichtlich beibehaltene Gewohnheit.')
  ],
  'grammar-you-ni-naru': [
    choice('changed-habit','Neue Gewohnheit','最近、早く起きるようになりました。',
      'Welche Veränderung beschreibt die Person?',
      ['Sie steht neuerdings früher auf.','Sie möchte morgen früher aufstehen.','Sie weigert sich, früher aufzustehen.'],
      'Sie steht neuerdings früher auf.',
      'Wörterbuchform + ようになる kann eine neue Gewohnheit ausdrücken.'),
    open('transfer-alt','Ich habe inzwischen gelernt, Kanji zu lesen.',
      'Formuliere die neu erreichte Fähigkeit auf Japanisch.',
      '漢字が読めるようになりました。',
      'Potentialform 読める + ようになりました beschreibt die erreichte Fähigkeit.')
  ],
  'grammar-you-ni-suru': [
    choice('avoid','Bewusst vermeiden','甘い物を食べすぎないようにしています。',
      'Was bedeutet dieser Satz?',
      ['Ich achte darauf, nicht zu viele Süßigkeiten zu essen.','Ich esse seit gestern überhaupt nichts mehr.','Ich kann keine Süßigkeiten mehr essen.'],
      'Ich achte darauf, nicht zu viele Süßigkeiten zu essen.',
      'ない-Form + ようにしている beschreibt eine wiederholte bewusste Bemühung.'),
    open('transfer-alt','Ich versuche, jeden Tag früh aufzustehen.',
      'Formuliere die bewusste Routine mit ようにしています.',
      '毎日早く起きるようにしています。',
      'Die Person bemüht sich aktiv um diese Gewohnheit, nicht zwingend um eine schon erreichte Veränderung.')
  ],
  'particle-kara-made': [
    choice('morning','Beginn einer Lernzeit','八時＿＿十時まで図書館で勉強します。',
      'Ich lerne von acht bis zehn Uhr in der Bibliothek. Was markiert den Beginn?',
      ['から','まで','へ','を'],'から',
      '八時から十時まで ist der Zeitraum von acht bis zehn Uhr.'),
    choice('closing','Ende einer Öffnungszeit','図書館は午後六時＿＿開いています。',
      'Die Bibliothek ist bis 18 Uhr geöffnet. Welche Partikel markiert den Endpunkt?',
      ['まで','から','に','を'],'まで',
      '午後六時まで bedeutet bis 18 Uhr; 開いています beschreibt hier den andauernden Zustand.'),
    open('transfer-alt','Ich arbeite von neun bis sechs Uhr.',
      'Drücke Beginn und Ende der Arbeitszeit auf Japanisch aus.',
      '九時から六時まで働きます。',
      'から und まで markieren den zeitlichen Rahmen der Handlung.')
  ],
  'particle-dake-shika': [
    choice('coffee','Mit verneinter Verbform','コーヒー＿＿飲みませんでした。',
      'Ich habe nichts außer Kaffee getrunken. Wähle die Partikel, die mit der negativen Form funktioniert.',
      ['しか','だけ','まで','から'],'しか',
      'コーヒーしか飲みませんでした ist die しか〜ない-Konstruktion.'),
    choice('bread','Neutral begrenzen','パン＿＿買いました。',
      'Ich habe nur Brot gekauft. Wähle die neutrale Begrenzung vor einer bejahten Verbform.',
      ['だけ','しか','から','まで'],'だけ',
      'パンだけ買いました benutzt だけ mit der bejahten Form 買いました.'),
    open('transfer-alt','Heute habe ich nur Tee getrunken.',
      'Schreibe einen Satz mit だけ und bejahter Verbform.',
      '今日はお茶だけ飲みました。',
      'だけ beschränkt die Auswahl auf Tee, ohne eine Negation zu verlangen.')
  ]
});
