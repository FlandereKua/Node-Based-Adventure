(() => {
  "use strict";

  const STORAGE_KEY = "nba-tracker-session";

  const state = {
    library: [],
    characters: [],
    currentIndex: 0,
    round: 1,
    turn: 1,
    effectTargetId: null
  };

  const elements = {
    libraryList: document.getElementById("library-list"),
    tableBody: document.getElementById("tracker-table-body"),
    roundCounter: document.getElementById("round-counter"),
    turnCounter: document.getElementById("turn-counter"),
    activeCharacter: document.getElementById("active-character"),
    endTurnBtn: document.getElementById("end-turn-btn"),
    resetBtn: document.getElementById("reset-session-btn"),
    exportBtn: document.getElementById("export-session-btn"),
    importBtn: document.getElementById("import-session-btn"),
    importInput: document.getElementById("import-session-input"),
    modal: document.getElementById("effect-modal"),
    modalForm: document.getElementById("effect-form"),
    modalCancel: document.getElementById("effect-cancel"),
    modalName: document.getElementById("effect-name"),
    modalType: document.getElementById("effect-type"),
    modalStat: document.getElementById("effect-stat"),
    modalValue: document.getElementById("effect-value"),
    modalDuration: document.getElementById("effect-duration")
  };

  async function init() {
    await loadLibrary();
    restoreSession();
    renderLibrary();
    renderTracker();
    updateSessionInfo();
    bindEvents();
  }

  function bindEvents() {
    elements.libraryList.addEventListener("click", handleLibraryClick);
    elements.tableBody.addEventListener("input", handleTableInput);
    elements.tableBody.addEventListener("click", handleTableClick);
    elements.endTurnBtn.addEventListener("click", handleEndTurn);
    elements.resetBtn.addEventListener("click", handleReset);
    elements.exportBtn.addEventListener("click", handleExport);
    elements.importBtn.addEventListener("click", () => elements.importInput.click());
    elements.importInput.addEventListener("change", handleImport);
    elements.modalCancel.addEventListener("click", closeEffectModal);
    elements.modal.addEventListener("click", event => {
      if (event.target === elements.modal) {
        closeEffectModal();
      }
    });
    elements.modalForm.addEventListener("submit", handleEffectSubmit);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeEffectModal();
      }
    });
  }

  async function loadLibrary() {
    try {
      const response = await fetch("/api/characters");
      if (!response.ok) {
        throw new Error(`Failed to load characters (${response.status})`);
      }
      const data = await response.json();
      const characters = Array.isArray(data.characters) ? data.characters : [];
      state.library = characters
        .map(character => ({
          ...character,
          name: character.name || character.id,
          combat: character.combat || {},
          core: character.core || {}
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error(error);
      state.library = [];
      renderLibraryError("Unable to load characters. Ensure the server can read the /Characters folder.");
    }
  }

  function renderLibraryError(message) {
    elements.libraryList.innerHTML = "";
    const div = document.createElement("div");
    div.className = "library-card";
    div.innerHTML = `<p>${message}</p>`;
    elements.libraryList.appendChild(div);
  }

  function renderLibrary() {
    if (!state.library.length) {
      if (!elements.libraryList.innerHTML) {
        renderLibraryError("No character files detected yet.");
      }
      return;
    }

    elements.libraryList.innerHTML = "";
    state.library.forEach(character => {
      const card = document.createElement("article");
      card.className = "library-card";
      const tierLabel = character.tier != null ? `Tier ${character.tier}` : "";
      const metaPieces = [tierLabel, character.race].filter(Boolean);
      const meta = metaPieces.length ? metaPieces.join(" | ") : "";

      card.innerHTML = `
        <h3>${character.name}</h3>
        ${meta ? `<span class="meta">${meta}</span>` : ""}
        <div class="actions">
          <button class="primary" data-action="add-character" data-id="${character.id}">Add to Tracker</button>
        </div>
      `;

      elements.libraryList.appendChild(card);
    });
  }

  function handleLibraryClick(event) {
    const target = event.target;
    if (!target.matches("[data-action='add-character']")) return;

    const baseId = target.dataset.id;
    const baseCharacter = state.library.find(character => character.id === baseId);
    if (!baseCharacter) return;

    const promptMessage = "Optional: enter a display name or leave blank to use the character's name.";
    const userInput = window.prompt(promptMessage, baseCharacter.name || baseCharacter.id) || "";

    addCharacterToSession(baseCharacter, userInput.trim());
  }

  function addCharacterToSession(baseCharacter, customName) {
    const characterInstance = createTrackerCharacter(baseCharacter, customName);
    state.characters.push(characterInstance);
    sortCharacters();
    if (state.characters.length === 1) {
      state.currentIndex = 0;
    }
    persistSession();
    renderTracker();
    updateSessionInfo();
  }

  function createTrackerCharacter(base, customName) {
    const hpCurrent = numericFallback(base.combat?.hp?.current, base.combat?.hp?.max, 0);
    const hpMax = numericFallback(base.combat?.hp?.max, base.combat?.hp?.current, hpCurrent);
    const resourceCurrent = numericFallback(base.combat?.resource?.current, base.combat?.resource?.max, 0);
    const resourceMax = numericFallback(base.combat?.resource?.max, base.combat?.resource?.current, resourceCurrent);
    const ac = numericFallback(base.combat?.ac, 0);
    const spd = numericFallback(base.combat?.spd, 0);
    const mv = computeMovement(spd);
    const resourceLabel = base.combat?.resource?.label || "Resource";

    return {
      instanceId: generateInstanceId(base.id),
      baseId: base.id,
      name: customName || base.name || base.id,
      tier: base.tier ?? null,
      race: base.race ?? "",
      core: base.core ?? {},
      stats: {
        hpCurrent,
        hpMax,
        resourceCurrent,
        resourceMax,
        resourceLabel,
        ac,
        spd,
        mv
      },
      effects: [],
      metadata: {
        sourcePath: base.sourcePath || null
      }
    };
  }

  function hydrateCharacterData(raw) {
    const stats = raw.stats || {};
    const spd = numericFallback(stats.spd, 0);
    const hydrated = {
      instanceId: raw.instanceId || generateInstanceId(raw.baseId || "char"),
      baseId: raw.baseId || null,
      name: raw.name || "Unknown",
      tier: raw.tier ?? null,
      race: raw.race ?? "",
      core: raw.core || {},
      stats: {
        hpCurrent: numericFallback(stats.hpCurrent, 0),
        hpMax: numericFallback(stats.hpMax, stats.hpCurrent, 0),
        resourceCurrent: numericFallback(stats.resourceCurrent, 0),
        resourceMax: numericFallback(stats.resourceMax, stats.resourceCurrent, 0),
        resourceLabel: stats.resourceLabel || "Resource",
        ac: numericFallback(stats.ac, 0),
        spd,
        mv: computeMovement(spd)
      },
      effects: Array.isArray(raw.effects)
        ? raw.effects.map(effect => hydrateEffect(effect))
        : [],
      metadata: raw.metadata || {}
    };
    return hydrated;
  }

  function hydrateEffect(effect) {
    const duration = numericFallback(effect?.duration, effect?.remainingTurns, 1) || 1;
    const remaining = numericFallback(effect?.remainingTurns, effect?.duration, duration) || duration;
    return {
      id: effect?.id || generateInstanceId("effect"),
      name: effect?.name || "Unnamed",
      type: effect?.type === "debuff" ? "debuff" : "buff",
      stat: effect?.stat || "",
      value: effect?.value || "",
      duration,
      remainingTurns: remaining
    };
  }

  function numericFallback(...values) {
    for (const value of values) {
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function computeMovement(speedValue) {
    const spd = Number(speedValue) || 0;
    const mv = spd / 3;
    return Number.isFinite(mv) ? Math.round(mv * 100) / 100 : 0;
  }

  function generateInstanceId(baseId) {
    const random = Math.random().toString(16).slice(2);
    if (window.crypto && "randomUUID" in window.crypto) {
      return `${baseId}-${window.crypto.randomUUID()}`;
    }
    return `${baseId}-${Date.now()}-${random}`;
  }

  function renderTracker() {
    elements.tableBody.innerHTML = "";

    if (!state.characters.length) {
      const row = document.createElement("tr");
      row.className = "empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 9;
      cell.textContent = "Add characters from the library to begin.";
      row.appendChild(cell);
      elements.tableBody.appendChild(row);
      elements.endTurnBtn.disabled = true;
      return;
    }

    elements.endTurnBtn.disabled = false;

    state.characters.forEach((character, index) => {
      const row = document.createElement("tr");
      row.dataset.id = character.instanceId;
      row.className = index === state.currentIndex ? "active-row" : "";

      const orderCell = document.createElement("td");
      orderCell.textContent = String(index + 1);
      row.appendChild(orderCell);

      const nameCell = document.createElement("td");
      const title = document.createElement("div");
      title.textContent = character.name;
      const meta = document.createElement("div");
      meta.className = "meta";
      const pieces = [];
      if (character.tier != null) pieces.push(`Tier ${character.tier}`);
      if (character.race) pieces.push(character.race);
      meta.textContent = pieces.join(" | ");
      nameCell.appendChild(title);
      if (pieces.length) nameCell.appendChild(meta);
      row.appendChild(nameCell);

      const spdCell = document.createElement("td");
      spdCell.appendChild(createNumberInput(character.stats.spd, {
        field: "spd",
        min: 0
      }));
      row.appendChild(spdCell);

      const mvCell = document.createElement("td");
      mvCell.textContent = formatNumber(character.stats.mv);
      row.appendChild(mvCell);

      const hpCell = document.createElement("td");
      hpCell.appendChild(createDualInput(
        character.stats.hpCurrent,
        character.stats.hpMax,
        { currentField: "hpCurrent", maxField: "hpMax", min: 0 }
      ));
      row.appendChild(hpCell);

      const resourceCell = document.createElement("td");
      resourceCell.appendChild(createDualInput(
        character.stats.resourceCurrent,
        character.stats.resourceMax,
        { currentField: "resourceCurrent", maxField: "resourceMax", min: 0, label: character.stats.resourceLabel }
      ));
      row.appendChild(resourceCell);

      const acCell = document.createElement("td");
      acCell.appendChild(createNumberInput(character.stats.ac, {
        field: "ac",
        min: 0
      }));
      row.appendChild(acCell);

      const effectsCell = document.createElement("td");
      const effectsWrapper = document.createElement("div");
      effectsWrapper.className = "effects-list";

      if (character.effects.length) {
        character.effects.forEach(effect => {
          effectsWrapper.appendChild(renderEffectPill(effect));
        });
      }

      const addEffectBtn = document.createElement("button");
      addEffectBtn.className = "secondary";
      addEffectBtn.type = "button";
      addEffectBtn.dataset.action = "add-effect";
      addEffectBtn.textContent = "Add";
      effectsWrapper.appendChild(addEffectBtn);

      effectsCell.appendChild(effectsWrapper);
      row.appendChild(effectsCell);

      const actionsCell = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.className = "danger";
      removeBtn.dataset.action = "remove-character";
      removeBtn.textContent = "Remove";
      actionsCell.appendChild(removeBtn);
      row.appendChild(actionsCell);

      elements.tableBody.appendChild(row);
    });
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }

  function createNumberInput(value, { field, min = null } = {}) {
    const input = document.createElement("input");
    input.type = "number";
    input.value = Number.isFinite(value) ? value : 0;
    input.dataset.action = "update-number";
    input.dataset.field = field;
    if (min != null) input.min = String(min);
    return input;
  }

  function createDualInput(current, max, { currentField, maxField, min = null, label = null } = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "stat-input-group";

    const currentInput = createNumberInput(current, { field: currentField, min });
    currentInput.classList.add("stat-input");

    const separator = document.createElement("span");
    separator.textContent = "/";

    const maxInput = createNumberInput(max, { field: maxField, min });
    maxInput.classList.add("stat-input");

    wrapper.appendChild(currentInput);
    wrapper.appendChild(separator);
    wrapper.appendChild(maxInput);

    if (label) {
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      wrapper.appendChild(labelSpan);
    }

    return wrapper;
  }

  function renderEffectPill(effect) {
    const pill = document.createElement("div");
    pill.className = `effect-pill ${effect.type}`;

    const info = document.createElement("span");
    const parts = [effect.name];
    if (effect.stat) parts.push(effect.stat);
    if (effect.value) parts.push(effect.value);
    parts.push(`${effect.remainingTurns}t`);
    info.textContent = parts.join(" | ");
    pill.appendChild(info);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.dataset.action = "remove-effect";
    removeBtn.dataset.effectId = effect.id;
    removeBtn.textContent = "×";
    pill.appendChild(removeBtn);

    return pill;
  }

  function handleTableInput(event) {
    const target = event.target;
    if (!target.matches("[data-action='update-number']")) return;

    const row = target.closest("tr");
    if (!row) return;

    const character = state.characters.find(item => item.instanceId === row.dataset.id);
    if (!character) return;

    const field = target.dataset.field;
    const value = Number(target.value);
    updateCharacterStat(character, field, value);
  }

  function updateCharacterStat(character, field, value) {
    if (!Number.isFinite(value)) return;

    if (field === "spd") {
      character.stats.spd = value;
      character.stats.mv = computeMovement(value);
      sortCharacters();
      persistSession();
      renderTracker();
      updateSessionInfo();
      return;
    }

    if (field === "hpCurrent") {
      character.stats.hpCurrent = clamp(value, 0, character.stats.hpMax);
    } else if (field === "hpMax") {
      character.stats.hpMax = Math.max(value, 0);
      character.stats.hpCurrent = clamp(character.stats.hpCurrent, 0, character.stats.hpMax);
    } else if (field === "resourceCurrent") {
      character.stats.resourceCurrent = clamp(value, 0, character.stats.resourceMax);
    } else if (field === "resourceMax") {
      character.stats.resourceMax = Math.max(value, 0);
      character.stats.resourceCurrent = clamp(character.stats.resourceCurrent, 0, character.stats.resourceMax);
    } else if (field === "ac") {
      character.stats.ac = Math.max(value, 0);
    }

    persistSession();
  }

  function clamp(value, min, max) {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (max != null) {
      return Math.min(Math.max(safeValue, min ?? 0), max);
    }
    return Math.max(safeValue, min ?? 0);
  }

  function handleTableClick(event) {
    const target = event.target;
    const row = target.closest("tr");
    if (!row) return;
    const character = state.characters.find(item => item.instanceId === row.dataset.id);
    if (!character) return;

    if (target.matches("[data-action='remove-character']")) {
      removeCharacter(character.instanceId);
      return;
    }

    if (target.matches("[data-action='add-effect']")) {
      openEffectModal(character.instanceId);
      return;
    }

    if (target.matches("[data-action='remove-effect']")) {
      const effectId = target.dataset.effectId;
      character.effects = character.effects.filter(effect => effect.id !== effectId);
      persistSession();
      renderTracker();
      return;
    }
  }

  function removeCharacter(instanceId) {
    const index = state.characters.findIndex(character => character.instanceId === instanceId);
    if (index === -1) return;

    const wasActive = index === state.currentIndex;
    state.characters.splice(index, 1);

    if (!state.characters.length) {
      state.currentIndex = 0;
      state.round = 1;
      state.turn = 1;
    } else if (wasActive) {
      state.currentIndex = state.currentIndex % state.characters.length;
    } else if (index < state.currentIndex) {
      state.currentIndex -= 1;
    }

    persistSession();
    renderTracker();
    updateSessionInfo();
  }

  function handleEndTurn() {
    if (!state.characters.length) return;

    const activeCharacter = state.characters[state.currentIndex];
    tickEffects(activeCharacter);

    state.currentIndex = (state.currentIndex + 1) % state.characters.length;
    if (state.currentIndex === 0) {
      state.round += 1;
    }
    state.turn += 1;

    persistSession();
    renderTracker();
    updateSessionInfo();
  }

  function tickEffects(character) {
    if (!character.effects.length) return;
    character.effects = character.effects
      .map(effect => ({
        ...effect,
        remainingTurns: effect.remainingTurns - 1
      }))
      .filter(effect => effect.remainingTurns > 0);
  }

  function handleReset() {
    if (!state.characters.length) return;
    const confirmed = window.confirm("Clear the current session? This cannot be undone.");
    if (!confirmed) return;

    state.characters = [];
    state.currentIndex = 0;
    state.round = 1;
    state.turn = 1;
    persistSession();
    renderTracker();
    updateSessionInfo();
  }

  function sortCharacters() {
    if (!state.characters.length) return;
    const activeId = state.characters[state.currentIndex]?.instanceId;

    state.characters.sort((a, b) => {
      const spdDiff = (b.stats.spd ?? 0) - (a.stats.spd ?? 0);
      if (spdDiff !== 0) return spdDiff;

      const dexDiff = (b.core?.DEX ?? 0) - (a.core?.DEX ?? 0);
      if (dexDiff !== 0) return dexDiff;

      return a.name.localeCompare(b.name);
    });

    if (activeId) {
      const newIndex = state.characters.findIndex(character => character.instanceId === activeId);
      state.currentIndex = newIndex === -1 ? 0 : newIndex;
    } else {
      state.currentIndex = 0;
    }
  }

  function updateSessionInfo() {
    elements.roundCounter.textContent = String(state.round);
    elements.turnCounter.textContent = String(state.turn);
    const activeCharacter = state.characters[state.currentIndex];
    elements.activeCharacter.textContent = activeCharacter ? activeCharacter.name : "–";
  }

  function persistSession() {
    try {
      const snapshot = {
        round: state.round,
        turn: state.turn,
        currentIndex: state.currentIndex,
        characters: state.characters.map(character => ({
          instanceId: character.instanceId,
          baseId: character.baseId,
          name: character.name,
          tier: character.tier,
          race: character.race,
          core: character.core,
          stats: character.stats,
          effects: character.effects,
          metadata: character.metadata
        }))
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error("Unable to persist session", error);
    }
  }

  function restoreSession() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const snapshot = JSON.parse(stored);
      if (!snapshot || !Array.isArray(snapshot.characters)) return;

      state.round = Number.isFinite(snapshot.round) ? snapshot.round : 1;
      state.turn = Number.isFinite(snapshot.turn) ? snapshot.turn : 1;
      state.currentIndex = Number.isFinite(snapshot.currentIndex) ? snapshot.currentIndex : 0;

      state.characters = snapshot.characters.map(character => hydrateCharacterData(character));

      if (!state.characters.length) {
        state.currentIndex = 0;
        state.round = 1;
        state.turn = 1;
      } else {
        sortCharacters();
        state.currentIndex = Math.min(Math.max(state.currentIndex, 0), state.characters.length - 1);
      }
    } catch (error) {
      console.error("Unable to restore session", error);
      state.characters = [];
      state.currentIndex = 0;
      state.round = 1;
      state.turn = 1;
    }
  }

  function handleExport() {
    if (!state.characters.length) {
      window.alert("No characters to export yet.");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      round: state.round,
      turn: state.turn,
      currentIndex: state.currentIndex,
      characters: state.characters
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nba-session-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handleImport(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const snapshot = JSON.parse(target.result);
        if (!snapshot || !Array.isArray(snapshot.characters)) {
          throw new Error("Invalid session file");
        }
        state.round = Number.isFinite(snapshot.round) ? snapshot.round : 1;
        state.turn = Number.isFinite(snapshot.turn) ? snapshot.turn : 1;
        state.currentIndex = Number.isFinite(snapshot.currentIndex) ? snapshot.currentIndex : 0;
        state.characters = snapshot.characters.map(character => hydrateCharacterData(character));
        sortCharacters();
        if (!state.characters.length) {
          state.currentIndex = 0;
          state.round = 1;
          state.turn = 1;
        } else {
          state.currentIndex = Math.min(Math.max(state.currentIndex, 0), state.characters.length - 1);
        }
        persistSession();
        renderTracker();
        updateSessionInfo();
      } catch (error) {
        console.error(error);
        window.alert("Unable to import session file. Please check the file format.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function openEffectModal(characterId) {
    state.effectTargetId = characterId;
    elements.modalName.value = "";
    elements.modalType.value = "buff";
    elements.modalStat.value = "";
    elements.modalValue.value = "";
    elements.modalDuration.value = "1";
    elements.modal.classList.remove("hidden");
    setTimeout(() => elements.modalName.focus(), 0);
  }

  function closeEffectModal() {
    state.effectTargetId = null;
    elements.modal.classList.add("hidden");
  }

  function handleEffectSubmit(event) {
    event.preventDefault();
    if (!state.effectTargetId) {
      closeEffectModal();
      return;
    }

    const character = state.characters.find(item => item.instanceId === state.effectTargetId);
    if (!character) {
      closeEffectModal();
      return;
    }

    const name = elements.modalName.value.trim();
    const type = elements.modalType.value;
    const stat = elements.modalStat.value.trim();
    const value = elements.modalValue.value.trim();
    const duration = Number(elements.modalDuration.value) || 1;

    if (!name) {
      window.alert("Effect name is required.");
      return;
    }

    const effect = {
      id: generateInstanceId("effect"),
      name,
      type: type === "debuff" ? "debuff" : "buff",
      stat,
      value,
      duration,
      remainingTurns: duration
    };

    character.effects.push(effect);
    persistSession();
    renderTracker();
    closeEffectModal();
  }

  init();
})();