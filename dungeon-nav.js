/* Kotoba Quest Little Dungeon — safe, additive entry for current cloud/index shell. */
(() => {
  'use strict';
  const href=new URL('./dungeon.html',document.baseURI).href;
  if(document.getElementById('kotobaDungeonNavigation'))return;
  const css=document.createElement('style');css.textContent=`
  #kotobaDungeonNavigation{display:inline-flex;gap:.45em;align-items:center;border:1px solid #d1b8e9;background:linear-gradient(115deg,#583e7f,#83508b);color:#fff;border-radius:13px;font-weight:800;padding:10px 15px;cursor:pointer;text-decoration:none;box-shadow:0 6px 18px #54387222}
  #kotobaDungeonNavigation:hover,#kotobaDungeonNavigation:focus-visible{filter:brightness(1.09);transform:translateY(-1px);outline:2px solid #be86c5;outline-offset:2px}
  #kotobaDungeonNavigation.kd-floating{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:1100;border:2px solid #fff7fb;box-shadow:0 7px 30px #37234165}
  `;document.head.appendChild(css);
  const a=document.createElement('a');a.id='kotobaDungeonNavigation';a.href=href;a.textContent='⚔ Little Dungeon';a.setAttribute('aria-label','Little Dungeon spielen');
  const nav=document.querySelector('nav.nav[aria-label="Hauptnavigation"], header nav.nav, header .nav');
  if(nav){nav.appendChild(a);return;}
  const welcome=document.querySelector('.hero .welcome, .dashboard .hero, main .hero');
  if(welcome){welcome.appendChild(a);return;}
  a.classList.add('kd-floating');document.body.appendChild(a);
})();
