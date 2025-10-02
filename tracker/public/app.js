(() => {
  "use strict";

  const STORAGE_KEYS = {
    sessions: "nba-tracker-sessions-v2",
    lastSession: "nba-tracker-last-session-v2",
    settings: "nba-tracker-settings-v1"
  };

  const state = {
    sheets: { characters: [], monsters: [] },
    session: null,
    effectTemplates: [],
    _effectEditingFor: null,
    // Which entry (instanceId) the skill overlay is currently showing
    skillContextEntryId: null,
    settings: {
      lightTheme: false,
      compactCards: false,
      keepSingleRoll: false
    },
    toastTimer: null
  };

  const dom = {};

  function query(id) {
    return document.getElementById(id);
  }

  function init() {
    cacheDom();
    bindGlobalEvents();
    loadSettings();
    applySettings();
    fetchSheets();
    fetchEffectTemplates();
    restoreLastSession();
    handleActionParam();
    initDiceUI();
    fetchSkills();
  }

  async function fetchEffectTemplates() {
    try {
      const res = await fetch('effects.json');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) state.effectTemplates = data;
    } catch (_) { /* ignore */ }
  }

  function cacheDom() {
    Object.assign(dom, {
      menuPlaceholder: query("menu-placeholder"),
      sessionView: query("session-view"),
      sessionNameDisplay: query("session-name-display"),
      sessionBreadcrumb: query("session-breadcrumb"),
      turnNumber: query("turn-number"),
      pendingSortIndicator: query("pending-sort-indicator"),
      allyContainer: query("ally-card-container"),
      enemyContainer: query("enemy-card-container"),
      allyCount: query("ally-count"),
      enemyCount: query("enemy-count"),
      turnOrderBar: query("turn-order-bar"),
      endTurnBtn: query("end-turn-btn"),
      loadSheetBtn: query("load-sheet-btn"),
      openMenuBtn: query("open-menu-btn"),
      menuOverlay: query("menu-overlay"),
      createModal: query("create-session-modal"),
      createForm: query("create-session-form"),
      createNameInput: query("create-session-name"),
      loadModal: query("load-session-modal"),
      savedSessionList: query("saved-session-list"),
      importInput: query("import-session-input"),
      settingsModal: query("settings-modal"),
      sheetPickerModal: query("sheet-picker-modal"),
      sheetSearchInput: query("sheet-search-input"),
      characterSheetList: query("character-sheet-list"),
      monsterSheetList: query("monster-sheet-list"),
      sheetDetailModal: query("sheet-detail-modal"),
      sheetDetailContent: query("sheet-detail-content"),
      toast: query("toast"),
      themeToggle: query("theme-toggle"),
      compactToggle: query("compact-toggle")
    });
    // Inject skill overlay if missing
    if (!document.getElementById('skill-overlay')) {
      const div = document.createElement('div');
      div.id = 'skill-overlay';
      div.className = 'overlay hidden';
      div.innerHTML = `<div class="overlay-card large"><div class="overlay-header"><h2>Skills</h2><button class="icon-btn" data-close-overlay>&times;</button></div><div class="overlay-body" id="skill-body"><div class="skill-toolbar"><input type="search" id="skill-search" placeholder="Search skills"/><span id="skill-count" class="count-chip">0</span><button type="button" class="ghost" id="open-skill-refresh" title="Refresh skills">↻</button></div><div id="skill-list" class="skill-list"></div></div></div>`;
      document.body.appendChild(div);
      dom.skillOverlay = div;
    } else {
      dom.skillOverlay = document.getElementById('skill-overlay');
    }
  }

  async function fetchSkills() {
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) return;
      const data = await res.json();
      state.skills = Array.isArray(data.skills) ? data.skills : [];
      // Restore search term
      const saved = localStorage.getItem('nba-skill-search');
      if (saved && document.getElementById('skill-search')) {
        document.getElementById('skill-search').value = saved;
      }
      // After skills load, auto-apply passive skills defined on entries (from sheet parsing)
      if (state.session) {
        const entries = getAllParticipants();
        entries.forEach(entry => applyParsedPassives(entry));
        persistSession();
        updateActiveView();
      }
    } catch (_) { /* ignore */ }
  }

  function openSkills(instanceId) {
    if (instanceId) state.skillContextEntryId = instanceId;
    if (dom.skillOverlay) { renderSkills(); openOverlay(dom.skillOverlay); }
  }

  function renderSkills() {
    const list = document.getElementById('skill-list'); if (!list) return;
    const searchInput = document.getElementById('skill-search');
    const queryVal = (searchInput?.value||'').toLowerCase();
    if (searchInput) state.lastSkillSearch = searchInput.value;
  if (state.lastSkillSearch != null) localStorage.setItem('nba-skill-search', state.lastSkillSearch);
    list.innerHTML='';
    const entry = state.skillContextEntryId ? findEntry(state.skillContextEntryId) : null;
    const skills = (state.skills||[]).filter(s => !queryVal || s.name.toLowerCase().includes(queryVal) || (s.typeTags||[]).some(t=>t.toLowerCase().includes(queryVal)));
    const count = document.getElementById('skill-count'); if (count) count.textContent = skills.length;
    skills.forEach(skill => {
      const card = document.createElement('div'); card.className='skill-card';
      const isPassive = skill.passive;
      const isActive = skill.active;
      const acquired = entry ? (entry.acquiredSkills||[]).includes(skill.name) : false;
      const unmet = entry ? (skill.prerequisites||[]).some(pr => !(entry.acquiredSkills||[]).includes(pr)) : true;
      if (unmet) card.classList.add('disabled');
      if (acquired) card.classList.add('owned');
      const badge = isPassive?'<span class="skill-badge passive" title="Passive">P</span>':(isActive?'<span class="skill-badge active" title="Active">A</span>':'');
      card.innerHTML = `<div class="skill-head">${badge}<strong>${escapeHtml(skill.name)}</strong><span class="skill-tags">${(skill.typeTags||[]).map(t=>`<em>#${escapeHtml(t)}</em>`).join(' ')}</span></div>`+
        `<div class="skill-meta">${skill.tier!==null?`Tier ${skill.tier}`:''} ${skill.rarity?`<span class='rarity ${skill.rarity.toLowerCase()}'>${skill.rarity}</span>`:''}`+
        `${skill.prerequisites && skill.prerequisites.length?`<span class='prereq'>Req: ${skill.prerequisites.map(p=>escapeHtml(p)).join(', ')}</span>`:''}`+
        `${acquired?`<span class='owned-flag'>Owned</span>`:''}</div>`+
        `<div class="skill-eff">${(skill.effectDetails||[]).map(e=>`<div class='eff-line'>${escapeHtml(e)}</div>`).join('')}</div>`+
        `${skill.rollHints && skill.rollHints.length?`<div class='skill-rolls'>${skill.rollHints.map(r=>`<button class='ghost mini' data-skill-roll='${r}'>Roll ${r}</button>`).join(' ')}</div>`:''}`+
        `${entry && isPassive && !acquired && !unmet ? `<div class='skill-actions'><button class='secondary mini' data-apply-passive='${escapeHtml(skill.name)}'>Apply Passive</button></div>`:''}`+
        `${entry && isActive && !acquired && !unmet ? `<div class='skill-actions'><button class='primary mini' data-learn-active='${escapeHtml(skill.name)}'>Learn Active</button></div>`:''}`;
      list.appendChild(card);
    });
  }

  document.addEventListener('input', e => { if (e.target && e.target.id === 'skill-search') renderSkills(); });
  document.addEventListener('click', e => {
  if (e.target && e.target.matches('[data-open-skills]')) { const card = e.target.closest('.tracker-card'); openSkills(card?card.dataset.instanceId:undefined); }
    if (e.target && e.target.id === 'open-skill-refresh') { fetchSkills().then(renderSkills); }
    if (e.target && e.target.matches('[data-skill-roll]')) {
      const expr = e.target.getAttribute('data-skill-roll');
      openDiceRoller();
      const input = document.getElementById('dice-expression');
      if (input) { input.value = expr; input.focus(); }
    }
    if (e.target && e.target.matches('[data-apply-passive]')) {
      const skillName = e.target.getAttribute('data-apply-passive');
      const skill = (state.skills||[]).find(s => s.name === skillName);
      if (!skill || !state.session) return;
      const entry = state.skillContextEntryId ? findEntry(state.skillContextEntryId) : null;
      if (!entry) return;
      const conv = convertSkillToEffects(skill, { passive: true });
      // Even if no stat targets, still mark acquired
      entry.acquiredSkills = Array.from(new Set([...(entry.acquiredSkills||[]), skill.name]));
      conv.effects.forEach(eff => entry.effects.push(eff));
      persistSession();
      if (conv.effects.some(e => e.targets && e.targets.length && e.turns > 5000)) { state.session.pendingSort = true; recomputeTurnOrder(true); }
      updateActiveView();
      showToast(`Passive ${skill.name} acquired${conv.effects.length? ' and applied':''}.`);
      renderSkills();
    }
    if (e.target && e.target.matches('[data-learn-active]')) {
      const skillName = e.target.getAttribute('data-learn-active');
      const skill = (state.skills||[]).find(s => s.name === skillName);
      if (!skill || !state.session) return;
      const entry = state.skillContextEntryId ? findEntry(state.skillContextEntryId) : null;
      if (!entry) return;
      if (!entry.acquiredSkills.includes(skillName)) {
        entry.acquiredSkills.push(skillName);
        persistSession();
        showToast(`Active skill ${skillName} learned.`);
        renderSkills();
      }
    }
  });

  function bindGlobalEvents() {
    document.addEventListener("click", handleDocumentClick);
    dom.openMenuBtn.addEventListener("click", () => openOverlay(dom.menuOverlay));
    dom.createForm.addEventListener("submit", handleCreateSessionSubmit);
    dom.endTurnBtn.addEventListener("click", handleEndTurn);
    dom.loadSheetBtn.addEventListener("click", openSheetPicker);
    dom.sheetSearchInput.addEventListener("input", debounce(renderSheetLists, 150));
    dom.allyContainer.addEventListener("input", handleCardInput);
    dom.enemyContainer.addEventListener("input", handleCardInput);
    dom.allyContainer.addEventListener("click", handleCardClick);
    dom.enemyContainer.addEventListener("click", handleCardClick);
    dom.turnOrderBar.addEventListener("click", handleTurnOrderClick);
    dom.importInput.addEventListener("change", handleImportSession);
    dom.themeToggle.addEventListener("change", handleThemeToggle);
    dom.compactToggle.addEventListener("change", handleCompactToggle);
    document.addEventListener('change', handleGlobalChange);
    document.addEventListener('submit', handleGlobalSubmit);
  }

  function handleDocumentClick(event) {
    const action = event.target.getAttribute("data-menu-action");
    if (action) {
      handleMenuAction(action);
      return;
    }

    const bulk = event.target.getAttribute('data-bulk');
    if (bulk) {
      handleBulkAction(bulk);
      return;
    }

    if (event.target.matches("[data-close-overlay]")) {
      const overlay = event.target.closest(".overlay");
      if (overlay) closeOverlay(overlay);
    }

    if (event.target === dom.sheetPickerModal && !event.target.closest(".overlay-card")) {
      closeOverlay(dom.sheetPickerModal);
    }
  }

  function handleMenuAction(action) {
    switch (action) {
      case "create":
        closeAllOverlays();
        openOverlay(dom.createModal);
        dom.createNameInput.focus();
        break;
      case "load":
        populateSavedSessions();
        closeAllOverlays();
        openOverlay(dom.loadModal);
        break;
      case "settings":
        syncSettingsToggles();
        closeAllOverlays();
        openOverlay(dom.settingsModal);
        break;
      case "convert":
        triggerConversion();
        break;
      default:
        break;
    }
  }

  function closeAllOverlays() {
    document.querySelectorAll(".overlay").forEach(overlay => overlay.classList.add("hidden"));
  }

  function openOverlay(element) {
    element.classList.remove("hidden");
  }

  function closeOverlay(element) {
    element.classList.add("hidden");
  }

  async function fetchSheets() {
    try {
      const response = await fetch("/api/sheets");
      if (!response.ok) {
        throw new Error(`Failed to fetch sheets (${response.status})`);
      }
      const data = await response.json();
      state.sheets.characters = Array.isArray(data.characters) ? data.characters : [];
      state.sheets.monsters = Array.isArray(data.monsters) ? data.monsters : [];
    } catch (error) {
      console.error(error);
      showToast("Unable to load sheet library. Please verify the server can read the Characters and Monsters folders.");
    }
  }

  function handleCreateSessionSubmit(event) {
    event.preventDefault();
    const name = dom.createNameInput.value.trim();
    if (!name) {
      dom.createNameInput.reportValidity();
      return;
    }
    const sessions = getStoredSessions();
    if (sessions[name]) {
      const overwrite = window.confirm(`A session named "${name}" already exists. Overwrite it?`);
      if (!overwrite) return;
    }

    const session = hydrateSession(createEmptySession(name));
    state.session = session;
    persistSession();
    updateActiveView();
    closeOverlay(dom.createModal);
    showToast(`Session "${name}" created.`);
  }

  function createEmptySession(name) {
    const now = new Date().toISOString();
    return {
      name,
      createdAt: now,
      updatedAt: now,
      turn: 1,
      allies: [],
      enemies: [],
      turnOrder: [],
      pendingSort: false
    };
  }

  function updateActiveView() {
    const hasSession = Boolean(state.session);
    dom.menuPlaceholder.classList.toggle("hidden", hasSession);
    dom.sessionView.classList.toggle("hidden", !hasSession);
    dom.endTurnBtn.disabled = !hasSession;
    dom.loadSheetBtn.disabled = !hasSession;

    if (!hasSession) {
      dom.sessionBreadcrumb.textContent = "No session loaded";
      dom.turnOrderBar.innerHTML = "<p>No participants yet.</p>";
      dom.turnOrderBar.classList.add("empty");
      return;
    }

    dom.sessionBreadcrumb.textContent = `Session: ${state.session.name}`;
    dom.sessionNameDisplay.textContent = state.session.name;
    dom.turnNumber.textContent = String(state.session.turn);

    renderTrackers();
    renderTurnOrderBar();
    updateCounts();
    updatePendingSortIndicator();
  }

  function renderTrackers() {
    renderTrackerColumn(dom.allyContainer, state.session.allies);
    renderTrackerColumn(dom.enemyContainer, state.session.enemies);
  }

  function renderTrackerColumn(container, items) {
    container.innerHTML = "";
    if (!items.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "empty-card";
      placeholder.textContent = "No entries yet.";
      container.appendChild(placeholder);
      return;
    }

    items.forEach(item => {
      container.appendChild(buildTrackerCard(item));
    });
  }

  function buildTrackerCard(entry) {
    const card = document.createElement("article");
    card.className = `tracker-card ${entry.role}`;
    card.dataset.instanceId = entry.instanceId;

    const header = document.createElement("header");
    const title = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = entry.name;
    title.appendChild(name);

  // Per-card dice button
  const diceBtn = document.createElement('button');
  diceBtn.type = 'button';
  diceBtn.className = 'ghost';
  diceBtn.textContent = '🎲';
  diceBtn.title = 'Open dice roller with this card context';
  diceBtn.addEventListener('click', (e) => { e.stopPropagation(); openDiceRoller(entry.instanceId); });
  title.appendChild(diceBtn);
  // Skills button
  const skillBtn = document.createElement('button');
  skillBtn.type = 'button';
  skillBtn.className = 'ghost';
  skillBtn.textContent = '📘';
  skillBtn.title = 'Open skills';
  skillBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openSkills(entry.instanceId); });
  title.appendChild(skillBtn);

    const meta = document.createElement("span");
    const metaParts = [];
    if (entry.tier !== null && entry.tier !== undefined) metaParts.push(`Tier ${entry.tier}`);
    if (entry.race) metaParts.push(entry.race);
    meta.className = "type-tag";
    meta.textContent = metaParts.join(" � ") || entry.category;

    header.appendChild(title);
    header.appendChild(meta);

  // Removed inline Details toggle button; card body click will toggle collapse.

  const statGrid = document.createElement("div");
  statGrid.className = "stat-grid";

    const deltas = computeEffectDeltas(entry);
    statGrid.appendChild(buildStatInput(entry, "hp", withDeltaLabel("HP", deltas.HP)));
    statGrid.appendChild(buildStatInput(entry, "resource", entry.stats.resourceLabel || "MP"));
  // SPD input shows effective value; editing adjusts base so removal of effects reverts correctly
  (function(){
    const spdWrap = document.createElement('div');
    spdWrap.className = 'stat-group spd-group';
    const spdLabel = document.createElement('label');
    spdLabel.textContent = 'SPD';
    const spdInput = document.createElement('input');
    spdInput.type = 'number'; spdInput.step='1';
    spdInput.dataset.action = 'update-spd-effective';
    spdInput.dataset.field = 'spd';
    const effectiveSpd = applyDelta(entry.stats.spd, deltas.SPD);
    spdInput.value = formatNumber(effectiveSpd);
    if (deltas.SPD) spdInput.title = `Base ${entry.stats.spd} (Δ${deltas.SPD>0?'+':''}${deltas.SPD})`; else spdInput.title='No modifiers';
    if (deltas.SPD) {
      const tag = document.createElement('span');
      tag.className = 'eff-delta-tag';
      tag.textContent = `${deltas.SPD>0?'+':''}${deltas.SPD}`;
      spdWrap.appendChild(spdLabel); spdWrap.appendChild(spdInput); spdWrap.appendChild(tag);
    } else {
      spdWrap.appendChild(spdLabel); spdWrap.appendChild(spdInput);
    }
    statGrid.appendChild(spdWrap);
  })();
  const effectiveMv = formatNumber(applyDelta(entry.stats.mv, deltas.MV));
  statGrid.appendChild(buildStatDisplay(withDeltaLabel("MV", deltas.MV), effectiveMv));
    statGrid.appendChild(buildStatDisplay(withDeltaLabel("AC", deltas.AC), formatNumber(applyDelta(entry.stats.ac, deltas.AC))));
  // Effects section
  const effectsWrap = document.createElement("div");
  effectsWrap.className = "effects-wrap";
  const effectsHeader = document.createElement("div");
  effectsHeader.className = "effects-header";
  const effectsTitle = document.createElement("span");
  effectsTitle.textContent = "Effects";
  const addEffectBtn = document.createElement("button");
  addEffectBtn.type = "button";
  addEffectBtn.className = "ghost";
  addEffectBtn.dataset.action = "add-effect";
  addEffectBtn.textContent = "+";
  effectsHeader.appendChild(effectsTitle);
  effectsHeader.appendChild(addEffectBtn);
  const effectsList = document.createElement("div");
  effectsList.className = "effects-list";
  // Quick template buttons (first 3 templates)
  if (state.effectTemplates && state.effectTemplates.length) {
    const quick = document.createElement('div');
    quick.className = 'quick-effects';
    state.effectTemplates.slice(0,3).forEach(tpl => {
      const qb = document.createElement('button');
      qb.type = 'button'; qb.className='ghost'; qb.textContent=tpl.label; qb.title='Quick add effect';
      qb.addEventListener('click', () => {
        const inst = findEntry(entry.instanceId); if (!inst) return;
        inst.effects.push({ id: crypto.randomUUID?crypto.randomUUID():Math.random().toString(16).slice(2), label: tpl.label, targets: tpl.targets, turns: tpl.turns||1 });
        persistSession(); state.session.pendingSort = true; recomputeTurnOrder(true); updateActiveView();
      });
      quick.appendChild(qb);
    });
    effectsWrap.appendChild(quick);
  }
  entry.effects.forEach(effect => effectsList.appendChild(buildEffectBadge(effect)));
  effectsWrap.appendChild(effectsHeader);
  effectsWrap.appendChild(effectsList);

  // Collapsible extended info
  const collapse = document.createElement("div");
  collapse.className = "card-collapse hidden";
  collapse.dataset.section = "extra";
  collapse.appendChild(buildInfoSection(entry));

  const footer = document.createElement("div");
    footer.className = "card-footer";

    const toggle = document.createElement("label");
    toggle.className = "complete-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.action = "toggle-complete";
    checkbox.checked = Boolean(entry.hasActed);
    toggle.appendChild(checkbox);
    const toggleText = document.createElement("span");
    toggleText.textContent = "Turn done";
    toggle.appendChild(toggleText);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "ghost";
    viewBtn.dataset.action = "view-sheet";
    viewBtn.textContent = "Detail";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ghost";
    removeBtn.dataset.action = "remove-entry";
    removeBtn.textContent = "Remove";

    actions.appendChild(viewBtn);
    actions.appendChild(removeBtn);

    footer.appendChild(toggle);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(statGrid);
  card.appendChild(effectsWrap);
  // (Removed inline passive/active chip row for space; skills managed via overlay)
  card.appendChild(collapse);
  card.appendChild(footer);

    if (!entry.hasActed) {
      card.classList.remove("complete");
    } else {
      card.classList.add("complete");
    }

    return card;
  }

  // (Removed buildEntrySkillSections; kept focusSkillCard for overlay convenience.)

  function focusSkillCard(name) {
    try {
      const list = document.getElementById('skill-list');
      if (!list) return;
      const node = Array.from(list.querySelectorAll('.skill-card')).find(div => div.querySelector('.skill-head strong')?.textContent === name);
      if (node) { node.classList.add('pulse'); node.scrollIntoView({ block:'center' }); setTimeout(()=>node.classList.remove('pulse'), 1200); }
    } catch(_) { /* ignore */ }
  }

  function buildInfoSection(entry) {
    const wrap = document.createElement("div");
    wrap.className = "info-grid";
    const core = document.createElement("div");
    core.className = "info-block";
    const coreTitle = document.createElement("h4"); coreTitle.textContent = "Core Attributes"; core.appendChild(coreTitle);
    const coreList = document.createElement("div"); coreList.className = "info-stats";
    const coreDeltas = computeEffectDeltas(entry).core || {};
    Object.entries(entry.core || {}).forEach(([k,v]) => {
      const up = k.toUpperCase();
      const delta = coreDeltas[up] || 0;
      const effective = applyDelta(v, delta);
      const row = document.createElement('span');
      if (delta) {
        const sign = delta > 0 ? '+' : '';
        row.innerHTML = `${k}: <strong class="${delta>0?'delta-pos':'delta-neg'}">${effective}</strong> <small class="delta">(base ${v} ${sign}${delta})</small>`;
      } else {
        row.textContent = `${k}: ${v ?? '-'}`;
      }
      coreList.appendChild(row);
    });
    core.appendChild(coreList);
    const info = document.createElement("div"); info.className = "info-block";
    const infoTitle = document.createElement("h4"); infoTitle.textContent = "Character Info"; info.appendChild(infoTitle);
    const infoBody = document.createElement("div"); infoBody.className = "info-stats";
    infoBody.innerHTML = [
      entry.race ? `<span>Race: ${entry.race}</span>`: "",
      entry.tier != null ? `<span>Tier: ${entry.tier}</span>`: ""
    ].filter(Boolean).join("");
    info.appendChild(infoBody);
    // Effective stats block (includes effect deltas)
    const eff = document.createElement('div');
    eff.className = 'info-block';
    const effTitle = document.createElement('h4'); effTitle.textContent = 'Effective Stats'; eff.appendChild(effTitle);
    const effBody = document.createElement('div'); effBody.className = 'info-stats';
    const d = computeEffectDeltas(entry);
    const rows = [
      ['HP', entry.stats.hp, d.HP],
      [entry.stats.resourceLabel || 'MP', entry.stats.resource, d.MP],
      ['SPD', entry.stats.spd, d.SPD],
      ['MV', entry.stats.mv, d.MV],
      ['AC', entry.stats.ac, d.AC]
    ];
    effBody.innerHTML = rows.map(([label, base, delta]) => {
      const effective = applyDelta(base, delta);
      if (delta) {
        const sign = delta > 0 ? '+' : '';
        return `<span>${label}: ${effective} <small class="delta">(base ${base} ${sign}${delta})</small></span>`;
      }
      return `<span>${label}: ${effective}</span>`;
    }).join('');
    eff.appendChild(effBody);

    wrap.appendChild(core);
    wrap.appendChild(info);
    wrap.appendChild(eff);
    return wrap;
  }

  function buildEffectBadge(effect) {
    const badge = document.createElement('span');
    badge.className = 'effect-badge';
    badge.dataset.effectId = effect.id;
    badge.dataset.action = 'edit-effect';
    const text = document.createElement('span');
    let targetText = '';
    if (Array.isArray(effect.targets)) {
      targetText = effect.targets.map(t => `${t.stat}${t.delta>=0?'+':''}${t.delta}`).join(',');
    } else if (effect.stat) {
      targetText = `${effect.stat}${effect.delta>=0?'+':''}${effect.delta}`;
    }
    text.textContent = `${effect.label}${targetText ? ' ('+targetText+')' : ''}`;
    const turnsBtn = document.createElement('button');
    turnsBtn.type = 'button';
    turnsBtn.className = 'ghost';
    turnsBtn.dataset.action = 'edit-effect-turns';
    turnsBtn.dataset.effectId = effect.id;
    const isInfinite = Number.isFinite(effect.turns) && effect.turns > 5000;
    // Display ∞ for very large duration effects (used for passives) while retaining numeric value internally
    turnsBtn.textContent = isInfinite ? '∞' : `${effect.turns}t`;
    if (isInfinite) {
      turnsBtn.title = `${effect.turns} turns (treated as passive / infinite)`;
    }
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'ghost'; remove.dataset.action = 'remove-effect'; remove.dataset.effectId = effect.id; remove.textContent = 'x';
    badge.appendChild(text);
    badge.appendChild(turnsBtn);
    badge.appendChild(remove);
    return badge;
  }

  function buildStatInput(entry, field, label) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-group";
    const title = document.createElement("label");
    title.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.dataset.action = "update-stat";
    input.dataset.field = field;
    if (field === "hp") {
      input.value = Number.isFinite(entry.stats.hp) ? entry.stats.hp : 0;
    } else {
      input.value = Number.isFinite(entry.stats.resource) ? entry.stats.resource : 0;
    }
    wrapper.appendChild(title);
    wrapper.appendChild(input);
    return wrapper;
  }

  function buildEditableNumber(entry, field, label) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-group";
    const title = document.createElement("label");
    title.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.dataset.action = "update-dynamic";
    input.dataset.field = field;
    input.value = Number.isFinite(entry.stats[field]) ? entry.stats[field] : 0;
    wrapper.appendChild(title);
    wrapper.appendChild(input);
    return wrapper;
  }

  function buildStatDisplay(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-group";
    const title = document.createElement("label");
    title.textContent = label;
    const span = document.createElement("span");
    span.textContent = value;
    if (/Δ/.test(label)) span.classList.add("delta-applied");
    wrapper.appendChild(title);
    wrapper.appendChild(span);
    return wrapper;
  }

  function withDeltaLabel(base, delta) {
    if (!delta || delta === 0) return base;
    const sign = delta > 0 ? "+" : "";
    return `${base} (Δ${sign}${delta})`;
  }

  function applyDelta(value, delta) {
    if (!delta) return value;
    const base = Number(value) || 0;
    return base + delta;
  }

  function computeEffectDeltas(entry) {
    const result = { HP: 0, MP: 0, SPD: 0, MV: 0, AC: 0, core: {} };
    (entry.effects || []).forEach(effect => {
      if (Array.isArray(effect.targets)) {
        effect.targets.forEach(t => applyTarget(t));
      } else if (effect.stat) { // legacy structure
        applyTarget({ stat: effect.stat, delta: effect.delta });
      }
    });
    function applyTarget(t) {
      if (!t || !t.stat || !Number.isFinite(t.delta)) return;
      const key = t.stat.toUpperCase();
      switch (key) {
        case 'HP': result.HP += t.delta; break;
        case 'MP': case 'RESOURCE': result.MP += t.delta; break;
        case 'SPD': result.SPD += t.delta; break;
        case 'AC': result.AC += t.delta; break;
        default: result.core[key] = (result.core[key] || 0) + t.delta; break;
      }
    }
    if (result.SPD) {
      const newMv = computeMovement(applyDelta(entry.stats.spd, result.SPD));
      result.MV = Number(newMv.toFixed(2)) - entry.stats.mv;
    }
    Object.keys(result).forEach(k => { if (k !== 'core' && !result[k]) result[k] = 0; });
    return result;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  function handleCardInput(event) {
    const target = event.target;
  if (!target.matches("[data-action='update-stat'],[data-action='update-dynamic'],[data-action='update-spd-effective']")) return;
    const card = target.closest(".tracker-card");
    if (!card) return;
    const entry = findEntry(card.dataset.instanceId);
    if (!entry) return;

    const field = target.dataset.field;
    const value = Number(target.value);
    if (!Number.isFinite(value) || value < 0) {
      target.value = field === "hp" ? entry.stats.hp : entry.stats.resource;
      return;
    }

    if (target.dataset.action === 'update-stat') {
      if (field === "hp") {
        entry.stats.hp = value;
      } else {
        entry.stats.resource = value;
      }
      entry.updatedAt = new Date().toISOString();
      persistSession();
    } else if (target.dataset.action === 'update-dynamic') {
      if (field === 'spd') {
        entry.stats.spd = value;
        entry.stats.mv = computeMovement(value);
        // Flag pending sort; only recompute immediately on first turn for initial order clarity
        state.session.pendingSort = true;
        if (state.session.turn === 1) {
          recomputeTurnOrder(true);
        }
        updatePendingSortIndicator();
      }
      entry.updatedAt = new Date().toISOString();
      persistSession();
    } else if (target.dataset.action === 'update-spd-effective') {
      // Convert effective edit back into base by subtracting current delta
      const deltas = computeEffectDeltas(entry);
      const baseSpd = value - (deltas.SPD || 0);
      entry.stats.spd = baseSpd < 0 ? 0 : baseSpd;
      entry.stats.mv = computeMovement(entry.stats.spd);
      state.session.pendingSort = true;
      recomputeTurnOrder(true);
      updatePendingSortIndicator();
      entry.updatedAt = new Date().toISOString();
      persistSession();
    }
  }

  function handleCardClick(event) {
    const target = event.target;
    const card = target.closest(".tracker-card");
    if (!card) return;
    const entry = findEntry(card.dataset.instanceId);
    if (!entry) return;

    if (target.matches("[data-action='toggle-complete']")) {
      entry.hasActed = target.checked;
      card.classList.toggle("complete", entry.hasActed);
      persistSession();
      return;
    }

    if (target.matches("[data-action='view-sheet']")) {
      openSheetDetail(entry);
      return;
    }

    // Clicking on card unused areas toggles collapse (not on buttons or inputs)
    if (!target.closest('.card-actions') && !target.closest('.stat-group') && !target.closest('.complete-toggle') && target.closest('.tracker-card')) {
      if (!target.matches('[data-action]') && !target.closest('button')) {
        const collapse = card.querySelector('.card-collapse');
        if (collapse) collapse.classList.toggle('hidden');
      }
    }

    if (target.matches("[data-action='add-effect']")) { openEffectEditor(entry.instanceId); return; }

    if (target.matches("[data-action='remove-effect']")) {
      const id = target.dataset.effectId;
      entry.effects = entry.effects.filter(e => e.id !== id);
      persistSession();
      state.session.pendingSort = true;
      recomputeTurnOrder(true);
      updateActiveView();
      return;
    }

    if (target.closest('.effect-badge') && target.closest('.effect-badge').dataset.action === 'edit-effect' && !target.matches('[data-action="remove-effect"],[data-action="edit-effect-turns"]')) {
      openEffectEditor(entry.instanceId, target.closest('.effect-badge').dataset.effectId);
      return;
    }

    if (target.matches("[data-action='edit-effect-turns']")) {
      const effectId = target.dataset.effectId;
      const effect = entry.effects.find(e => e.id === effectId);
      if (!effect) return;
      const raw = window.prompt("New turns remaining", effect.turns);
      if (raw === null) return;
      const val = parseInt(raw, 10);
      if (Number.isFinite(val) && val > 0) {
        effect.turns = val;
        persistSession();
        state.session.pendingSort = true;
        recomputeTurnOrder(true);
        updateActiveView();
      }
      return;
    }

    if (target.matches("[data-action='remove-entry']")) {
      removeEntry(entry.instanceId);
      return;
    }

    // Removed automatic sheet detail opening on generic card click.
    return;
  }

  function handleTurnOrderClick(event) {
    const card = event.target.closest(".turn-order-card");
    if (!card) return;
    const entry = findEntry(card.dataset.instanceId);
    if (entry) {
      openSheetDetail(entry);
    }
  }

  function handleEndTurn() {
    if (!state.session) return;
    const participants = getAllParticipants();
    if (!participants.length) {
      showToast("Add allies or enemies before ending a turn.");
      return;
    }

    const pending = participants.filter(entity => !entity.hasActed);
    if (pending.length) {
      pending.forEach(entity => highlightEntry(entity.instanceId));
      showToast("All cards must be marked as done before ending the turn.");
      return;
    }

    state.session.turn += 1;
    participants.forEach(entity => {
      entity.hasActed = false;
      // Apply HP/MP deltas before decrementing effect durations
      const deltas = computeEffectDeltas(entity);
      if (deltas.HP) {
        entity.stats.hp = Math.max(0, entity.stats.hp + deltas.HP);
      }
      if (deltas.MP) {
        entity.stats.resource = Math.max(0, entity.stats.resource + deltas.MP);
      }
      entity.effects = entity.effects.filter(effect => {
        effect.turns -= 1;
        return effect.turns > 0;
      });
    });

    // Recompute at the end of each turn, applying any SPD changes made during the turn.
    recomputeTurnOrder(true);
    persistSession();
    updateActiveView();
    showToast(`Turn advanced to ${state.session.turn}.`);
  }

  function recomputeTurnOrder(force = false) {
    if (!state.session) return;
    if (!force && !state.session.pendingSort) return;

    const ordered = getAllParticipants().slice().sort((a, b) => {
      // Use effective SPD (including effect deltas) for ordering
      const da = computeEffectDeltas(a).SPD || 0;
      const db = computeEffectDeltas(b).SPD || 0;
      const effA = (a.stats.spd ?? 0) + da;
      const effB = (b.stats.spd ?? 0) + db;
      const spdDiff = effB - effA;
      if (spdDiff !== 0) return spdDiff;
      const dexDiff = (b.core?.DEX ?? 0) - (a.core?.DEX ?? 0);
      if (dexDiff !== 0) return dexDiff;
      return a.name.localeCompare(b.name);
    });

    state.session.turnOrder = ordered.map(entity => entity.instanceId);
    state.session.pendingSort = false;
  }

  function handleActionParam() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (!action) return;
      if (action === 'create') {
        openOverlay(dom.createModal);
        dom.createNameInput?.focus();
      } else if (action === 'load') {
        populateSavedSessions();
        openOverlay(dom.loadModal);
      }
    } catch (_) { /* ignore */ }
  }

  /* ================= Dice Roller ================= */
  function ensureSessionProf() {
    if (!state.session) return 0;
    if (typeof state.session.prof !== 'number') state.session.prof = 0;
    return state.session.prof;
  }

  function openDiceRoller(instanceId) {
    const modal = document.getElementById('dice-roller-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.dataset.contextInstance = instanceId || '';
    const expr = document.getElementById('dice-expression');
    if (expr) expr.focus();
    const profInput = document.getElementById('session-prof-input');
    if (profInput) { profInput.value = ensureSessionProf(); }
  }

  function closeDiceRoller() {
    const modal = document.getElementById('dice-roller-modal');
    if (modal) {
      modal.classList.add('hidden');
      delete modal.dataset.contextInstance;
    }
  }

  function parseDiceExpression(raw) {
    const expr = (raw || '').trim();
    if (!expr) return { parts: [], rolls: [], raw };
    const tokens = expr.match(/d?\d+d\d+|d\d+|kh1|kl1|[+-]|\b(?:STR|DEX|CON|INT|WIS|CHA|SPD|AC|HP|MP|PROF)(?:\|(STR|DEX|CON|INT|WIS|CHA))?\b|\d+/gi) || [];
    let keepHigh=false, keepLow=false;
    const parts=[]; let sign=1; const rolls=[];
    tokens.forEach(tok => {
      const lower = tok.toLowerCase();
      if (tok === '+') { sign=1; return; }
      if (tok === '-') { sign=-1; return; }
      if (lower === 'kh1') { keepHigh=true; keepLow=false; return; }
      if (lower === 'kl1') { keepLow=true; keepHigh=false; return; }
      if (/^\d+$/.test(tok)) { parts.push({type:'flat', value: sign*parseInt(tok,10)}); sign=1; return; }
      if (/^\d+d\d+$/i.test(tok) || /^d\d+$/i.test(tok)) {
        let count, faces; if (/^d\d+$/i.test(tok)) { count=1; faces=parseInt(tok.slice(1),10); } else { const [c,f]=tok.toLowerCase().split('d'); count=parseInt(c,10); faces=parseInt(f,10); }
        const these=[]; for(let i=0;i<count;i++){ these.push(1+Math.floor(Math.random()*faces)); }
        let used=these.slice(); if (keepHigh) used=[Math.max(...these)]; else if (keepLow) used=[Math.min(...these)];
        const subtotal=used.reduce((a,b)=>a+b,0)*sign; const detail={notation:tok, all:these, used, subtotal, sign};
        rolls.push(detail); parts.push({type:'roll', detail}); sign=1; return;
      }
      if (/^(?:STR|DEX|CON|INT|WIS|CHA|SPD|AC|HP|MP|PROF)(?:\|(STR|DEX|CON|INT|WIS|CHA))?$/i.test(tok)) {
        if (tok.includes('|')) {
          const [a,b] = tok.toUpperCase().split('|');
          parts.push({ type:'alt-stat', keys:[a,b], sign });
        } else {
          parts.push({ type:'stat', key:tok.toUpperCase(), sign });
        }
        sign=1; return;
      }
    });
    return { parts, rolls, raw: expr };
  }

  function resolveStatValue(key, entry) {
    if (key === 'PROF') return ensureSessionProf();
    if (!entry) return 0;
    switch (key) {
      case 'SPD': return (entry.stats?.spd||0) + (computeEffectDeltas(entry).SPD||0);
      case 'AC': return (entry.stats?.ac||0) + (computeEffectDeltas(entry).AC||0);
      case 'HP': return entry.stats?.hp||0;
      case 'MP': return entry.stats?.resource||0;
      default: return entry.core?.[key] || 0;
    }
  }

  function evaluateDiceParts(parts, entry) {
    let total=0; const segments=[]; const critFlags=[];
    parts.forEach(p => {
      if (p.type==='flat') { total+=p.value; segments.push(`${p.value>=0?'+':''}${p.value}`); }
      else if (p.type==='roll') {
        const d=p.detail; total+=d.subtotal; segments.push(`${d.sign<0?'-':''}${d.notation}[${d.all.join(',')}]${d.used.length!==d.all.length?`→${d.used.join(',')}`:''}=${d.subtotal}`);
        // Crit: any used die equals its max face (supports NdX; if keep high, evaluate used array)
        const facesMatch = /d(\d+)/i.exec(d.notation);
        if (facesMatch) {
          const maxFace = parseInt(facesMatch[1],10);
            if (d.used.some(v => v === maxFace)) critFlags.push(true);
        }
      }
      else if (p.type==='stat') { const v=resolveStatValue(p.key, entry)*p.sign; total+=v; segments.push(`${v>=0?'+':''}${p.key}(${v})`); }
      else if (p.type==='alt-stat') {
        const a = resolveStatValue(p.keys[0], entry); const b = resolveStatValue(p.keys[1], entry);
        const chosen = Math.max(a,b)*p.sign; total+=chosen; segments.push(`${chosen>=0?'+':''}${p.keys.join('|')}(${chosen})`);
      }
    });
    return { total, detail: segments.join(' '), crit: critFlags.some(Boolean) };
  }

  function addDiceHistoryLine(result) {
    const hist = document.getElementById('dice-history'); if (!hist) return;
    const div=document.createElement('div'); div.className='dice-line';
    if (result.crit) div.classList.add('crit');
    const time=new Date().toLocaleTimeString();
    div.innerHTML = `<span class="dice-time">${time}</span> <span class="dice-total">${result.total}</span> <span class="dice-detail">${escapeHtml(result.detail)}${result.crit?'<span class="crit-flag"> CRIT!</span>':''}</span>`;
    hist.prepend(div);
  }

  function escapeHtml(str){ return String(str).replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }

  function initDiceUI() {
    const openBtn = document.getElementById('open-dice-btn'); if (openBtn) openBtn.addEventListener('click', ()=>openDiceRoller());
    const modal = document.getElementById('dice-roller-modal'); if (!modal) return;
    modal.querySelectorAll('[data-close-overlay]').forEach(btn=>btn.addEventListener('click', closeDiceRoller));
    modal.addEventListener('click', e => { if (e.target === modal) closeDiceRoller(); });
    const form=document.getElementById('dice-form');
    const reroll=document.getElementById('dice-reroll-btn');
    const clearBtn=document.getElementById('dice-clear-btn');
    const expr=document.getElementById('dice-expression');
    const prof=document.getElementById('session-prof-input');
    if (prof) prof.addEventListener('change', ()=>{ if (!state.session) return; state.session.prof=parseInt(prof.value,10)||0; persistSession(); });
    if (form) form.addEventListener('submit', e => { e.preventDefault(); const ctxId=modal.dataset.contextInstance; const entry=ctxId?findEntry(ctxId):null; const parsed=parseDiceExpression(expr.value); const evald=evaluateDiceParts(parsed.parts, entry); if (state.settings.keepSingleRoll) { const hist=document.getElementById('dice-history'); if (hist) hist.innerHTML=''; } addDiceHistoryLine(evald); reroll.disabled=false; reroll.dataset.lastExpr=expr.value; reroll.dataset.lastCtx=ctxId||''; });
    if (reroll) reroll.addEventListener('click', ()=>{ const exprStr=reroll.dataset.lastExpr; if(!exprStr) return; const ctxId=reroll.dataset.lastCtx; const entry=ctxId?findEntry(ctxId):null; const parsed=parseDiceExpression(exprStr); const evald=evaluateDiceParts(parsed.parts, entry); addDiceHistoryLine(evald); });
    if (clearBtn) clearBtn.addEventListener('click', () => { const hist=document.getElementById('dice-history'); if (hist) hist.innerHTML=''; reroll.disabled=true; });
  }

  function renderTurnOrderBar() {
    if (!state.session) return;
    const container = dom.turnOrderBar;
    container.innerHTML = "";
    const order = state.session.turnOrder.length ? state.session.turnOrder : getAllParticipants().map(entity => entity.instanceId);
    if (!order.length) {
      container.classList.add("empty");
      container.innerHTML = "<p>No participants yet.</p>";
      return;
    }

    container.classList.remove("empty");
    order.forEach((id, index) => {
      const entity = findEntry(id);
      if (!entity) return;
      const card = document.createElement("article");
      card.className = `turn-order-card ${entity.role}`;
      card.dataset.instanceId = entity.instanceId;

      const name = document.createElement("div");
      name.className = "order-name";
      name.textContent = entity.name;

  const d = computeEffectDeltas(entity);
  const effSpd = formatNumber(applyDelta(entity.stats.spd, d.SPD));
  const effMv = formatNumber(applyDelta(entity.stats.mv, d.MV));
  const meta = document.createElement("div");
  meta.className = "order-meta";
  meta.textContent = `SPD ${effSpd}${d.SPD ? ` (Δ${d.SPD>0?'+':''}${d.SPD})` : ''} � MV ${effMv}`;

      const indicator = document.createElement("div");
      indicator.className = "order-meta";
      indicator.textContent = `${capitalize(entity.role)} � ${entity.hasActed ? "Done" : "Waiting"}`;

      card.appendChild(name);
      card.appendChild(meta);
      card.appendChild(indicator);

      if (!entity.hasActed && index === 0) {
        card.classList.add("active");
      }

      container.appendChild(card);
    });
  }

  function updateCounts() {
    dom.allyCount.textContent = String(state.session.allies.length);
    dom.enemyCount.textContent = String(state.session.enemies.length);
  }

  function updatePendingSortIndicator() {
    if (!state.session) return;
    dom.pendingSortIndicator.classList.toggle("hidden", !state.session.pendingSort);
  }

  function openSheetPicker() {
    if (!state.session) {
      showToast("Create or load a session first.");
      return;
    }
    dom.sheetSearchInput.value = "";
    renderSheetLists();
    closeAllOverlays();
    openOverlay(dom.sheetPickerModal);
  }

  function renderSheetLists() {
    const query = dom.sheetSearchInput.value.trim().toLowerCase();
    renderSheetList(dom.characterSheetList, state.sheets.characters, query);
    renderSheetList(dom.monsterSheetList, state.sheets.monsters, query);
  }

  function renderSheetList(container, sheets, query) {
    container.innerHTML = "";
    if (!sheets.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "menu-note";
      placeholder.textContent = "No sheets detected.";
      container.appendChild(placeholder);
      return;
    }

    const filtered = sheets.filter(sheet => {
      if (!query) return true;
      const haystack = [sheet.name, sheet.race, sheet.rawContent].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    if (!filtered.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "menu-note";
      placeholder.textContent = "No matches.";
      container.appendChild(placeholder);
      return;
    }

    filtered.forEach(sheet => {
      container.appendChild(buildSheetEntry(sheet));
    });
  }

  function buildSheetEntry(sheet) {
    const entry = document.createElement("article");
    entry.className = "sheet-entry";
    entry.dataset.sheetId = sheet.id;
    entry.dataset.category = sheet.category ?? inferCategory(sheet.sourcePath);

    const header = document.createElement("header");
    const title = document.createElement("h4");
    title.textContent = sheet.name || sheet.id;
    const tier = sheet.tier !== null && sheet.tier !== undefined ? `Tier ${sheet.tier}` : "";
    const race = sheet.race || "";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = [tier, race].filter(Boolean).join(" � ");
    header.appendChild(title);
    header.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const addAlly = document.createElement("button");
    addAlly.type = "button";
    addAlly.className = "secondary";
    addAlly.dataset.action = "add-sheet";
    addAlly.dataset.role = "ally";
    addAlly.textContent = "Add as Ally";

    const addEnemy = document.createElement("button");
    addEnemy.type = "button";
    addEnemy.className = "ghost";
    addEnemy.dataset.action = "add-sheet";
    addEnemy.dataset.role = "enemy";
    addEnemy.textContent = "Add as Enemy";

    actions.appendChild(addAlly);
    actions.appendChild(addEnemy);

    entry.appendChild(header);
    entry.appendChild(actions);

    entry.addEventListener("click", event => {
      const role = event.target.getAttribute("data-role");
      if (!role) return;
      addSheetToSession(sheet, role);
    });

    return entry;
  }

  function inferCategory(sourcePath) {
    if (!sourcePath) return "character";
    return sourcePath.toLowerCase().includes("monsters") ? "monster" : "character";
  }

  function addSheetToSession(sheet, role) {
    if (!state.session) {
      showToast("Create or load a session first.");
      return;
    }

    const entity = instantiateEntry(sheet, role);
    if (role === "ally") {
      state.session.allies.push(entity);
    } else {
      state.session.enemies.push(entity);
    }

    state.session.turnOrder.push(entity.instanceId);
    state.session.pendingSort = true;
    state.session.updatedAt = new Date().toISOString();
    persistSession();
    updateActiveView();
    updatePendingSortIndicator();
    showToast(`${entity.name} added as ${role}.`);
  }

  function instantiateEntry(sheet, role) {
    const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    const instanceId = `${sheet.id}-${randomId}`;
    const hpDefault = firstFinite(sheet.combat?.hp?.max, sheet.combat?.hp?.current, 0);
    const resourceDefault = firstFinite(sheet.combat?.resource?.max, sheet.combat?.resource?.current, 0);
    const entry = {
      instanceId,
      sheetId: sheet.id,
      category: sheet.category ?? inferCategory(sheet.sourcePath),
      role,
      name: sheet.name || sheet.id,
      race: sheet.race || "",
      tier: sheet.tier ?? null,
      core: sheet.core || {},
      combat: sheet.combat || {},
      stats: {
        hp: hpDefault,
        resource: resourceDefault,
        resourceLabel: sheet.combat?.resource?.label || "MP",
        spd: firstFinite(sheet.combat?.spd, 0),
        mv: computeMovement(firstFinite(sheet.combat?.spd, 0)),
        ac: firstFinite(sheet.combat?.ac, 0)
      },
      hasActed: false,
      effects: [], // { id, label, stat, delta, turns }
      rawContent: sheet.rawContent || "",
      sourcePath: sheet.sourcePath || "",
      addedAt: new Date().toISOString(),
      acquiredSkills: []
    };
    ensureOriginSkills(entry);
    // If skills already loaded, auto-apply passives now
    applyParsedPassives(entry);
    // Auto-learn parsed actives for prerequisite chains
    ensureParsedActivesLearned(entry);
    return entry;
  }

  function ensureOriginSkills(entry) {
    if (!entry) return;
    if (!Array.isArray(entry.acquiredSkills)) entry.acquiredSkills = [];
    const origins = ['Life'];
    if (Array.isArray(state.skills) && state.skills.length) {
      origins.forEach(name => {
        if (state.skills.some(s => s.name === name) && !entry.acquiredSkills.includes(name)) {
          entry.acquiredSkills.push(name);
        }
      });
    }
  }

  function applyParsedPassives(entry) {
    if (!entry) return;
    if (!Array.isArray(state.skills) || !state.skills.length) return; // wait until skills loaded
    if (!Array.isArray(entry.passiveSkillNames)) return;
    entry.passiveSkillNames.forEach(name => {
      let skill = state.skills.find(s => s.name === name && s.passive);
      if (!skill) { // case-insensitive fallback
        skill = state.skills.find(s => s.passive && s.name.toLowerCase() === String(name).toLowerCase());
      }
      if (!skill) return;
      if (entry.acquiredSkills && entry.acquiredSkills.includes(name)) return;
      const conv = convertSkillToEffects(skill, { passive: true });
      entry.acquiredSkills = Array.from(new Set([...(entry.acquiredSkills||[]), name]));
      if (conv.effects.length) {
        conv.effects.forEach(eff => { eff.isPassive = true; entry.effects.push(eff); });
      }
    });
  }

  function ensureParsedActivesLearned(entry) {
    if (!entry) return; if (!Array.isArray(entry.activeSkillNames)) return;
    entry.activeSkillNames.forEach(name => {
      if (!Array.isArray(entry.acquiredSkills)) entry.acquiredSkills = [];
      if (!entry.acquiredSkills.includes(name)) entry.acquiredSkills.push(name);
    });
  }

  /**
   * convertSkillToEffects(skill, options)
   * Parses skill.effectDetails lines into a normalized array of effect objects.
   * Supported patterns:
   *   +N STAT, -N STAT (e.g., +2 STR, -1 SPD)
   *   Optional duration suffix patterns on a line:
   *     "for 3 turns" | "for 1 turn" | "(3t)" | "[3t]" | trailing "x3t"
   *   If multiple stat modifications appear on separate lines each becomes a target within a single effect unless separated by blank lines in future expansions.
   * Passives ignore parsed duration and become 9999 turns.
   */
  function convertSkillToEffects(skill, options = {}) {
    const passive = !!options.passive || !!skill.passive;
    const lines = Array.isArray(skill.effectDetails) ? skill.effectDetails.slice() : [];
    const effects = [];
    const targets = [];
    let parsedDuration = null; // in turns
    const statRegex = /([+-]\d+)\s+(STR|DEX|CON|INT|WIS|CHA|SPD|AC|HP|MP)\b/i;
    const durationRegexes = [
      /for\s+(\d+)\s+turns?/i,
      /\b(\d+)t\b/i,
      /\((\d+)t\)/i,
      /\[(\d+)t\]/i
    ];
    lines.forEach(rawLine => {
      const line = String(rawLine).trim();
      if (!line) return;
      const m = line.match(statRegex);
      if (m) {
        targets.push({ stat: m[2].toUpperCase(), delta: parseInt(m[1],10) });
      }
      // attempt duration discovery (first wins)
      if (parsedDuration == null) {
        for (const rx of durationRegexes) {
          const dm = line.match(rx);
            if (dm) { parsedDuration = parseInt(dm[1],10); break; }
        }
      }
    });
    if (targets.length) {
      const turns = passive ? 9999 : (Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 1);
      effects.push({ id: crypto.randomUUID?crypto.randomUUID():Math.random().toString(16).slice(2), label: skill.name, targets, turns, isPassive: passive });
    }
    return { effects, duration: parsedDuration };
  }

  function computeMovement(speed) {
    const spd = Number(speed) || 0;
    return Math.round((spd / 3) * 100) / 100;
  }

  function firstFinite(...values) {
    for (const value of values) {
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function removeEntry(instanceId) {
    if (!state.session) return;
    const prevCount = state.session.allies.length + state.session.enemies.length;
    state.session.allies = state.session.allies.filter(entry => entry.instanceId !== instanceId);
    state.session.enemies = state.session.enemies.filter(entry => entry.instanceId !== instanceId);
    state.session.turnOrder = state.session.turnOrder.filter(id => id !== instanceId);
    state.session.updatedAt = new Date().toISOString();
    if (prevCount !== state.session.allies.length + state.session.enemies.length) {
      persistSession();
      updateActiveView();
      showToast("Entry removed.");
    }
  }

  function highlightEntry(instanceId) {
    const card = document.querySelector(`.tracker-card[data-instance-id='${instanceId}']`);
    if (!card) return;
    card.classList.add("needs-attention");
    setTimeout(() => card.classList.remove("needs-attention"), 1000);
  }

  function findEntry(instanceId) {
    if (!state.session) return null;
    return state.session.allies.concat(state.session.enemies).find(entry => entry.instanceId === instanceId) || null;
  }

  function getAllParticipants() {
    if (!state.session) return [];
    return state.session.allies.concat(state.session.enemies);
  }

  function openSheetDetail(entry) {
    dom.sheetDetailContent.innerHTML = renderMarkdown(entry.rawContent || "");
    dom.sheetDetailModal.querySelector("#sheet-detail-title").textContent = entry.name;
    closeAllOverlays();
    openOverlay(dom.sheetDetailModal);
  }

  function getStoredSessions() {
    try {
      const payload = window.localStorage.getItem(STORAGE_KEYS.sessions);
      if (!payload) return {};
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.error("Failed to read sessions", error);
      return {};
    }
  }

  function saveSessionsMap(map) {
    window.localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(map));
  }

  // Persist the current session to localStorage. Accepts options:
  // { skipTimestamp: true } to avoid mutating updatedAt when simply restoring.
  function persistSession(options = {}) {
    if (!state.session) return;
    const { skipTimestamp = false } = options;
    const sessions = getStoredSessions();
    if (!skipTimestamp) {
      state.session.updatedAt = new Date().toISOString();
    }
    sessions[state.session.name] = state.session;
    saveSessionsMap(sessions);
    window.localStorage.setItem(STORAGE_KEYS.lastSession, state.session.name);
  }

  function populateSavedSessions() {
    const sessions = getStoredSessions();
    dom.savedSessionList.innerHTML = "";
    const names = Object.keys(sessions).sort((a, b) => b.localeCompare(a));
    if (!names.length) {
      const info = document.createElement("p");
      info.className = "menu-note";
      info.textContent = "No saved sessions yet.";
      dom.savedSessionList.appendChild(info);
      return;
    }

    names.forEach(name => {
      const session = sessions[name];
      dom.savedSessionList.appendChild(buildSavedSessionCard(session));
    });

    // Fetch server-side list (non-blocking augmentation)
    fetch('/api/sessions')
      .then(r => r.ok ? r.json() : null)
      .then(payload => {
        if (!payload || !Array.isArray(payload.sessions)) return;
        // Show server sessions not already in localStorage
        payload.sessions.forEach(s => {
          if (!sessions[s.name]) {
            const ghost = {
              name: s.name,
              updatedAt: s.updatedAt,
              turn: s.turn,
              allies: new Array(s.allies).fill(0),
              enemies: new Array(s.enemies).fill(0)
            };
            dom.savedSessionList.appendChild(buildSavedSessionCard(ghost));
          }
        });
      }).catch(() => {});
  }

  function buildSavedSessionCard(session) {
    const card = document.createElement("div");
    card.className = "saved-session-card";

    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = session.name;
    const meta = document.createElement("span");
    meta.className = "saved-session-meta";
    meta.textContent = `Updated ${formatDate(session.updatedAt)}`;
    header.appendChild(title);
    header.appendChild(meta);

    const allyCount = Array.isArray(session.allies) ? session.allies.length : 0;
    const enemyCount = Array.isArray(session.enemies) ? session.enemies.length : 0;
    const turnLabel = Number.isFinite(session.turn) ? session.turn : 1;
    const stats = document.createElement("div");
    stats.className = "saved-session-meta";
    stats.textContent = `${allyCount} allies � ${enemyCount} enemies � Turn ${turnLabel}`;

    const actions = document.createElement("div");
    actions.className = "saved-session-actions";

    const loadBtn = document.createElement("button");
    loadBtn.className = "primary";
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => {
      state.session = hydrateSession(deepClone(session));
      persistSession({ skipTimestamp: true });
      updateActiveView();
      closeOverlay(dom.loadModal);
      showToast(`Session "${session.name}" loaded.`);
    });

    const exportBtn = document.createElement("button");
    exportBtn.className = "secondary";
    exportBtn.textContent = "Export";
    exportBtn.addEventListener("click", () => exportSession(hydrateSession(deepClone(session))));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      const confirmed = window.confirm(`Delete session "${session.name}"? This cannot be undone.`);
      if (!confirmed) return;
      const map = getStoredSessions();
      delete map[session.name];
      saveSessionsMap(map);
      populateSavedSessions();
      if (state.session && state.session.name === session.name) {
        state.session = null;
        window.localStorage.removeItem(STORAGE_KEYS.lastSession);
        updateActiveView();
      }
      showToast("Session deleted.");
    });

    actions.appendChild(loadBtn);
    actions.appendChild(exportBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(stats);
    card.appendChild(actions);
    return card;
  }

  function exportSession(session) {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${session.name.replace(/[^a-z0-9-_]+/gi, "_") || "session"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportSession(event) {
    const [file] = event.target.files || [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const session = JSON.parse(target.result);
        if (!session || !session.name) throw new Error("Invalid session file");
        const map = getStoredSessions();
        map[session.name] = session;
        saveSessionsMap(map);
        populateSavedSessions();
        showToast(`Session "${session.name}" imported.`);
      } catch (error) {
        console.error(error);
        showToast("Unable to import session file. Please check the format.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function restoreLastSession() {
    const lastName = window.localStorage.getItem(STORAGE_KEYS.lastSession);
    if (!lastName) return;
    const sessions = getStoredSessions();
    if (!sessions[lastName]) return;
  state.session = hydrateSession(deepClone(sessions[lastName]));
  // Do not touch updatedAt when just restoring automatically.
  persistSession({ skipTimestamp: true });
  updateActiveView();
  }

  function triggerConversion() {
    const mode = window.prompt("Convert mode: type 'all' for all sheets or enter comma separated IDs (e.g. ashtear,cermia). Cancel to abort.");
    if (mode === null) return; // cancelled
    let body = {};
    if (mode && mode.trim().toLowerCase() !== 'all') {
      const ids = mode.split(',').map(s => s.trim()).filter(Boolean);
      if (!ids.length) {
        showToast('No valid IDs provided.');
        return;
      }
      body.ids = ids;
    }
    fetch("/api/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(r => { if (!r.ok) throw new Error('Conversion failed'); return r.json(); })
      .then(payload => {
        if (!payload || !Array.isArray(payload.records)) throw new Error('Bad payload');
        downloadBlob(JSON.stringify(payload.records, null, 2), body.ids ? 'selected-sheets.json' : 'all-sheets.json', 'application/json');
        if (payload.summaryCsv) {
          downloadBlob(payload.summaryCsv, body.ids ? 'selected-summary.csv' : 'all-summary.csv', 'text/csv');
        }
        showToast(`Converted ${payload.count || payload.records.length} sheet(s).`);
      })
      .catch(err => {
        console.error(err);
        showToast('Unable to convert sheets on the server.');
      });
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      dom.toast.classList.add("hidden");
    }, 2600);
  }

  function formatDate(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function hydrateSession(session) {
    if (!session || typeof session !== "object") return createEmptySession("Unnamed Session");

    session.turn = Number.isFinite(session.turn) && session.turn > 0 ? session.turn : 1;
    session.pendingSort = Boolean(session.pendingSort);
    session.createdAt = session.createdAt || new Date().toISOString();
    session.updatedAt = session.updatedAt || session.createdAt;

    session.allies = Array.isArray(session.allies)
      ? session.allies.map(hydrateEntry)
      : [];
    session.enemies = Array.isArray(session.enemies)
      ? session.enemies.map(hydrateEntry)
      : [];

    const validIds = new Set(session.allies.concat(session.enemies).map(entry => entry.instanceId));
    session.turnOrder = Array.isArray(session.turnOrder)
      ? session.turnOrder.filter(id => validIds.has(id))
      : [];

    if (!session.turnOrder.length) {
      session.turnOrder = Array.from(validIds);
    }

    // Migrate legacy global acquiredSkills if present
    if (Array.isArray(session.acquiredSkills) && session.acquiredSkills.length) {
      const legacy = new Set(session.acquiredSkills);
      session.allies.forEach(e => { e.acquiredSkills = Array.from(new Set([...(e.acquiredSkills||[]), ...legacy])); });
      session.enemies.forEach(e => { e.acquiredSkills = Array.from(new Set([...(e.acquiredSkills||[]), ...legacy])); });
      delete session.acquiredSkills;
    }
    return session;
  }

  function hydrateEntry(entry) {
    const source = entry || {};
    const baseId = source.sheetId || "entry";
    const fallbackId = `${baseId}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

    const clone = {
      ...source,
      instanceId: source.instanceId || fallbackId,
      role: source.role === "enemy" ? "enemy" : "ally",
      category: source.category || inferCategory(source.sourcePath),
      name: source.name || baseId,
      core: source.core || {},
      combat: source.combat || {},
      rawContent: source.rawContent || "",
      addedAt: source.addedAt || new Date().toISOString()
    };

    const hp = firstFinite(
      source.stats?.hp,
      clone.combat?.hp?.current,
      clone.combat?.hp?.max,
      0
    );
    const resource = firstFinite(
      source.stats?.resource,
      clone.combat?.resource?.current,
      clone.combat?.resource?.max,
      0
    );
    const spd = firstFinite(source.stats?.spd, clone.combat?.spd, 0);
    const ac = firstFinite(source.stats?.ac, clone.combat?.ac, 0);
    const mv = Number.isFinite(source.stats?.mv) ? source.stats.mv : computeMovement(spd);

    clone.stats = {
      hp,
      resource,
      resourceLabel: source.stats?.resourceLabel || clone.combat?.resource?.label || "MP",
      spd,
      mv,
      ac
    };

    clone.hasActed = Boolean(source.hasActed);
    clone.effects = Array.isArray(source.effects) ? source.effects.filter(e => e && e.label).map(e => {
      if (e && !e.targets && e.stat) {
        return {
          id: e.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)),
          label: e.label,
          targets: [{ stat: e.stat, delta: Number.isFinite(e.delta) ? e.delta : 0 }],
          turns: Number.isFinite(e.turns) ? e.turns : 1
        };
      }
      return e;
    }) : [];
    clone.acquiredSkills = Array.isArray(source.acquiredSkills) ? source.acquiredSkills.slice() : [];
    // Parse rawContent for Passive / Active skill listing sections
    try {
      const text = String(clone.rawContent || '');
      const sections = { passive: [], active: [] };
      // Simple regex: capture lines under headings starting with '## Passive' or '## Active' until next '##'
      const regex = /(^##\s*(Passive|Active)[^\n]*)([\s\S]*?)(?=^##\s|\Z)/gmi;
      let m;
      while ((m = regex.exec(text)) !== null) {
        const kind = m[2].toLowerCase();
        const body = m[3];
        const lines = body.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith('##'));
        lines.forEach(line => {
          // Accept bullet or plain lines; strip leading markers like '-', '*', '+' and digits.
          const cleaned = line.replace(/^[-*+\d\.\)]\s*/, '').trim();
          // Stop if line looks like a new heading accidentally not captured
          if (/^#/.test(cleaned)) return;
          // Keep only first token up to ' - ' or ':' as a candidate skill name
          const name = cleaned.split(/\s+-\s+|:/)[0].trim();
            if (name && !sections[kind].includes(name)) sections[kind].push(name);
        });
      }
      clone.passiveSkillNames = sections.passive;
      clone.activeSkillNames = sections.active;
    } catch(_) { /* ignore parse errors */ }
    ensureOriginSkills(clone);
    ensureParsedActivesLearned(clone);
    return clone;
  }

  function loadSettings() {
    try {
      const payload = window.localStorage.getItem(STORAGE_KEYS.settings);
      if (!payload) return;
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === "object") {
        state.settings.lightTheme = Boolean(parsed.lightTheme);
        state.settings.compactCards = Boolean(parsed.compactCards);
      }
    } catch (error) {
      console.error("Unable to load settings", error);
    }
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  }

  function applySettings() {
    document.body.classList.toggle("light-theme", state.settings.lightTheme);
    document.body.classList.toggle("compact", state.settings.compactCards);
  }

  function syncSettingsToggles() {
    dom.themeToggle.checked = state.settings.lightTheme;
    dom.compactToggle.checked = state.settings.compactCards;
  }

  function handleThemeToggle(event) {
    state.settings.lightTheme = event.target.checked;
    applySettings();
    saveSettings();
  }

  function handleCompactToggle(event) {
    state.settings.compactCards = event.target.checked;
    applySettings();
    saveSettings();
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (error) {
        console.warn("structuredClone failed, falling back to JSON clone", error);
      }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function handleBulkAction(code) {
    if (!state.session) return;
    const map = {
      'ally-complete': ['allies', true],
      'ally-reset': ['allies', false],
      'enemy-complete': ['enemies', true],
      'enemy-reset': ['enemies', false]
    };
    if (!map[code]) return;
    const [group, val] = map[code];
    state.session[group].forEach(e => { e.hasActed = val; });
    persistSession();
    updateActiveView();
  }

  function openEffectEditor(instanceId, effectId) {
    const entry = findEntry(instanceId); if (!entry) return;
    state._effectEditingFor = instanceId;
    state._editingEffectId = effectId || null;
    populateEffectTemplateSelect();
    const form = document.getElementById('effect-editor-form');
    if (form) form.reset();
    const nameInput = document.getElementById('effect-name-input');
    const turnsInput = document.getElementById('effect-turns-input');
    const targetsInput = document.getElementById('effect-targets-input');
    if (nameInput) nameInput.value = '';
    if (turnsInput) turnsInput.value = '2';
    if (targetsInput) targetsInput.value = '';
    if (effectId) {
      const eff = entry.effects.find(e => e.id === effectId);
      if (eff) {
        if (nameInput) nameInput.value = eff.label;
        if (turnsInput) turnsInput.value = eff.turns;
        if (targetsInput) targetsInput.value = (eff.targets || []).map(t => `${t.stat}:${t.delta>=0?'+':''}${t.delta}`).join('\n');
      }
    }
    closeAllOverlays();
    const modal = document.getElementById('effect-editor-modal');
    if (modal) openOverlay(modal);
  }

  function loadRecentCustomEffects() {
    try {
      const raw = localStorage.getItem('nba-recent-effects');
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }

  function populateEffectTemplateSelect() {
    const sel = document.getElementById('effect-template-select');
    if (!sel) return;
    const recent = loadRecentCustomEffects();
    let recentBlock = '';
    if (recent.length) {
      recentBlock = '<optgroup label="Recent">' + recent.map((r,i)=>`<option value="recent:${i}">${r.label}</option>`).join('') + '</optgroup>';
    }
    const templateBlock = state.effectTemplates.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
    sel.innerHTML = '<option value="__custom">Custom...</option>' + recentBlock + templateBlock;
  }

  function handleGlobalChange(e) {
    if (e.target && e.target.id === 'effect-template-select') {
      const val = e.target.value;
      if (val === '__custom') return;
      let tpl = null;
      if (val.startsWith('recent:')) {
        const idx = parseInt(val.split(':')[1],10);
        tpl = loadRecentCustomEffects()[idx];
      } else {
        tpl = state.effectTemplates.find(t => t.id === val);
      }
      if (!tpl) return;
      const nameInput = document.getElementById('effect-name-input');
      const turnsInput = document.getElementById('effect-turns-input');
      const targetsInput = document.getElementById('effect-targets-input');
      if (nameInput) nameInput.value = tpl.label;
      if (turnsInput) turnsInput.value = tpl.turns || 1;
      if (targetsInput) targetsInput.value = (tpl.targets || []).map(t => `${t.stat}:${t.delta>=0?'+':''}${t.delta}`).join('\n');
    }
  }

  function cacheRecentCustomEffect(effect) {
    try {
      if (!effect || !effect.label) return;
      if (state.effectTemplates.some(t => t.label === effect.label)) return; // skip if template label duplicate
      const key = 'nba-recent-effects';
      const raw = localStorage.getItem(key);
      let list = [];
      if (raw) list = JSON.parse(raw) || [];
      list = list.filter(e => e.label !== effect.label);
      list.unshift({ label: effect.label, targets: effect.targets, turns: effect.turns });
      if (list.length > 8) list.length = 8;
      localStorage.setItem(key, JSON.stringify(list));
    } catch (_) {}
  }

  function handleGlobalSubmit(e) {
    if (e.target && e.target.id === 'effect-editor-form') {
      e.preventDefault();
      const entry = findEntry(state._effectEditingFor);
      if (!entry) return;
      const name = document.getElementById('effect-name-input')?.value.trim();
      const turns = parseInt(document.getElementById('effect-turns-input')?.value, 10) || 1;
      const rawTargets = (document.getElementById('effect-targets-input')?.value || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
      const errorEl = document.getElementById('effect-error');
      if (errorEl) errorEl.style.display = 'none';
      const targets = [];
      const invalid = [];
      rawTargets.forEach(line => {
        const idx = line.indexOf(':');
        if (idx === -1) { invalid.push(line); return; }
        const stat = line.slice(0, idx).trim().toUpperCase();
        const deltaRaw = line.slice(idx + 1).trim();
        const delta = Number(deltaRaw);
        if (!stat || !/^[-+]?\d+(?:\.\d+)?$/.test(deltaRaw) || !Number.isFinite(delta)) { invalid.push(line); return; }
        targets.push({ stat, delta });
      });
      if (!name || !targets.length) {
        if (errorEl) { errorEl.textContent = 'Provide a name and at least one valid target line.'; errorEl.style.display = 'block'; }
        return;
      }
      if (invalid.length && errorEl) {
        errorEl.textContent = `Ignored invalid line(s): ${invalid.join(', ')}`;
        errorEl.style.display = 'block';
      }
      const existing = state._editingEffectId ? entry.effects.find(e => e.id === state._editingEffectId) : null;
      if (existing) {
        existing.label = name;
        existing.targets = targets;
        existing.turns = Math.max(1, turns);
      } else {
        const newEffect = { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2), label: name, targets, turns: Math.max(1, turns) };
        entry.effects.push(newEffect);
        cacheRecentCustomEffect(newEffect);
      }
      persistSession();
      if (state.session) { state.session.pendingSort = true; recomputeTurnOrder(true); }
      updateActiveView();
      const modal = document.getElementById('effect-editor-modal');
      if (modal) closeOverlay(modal);
    }
  }

  function renderMarkdown(raw) {
    if (!raw) return '<em>No content</em>';
    const esc = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = esc
      .replace(/!\[\[([^\]]+)\]\]/g, (m, p1) => `<img src="${resolveImage(p1)}" alt="${p1}" class="sheet-img" />`)
      .replace(/\[\[([^\]|]+\.(?:png|jpg|jpeg|gif))\]\]/gi, (m,p1) => `<img src="${resolveImage(p1)}" alt="${p1}" class="sheet-img" />`);
    // Standalone image filename on its own line -> image
    html = html.replace(/^(?:\s*)([A-Za-z0-9_\- ]+\.(?:png|jpg|jpeg|gif))(?:\s*)$/gmi, (m, p1) => `<img src="${resolveImage(p1.trim())}" alt="${p1.trim()}" class="sheet-img" />`);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^###\s+(.+)$/gm,'<h3>$1</h3>')
               .replace(/^##\s+(.+)$/gm,'<h2>$1</h2>')
               .replace(/^#\s+(.+)$/gm,'<h1>$1</h1>');
    html = html.replace(/^(?:- \s*.*(?:\n|$))+?/gm, block => '<ul>' + block.trim().split(/\n/).map(l=>l.replace(/^-\s*/,'')).map(li=>`<li>${li}</li>`).join('') + '</ul>');
    html = html.split(/\n{2,}/).map(p=> p.match(/^<h[1-3]|^<ul|<img|<p|<blockquote|<table|^<code/) ? p : `<p>${p.replace(/\n/g,'<br>')}</p>`).join('\n');
    return html;
  }

  function resolveImage(rel) {
    if (!rel) return '';
    const clean = rel.trim().replace(/^\.\//,'').replace(/^!+/,'');
    const cleaned = clean.replace(/^Resources\/(?:Image|Images)\//i, '');
    // If already looks like a URL path keep it
    if (/^https?:/i.test(cleaned) || cleaned.startsWith('/')) return cleaned;
    // Map bare filename to /img route; allow subdir hints like Character/Name.png
    if (/\.(png|jpg|jpeg|gif|svg)$/i.test(cleaned)) {
      if (cleaned.includes('/')) return `/img/${cleaned}`;
      return `/img/${cleaned}`;
    }
    return cleaned;
  }

  document.addEventListener("DOMContentLoaded", init);
})();