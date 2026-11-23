/* ============================================================
   RotinaFit — lógica do aplicativo
   ============================================================ */
(function () {
  "use strict";

  const D = window.RF_DATA;
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const KEYS = {
    routine: "rotinafit.routine.v1",
    history: "rotinafit.history.v1",
    playlist: "rotinafit.playlist.v1",
    settings: "rotinafit.settings.v1"
  };

  const DEFAULT_SETTINGS = { sound: true, vibration: true };

  const VIEW_META = {
    inicio: ["SEU ESPAÇO", "Início"],
    montar: ["PERSONALIZE", "Montar rotina"],
    rotina: ["SEU PLANO DE TREINO", "Minha rotina"],
    playlist: ["TREINO PERSONALIZADO", "Minha playlist"],
    exercicios: ["BIBLIOTECA", "Exercícios"],
    progresso: ["SEUS NÚMEROS", "Progresso"],
    treino: ["FOCUS MODE", "Treino em andamento"]
  };

  const state = {
    routine: load(KEYS.routine, null),
    history: load(KEYS.history, []),
    playlist: load(KEYS.playlist, []),
    settings: Object.assign({}, DEFAULT_SETTINGS, load(KEYS.settings, {})),
    active: null,
    view: "inicio",
    library: { q: "", group: "todos", equip: "todos" },
    timer: { left: 90, running: false, default: 90 },
    evolutionExercise: null
  };

  /* ------------------------------ Utils ------------------------------ */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      toast("Não foi possível salvar no navegador.", "error");
    }
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function norm(value) {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '"><use href="#i-' + name + '"></use></svg>';
  }

  function dateKey(date) {
    const d = date || new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }

  function formatDateShort(iso) {
    const parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1];
  }

  function mmss(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function toast(message, type) {
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    $("#toast-root").appendChild(el);
    window.setTimeout(function () {
      el.style.opacity = "0";
      el.style.transform = "translateX(16px)";
      window.setTimeout(function () { el.remove(); }, 250);
    }, 3200);
  }

  let modalCloseCallback = null;
  function openModal(html, onClose) {
    $("#modal-content").innerHTML = html;
    modalCloseCallback = typeof onClose === "function" ? onClose : null;
    $("#modal-backdrop").hidden = false;
    document.body.style.overflow = "hidden";
    $("#modal-close").focus();
  }

  function closeModal() {
    if ($("#modal-backdrop").hidden) return;
    $("#modal-backdrop").hidden = true;
    document.body.style.overflow = "";
    modalExerciseId = null;
    const cb = modalCloseCallback;
    modalCloseCallback = null;
    if (cb) cb();
  }

  function confirmDialog(title, message, confirmLabel) {
    return new Promise(function (resolve) {
      let settled = false;
      openModal([
        '<div class="modal-emoji">' + icon("info") + "</div>",
        "<h2>" + esc(title) + "</h2>",
        "<p>" + esc(message) + "</p>",
        '<div class="modal-actions">',
        '<button class="btn btn-primary" id="confirm-yes">' + esc(confirmLabel || "Confirmar") + "</button>",
        '<button class="btn btn-ghost" id="confirm-no">Cancelar</button>',
        "</div>"
      ].join(""), function () {
        if (!settled) { settled = true; resolve(false); }
      });
      $("#confirm-yes").addEventListener("click", function () {
        settled = true;
        closeModal();
        resolve(true);
      });
      $("#confirm-no").addEventListener("click", closeModal);
    });
  }

  /* ------------------------------ Navigation ------------------------------ */
  function showView(view) {
    if (view === "treino" && !state.active) view = "inicio";
    state.view = view;
    $$(".view").forEach(function (el) { el.classList.toggle("active", el.id === "view-" + view); });
    $$(".nav-item").forEach(function (el) {
      el.classList.toggle("active", el.dataset.view === view);
    });
    const meta = VIEW_META[view] || VIEW_META.inicio;
    $("#topbar-eyebrow").textContent = meta[0];
    $("#topbar-title").textContent = meta[1];
    window.scrollTo(0, 0);
  }

  /* ------------------------------ Stats ------------------------------ */
  function getStats() {
    const total = state.history.length;
    const minutes = Math.round(state.history.reduce(function (sum, h) { return sum + (h.duracaoSeg || 0); }, 0) / 60);
    const sets = state.history.reduce(function (sum, h) { return sum + (h.series || 0); }, 0);
    const days = new Set(state.history.map(function (h) { return h.date; }));
    const maxLoad = state.history.reduce(function (max, h) {
      return (h.registros || []).reduce(function (m, r) { return Math.max(m, Number(r.kg) || 0); }, max);
    }, 0);

    let streak = 0;
    const cursor = new Date();
    if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const last7 = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push({
        key: dateKey(d),
        label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(".", ""),
        count: days.has(dateKey(d)) ? state.history.filter(function (h) { return h.date === dateKey(d); }).length : 0,
        today: i === 0
      });
    }
    return { total: total, minutes: minutes, sets: sets, streak: streak, maxLoad: maxLoad, last7: last7 };
  }

  function statCard(iconName, value, label, tone) {
    return '<div class="stat-card"><span class="stat-icon ' + (tone || "") + '">' + icon(iconName) + '</span><div><div class="stat-value">' + esc(value) + '</div><div class="stat-label">' + esc(label) + "</div></div></div>";
  }

  /* ------------------------------ Routine building ------------------------------ */
  function buildDays(profile) {
    const base = D.SCHEMES[profile.objetivo] || D.SCHEMES["ganhar-massa"];
    let series = base.series;
    let descanso = base.descanso;

    if (profile.nivel === "iniciante") {
      series = Math.max(2, series - 1);
      descanso += 15;
    } else if (profile.nivel === "avancado") {
      series += profile.objetivo === "forca" ? 1 : 0;
      descanso = Math.max(30, descanso - 15);
    }

    const allowed = new Set(D.LOCATION_EQUIPMENT[profile.local] || D.LOCATION_EQUIPMENT.academia);
    const split = D.SPLITS[profile.dias] || D.SPLITS[3];
    const wantsCardio = profile.objetivo === "emagrecer" || profile.objetivo === "condicionamento";
    const cardioPool = D.EXERCISES.filter(function (e) { return e.grupo === "cardio" && allowed.has(e.equipamento); });

    return split.map(function (session, sessionIndex) {
      const chosen = [];

      session.slots.forEach(function (slot, slotIndex) {
        const pool = D.EXERCISES.filter(function (e) {
          return e.grupo === slot.grupo && allowed.has(e.equipamento);
        });
        if (!pool.length) return;
        const start = (sessionIndex * 2 + slotIndex) % pool.length;
        for (let k = 0; k < slot.qtd; k += 1) {
          const ex = pool[(start + k) % pool.length];
          if (!chosen.some(function (item) { return item.id === ex.id; })) {
            chosen.push({
              id: ex.id,
              nome: ex.nome,
              grupo: ex.grupo,
              equipamento: ex.equipamento,
              serieLabel: series + " × " + base.reps,
              descanso: descanso,
              dica: ex.dica
            });
          }
        }
      });

      if (wantsCardio && session.cardio > 0 && cardioPool.length) {
        const cardio = cardioPool[sessionIndex % cardioPool.length];
        chosen.push({
          id: cardio.id,
          nome: cardio.nome,
          grupo: "cardio",
          equipamento: cardio.equipamento,
          serieLabel: session.cardio + " min",
          descanso: 0,
          dica: cardio.dica
        });
      }

      const minutes = 5 + Math.round(chosen.reduce(function (sum, ex) {
        if (ex.grupo === "cardio") return sum + session.cardio;
        return sum + series * 0.6 + (series * descanso) / 60;
      }, 0));

      return {
        nome: session.nome,
        foco: session.foco,
        duracao: Math.max(15, minutes),
        exercicios: chosen
      };
    });
  }

  function generateRoutine(form) {
    const data = new FormData(form);
    const profile = {
      objetivo: data.get("objetivo"),
      nivel: data.get("nivel"),
      dias: Number(data.get("dias")),
      local: data.get("local"),
      observacoes: (data.get("observacoes") || "").trim()
    };
    state.routine = {
      createdAt: Date.now(),
      profile: profile,
      days: buildDays(profile)
    };
    save(KEYS.routine, state.routine);
    renderAll();
    showView("rotina");
    toast("Rotina criada! Bons treinos 💪");
  }

  function fillForm(profile) {
    if (!profile) return;
    ["objetivo", "nivel", "local"].forEach(function (name) {
      const input = $('input[name="' + name + '"][value="' + profile[name] + '"]');
      if (input) input.checked = true;
    });
    const range = $("#dias-range");
    range.value = profile.dias;
    $("#dias-value").textContent = profile.dias;
    $("#split-hint").textContent = D.SPLIT_HINTS[profile.dias] || "";
    $("#observacoes").value = profile.observacoes || "";
  }

  /* ------------------------------ Edição da rotina ------------------------------ */
  function exById(id) {
    return D.EXERCISES.find(function (e) { return e.id === id; });
  }

  function routineItem(ex, serieLabel, descanso) {
    return {
      id: ex.id, nome: ex.nome, grupo: ex.grupo, equipamento: ex.equipamento,
      serieLabel: serieLabel, descanso: descanso, dica: ex.dica
    };
  }

  function saveRoutine() {
    save(KEYS.routine, state.routine);
    renderRoutine();
    renderDashboard();
  }

  function updateDayDuration(day) {
    const minutes = 5 + Math.round(day.exercicios.reduce(function (sum, ex) {
      if (ex.grupo === "cardio") return sum + (parseInt(ex.serieLabel, 10) || 10);
      const series = Math.max(1, Number(String(ex.serieLabel).split("×")[0]) || 3);
      return sum + series * 0.6 + (series * (Number(ex.descanso) || 0)) / 60;
    }, 0));
    day.duracao = Math.max(15, minutes);
  }

  function removeRoutineExercise(key) {
    if (!state.routine) return;
    const parts = key.split("-").map(Number);
    const day = state.routine.days[parts[0]];
    if (!day || !day.exercicios[parts[1]]) return;
    const name = day.exercicios[parts[1]].nome;
    confirmDialog("Remover exercício?", "Remover " + name + " deste dia da rotina?", "Remover").then(function (yes) {
      if (!yes) return;
      day.exercicios.splice(parts[1], 1);
      updateDayDuration(day);
      saveRoutine();
      toast("Exercício removido da rotina.");
    });
  }

  function openExercisePicker(dayIndex, exIndex) {
    if (!state.routine) return;
    const day = state.routine.days[dayIndex];
    if (!day) return;
    const current = exIndex == null ? null : day.exercicios[exIndex];
    const pool = D.EXERCISES.filter(function (e) {
      if (!current) return true;
      return e.grupo === current.grupo;
    }).sort(function (a, b) {
      if (current) {
        if (a.equipamento === current.equipamento && b.equipamento !== current.equipamento) return -1;
        if (b.equipamento === current.equipamento && a.equipamento !== current.equipamento) return 1;
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    let query = "";
    openModal([
      '<div class="modal-emoji">' + icon("edit") + "</div>",
      "<h2>" + (current ? "Trocar exercício" : "Adicionar exercício") + "</h2>",
      "<p>" + (current
        ? "Escolha outro exercício para " + esc(current.nome) + "."
        : "Escolha um exercício para adicionar a " + esc(day.nome) + ".") + "</p>",
      '<div class="picker-tools"><div class="search-box picker-search">' + icon("search") +
      '<input type="search" id="picker-search" placeholder="Buscar exercício..." aria-label="Buscar exercício" /></div></div>',
      '<div class="picker-list" id="picker-list"></div>',
      '<div class="modal-actions"><button class="btn btn-ghost" data-close-modal="1">Cancelar</button></div>'
    ].join(""));

    function renderPicker() {
      const q = norm(query.trim());
      const list = pool.filter(function (e) { return !q || norm(e.nome).indexOf(q) !== -1; }).slice(0, 60);
      $("#picker-list").innerHTML = list.length ? list.map(function (e) {
        return [
          '<button class="picker-item" data-picker-id="' + esc(e.id) + '">',
          "<span><strong>" + esc(e.nome) + "</strong><small>" + esc(D.GROUP_LABELS[e.grupo]) + " · " + esc(D.EQUIP_LABELS[e.equipamento]) + "</small></span>",
          icon("plus") + "</button>"
        ].join("");
      }).join("") : '<p class="evo-empty">Nenhum exercício encontrado.</p>';
    }

    function choose(id) {
      const ex = exById(id);
      if (!ex) return;
      const serieLabel = current ? current.serieLabel : "3 × 10";
      const descanso = current ? current.descanso : 90;
      const item = routineItem(ex, serieLabel, descanso);
      if (current) day.exercicios[exIndex] = item;
      else day.exercicios.push(item);
      updateDayDuration(day);
      saveRoutine();
      closeModal();
      toast(current ? "Exercício trocado." : "Exercício adicionado à rotina.");
    }

    $("#picker-search").addEventListener("input", function () { query = this.value; renderPicker(); });
    $("#picker-list").addEventListener("click", function (event) {
      const btn = event.target.closest("[data-picker-id]");
      if (btn) choose(btn.dataset.pickerId);
    });
    renderPicker();
    $("#picker-search").focus();
  }

  /* ------------------------------ Playlist ------------------------------ */
  function defaultPlaylistItem(ex) {
    const objective = state.routine ? state.routine.profile.objetivo : "ganhar-massa";
    const scheme = D.SCHEMES[objective] || D.SCHEMES["ganhar-massa"];
    return {
      id: ex.id,
      nome: ex.nome,
      grupo: ex.grupo,
      equipamento: ex.equipamento,
      series: Math.max(2, scheme.series - 1),
      repeticoes: scheme.reps,
      descanso: scheme.descanso
    };
  }

  function addToPlaylist(id) {
    if (state.playlist.some(function (item) { return item.id === id; })) {
      toast("Esse exercício já está na sua playlist.");
      return;
    }
    const ex = D.EXERCISES.find(function (item) { return item.id === id; });
    if (!ex) return;
    state.playlist.push(defaultPlaylistItem(ex));
    save(KEYS.playlist, state.playlist);
    renderPlaylist();
    renderLibrary();
    const modalBtn = $("#modal-content [data-add-playlist]");
    if (modalBtn) {
      modalBtn.innerHTML = icon("check") + " Já está na playlist";
      modalBtn.disabled = true;
    }
    toast("Adicionado à playlist: " + ex.nome);
  }

  function removeFromPlaylist(index) {
    state.playlist.splice(index, 1);
    save(KEYS.playlist, state.playlist);
    renderPlaylist();
    renderLibrary();
  }

  function movePlaylist(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= state.playlist.length) return;
    const item = state.playlist.splice(index, 1)[0];
    state.playlist.splice(target, 0, item);
    save(KEYS.playlist, state.playlist);
    renderPlaylist();
  }

  function updatePlaylistField(index, field, value) {
    const item = state.playlist[index];
    if (!item) return;
    if (field === "descanso" || field === "series") {
      item[field] = Math.max(field === "descanso" ? 0 : 1, Number(value) || (field === "descanso" ? 0 : 1));
    } else {
      item[field] = String(value).trim() || "12";
    }
    save(KEYS.playlist, state.playlist);
  }

  function playlistDay() {
    return {
      nome: "Minha playlist",
      foco: "Treino personalizado",
      duracao: 0,
      exercicios: state.playlist.map(function (item) {
        const ex = D.EXERCISES.find(function (e) { return e.id === item.id; });
        return {
          id: item.id,
          nome: item.nome,
          grupo: item.grupo,
          equipamento: item.equipamento,
          serieLabel: item.series + " × " + item.repeticoes,
          descanso: Number(item.descanso) || 0,
          dica: ex ? ex.dica : ""
        };
      })
    };
  }

  /* ------------------------------ Rendering ------------------------------ */
  function renderAll() {
    renderDashboard();
    renderRoutine();
    renderPlaylist();
    renderLibrary();
    renderProgress();
  }

  function renderDashboard() {
    const hasRoutine = Boolean(state.routine && state.routine.days && state.routine.days.length);
    $("#dash-empty").hidden = hasRoutine;
    $("#dash-active").hidden = !hasRoutine;
    if (!hasRoutine) return;

    const stats = getStats();
    const weekdayIndex = (new Date().getDay() + 6) % 7;
    const dayIndex = weekdayIndex % state.routine.days.length;
    const day = state.routine.days[dayIndex];
    const objective = D.OBJECTIVE_LABELS[state.routine.profile.objetivo] || "Seu objetivo";

    $("#today-card").innerHTML = [
      '<div><span class="eyebrow">TREINO SUGERIDO PARA HOJE · ' + esc(objective.toUpperCase()) + "</span>",
      "<h2>" + esc(day.nome) + "</h2>",
      "<p>" + esc(day.foco) + " · " + day.exercicios.length + " exercícios · cerca de " + day.duracao + " min</p>",
      '<div class="today-card-actions">',
      '<button class="btn btn-primary" data-start-day="' + dayIndex + '">' + icon("play") + " Iniciar treino</button>",
      '<button class="btn btn-ghost" data-go="rotina">Ver rotina completa</button>',
      "</div></div>",
      '<div class="today-badge" aria-hidden="true">🔥</div>'
    ].join("");

    $("#dash-stats").innerHTML =
      statCard("check", stats.total, "Treinos concluídos") +
      statCard("fire", stats.streak, "Dias seguidos", "orange") +
      statCard("clock", stats.minutes, "Minutos treinados", "mint");
  }

  function renderRoutine() {
    const hasRoutine = Boolean(state.routine && state.routine.days && state.routine.days.length);
    $("#routine-empty").hidden = hasRoutine;
    $("#routine-content").hidden = !hasRoutine;
    $("#routine-actions").hidden = !hasRoutine;
    if (!hasRoutine) {
      $("#routine-subtitle").textContent = "Monte uma rotina para começar.";
      return;
    }

    const p = state.routine.profile;
    const avg = Math.round(state.routine.days.reduce(function (s, d) { return s + d.duracao; }, 0) / state.routine.days.length);
    $("#routine-subtitle").textContent = D.OBJECTIVE_LABELS[p.objetivo] + " · " + D.LEVEL_LABELS[p.nivel] + " · " + p.dias + " dias por semana";
    $("#routine-summary").innerHTML = [
      '<span class="summary-chip accent"><strong>' + esc((D.SCHEMES[p.objetivo] || {}).label || D.OBJECTIVE_LABELS[p.objetivo] || "Seu plano") + "</strong></span>",
      '<span class="summary-chip">' + p.dias + " treinos/semana</span>",
      '<span class="summary-chip">~' + avg + " min por treino</span>",
      '<span class="summary-chip">' + esc(D.LOCATION_LABELS[p.local]) + "</span>"
    ].join("");

    $("#week-grid").innerHTML = state.routine.days.map(function (day, index) {
      const rows = day.exercicios.map(function (ex, exIndex) {
        return [
          '<div class="ex-row"><span class="ex-row-num">' + (exIndex + 1) + "</span>",
          '<span class="ex-row-main"><span class="ex-row-name">' + esc(ex.nome) + '</span><span class="ex-row-set">' + esc(ex.serieLabel) + (ex.descanso ? " · " + ex.descanso + "s de descanso" : "") + "</span></span>",
          '<span class="tag">' + esc(D.GROUP_LABELS[ex.grupo] || ex.grupo) + "</span>",
          '<span class="day-ex-actions">',
          '<button class="ex-action" data-ex-change="' + index + "-" + exIndex + '" title="Trocar exercício" aria-label="Trocar exercício">' + icon("edit") + "</button>",
          '<button class="ex-action danger" data-ex-remove="' + index + "-" + exIndex + '" title="Remover exercício" aria-label="Remover exercício">' + icon("trash") + "</button>",
          "</span></div>"
        ].join("");
      }).join("") || '<p class="evo-empty">Nenhum exercício neste dia. Adicione um abaixo.</p>';

      return [
        '<article class="day-card" data-day-card="' + index + '">',
        '<div class="day-card-head"><div><span class="day-index">' + String(index + 1).padStart(2, "0") + "</span><h3>" + esc(day.nome) + '</h3><p class="day-focus">' + esc(day.foco) + '</p><div class="day-meta"><span>' + icon("clock") + " " + day.duracao + ' min</span><span>' + icon("dumbbell") + " " + day.exercicios.length + " exercícios</span></div></div>",
        '<button class="day-toggle" data-toggle-day="' + index + '" aria-label="Expandir treino">' + icon("chevron") + "</button></div>",
        '<div class="day-exercises">' + rows + "</div>",
        '<div class="day-actions"><button class="btn btn-primary btn-sm" data-start-day="' + index + '">' + icon("play") + " Iniciar este treino</button>",
        '<button class="btn btn-ghost btn-sm" data-ex-add="' + index + '">' + icon("plus") + " Adicionar exercício</button></div>",
        "</article>"
      ].join("");
    }).join("") + (p.observacoes ? '<div class="notes-box"><strong>Lembrete pessoal:</strong> ' + esc(p.observacoes) + "</div>" : "");
  }

  function renderPlaylist() {
    const hasItems = state.playlist.length > 0;
    $("#playlist-empty").hidden = hasItems;
    $("#playlist-content").hidden = !hasItems;
    $("#playlist-actions").hidden = !hasItems;
    $("#playlist-subtitle").textContent = hasItems
      ? "Use as setas para organizar e ajuste séries, repetições e descanso de cada exercício."
      : "Monte um treino só com os exercícios que você gosta.";

    if (!hasItems) return;

    const totalSets = state.playlist.reduce(function (sum, item) { return sum + (Number(item.series) || 1); }, 0);
    const minutes = 5 + Math.round(state.playlist.reduce(function (sum, item) {
      return sum + (Number(item.series) || 1) * 0.6 + ((Number(item.series) || 1) * (Number(item.descanso) || 0)) / 60;
    }, 0));

    $("#playlist-summary").innerHTML = [
      '<span class="summary-chip accent"><strong>' + state.playlist.length + (state.playlist.length === 1 ? " exercício" : " exercícios") + "</strong></span>",
      '<span class="summary-chip">' + totalSets + " séries no total</span>",
      '<span class="summary-chip">~' + minutes + " min</span>"
    ].join("");

    $("#playlist-list").innerHTML = state.playlist.map(function (item, index) {
      return [
        '<article class="playlist-item"><span class="pl-number">' + String(index + 1).padStart(2, "0") + "</span>",
        '<div class="pl-main"><div class="pl-head"><strong>' + esc(item.nome) + '</strong><span class="tag">' + esc(D.GROUP_LABELS[item.grupo] || item.grupo) + "</span></div>",
        '<div class="pl-fields">',
        '<label>Séries<input type="number" min="1" max="12" value="' + esc(item.series) + '" data-pl-field="series" data-pl-index="' + index + '" /></label>',
        '<label>Repetições<input type="text" maxlength="14" value="' + esc(item.repeticoes) + '" data-pl-field="repeticoes" data-pl-index="' + index + '" /></label>',
        '<label>Descanso (s)<input type="number" min="0" max="300" step="15" value="' + esc(item.descanso) + '" data-pl-field="descanso" data-pl-index="' + index + '" /></label>',
        "</div></div>",
        '<div class="pl-actions">',
        '<button class="pl-icon" data-pl-move="' + index + '" data-dir="-1" title="Subir" aria-label="Subir exercício">' + icon("up") + "</button>",
        '<button class="pl-icon" data-pl-move="' + index + '" data-dir="1" title="Descer" aria-label="Descer exercício">' + icon("down") + "</button>",
        '<button class="pl-icon" data-pl-demo="' + esc(item.id) + '" title="Ver animação" aria-label="Ver animação">' + icon("play") + "</button>",
        '<button class="pl-icon danger" data-pl-remove="' + index + '" title="Remover" aria-label="Remover exercício">' + icon("trash") + "</button>",
        "</div></article>"
      ].join("");
    }).join("");
  }

  function renderLibrary() {
    $("#group-filters").innerHTML = ["todos"].concat(Object.keys(D.GROUP_LABELS)).map(function (key) {
      const label = key === "todos" ? "Todos" : D.GROUP_LABELS[key];
      return '<button class="filter-chip' + (state.library.group === key ? " active" : "") + '" data-filter-group="' + key + '">' + esc(label) + "</button>";
    }).join("");

    $("#equip-filters").innerHTML = ["todos"].concat(Object.keys(D.EQUIP_LABELS)).map(function (key) {
      const label = key === "todos" ? "Qualquer equipamento" : D.EQUIP_LABELS[key];
      return '<button class="filter-chip' + (state.library.equip === key ? " active" : "") + '" data-filter-equip="' + key + '">' + esc(label) + "</button>";
    }).join("");

    const q = norm(state.library.q.trim());
    const results = D.EXERCISES.filter(function (ex) {
      const matchesGroup = state.library.group === "todos" || ex.grupo === state.library.group;
      const matchesEquip = state.library.equip === "todos" || ex.equipamento === state.library.equip;
      const matchesSearch = !q || norm(ex.nome).indexOf(q) !== -1 || norm(D.GROUP_LABELS[ex.grupo]).indexOf(q) !== -1;
      return matchesGroup && matchesEquip && matchesSearch;
    });

    $("#results-count").textContent = results.length + (results.length === 1 ? " exercício encontrado" : " exercícios encontrados");
    $("#exercise-grid").innerHTML = results.length ? results.map(function (ex) {
      const added = state.playlist.some(function (item) { return item.id === ex.id; });
      return [
        '<article class="ex-card' + (added ? " added" : "") + '">',
        '<button class="ex-card-main" data-exercise="' + ex.id + '">',
        '<div class="ex-card-top"><span class="ex-card-icon">' + icon("dumbbell") + '</span><span class="tag">' + esc(D.GROUP_LABELS[ex.grupo]) + "</span></div>",
        "<h3>" + esc(ex.nome) + "</h3>",
        '<div class="ex-card-tags"><span>' + esc(D.EQUIP_LABELS[ex.equipamento]) + "</span></div>",
        "</button>",
        '<button class="ex-card-add" data-add-playlist="' + ex.id + '" title="' + (added ? "Já está na playlist" : "Adicionar à playlist") + '" aria-label="Adicionar à playlist">' + icon(added ? "check" : "plus") + "</button>",
        "</article>"
      ].join("");
    }).join("") : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-emoji">🔍</div><h3>Nada encontrado</h3><p>Tente outro termo ou remova os filtros.</p></div>';
  }

  function renderProgress() {
    const stats = getStats();
    $("#progress-stats").innerHTML =
      statCard("check", stats.total, "Treinos concluídos") +
      statCard("clock", stats.minutes, "Minutos treinados", "mint") +
      statCard("fire", stats.streak, "Sequência atual", "orange") +
      statCard("dumbbell", stats.sets, "Séries realizadas") +
      statCard("weight", stats.maxLoad + " kg", "Maior carga", "orange");

    const max = Math.max(1, Math.max.apply(null, stats.last7.map(function (d) { return d.count; })));
    $("#week-chart").innerHTML = stats.last7.map(function (day) {
      const height = day.count ? Math.max(14, Math.round((day.count / max) * 100)) : 3;
      return '<div class="chart-col' + (day.today ? " today" : "") + '"><div class="chart-bar-wrap"><div class="chart-bar' + (day.count ? "" : " zero") + '" style="height:' + height + '%" title="' + day.count + ' treino(s)"></div></div><span class="chart-label">' + esc(day.label) + "</span></div>";
    }).join("");

    const history = state.history.slice().sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 20);
    $("#history-list").innerHTML = history.length ? history.map(function (h) {
      return '<div class="history-item"><span class="history-dot">' + icon("check") +
        '</span><div class="history-info"><strong>' + esc(h.dayName) +
        '</strong><small>' + formatDateShort(h.date) + ' · ' + h.series + ' de ' + h.total + ' séries</small></div>' +
        '<div class="history-right"><strong>' + mmss(h.duracaoSeg) + '</strong><span>tempo</span></div></div>';
    }).join("") : '<div class="empty-state" style="border:0"><div class="empty-emoji">📊</div><h3>Histórico vazio</h3><p>Finalize seu primeiro treino para ver os resultados aqui.</p></div>';

    renderEvolution();
  }

  function renderEvolution() {
    const panel = $("#evolution-panel");
    if (!panel) return;
    const entries = [];
    state.history.forEach(function (h) {
      (h.registros || []).forEach(function (r) {
        entries.push({
          nome: r.nome, serie: r.serie, kg: Number(r.kg) || 0,
          reps: r.reps || "", date: h.date, timestamp: h.timestamp
        });
      });
    });

    if (!entries.length) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;

    const names = Array.from(new Set(entries.map(function (e) { return e.nome; }))).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR");
    });
    if (!state.evolutionExercise || names.indexOf(state.evolutionExercise) === -1) {
      state.evolutionExercise = names[0];
    }
    const selected = state.evolutionExercise;
    const series = entries.filter(function (e) { return e.nome === selected; })
      .sort(function (a, b) { return a.timestamp - b.timestamp; });
    const last = series[series.length - 1];
    const best = series.reduce(function (m, e) { return e.kg > m.kg ? e : m; }, series[0]);
    const recent = series.slice(-7);
    const max = Math.max(1, Math.max.apply(null, recent.map(function (e) { return e.kg; })));

    $("#evolution-content").innerHTML = [
      '<label class="evolution-select">Exercício',
      '<select id="evolution-select">' + names.map(function (n) {
        return '<option value="' + esc(n) + '"' + (n === selected ? " selected" : "") + ">" + esc(n) + "</option>";
      }).join("") + "</select></label>",
      '<div class="evo-summary">',
      "<div><strong>" + last.kg + " kg</strong><span>Última carga · " + formatDateShort(last.date) + " · " + esc(last.reps || "rep") + "</span></div>",
      "<div><strong>" + best.kg + " kg</strong><span>Recorde · " + formatDateShort(best.date) + "</span></div>",
      "</div>",
      '<div class="chart">' + recent.map(function (e, i) {
        const height = e.kg ? Math.max(12, Math.round((e.kg / max) * 100)) : 3;
        return '<div class="chart-col' + (i === recent.length - 1 ? " today" : "") + '"><div class="chart-bar-wrap"><div class="chart-bar' + (e.kg ? "" : " zero") + '" style="height:' + height + '%" title="' + e.kg + ' kg"></div></div><span class="chart-label">' + formatDateShort(e.date) + "</span></div>";
      }).join("") + "</div>",
      '<div class="evo-log"><strong style="font-size:13px">Registros recentes</strong>' + series.slice().reverse().slice(0, 6).map(function (e) {
        return '<div class="evo-log-item"><span>' + formatDateShort(e.date) + " · série " + e.serie + " · " + esc(e.reps || "—") + " rep</span><strong>" + e.kg + " kg</strong></div>";
      }).join("") + "</div>"
    ].join("");

    $("#evolution-select").addEventListener("change", function () {
      state.evolutionExercise = this.value;
      renderEvolution();
    });
  }

  /* ------------------------------ Workout ------------------------------ */
  function currentWorkoutDay() {
    if (!state.active) return null;
    return state.active.customDay || (state.routine && state.routine.days[state.active.dayIndex]);
  }

  function startWorkout(dayIndex) {
    const day = state.routine && state.routine.days[dayIndex];
    if (day) beginWorkout(day, { dayIndex: dayIndex, dayName: day.nome, customDay: null });
  }

  function startPlaylistWorkout() {
    if (!state.playlist.length) {
      toast("Adicione exercícios à playlist antes de iniciar.", "error");
      return;
    }
    const day = playlistDay();
    beginWorkout(day, { dayIndex: null, dayName: "Minha playlist", customDay: day });
  }

  function beginWorkout(day, meta) {
    const firstRest = (day.exercicios.find(function (ex) { return ex.descanso > 0; }) || {}).descanso || 90;
    state.active = Object.assign({
      startedAt: Date.now(),
      elapsed: 0,
      checks: {},
      logs: {},
      totalSets: day.exercicios.reduce(function (sum, ex) { return sum + renderedSets(ex); }, 0)
    }, meta);
    state.timer = { left: firstRest, default: firstRest, running: false };
    showView("treino");
    renderWorkout();
    updateWorkoutClock();
    updateTimerUI();
  }

  function setKey(exIndex, setIndex) { return exIndex + "-" + setIndex; }

  function renderedSets(ex) {
    if (ex.grupo === "cardio") return 1;
    return Math.max(1, Number(String(ex.serieLabel).split("×")[0]) || 1);
  }

  function renderWorkout() {
    const day = currentWorkoutDay();
    if (!state.active || !day) return;
    $("#workout-name").textContent = day.nome;

    $("#workout-exercises").innerHTML = day.exercicios.map(function (ex, exIndex) {
      const count = renderedSets(ex);
      const buttons = [];
      const repsHint = String(ex.serieLabel).split("×")[1] || "rep";
      for (let i = 0; i < count; i += 1) {
        const key = setKey(exIndex, i);
        const done = Boolean(state.active.checks[key]);
        const log = state.active.logs[key] || {};
        buttons.push([
          '<div class="set-log">',
          '<button class="set-btn' + (done ? " done" : "") + '" data-set="' + key + '" aria-label="Série ' + (i + 1) + (done ? " concluída" : "") + '">' + (done ? icon("check") : (i + 1)) + "</button>",
          '<input type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg" value="' + esc(log.kg == null ? "" : log.kg) + '" data-log-kg="' + key + '" aria-label="Carga em kg da série ' + (i + 1) + '" />',
          '<input type="number" inputmode="numeric" min="0" step="1" placeholder="' + esc(repsHint.trim()) + '" value="' + esc(log.reps == null ? "" : log.reps) + '" data-log-reps="' + key + '" aria-label="Repetições da série ' + (i + 1) + '" />',
          "</div>"
        ].join(""));
      }
      return [
        '<article class="workout-ex"><div class="workout-ex-head"><div><h3>' + esc(ex.nome) + "</h3><p>" + esc(ex.serieLabel) + (ex.descanso ? " · descanso " + ex.descanso + "s" : "") + '</p></div><span class="tag">' + esc(D.GROUP_LABELS[ex.grupo]) + "</span></div>",
        '<div class="sets">' + buttons.join("") + "</div></article>"
      ].join("");
    }).join("");

    // Garante que o total reflita exatamente o que está na tela.
    state.active.totalSets = day.exercicios.reduce(function (sum, ex, index) { return sum + renderedSets(ex); }, 0);
    updateWorkoutProgress();
  }

  function updateWorkoutProgress() {
    if (!state.active) return;
    const done = Object.keys(state.active.checks).filter(function (k) { return state.active.checks[k]; }).length;
    const total = state.active.totalSets;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $("#workout-bar").style.width = pct + "%";
    $("#workout-progress-text").textContent = done + " / " + total + " séries";
    $("#btn-finalizar").innerHTML = "Finalizar treino " + icon("check");
  }

  function updateWorkoutClock() {
    if (!state.active) return;
    $("#workout-elapsed").textContent = mmss(state.active.elapsed);
  }

  function toggleSet(key) {
    if (!state.active) return;
    if (state.active.checks[key]) delete state.active.checks[key];
    else state.active.checks[key] = true;
    const btn = $('[data-set="' + key + '"]');
    const done = Boolean(state.active.checks[key]);
    if (btn) {
      btn.classList.toggle("done", done);
      btn.innerHTML = done ? icon("check") : key.split("-")[1] * 1 + 1;
      btn.setAttribute("aria-label", "Série " + (key.split("-")[1] * 1 + 1) + (done ? " concluída" : ""));
    }
    // Ao concluir uma série automaticamente, sugere o descanso.
    if (done) {
      const day = currentWorkoutDay();
      const ex = day && day.exercicios[Number(key.split("-")[0])];
      if (ex && ex.descanso > 0 && !state.timer.running) {
        state.timer = { left: ex.descanso, default: ex.descanso, running: false };
        updateTimerUI();
      }
    }
    updateWorkoutProgress();
  }

  function finishWorkout() {
    if (!state.active) return;
    const done = Object.keys(state.active.checks).filter(function (k) { return state.active.checks[k]; }).length;
    const total = state.active.totalSets;
    const proceed = done === 0
      ? window.confirm("Você não marcou nenhuma série. Deseja finalizar o treino mesmo assim?")
      : true;
    if (!proceed) return;

    const day = currentWorkoutDay();
    const registros = [];
    if (day) {
      day.exercicios.forEach(function (ex, exIndex) {
        for (let i = 0; i < renderedSets(ex); i += 1) {
          const log = (state.active.logs || {})[setKey(exIndex, i)];
          if (!log) continue;
          const kg = Number(log.kg);
          const reps = String(log.reps || "").trim();
          if (!Number.isFinite(kg) || kg <= 0) continue;
          registros.push({ id: ex.id, nome: ex.nome, serie: i + 1, kg: kg, reps: reps });
        }
      });
    }

    state.history.push({
      date: dateKey(),
      timestamp: Date.now(),
      dayName: state.active.dayName,
      duracaoSeg: state.active.elapsed,
      series: done,
      total: total,
      registros: registros
    });
    save(KEYS.history, state.history);
    state.active = null;
    state.timer.running = false;
    renderAll();
    showView("progresso");
    toast("Treino finalizado! Registrado no seu progresso 🔥");
  }

  function exitWorkout() {
    if (!state.active) return;
    confirmDialog("Sair do treino?", "O treino atual será descartado e não aparecerá no seu histórico.", "Sair sem salvar").then(function (yes) {
      if (!yes) return;
      state.active = null;
      state.timer.running = false;
      showView("rotina");
    });
  }

  function updateTimerUI() {
    $("#timer-display").textContent = mmss(state.timer.left);
    $("#btn-timer-toggle").textContent = state.timer.running ? "Pausar" : (state.timer.left < state.timer.default ? "Continuar" : "Iniciar");
  }

  function toggleTimer() {
    ensureAudio();
    if (state.timer.left <= 0) state.timer.left = state.timer.default;
    state.timer.running = !state.timer.running;
    updateTimerUI();
  }

  let audioCtx = null;
  function ensureAudio() {
    if (!state.settings.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* áudio é opcional */ }
  }

  function beep() {
    if (state.settings.sound) {
      ensureAudio();
      try {
        if (audioCtx) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.36);
        }
      } catch (e) { /* áudio é opcional */ }
    }
    if (state.settings.vibration && navigator.vibrate) {
      try { navigator.vibrate([200, 120, 200]); } catch (e) { /* vibração é opcional */ }
    }
  }

  /* ------------------------------ Vídeos do YouTube ------------------------------ */
  let online = navigator.onLine !== false;
  let modalExerciseId = null;

  function isOnline() { return online && navigator.onLine !== false; }

  function watchUrl(ex) {
    const id = D.VIDEOS[ex.id];
    return id
      ? "https://www.youtube.com/watch?v=" + id
      : "https://www.youtube.com/results?search_query=" + encodeURIComponent(ex.nome + " exercício como fazer");
  }

  function videoMessage(ex, id) {
    if (!isOnline()) {
      return {
        title: "Sem internet no momento",
        text: "O player volta automaticamente quando a conexão retornar. Enquanto isso, use as instruções abaixo ou guarde o link do YouTube para assistir depois."
      };
    }
    if (!id) {
      return {
        title: "Vídeo não disponível para este exercício",
        text: "Você ainda pode abrir a busca no YouTube ou seguir as instruções passo a passo abaixo."
      };
    }
    return {
      title: "Abra o vídeo no YouTube",
      text: "O player embutido é bloqueado quando o app é aberto direto do arquivo. Inicie o servidor no computador com o arquivo Iniciar.bat para assistir aqui, ou use o botão abaixo."
    };
  }

  function videoMarkup(ex) {
    const id = D.VIDEOS[ex.id];
    const url = watchUrl(ex);
    const canEmbed = isOnline() && Boolean(id) && (location.protocol === "http:" || location.protocol === "https:");
    const msg = canEmbed ? null : videoMessage(ex, id);
    const player = canEmbed
      ? '<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
        '?rel=0&modestbranding=1&playsinline=1" title="Vídeo: ' + esc(ex.nome) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
      : '<div class="video-offline"><span class="video-offline-icon">' + icon("info") + "</span><div><strong>" +
        esc(msg.title) + "</strong><p>" + esc(msg.text) + "</p></div></div>";

    return [
      '<div class="video-block">',
      player,
      '<div class="video-actions">',
      '<a class="btn btn-primary btn-sm" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + icon("play") + " Abrir no YouTube</a>",
      '<button class="btn btn-ghost btn-sm" data-copy-video="' + esc(url) + '">' + icon("list") + " Copiar link</button>",
      "</div></div>"
    ].join("");
  }

  function updateNetPill() {
    const pill = $("#net-pill");
    if (!pill) return;
    pill.classList.toggle("offline", !isOnline());
    $("#net-label").textContent = isOnline() ? "Online" : "Sem internet";
  }

  function refreshModalVideo() {
    if ($("#modal-backdrop").hidden || !modalExerciseId) return;
    const ex = D.EXERCISES.find(function (item) { return item.id === modalExerciseId; });
    const holder = $("#modal-video");
    if (ex && holder) holder.innerHTML = videoMarkup(ex);
  }

  function copyText(text) {
    function fallback() {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { /* navegador pode bloquear */ }
      input.remove();
      toast(ok ? "Link copiado!" : "Não foi possível copiar. Use o botão Abrir no YouTube.");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Link copiado!");
      }, fallback);
    } else {
      fallback();
    }
  }

  /* ------------------------------ Modal de exercício ------------------------------ */
  function openExerciseModal(id) {
    const ex = D.EXERCISES.find(function (item) { return item.id === id; });
    if (!ex) return;
    const steps = ex.descricao.split(". ").filter(Boolean).map(function (step, i) {
      return "<li><b>" + String(i + 1).padStart(2, "0") + "</b><span>" + esc(step.replace(/\.$/, "")) + ".</span></li>";
    }).join("");
    const added = state.playlist.some(function (item) { return item.id === ex.id; });
    modalExerciseId = ex.id;

    openModal([
      '<div id="modal-video">' + videoMarkup(ex) + "</div>",
      "<h2>" + esc(ex.nome) + "</h2>",
      '<div class="modal-tags"><span class="tag">' + esc(D.GROUP_LABELS[ex.grupo]) + '</span><span class="tag">' + esc(D.EQUIP_LABELS[ex.equipamento]) + "</span></div>",
      '<ul class="modal-steps">' + steps + "</ul>",
      '<div class="modal-tip"><strong>Dica:</strong> ' + esc(ex.dica) + "</div>",
      '<div class="modal-actions">',
      '<button class="btn btn-primary" data-add-playlist="' + esc(ex.id) + '">' + (added ? icon("check") + " Já está na playlist" : icon("plus") + " Adicionar à playlist") + "</button>",
      '<button class="btn btn-ghost" data-close-modal="1">Fechar</button>',
      "</div>"
    ].join(""));
  }

  /* ------------------------------ Backup e PWA ------------------------------ */
  function exportData() {
    const payload = {
      app: "RotinaFit",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        routine: state.routine,
        history: state.history,
        playlist: state.playlist,
        settings: state.settings
      }
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rotinafit-backup-" + dateKey() + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Backup exportado! Guarde o arquivo em um lugar seguro.");
    } catch (e) {
      toast("Não foi possível exportar o backup.", "error");
    }
  }

  function openBackupModal() {
    openModal([
      '<div class="modal-emoji">' + icon("download") + "</div>",
      "<h2>Backup dos dados</h2>",
      "<p>Exporte um arquivo com sua rotina, playlist, histórico e preferências. Para restaurar, escolha um backup salvo — os dados atuais deste navegador serão substituídos.</p>",
      '<div class="modal-actions">',
      '<button class="btn btn-primary" id="backup-export-modal">' + icon("download") + " Exportar arquivo</button>",
      '<button class="btn btn-ghost" id="backup-import-modal">' + icon("upload") + " Escolher arquivo</button>",
      "</div>"
    ].join(""));
    $("#backup-export-modal").addEventListener("click", function () { closeModal(); exportData(); });
    $("#backup-import-modal").addEventListener("click", function () { $("#import-file").click(); });
  }

  function normalizeBackup(data) {
    let routine = null;
    if (data.routine && Array.isArray(data.routine.days) && data.routine.days.length && data.routine.profile) {
      const profile = Object.assign({}, data.routine.profile);
      if (!D.OBJECTIVE_LABELS[profile.objetivo]) profile.objetivo = "ganhar-massa";
      if (!D.LEVEL_LABELS[profile.nivel]) profile.nivel = "iniciante";
      if (!D.LOCATION_LABELS[profile.local]) profile.local = "academia";
      profile.dias = Math.min(6, Math.max(2, Number(profile.dias) || 3));
      routine = {
        profile: profile,
        days: data.routine.days.map(function (day) {
          return {
            nome: String(day.nome || "Treino"),
            foco: String(day.foco || ""),
            duracao: Math.max(15, Number(day.duracao) || 45),
            exercicios: Array.isArray(day.exercicios) ? day.exercicios.map(function (ex) {
              return {
                id: String(ex.id || ""), nome: String(ex.nome || "Exercício"),
                grupo: D.GROUP_LABELS[ex.grupo] ? ex.grupo : "peito",
                equipamento: String(ex.equipamento || "barra"),
                serieLabel: String(ex.serieLabel || "3 × 10"),
                descanso: Math.max(0, Number(ex.descanso) || 0),
                dica: String(ex.dica || "")
              };
            }) : []
          };
        })
      };
    }
    const history = (Array.isArray(data.history) ? data.history : []).filter(function (h) {
      return h && typeof h === "object" && h.date && Number.isFinite(Number(h.timestamp));
    }).map(function (h) {
      return {
        date: String(h.date), timestamp: Number(h.timestamp),
        dayName: String(h.dayName || "Treino"),
        duracaoSeg: Math.max(0, Number(h.duracaoSeg) || 0),
        series: Math.max(0, Number(h.series) || 0),
        total: Math.max(0, Number(h.total) || 0),
        registros: Array.isArray(h.registros) ? h.registros.map(function (r) {
          return {
            id: String(r.id || ""), nome: String(r.nome || "Exercício"),
            serie: Math.max(1, Number(r.serie) || 1),
            kg: Math.max(0, Number(r.kg) || 0),
            reps: String(r.reps || "")
          };
        }) : []
      };
    });
    const playlist = (Array.isArray(data.playlist) ? data.playlist : []).filter(function (item) {
      return item && typeof item === "object" && item.id;
    });
    const settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
    settings.sound = settings.sound !== false;
    settings.vibration = settings.vibration !== false;
    return { routine: routine, history: history, playlist: playlist, settings: settings };
  }

  function applyBackup(payload) {
    const data = payload && payload.data;
    if (!data || typeof data !== "object") throw new Error("Arquivo inválido");
    const clean = normalizeBackup(data);
    confirmDialog("Importar backup?", "Isso substitui rotina, playlist, histórico e preferências salvos neste navegador. Continuar?", "Importar").then(function (yes) {
      if (!yes) return;
      state.routine = clean.routine;
      state.history = clean.history;
      state.playlist = clean.playlist;
      state.settings = clean.settings;
      state.active = null;
      state.evolutionExercise = null;
      save(KEYS.routine, state.routine);
      save(KEYS.history, state.history);
      save(KEYS.playlist, state.playlist);
      save(KEYS.settings, state.settings);
      syncSettingsUI();
      renderAll();
      showView("inicio");
      toast("Backup importado com sucesso!");
    });
  }

  function importBackup(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Arquivo muito grande para um backup.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      try {
        applyBackup(JSON.parse(String(reader.result)));
      } catch (e) {
        toast("Não foi possível ler o backup. Verifique se é um arquivo do RotinaFit.", "error");
      }
    };
    reader.onerror = function () { toast("Não foi possível ler o arquivo.", "error"); };
    reader.readAsText(file);
  }

  let installPrompt = null;
  function updateInstallButtons() {
    $$("[data-install-app]").forEach(function (btn) { btn.hidden = !installPrompt; });
  }

  function registerPWA() {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline é opcional */ });
    }
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      installPrompt = event;
      updateInstallButtons();
    });
    window.addEventListener("appinstalled", function () {
      installPrompt = null;
      updateInstallButtons();
      toast("RotinaFit instalado na tela inicial!");
    });
  }

  function syncSettingsUI() {
    const sound = $("#alert-sound");
    const vibration = $("#alert-vibration");
    if (sound) sound.checked = state.settings.sound !== false;
    if (vibration) vibration.checked = state.settings.vibration !== false;
  }

  /* ------------------------------ Eventos ------------------------------ */
  function bindEvents() {
    document.addEventListener("click", function (event) {
      const go = event.target.closest("[data-go]");
      if (go) { showView(go.dataset.go); return; }

      const nav = event.target.closest(".nav-item[data-view]");
      if (nav) { showView(nav.dataset.view); return; }

      const copyVideo = event.target.closest("[data-copy-video]");
      if (copyVideo) { copyText(copyVideo.dataset.copyVideo); return; }

      const closeModalBtn = event.target.closest("[data-close-modal]");
      if (closeModalBtn) { closeModal(); return; }

      const add = event.target.closest("[data-add-playlist]");
      if (add) { addToPlaylist(add.dataset.addPlaylist); return; }

      const plMove = event.target.closest("[data-pl-move]");
      if (plMove) { movePlaylist(Number(plMove.dataset.plMove), Number(plMove.dataset.dir)); return; }

      const plRemove = event.target.closest("[data-pl-remove]");
      if (plRemove) { removeFromPlaylist(Number(plRemove.dataset.plRemove)); return; }

      const plDemo = event.target.closest("[data-pl-demo]");
      if (plDemo) { openExerciseModal(plDemo.dataset.plDemo); return; }

      const start = event.target.closest("[data-start-day]");
      if (start) { startWorkout(Number(start.dataset.startDay)); return; }

      const toggle = event.target.closest("[data-toggle-day]");
      if (toggle) {
        const card = toggle.closest(".day-card");
        if (card) card.classList.toggle("open");
        return;
      }

      const dayHead = event.target.closest(".day-card-head");
      if (dayHead) {
        const card = dayHead.closest(".day-card");
        if (card) card.classList.toggle("open");
        return;
      }

      const groupFilter = event.target.closest("[data-filter-group]");
      if (groupFilter) { state.library.group = groupFilter.dataset.filterGroup; renderLibrary(); return; }

      const equipFilter = event.target.closest("[data-filter-equip]");
      if (equipFilter) { state.library.equip = equipFilter.dataset.filterEquip; renderLibrary(); return; }

      const exercise = event.target.closest("[data-exercise]");
      if (exercise) { openExerciseModal(exercise.dataset.exercise); return; }

      const set = event.target.closest("[data-set]");
      if (set) { toggleSet(set.dataset.set); return; }

      const preset = event.target.closest("[data-sec]");
      if (preset) {
        ensureAudio();
        state.timer = { left: Number(preset.dataset.sec), default: Number(preset.dataset.sec), running: false };
        updateTimerUI();
      }

      const exChange = event.target.closest("[data-ex-change]");
      if (exChange) {
        const parts = exChange.dataset.exChange.split("-").map(Number);
        openExercisePicker(parts[0], parts[1]);
        return;
      }

      const exRemove = event.target.closest("[data-ex-remove]");
      if (exRemove) { removeRoutineExercise(exRemove.dataset.exRemove); return; }

      const exAdd = event.target.closest("[data-ex-add]");
      if (exAdd) { openExercisePicker(Number(exAdd.dataset.exAdd), null); return; }
    });

    $("#routine-form").addEventListener("submit", function (event) {
      event.preventDefault();
      generateRoutine(this);
    });

    $("#dias-range").addEventListener("input", function () {
      $("#dias-value").textContent = this.value;
      $("#split-hint").textContent = D.SPLIT_HINTS[this.value] || "";
    });

    $("#library-search").addEventListener("input", function () {
      state.library.q = this.value;
      renderLibrary();
    });

    $("#btn-refazer").addEventListener("click", function () {
      fillForm(state.routine && state.routine.profile);
      showView("montar");
      toast("Ajuste os dados e gere uma nova rotina.");
    });

    $("#btn-excluir").addEventListener("click", function () {
      confirmDialog("Excluir rotina?", "Sua rotina e todo o histórico de treinos serão apagados deste navegador.", "Excluir tudo").then(function (yes) {
        if (!yes) return;
        state.routine = null;
        state.history = [];
        state.active = null;
        localStorage.removeItem(KEYS.routine);
        localStorage.removeItem(KEYS.history);
        renderAll();
        showView("inicio");
        toast("Rotina e histórico removidos.");
      });
    });

    $("#btn-iniciar-playlist").addEventListener("click", startPlaylistWorkout);

    $("#btn-limpar-playlist").addEventListener("click", function () {
      confirmDialog("Limpar playlist?", "Todos os exercícios serão removidos da sua playlist.", "Limpar playlist").then(function (yes) {
        if (!yes) return;
        state.playlist = [];
        save(KEYS.playlist, state.playlist);
        renderPlaylist();
        renderLibrary();
        toast("Playlist limpa.");
      });
    });

    $("#playlist-list").addEventListener("change", function (event) {
      const field = event.target.closest("[data-pl-field]");
      if (!field) return;
      updatePlaylistField(Number(field.dataset.plIndex), field.dataset.plField, field.value);
      renderPlaylist();
    });

    $("#workout-exercises").addEventListener("change", function (event) {
      if (!state.active) return;
      const field = event.target.closest("[data-log-kg], [data-log-reps]");
      if (!field) return;
      const key = field.dataset.logKg != null ? field.dataset.logKg : field.dataset.logReps;
      const prop = field.dataset.logKg != null ? "kg" : "reps";
      if (!state.active.logs) state.active.logs = {};
      const log = state.active.logs[key] || (state.active.logs[key] = {});
      log[prop] = field.value.trim();
    });

    $("#btn-sair-treino").addEventListener("click", exitWorkout);
    $("#btn-finalizar").addEventListener("click", finishWorkout);
    $("#btn-timer-toggle").addEventListener("click", toggleTimer);
    $("#btn-timer-reset").addEventListener("click", function () {
      state.timer = { left: state.timer.default, default: state.timer.default, running: false };
      updateTimerUI();
    });
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-backdrop").addEventListener("click", function (event) {
      if (event.target === this) closeModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !$("#modal-backdrop").hidden) closeModal();
    });

    window.addEventListener("online", function () {
      online = true;
      updateNetPill();
      refreshModalVideo();
    });
    window.addEventListener("offline", function () {
      online = false;
      updateNetPill();
      refreshModalVideo();
    });

    $("#btn-export").addEventListener("click", exportData);
    $("#btn-import").addEventListener("click", function () { $("#import-file").click(); });
    $("#btn-backup-side").addEventListener("click", openBackupModal);
    $("#import-file").addEventListener("change", function () {
      importBackup(this.files && this.files[0]);
      this.value = "";
    });

    $$("[data-install-app]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then(function () {
          installPrompt = null;
          updateInstallButtons();
        });
      });
    });

    [["#alert-sound", "sound"], ["#alert-vibration", "vibration"]].forEach(function (pair) {
      const el = $(pair[0]);
      if (!el) return;
      el.addEventListener("change", function () {
        state.settings[pair[1]] = this.checked;
        save(KEYS.settings, state.settings);
        if (pair[1] === "sound" && this.checked) ensureAudio();
      });
    });
  }

  /* ------------------------------ Relógio global ------------------------------ */
  window.setInterval(function () {
    let needsWorkoutUpdate = false;
    let needsTimerUpdate = false;

    if (state.active && state.view === "treino") {
      state.active.elapsed += 1;
      needsWorkoutUpdate = true;
    }
    if (state.timer.running) {
      state.timer.left -= 1;
      needsTimerUpdate = true;
      if (state.timer.left <= 0) {
        state.timer.left = 0;
        state.timer.running = false;
        beep();
        toast("Descanso finalizado. Vamos para a próxima série!");
      }
    }
    if (needsWorkoutUpdate) updateWorkoutClock();
    if (needsTimerUpdate) updateTimerUI();
  }, 1000);

  /* ------------------------------ Init ------------------------------ */
  function init() {
    const now = new Date();
    $("#today-date").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);
    if (state.routine) fillForm(state.routine.profile);
    bindEvents();
    syncSettingsUI();
    updateNetPill();
    updateInstallButtons();
    registerPWA();
    renderAll();
    showView("inicio");
  }

  init();
})();
