(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.showView || !skills) return;

  const VERSION = "0.31.4af2";
  const REALMS = [
    { id: "Knowledge", icon: "📚", treeId: "knowledgeTalentTree", built: true },
    { id: "Health", icon: "🌱", treeId: "healthTalentTree", built: true },
    { id: "Work", icon: "📎", treeId: "workTalentTree", built: true },
    { id: "Recovery", icon: "🌿", treeId: "recoveryTalentTree", built: false },
    { id: "Japanese", icon: "🌸", treeId: "japaneseTalentTree", built: false },
    { id: "Home", icon: "🏠", treeId: "homeTalentTree", built: false },
    { id: "Hobbies", icon: "🎨", treeId: "hobbiesTalentTree", built: false }
  ];
  const TAB_KEY = "life-rpg-skills-tree-tab-v1";
  let activeRealm = readTab();
  let syncing = false;
  let observer = null;

  init();

  function init() {
    hardenRouting();
    buildSkillsLayout();
    syncTalentTrees();
    compactHabitMapping();
    compactRecentHistory();
    syncRouteFromDom();
    bind();
    observeLateTreeMounts();
    window.LifeRPGSkillsUI = {
      version: VERSION,
      open: openSkills,
      selectRealm: selectRealm,
      refresh: refresh
    };
  }

  function hardenRouting() {
    if (app.__skillsRouteWrappedV314af2) return;
    const original = app.showView.bind(app);
    app.showView = viewName => {
      setSkillsRoute(viewName === "skills");
      const result = original(viewName);
      if (viewName === "skills") ensureOnlySkillsActive();
      return result;
    };
    app.__skillsRouteWrappedV314af2 = true;
  }

  function bind() {
    document.addEventListener("click", event => {
      const treeTab = event.target.closest?.("[data-skill-tree-realm]");
      if (treeTab) {
        event.preventDefault();
        selectRealm(treeTab.dataset.skillTreeRealm);
        return;
      }

      const skillsTrigger = event.target.closest?.("[data-skills-open], .nav-button[data-view='skills']");
      if (skillsTrigger) {
        window.setTimeout(openSkills, 0);
        return;
      }

      const otherView = event.target.closest?.("[data-view], [data-view-target]");
      if (otherView) {
        const target = otherView.dataset.view || otherView.dataset.viewTarget;
        if (target && target !== "skills") setSkillsRoute(false);
      }
    }, true);

    window.addEventListener("life-rpg:render", () => window.setTimeout(refresh, 0));
    window.addEventListener("life-rpg:state-saved", () => window.setTimeout(refresh, 0));
  }

  function observeLateTreeMounts() {
    const view = document.getElementById("view-skills");
    if (!view || observer) return;
    observer = new MutationObserver(() => {
      if (syncing) return;
      window.setTimeout(() => {
        syncTalentTrees();
        compactHabitMapping();
        compactRecentHistory();
      }, 0);
    });
    observer.observe(view, { childList: true, subtree: false });
  }

  function refresh() {
    buildSkillsLayout();
    syncTalentTrees();
    compactHabitMapping();
    compactRecentHistory();
    updateRealmSummaryHeader();
  }

  function openSkills() {
    app.showView("skills");
    ensureOnlySkillsActive();
    refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setSkillsRoute(active) {
    document.body.classList.toggle("life-rpg-skills-route-v314af2", Boolean(active));
  }

  function syncRouteFromDom() {
    setSkillsRoute(document.getElementById("view-skills")?.classList.contains("active"));
  }

  function ensureOnlySkillsActive() {
    document.querySelectorAll("main > .view").forEach(view => {
      view.classList.toggle("active", view.id === "view-skills");
    });
    document.querySelectorAll(".nav-button").forEach(button => {
      button.classList.toggle("active", button.dataset.view === "skills");
    });
    setSkillsRoute(true);
  }

  function buildSkillsLayout() {
    const view = document.getElementById("view-skills");
    const realmGrid = document.getElementById("skillsRealmGrid");
    if (!view || !realmGrid) return;

    if (!document.getElementById("skillsTalentHub")) {
      const hub = document.createElement("section");
      hub.id = "skillsTalentHub";
      hub.className = "skills-talent-hub-v314af2";
      hub.innerHTML = `
        <div class="skills-section-heading-v314af2">
          <div><p class="eyebrow">REALM TALENTS</p><h2>Talent Trees</h2><p>Spend each Realm's points on the upgrades you want next. Only one tree is open at a time.</p></div>
          <div class="skills-tree-active-bank-v314af2" id="skillsTreeActiveBank"></div>
        </div>
        <nav class="skills-tree-tabs-v314af2" id="skillsTreeTabs" aria-label="Choose Talent Tree"></nav>
        <div class="skills-tree-stage-v314af2" id="skillsTreeStage"></div>`;
      realmGrid.insertAdjacentElement("beforebegin", hub);
    }

    if (!document.getElementById("skillsRealmHeading")) {
      const heading = document.createElement("div");
      heading.id = "skillsRealmHeading";
      heading.className = "skills-section-heading-v314af2 skills-realm-heading-v314af2";
      heading.innerHTML = `<div><p class="eyebrow">YOUR SKILLS</p><h2>Skills by Realm</h2><p>All skills stay visible here. Talent Trees above are choices; these levels are the practice Life RPG actually observed.</p></div><span id="skillsRealmHeadingMeta"></span>`;
      realmGrid.insertAdjacentElement("beforebegin", heading);
    }
  }

  function syncTalentTrees() {
    const stage = document.getElementById("skillsTreeStage");
    const tabs = document.getElementById("skillsTreeTabs");
    if (!stage || !tabs) return;
    syncing = true;
    try {
      REALMS.forEach(realm => {
        const tree = document.getElementById(realm.treeId);
        if (tree && tree.parentElement !== stage) stage.appendChild(tree);
      });

      tabs.innerHTML = REALMS.map(realm => {
        const points = skills.getRealmPoints?.(realm.id) || { available: 0 };
        const exists = Boolean(document.getElementById(realm.treeId));
        const current = activeRealm === realm.id;
        return `<button type="button" class="skills-tree-tab-v314af2 ${current ? "active" : ""}" data-skill-tree-realm="${escapeAttr(realm.id)}" aria-pressed="${current ? "true" : "false"}"><span>${realm.icon}</span><strong>${escapeHtml(realm.id)}</strong><small>${exists ? `${Number(points.available || 0)} pt${Number(points.available || 0) === 1 ? "" : "s"}` : "later"}</small></button>`;
      }).join("");

      renderSelectedTree();
    } finally {
      syncing = false;
    }
  }

  function renderSelectedTree() {
    const stage = document.getElementById("skillsTreeStage");
    if (!stage) return;
    const selected = REALMS.find(realm => realm.id === activeRealm) || REALMS[0];
    const selectedTree = document.getElementById(selected.treeId);

    REALMS.forEach(realm => {
      const tree = document.getElementById(realm.treeId);
      if (!tree) return;
      const active = realm.id === selected.id;
      tree.classList.toggle("skills-tree-panel-active-v314af2", active);
      tree.classList.toggle("skills-tree-panel-hidden-v314af2", !active);
      tree.hidden = !active;
    });

    let empty = document.getElementById("skillsTreeComingSoon");
    if (!selectedTree) {
      if (!empty) {
        empty = document.createElement("article");
        empty.id = "skillsTreeComingSoon";
        empty.className = "skills-tree-coming-v314af2";
        stage.appendChild(empty);
      }
      const skillCount = (skills.registry || []).filter(item => item.realm === selected.id).length;
      empty.hidden = false;
      empty.innerHTML = `<span>${selected.icon}</span><div><small>${escapeHtml(selected.id.toUpperCase())} · TALENT TREE</small><h3>Not built yet.</h3><p>Your ${skillCount} ${skillCount === 1 ? "skill is" : "skills are"} already tracking normally. This tab is reserved for the Realm's future Talent Tree, so the Skills page will not need another redesign later.</p></div>`;
    } else if (empty) {
      empty.hidden = true;
    }

    document.querySelectorAll("[data-skill-tree-realm]").forEach(button => {
      const active = button.dataset.skillTreeRealm === selected.id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const bank = document.getElementById("skillsTreeActiveBank");
    if (bank) {
      const points = skills.getRealmPoints?.(selected.id) || { available: 0, earned: 0, spent: 0 };
      bank.innerHTML = `<small>${selected.icon} ${escapeHtml(selected.id)} Points</small><strong>${Number(points.available || 0)} available</strong><span>${Number(points.spent || 0)} spent · ${Number(points.earned || 0)} earned</span>`;
    }
  }

  function selectRealm(realmId) {
    if (!REALMS.some(realm => realm.id === realmId)) return;
    activeRealm = realmId;
    try { localStorage.setItem(TAB_KEY, realmId); } catch {}
    renderSelectedTree();
    document.getElementById("skillsTalentHub")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function readTab() {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (REALMS.some(realm => realm.id === saved)) return saved;
    } catch {}
    return "Knowledge";
  }

  function compactHabitMapping() {
    const host = document.getElementById("skillsHabitMapping");
    if (!host) return;
    const complete = Boolean(host.querySelector(".skills-map-complete-v314aa"));
    host.classList.toggle("skills-habit-mapping-finished-v314af2", complete);
  }

  function compactRecentHistory() {
    const list = document.getElementById("skillsRecentPractice");
    const panel = list?.closest?.(".skills-history-panel-v314aa");
    if (!list || !panel) return;

    let details = document.getElementById("skillsRecentDetails");
    if (!details) {
      details = document.createElement("details");
      details.id = "skillsRecentDetails";
      details.className = "skills-recent-details-v314af2";
      const summary = document.createElement("summary");
      summary.innerHTML = `<span>≡</span><div><small>PRACTICE HISTORY</small><strong>Recent Skill XP</strong><em id="skillsHistorySummaryMeta">Open history</em></div><b>›</b>`;
      const body = document.createElement("div");
      body.className = "skills-recent-details-body-v314af2";
      body.appendChild(list);
      details.append(summary, body);
      panel.replaceChildren(details);
    }

    const events = app.getState()?.skills?.events || [];
    const meta = document.getElementById("skillsHistorySummaryMeta");
    if (meta) {
      if (!events.length) meta.textContent = "No practice derived yet";
      else {
        const latest = [...events].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))[0];
        const skill = skills.getSkill?.(latest?.skillId);
        meta.textContent = `${events.length} events · latest: ${skill?.label || "Skill practice"} +${formatXp(latest?.xp || 0)}`;
      }
    }
  }

  function updateRealmSummaryHeader() {
    const meta = document.getElementById("skillsRealmHeadingMeta");
    if (!meta) return;
    const registry = skills.registry || [];
    const discovered = registry.filter(item => skills.getLevelInfo?.(item.id)?.discovered).length;
    meta.textContent = `${discovered} / ${registry.length} discovered`;
  }

  function formatXp(value) {
    const n = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  }

  function escapeHtml(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
})();
