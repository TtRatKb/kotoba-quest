(() => {
  "use strict";

  const VERSION = "0.31.4af2";
  const ASSETS = {
    skills: { js: "skills.js", css: "skills.css", version: "0.31.4ac", global: "LifeRPGSkills" },
    journalRewards: { js: "journal-rewards.js", version: "0.31.4ab", global: "LifeRPGJournalRewards" },
    weeklyReview: { js: "weekly-review.js", css: "weekly-review.css", version: "0.31.4ac", global: "LifeRPGWeeklyReview" },
    knowledgeTree: { js: "knowledge-tree.js", css: "knowledge-tree.css", version: "0.31.4ad", global: "LifeRPGKnowledgeTree" },
    healthTree: { js: "health-tree.js", css: "health-tree.css", version: "0.31.4ae", global: "LifeRPGHealthTree" },
    workTree: { js: "work-tree.js", css: "work-tree.css", version: "0.31.4af", global: "LifeRPGWorkTree" },
    skillsUi: { js: "skills-ui.js", css: "skills-ui.css", version: "0.31.4af2", global: "LifeRPGSkillsUI" }
  };

  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  if (standalone) document.body.classList.add("is-standalone-v251");

  function assetUrl(path, version) {
    return new URL(`./${path}?v=${encodeURIComponent(`${VERSION}-${version}`)}`, document.baseURI).href;
  }

  function ensureStyle(key, spec) {
    if (!spec.css) return;
    const marker = `lifeRpg${key[0].toUpperCase()}${key.slice(1)}`;
    let link = document.querySelector(`link[data-${marker.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset[marker] = VERSION;
      document.head.appendChild(link);
    }
    link.href = assetUrl(spec.css, spec.version);
  }

  function removeStaleScript(key) {
    const selector = `script[data-life-rpg-${key.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}]`;
    const script = document.querySelector(selector);
    if (script && !window[ASSETS[key].global]) script.remove();
  }

  function loadScript(key, spec) {
    if (window[spec.global]) return Promise.resolve(true);

    removeStaleScript(key);

    return new Promise((resolve, reject) => {
      const selector = `script[data-life-rpg-${key.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}]`;
      const existing = document.querySelector(selector);
      if (existing) {
        existing.addEventListener("load", () => resolve(Boolean(window[spec.global])), { once: true });
        existing.addEventListener("error", () => reject(new Error(`${spec.js} failed to load`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = assetUrl(spec.js, spec.version);
      script.async = false;
      script.dataset[`lifeRpg${key[0].toUpperCase()}${key.slice(1)}`] = VERSION;
      script.onload = () => {
        if (!window[spec.global]) {
          reject(new Error(`${spec.js} loaded but did not initialize ${spec.global}`));
          return;
        }
        resolve(true);
      };
      script.onerror = () => reject(new Error(`${spec.js} failed to load`));
      document.head.appendChild(script);
    });
  }

  function ensurePrimarySkillsNav() {
    if (!window.LifeRPGSkills?.open) return;

    const nav = document.querySelector(".bottom-nav");
    if (nav && !nav.querySelector('.nav-button[data-view="skills"]')) {
      const button = document.createElement("button");
      button.className = "nav-button";
      button.type = "button";
      button.dataset.view = "skills";
      button.dataset.skillsOpen = "true";
      button.innerHTML = "<span>✦</span><small>Skills</small>";

      const growth = nav.querySelector('.nav-button[data-view="growth"]');
      if (growth) nav.insertBefore(button, growth);
      else nav.appendChild(button);
    }

    const strip = document.querySelector(".dashboard-command-strip");
    if (strip && !strip.querySelector("[data-skills-open]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.skillsOpen = "true";
      button.innerHTML = '<span class="command-strip-icon">✦</span><span><strong>Skills</strong><small>Levels, Realm Points and Talent Trees.</small></span><b>›</b>';
      const activity = strip.querySelector('[data-view-target="activity"]');
      if (activity?.nextSibling) strip.insertBefore(button, activity.nextSibling);
      else strip.appendChild(button);
    }
  }

  function showLoaderProblem(error) {
    console.error("Life RPG progression loader:", error);
    const strip = document.querySelector(".dashboard-command-strip");
    if (!strip || strip.querySelector("[data-progression-loader-retry]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.progressionLoaderRetry = "true";
    button.innerHTML = '<span class="command-strip-icon">⚠</span><span><strong>Skills need a reload</strong><small>Tap to retry loading the progression modules.</small></span><b>↻</b>';
    button.addEventListener("click", () => {
      button.remove();
      startProgressionLoader();
    }, { once: true });
    strip.appendChild(button);
  }

  async function startProgressionLoader() {
    try {
      Object.entries(ASSETS).forEach(([key, spec]) => ensureStyle(key, spec));

      // Load strictly in dependency order. The previous loader inserted all scripts
      // dynamically at once; this version waits for each dependency to initialize.
      await loadScript("skills", ASSETS.skills);
      ensurePrimarySkillsNav();

      await loadScript("journalRewards", ASSETS.journalRewards);
      await loadScript("weeklyReview", ASSETS.weeklyReview);
      await loadScript("knowledgeTree", ASSETS.knowledgeTree);
      await loadScript("healthTree", ASSETS.healthTree);
      await loadScript("workTree", ASSETS.workTree);
      await loadScript("skillsUi", ASSETS.skillsUi);

      ensurePrimarySkillsNav();
      window.LifeRPGSkills?.rebuild?.();
    } catch (error) {
      showLoaderProblem(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startProgressionLoader, { once: true });
  } else {
    startProgressionLoader();
  }

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, { scope: "./", updateViaCache: "none" })
      .then(registration => registration.update?.())
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
