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
    settings: {
      lightTheme: false,
      compactCards: false
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
    restoreLastSession();
    handleActionParam();
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
  }

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
  }

  function handleDocumentClick(event) {
    const action = event.target.getAttribute("data-menu-action");
    if (action) {
      handleMenuAction(action);
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

    const meta = document.createElement("span");
    const metaParts = [];
    if (entry.tier !== null && entry.tier !== undefined) metaParts.push(`Tier ${entry.tier}`);
    if (entry.race) metaParts.push(entry.race);
    meta.className = "type-tag";
    meta.textContent = metaParts.join(" � ") || entry.category;

    header.appendChild(title);
    header.appendChild(meta);

    const statGrid = document.createElement("div");
    statGrid.className = "stat-grid";

  statGrid.appendChild(buildStatInput(entry, "hp", "HP"));
  statGrid.appendChild(buildStatInput(entry, "resource", entry.stats.resourceLabel || "MP"));
  statGrid.appendChild(buildEditableNumber(entry, "spd", "SPD"));
  statGrid.appendChild(buildStatDisplay("MV", formatNumber(entry.stats.mv)));
  statGrid.appendChild(buildStatDisplay("AC", formatNumber(entry.stats.ac)));

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
    viewBtn.textContent = "View Sheet";

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
    card.appendChild(footer);

    if (!entry.hasActed) {
      card.classList.remove("complete");
    } else {
      card.classList.add("complete");
    }

    return card;
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
    wrapper.appendChild(title);
    wrapper.appendChild(span);
    return wrapper;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  function handleCardInput(event) {
    const target = event.target;
  if (!target.matches("[data-action='update-stat'],[data-action='update-dynamic']")) return;
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

    if (target.matches("[data-action='remove-entry']")) {
      removeEntry(entry.instanceId);
      return;
    }

    if (target.closest(".card-actions") || target.closest(".stat-group") || target.closest(".complete-toggle")) {
      return;
    }

    openSheetDetail(entry);
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
      const spdDiff = (b.stats.spd ?? 0) - (a.stats.spd ?? 0);
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

      const meta = document.createElement("div");
      meta.className = "order-meta";
      meta.textContent = `SPD ${formatNumber(entity.stats.spd)} � MV ${formatNumber(entity.stats.mv)}`;

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
    return {
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
      rawContent: sheet.rawContent || "",
      sourcePath: sheet.sourcePath || "",
      addedAt: new Date().toISOString()
    };
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
    dom.sheetDetailContent.textContent = entry.rawContent || "No additional information available.";
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

  document.addEventListener("DOMContentLoaded", init);
})();