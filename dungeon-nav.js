/* Kotoba Quest – additive entries for Daily and Little Dungeon.
 * Navigation only: no reads, writes, migrations or SRS changes. */
(() => {
  'use strict';
  const existing = [
    { id: 'kotobaDailyNavigation', file: 'daily.html', text: '✿ Kotoba Daily', label: 'Kotoba Daily: kurze Japanisch-Lernquests' },
    { id: 'kotobaDungeonNavigation', file: 'dungeon.html', text: '⚔ Little Dungeon', label: 'Little Dungeon spielen' }
  ];
  const cssId = 'kotobaAdditiveNavigationStyles';
  if (!document.getElementById(cssId)) {
    const css = document.createElement('style');
    css.id = cssId;
    css.textContent = `
      #kotobaDailyNavigation,#kotobaDungeonNavigation{display:inline-flex;gap:.45em;align-items:center;border:1px solid #d1b8e9;background:linear-gradient(115deg,#583e7f,#83508b);color:#fff;border-radius:13px;font-weight:800;padding:10px 15px;cursor:pointer;text-decoration:none;box-shadow:0 6px 18px #54387222}
      #kotobaDailyNavigation{background:linear-gradient(115deg,#7654cd,#d888b9);border-color:#e0b4dd}
      #kotobaDailyNavigation:hover,#kotobaDungeonNavigation:hover,#kotobaDailyNavigation:focus-visible,#kotobaDungeonNavigation:focus-visible{filter:brightness(1.09);transform:translateY(-1px);outline:2px solid #be86c5;outline-offset:2px}
      #kotobaDungeonNavigation.kd-floating,#kotobaDailyNavigation.kd-floating{position:fixed;right:16px;z-index:1100;border:2px solid #fff7fb;box-shadow:0 7px 30px #37234165}
      #kotobaDailyNavigation.kd-floating{bottom:calc(18px + env(safe-area-inset-bottom,0px))}
      #kotobaDungeonNavigation.kd-floating{bottom:calc(76px + env(safe-area-inset-bottom,0px))}
      @media(max-width:500px){#kotobaDailyNavigation,#kotobaDungeonNavigation{font-size:.82rem;padding:9px 11px}}
    `;
    document.head.appendChild(css);
  }
  const nav = document.querySelector('nav.nav[aria-label="Hauptnavigation"], header nav.nav, header .nav');
  const welcome = document.querySelector('.hero .welcome, .dashboard .hero, main .hero');
  for (const entry of existing) {
    if (document.getElementById(entry.id) || document.querySelector(`a[href*="${entry.file}"]`)) continue;
    const a = document.createElement('a');
    a.id = entry.id;
    a.href = new URL('./' + entry.file, document.baseURI).href;
    a.textContent = entry.text;
    a.setAttribute('aria-label', entry.label);
    if (nav) nav.appendChild(a);
    else if (welcome) welcome.appendChild(a);
    else { a.classList.add('kd-floating'); document.body.appendChild(a); }
  }
})();
