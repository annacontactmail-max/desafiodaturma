// ============================================================
// DESAFIO DA TURMA - APP.JS
// ============================================================

const KEY = "desafioTurmaV2";

// ------------------------------------------------------------
// DADOS INICIAIS
// ------------------------------------------------------------

const DEFAULTS = {
  className: "Turma",
  pin: "1234",
  score: 0,

  levels: [
    { name: "Sair mais cedo", points: 20, emoji: "🟦" },
    { name: "Aula livre", points: 35, emoji: "🟩" },
    { name: "Torneio", points: 50, emoji: "🟨" },
    { name: "Aula na rua", points: 70, emoji: "🟧" },
    { name: "Festa 1h", points: 100, emoji: "🟪" },
    { name: "Festa 2h", points: 130, emoji: "🏆" }
  ],

  actions: [
    {
      name: "Semana sem ocorrências nem faltas",
      points: 3,
      emoji: "🟢"
    },
    {
      name: "Elogio",
      points: 4,
      emoji: "⭐"
    },
    {
      name: "Ocorrência",
      points: -3,
      emoji: "🔴"
    },
    {
      name: "Falta injustificada",
      points: -2,
      emoji: "🟠"
    },
    {
      name: "Falta disciplinar",
      points: -10,
      emoji: "🚨"
    }
  ]
};

// ------------------------------------------------------------
// ESTADO
// ------------------------------------------------------------

let data = loadLocal();
let history = [];

let adminUnlocked = false;
let currentClassroomId = null;

let supabaseClient = null;

// ------------------------------------------------------------
// ELEMENTOS
// ------------------------------------------------------------

const $ = (selector) => document.querySelector(selector);

// ------------------------------------------------------------
// SUPABASE
// ------------------------------------------------------------

function initSupabase() {
  try {
    if (
      typeof window.supabase !== "undefined" &&
      typeof SUPABASE_URL !== "undefined" &&
      typeof SUPABASE_KEY !== "undefined"
    ) {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      console.log("Supabase ligado.");
      return true;
    }

    console.warn("Supabase não configurado. A usar armazenamento local.");
    return false;

  } catch (error) {
    console.error("Erro ao iniciar Supabase:", error);
    supabaseClient = null;
    return false;
  }
}

// ------------------------------------------------------------
// LOCAL STORAGE
// ------------------------------------------------------------

function loadLocal() {
  try {
    const saved = localStorage.getItem(KEY);

    if (!saved) {
      return structuredClone(DEFAULTS);
    }

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(DEFAULTS),
      ...parsed,
      score: Math.max(0, Number(parsed.score) || 0),
      levels: Array.isArray(parsed.levels)
        ? parsed.levels
        : structuredClone(DEFAULTS.levels),
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
        : structuredClone(DEFAULTS.actions)
    };

  } catch (error) {
    console.error("Erro ao carregar dados locais:", error);
    return structuredClone(DEFAULTS);
  }
}

function saveLocal() {
  try {
    data.score = Math.max(0, Number(data.score) || 0);

    localStorage.setItem(
      KEY,
      JSON.stringify(data)
    );

  } catch (error) {
    console.error("Erro ao guardar dados locais:", error);
  }
}

// ------------------------------------------------------------
// HISTÓRICO LOCAL
// ------------------------------------------------------------

function loadLocalHistory() {
  try {
    const saved = localStorage.getItem(KEY + "_history");

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];

  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    return [];
  }
}

function saveLocalHistory() {
  try {
    localStorage.setItem(
      KEY + "_history",
      JSON.stringify(history)
    );
  } catch (error) {
    console.error("Erro ao guardar histórico:", error);
  }
}

// ------------------------------------------------------------
// SUPABASE - CARREGAR TURMA
// ------------------------------------------------------------

async function loadRemote() {
  if (!supabaseClient) {
    return;
  }

  try {
    const { data: classrooms, error } =
      await supabaseClient
        .from("classrooms")
        .select("*")
        .limit(1);

    if (error) {
      console.error("Erro ao carregar turma:", error);
      return;
    }

    if (!classrooms || classrooms.length === 0) {
      console.log("Ainda não existe turma no Supabase.");
      return;
    }

    const remote = classrooms[0];

    currentClassroomId = remote.id;

    data.className =
      remote.name ||
      data.className ||
      DEFAULTS.className;

    data.pin =
      remote.pin ||
      data.pin ||
      DEFAULTS.pin;

    data.score =
      Math.max(
        0,
        Number(remote.score) || 0
      );

    if (Array.isArray(remote.levels)) {
      data.levels = remote.levels;
    }

    if (Array.isArray(remote.actions)) {
      data.actions = remote.actions;
    }

    saveLocal();

    await loadRemoteHistory();

    render();

    console.log("Dados carregados do Supabase.");

  } catch (error) {
    console.error("Erro na sincronização:", error);
  }
}

// ------------------------------------------------------------
// SUPABASE - GUARDAR TURMA
// ------------------------------------------------------------

async function saveRemote() {
  if (!supabaseClient) {
    return;
  }

  try {
    const payload = {
      name: data.className,
      pin: data.pin,
      score: Math.max(0, Number(data.score) || 0),
      levels: data.levels,
      actions: data.actions,
      updated_at: new Date().toISOString()
    };

    let result;

    if (currentClassroomId) {
      result = await supabaseClient
        .from("classrooms")
        .update(payload)
        .eq("id", currentClassroomId);

    } else {
      result = await supabaseClient
        .from("classrooms")
        .insert(payload)
        .select()
        .single();

      if (!result.error && result.data) {
        currentClassroomId = result.data.id;
      }
    }

    if (result.error) {
      console.error(
        "Erro ao guardar no Supabase:",
        result.error
      );
      return;
    }

    console.log("Dados guardados no Supabase.");

  } catch (error) {
    console.error("Erro ao guardar remotamente:", error);
  }
}

// ------------------------------------------------------------
// SUPABASE - HISTÓRICO
// ------------------------------------------------------------

async function loadRemoteHistory() {
  if (!supabaseClient || !currentClassroomId) {
    return;
  }

  try {
    const { data: remoteHistory, error } =
      await supabaseClient
        .from("score_history")
        .select("*")
        .eq("classroom_id", currentClassroomId)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error(
        "Erro ao carregar histórico:",
        error
      );

      return;
    }

    history = Array.isArray(remoteHistory)
      ? remoteHistory
      : [];

    saveLocalHistory();

    renderHistory();

  } catch (error) {
    console.error(
      "Erro no histórico:",
      error
    );
  }
}

async function saveRemoteHistory(item) {
  if (!supabaseClient || !currentClassroomId) {
    return;
  }

  try {
    const payload = {
      classroom_id: currentClassroomId,
      name: item.name,
      emoji: item.emoji,
      delta: item.delta,
      before_score: item.before_score,
      after_score: item.after_score,
      created_at: item.created_at
    };

    const { error } =
      await supabaseClient
        .from("score_history")
        .insert(payload);

    if (error) {
      console.error(
        "Erro ao guardar histórico:",
        error
      );
    }

  } catch (error) {
    console.error(
      "Erro no histórico remoto:",
      error
    );
  }
}

// ------------------------------------------------------------
// RENDER PRINCIPAL
// ------------------------------------------------------------

function render() {
  data.score = Math.max(
    0,
    Number(data.score) || 0
  );

  if ($("#classTitle")) {
    $("#classTitle").textContent =
      data.className || "Turma";
  }

  if ($("#score")) {
    $("#score").textContent =
      Math.max(0, data.score);
  }

  renderProgress();

  renderLevels();

  renderActions();

  renderHistory();

  updateAdminVisibility();
}

// ------------------------------------------------------------
// PROGRESSO
// ------------------------------------------------------------

function renderProgress() {
  const score = Math.max(
    0,
    Number(data.score) || 0
  );

  const levels = [...data.levels]
    .sort((a, b) => Number(a.points) - Number(b.points));

  let previous = 0;
  let nextLevel = null;

  for (const level of levels) {
    if (score < Number(level.points)) {
      nextLevel = level;
      break;
    }

    previous = Number(level.points);
  }

  if (!nextLevel) {
    if ($("#progressBar")) {
      $("#progressBar").style.width = "100%";
    }

    if ($("#nextText")) {
      $("#nextText").textContent =
        "🏆 A turma alcançou todos os níveis!";
    }

    if ($("#celebration")) {
      $("#celebration").textContent =
        "🎉 Parabéns, turma!";
    }

  } else {
    const target = Number(nextLevel.points);

    const range = target - previous;

    const progress =
      range > 0
        ? ((score - previous) / range) * 100
        : 0;

    if ($("#progressBar")) {
      $("#progressBar").style.width =
        Math.max(0, Math.min(100, progress)) + "%";
    }

    if ($("#nextText")) {
      $("#nextText").textContent =
        `${target - score} pontos para "${nextLevel.name}"`;
    }

    if ($("#celebration")) {
      $("#celebration").textContent =
        `${nextLevel.emoji} Próximo prémio: ${nextLevel.name}`;
    }
  }

  renderChart();
}

// ------------------------------------------------------------
// NÍVEIS
// ------------------------------------------------------------

function renderLevels() {
  const container = $("#levels");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const levels = [...data.levels]
    .sort((a, b) => Number(a.points) - Number(b.points));

  levels.forEach((level) => {
    const card = document.createElement("div");

    card.className = "levelCard";

    const achieved =
      data.score >= Number(level.points);

    if (achieved) {
      card.classList.add("achieved");
    }

    card.innerHTML = `
      <div class="levelEmoji">
        ${level.emoji || "🏆"}
      </div>

      <div class="levelInfo">
        <strong>${escapeHtml(level.name)}</strong>
        <span>${Number(level.points)} pontos</span>
      </div>

      <div class="levelStatus">
        ${achieved ? "✅" : "🔒"}
      </div>
    `;

    container.appendChild(card);
  });
}

// ------------------------------------------------------------
// AÇÕES
// ------------------------------------------------------------

function renderActions() {
  const positiveContainer =
    $("#positiveActions");

  const negativeContainer =
    $("#negativeActions");

  if (positiveContainer) {
    positiveContainer.innerHTML = "";
  }

  if (negativeContainer) {
    negativeContainer.innerHTML = "";
  }

  data.actions.forEach((action, index) => {
    const button = document.createElement("button");

    button.className = "actionButton";

    if (Number(action.points) >= 0) {
      button.classList.add("positive");
    } else {
      button.classList.add("negative");
    }

    button.dataset.index = index;

    button.innerHTML = `
      <span class="actionEmoji">
        ${action.emoji || "⭐"}
      </span>

      <span class="actionName">
        ${escapeHtml(action.name)}
      </span>

      <strong>
        ${Number(action.points) > 0 ? "+" : ""}
        ${Number(action.points)}
      </strong>
    `;

    button.addEventListener(
      "click",
      () => change(index)
    );

    if (Number(action.points) >= 0) {
      if (positiveContainer) {
        positiveContainer.appendChild(button);
      }
    } else {
      if (negativeContainer) {
        negativeContainer.appendChild(button);
      }
    }
  });

  updateAdminVisibility();
}

// ------------------------------------------------------------
// VISIBILIDADE DOS BOTÕES ADMIN
// ------------------------------------------------------------

function updateAdminVisibility() {
  const positive =
    $("#positiveActions");

  const negative =
    $("#negativeActions");

  const lockedMessagePositive =
    document.querySelector("#positiveLocked");

  const lockedMessageNegative =
    document.querySelector("#negativeLocked");

  if (adminUnlocked) {
    if (lockedMessagePositive) {
      lockedMessagePositive.style.display = "none";
    }

    if (lockedMessageNegative) {
      lockedMessageNegative.style.display = "none";
    }

    if (positive) {
      positive.style.display = "";
    }

    if (negative) {
      negative.style.display = "";
    }

  } else {
    if (positive) {
      positive.style.display = "none";
    }

    if (negative) {
      negative.style.display = "none";
    }

    if (lockedMessagePositive) {
      lockedMessagePositive.style.display = "";
      lockedMessagePositive.textContent =
        "🔒 Área do administrador — Entre na Administração para ganhar pontos.";
    }

    if (lockedMessageNegative) {
      lockedMessageNegative.style.display = "";
      lockedMessageNegative.textContent =
        "🔒 Área do administrador — Entre na Administração para retirar pontos.";
    }
  }
}

// ------------------------------------------------------------
// ALTERAR PONTOS
// ------------------------------------------------------------

async function change(index) {
  if (!adminUnlocked) {
    alert(
      "🔒 Apenas o administrador pode alterar os pontos."
    );

    return;
  }

  const action = data.actions[index];

  if (!action) {
    return;
  }

  const before =
    Math.max(0, Number(data.score) || 0);

  const requestedDelta =
    Number(action.points) || 0;

  // A pontuação nunca pode ficar abaixo de zero.
  data.score = Math.max(
    0,
    before + requestedDelta
  );

  const actualChange =
    data.score - before;

  // Se era uma penalização e a turma já estava a 0,
  // não criamos um registo desnecessário.
  if (actualChange === 0) {
    alert(
      "A turma já está com 0 pontos."
    );

    data.score = before;

    return;
  }

  const historyItem = {
    name: action.name,
    emoji: action.emoji || "⭐",
    delta: actualChange,
    before_score: before,
    after_score: data.score,
    created_at: new Date().toISOString()
  };

  history.unshift(historyItem);

  saveLocal();

  saveLocalHistory();

  render();

  await saveRemote();

  await saveRemoteHistory(historyItem);
}

// ------------------------------------------------------------
// DESFAZER ÚLTIMA ALTERAÇÃO
// ------------------------------------------------------------

async function undo() {
  if (!adminUnlocked) {
    alert(
      "🔒 Apenas o administrador pode desfazer alterações."
    );

    return;
  }

  if (!history.length) {
    alert(
      "Não existe nenhuma alteração para desfazer."
    );

    return;
  }

  const last = history.shift();

  data.score = Math.max(
    0,
    Number(last.before_score) || 0
  );

  saveLocal();

  saveLocalHistory();

  render();

  await saveRemote();

  // Recarrega o histórico remoto para manter
  // a informação sincronizada.
  await loadRemoteHistory();
}

// ------------------------------------------------------------
// LIMPAR HISTÓRICO
// ------------------------------------------------------------

async function clearHistory() {
  if (!adminUnlocked) {
    alert(
      "🔒 Apenas o administrador pode limpar o histórico."
    );

    return;
  }

  if (!history.length) {
    return;
  }

  const confirmed = confirm(
    "Tem a certeza de que quer limpar o histórico?"
  );

  if (!confirmed) {
    return;
  }

  history = [];

  saveLocalHistory();

  if (
    supabaseClient &&
    currentClassroomId
  ) {
    try {
      const { error } =
        await supabaseClient
          .from("score_history")
          .delete()
          .eq(
            "classroom_id",
            currentClassroomId
          );

      if (error) {
        console.error(
          "Erro ao limpar histórico remoto:",
          error
        );
      }

    } catch (error) {
      console.error(
        "Erro ao limpar histórico:",
        error
      );
    }
  }

  renderHistory();
}

// ------------------------------------------------------------
// HISTÓRICO
// ------------------------------------------------------------

function renderHistory() {
  const container = $("#history");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!history.length) {
    container.innerHTML = `
      <div class="emptyHistory">
        Ainda não existem alterações registadas.
      </div>
    `;

    return;
  }

  history.forEach((item) => {
    const row = document.createElement("div");

    row.className = "historyItem";

    const delta =
      Number(item.delta) || 0;

    const deltaText =
      delta > 0
        ? `+${delta}`
        : `${delta}`;

    row.innerHTML = `
      <div class="historyEmoji">
        ${item.emoji || "⭐"}
      </div>

      <div class="historyInfo">
        <strong>
          ${escapeHtml(item.name)}
        </strong>

        <small>
          ${formatDate(item.created_at)}
        </small>
      </div>

      <div class="historyDelta ${
        delta >= 0
          ? "historyPositive"
          : "historyNegative"
      }">
        ${deltaText}
      </div>
    `;

    container.appendChild(row);
  });
}

// ------------------------------------------------------------
// GRÁFICO
// ------------------------------------------------------------

function renderChart() {
  const line =
    $("#chartLine");

  const dots =
    $("#chartDots");

  const currentScore =
    $("#chartCurrentScore");

  const empty =
    $("#chartEmpty");

  if (!line || !dots) {
    return;
  }

  const values = [];

  // Começamos com a pontuação anterior
  // mais antiga disponível.
  if (history.length) {
    const reversed =
      [...history].reverse();

    if (reversed.length) {
      values.push(
        Math.max(
          0,
          Number(reversed[0].before_score) || 0
        )
      );

      reversed.forEach((item) => {
        values.push(
          Math.max(
            0,
            Number(item.after_score) || 0
          )
        );
      });
    }
  }

  if (!values.length) {
    values.push(
      Math.max(
        0,
        Number(data.score) || 0
      )
    );
  }

  const width = 600;
  const height = 220;
  const padding = 25;

  const maxValue =
    Math.max(...values, 1);

  const minValue = 0;

  const usableWidth =
    width - padding * 2;

  const usableHeight =
    height - padding * 2;

  const points = values.map(
    (value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding +
            (index /
              (values.length - 1)) *
              usableWidth;

      const y =
        height -
        padding -
        ((value - minValue) /
          (maxValue - minValue || 1)) *
          usableHeight;

      return {
        x,
        y,
        value
      };
    }
  );

  const path =
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${
            point.x
          } ${point.y}`
      )
      .join(" ");

  line.setAttribute(
    "d",
    path
  );

  dots.innerHTML = "";

  points.forEach((point) => {
    const circle =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );

    circle.setAttribute(
      "cx",
      point.x
    );

    circle.setAttribute(
      "cy",
      point.y
    );

    circle.setAttribute(
      "r",
      "5"
    );

    dots.appendChild(circle);
  });

  if (currentScore) {
    currentScore.textContent =
      `${Math.max(0, data.score)} pontos`;
  }

  if (empty) {
    empty.style.display =
      values.length > 1
        ? "none"
        : "";
  }
}

// ------------------------------------------------------------
// ADMINISTRAÇÃO
// ------------------------------------------------------------

function openAdmin() {
  const modal =
    $("#adminModal");

  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");

  adminUnlocked = false;

  if ($("#pinArea")) {
    $("#pinArea").style.display = "";
  }

  if ($("#adminForm")) {
    $("#adminForm").style.display = "none";
  }

  if ($("#pinInput")) {
    $("#pinInput").value = "";
    $("#pinInput").focus();
  }

  // IMPORTANTE:
  // Nunca mostramos o PIN atual.
  if ($("#newPinInput")) {
    $("#newPinInput").value = "";
    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";
  }
}

function closeAdmin() {
  adminUnlocked = false;

  const modal =
    $("#adminModal");

  if (modal) {
    modal.classList.add("hidden");
  }

  if ($("#pinInput")) {
    $("#pinInput").value = "";
  }

  if ($("#newPinInput")) {
    $("#newPinInput").value = "";
  }

  render();
}

// ------------------------------------------------------------
// ENTRAR NA ADMINISTRAÇÃO
// ------------------------------------------------------------

function unlockAdmin() {
  const enteredPin =
    $("#pinInput")
      ? $("#pinInput").value.trim()
      : "";

  if (!enteredPin) {
    alert(
      "Introduza o PIN."
    );

    return;
  }

  // O PIN é comparado com o PIN guardado.
  // NÃO existe bypass universal.
  if (
    enteredPin ===
    String(data.pin)
  ) {
    adminUnlocked = true;

    if ($("#pinArea")) {
      $("#pinArea").style.display =
        "none";
    }

    if ($("#adminForm")) {
      $("#adminForm").style.display =
        "";
    }

    loadAdmin();

    updateAdminVisibility();

  } else {
    adminUnlocked = false;

    alert(
      "PIN incorreto."
    );

    if ($("#pinInput")) {
      $("#pinInput").value = "";
      $("#pinInput").focus();
    }
  }
}

// ------------------------------------------------------------
// CARREGAR FORMULÁRIO ADMIN
// ------------------------------------------------------------

function loadAdmin() {
  if (!adminUnlocked) {
    return;
  }

  if ($("#classInput")) {
    $("#classInput").value =
      data.className || "";
  }

  // IMPORTANTE:
  // O PIN atual NÃO é colocado no campo.
  if ($("#newPinInput")) {
    $("#newPinInput").value = "";

    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";
  }

  renderAdminLevels();
}

// ------------------------------------------------------------
// NÍVEIS NO ADMIN
// ------------------------------------------------------------

function renderAdminLevels() {
  const container =
    $("#levelInputs");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  data.levels.forEach(
    (level, index) => {
      const wrapper =
        document.createElement("div");

      wrapper.className =
        "adminLevelRow";

      wrapper.innerHTML = `
        <input
          type="text"
          class="levelNameInput"
          data-index="${index}"
          value="${escapeAttribute(level.name)}"
          placeholder="Nome do prémio"
        >

        <input
          type="number"
          class="levelPointsInput"
          data-index="${index}"
          value="${Number(level.points)}"
          min="0"
          placeholder="Pontos"
        >

        <input
          type="text"
          class="levelEmojiInput"
          data-index="${index}"
          value="${escapeAttribute(level.emoji || "")}"
          maxlength="4"
          placeholder="🏆"
        >
      `;

      container.appendChild(wrapper);
    }
  );
}

// ------------------------------------------------------------
// GUARDAR ADMIN
// ------------------------------------------------------------

async function saveAdmin(event) {
  if (event) {
    event.preventDefault();
  }

  if (!adminUnlocked) {
    alert(
      "🔒 Primeiro entre na Administração."
    );

    return;
  }

  // Nome da turma
  if ($("#classInput")) {
    const className =
      $("#classInput").value.trim();

    if (className) {
      data.className =
        className;
    }
  }

  // ----------------------------------------------------------
  // PIN
  // ----------------------------------------------------------

  // NÃO mostramos o PIN atual.
  // Se o campo estiver vazio, mantém o PIN existente.
  if ($("#newPinInput")) {
    const newPin =
      $("#newPinInput")
        .value
        .trim();

    if (newPin) {
      data.pin = newPin;
    }
  }

  // ----------------------------------------------------------
  // NÍVEIS
  // ----------------------------------------------------------

  const nameInputs =
    document.querySelectorAll(
      ".levelNameInput"
    );

  const pointsInputs =
    document.querySelectorAll(
      ".levelPointsInput"
    );

  const emojiInputs =
    document.querySelectorAll(
      ".levelEmojiInput"
    );

  const newLevels = [];

  data.levels.forEach(
    (level, index) => {
      const nameInput =
        nameInputs[index];

      const pointsInput =
        pointsInputs[index];

      const emojiInput =
        emojiInputs[index];

      const name =
        nameInput
          ? nameInput.value.trim()
          : level.name;

      const points =
        pointsInput
          ? Math.max(
              0,
              Number(pointsInput.value) || 0
            )
          : Number(level.points);

      const emoji =
        emojiInput
          ? emojiInput.value.trim()
          : level.emoji;

      newLevels.push({
        name:
          name || level.name,
        points,
        emoji:
          emoji || level.emoji || "🏆"
      });
    }
  );

  data.levels = newLevels;

  // Garantir score válido
  data.score = Math.max(
    0,
    Number(data.score) || 0
  );

  saveLocal();

  render();

  await saveRemote();

  alert(
    "✅ Definições guardadas!"
  );

  // Limpa o campo do novo PIN depois de guardar.
  if ($("#newPinInput")) {
    $("#newPinInput").value = "";
    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";
  }
}

// ------------------------------------------------------------
// RESET DA TURMA
// ------------------------------------------------------------

async function resetClass() {
  if (!adminUnlocked) {
    alert(
      "🔒 Apenas o administrador pode reiniciar a pontuação."
    );

    return;
  }

  const confirmed =
    confirm(
      "Tem a certeza de que quer colocar a pontuação da turma a 0?"
    );

  if (!confirmed) {
    return;
  }

  data.score = 0;

  saveLocal();

  render();

  await saveRemote();

  alert(
    "✅ A pontuação voltou a 0."
  );
}

// ------------------------------------------------------------
// EVENTOS
// ------------------------------------------------------------

function setupEvents() {
  // Abrir administração
  if ($("#adminBtn")) {
    $("#adminBtn").addEventListener(
      "click",
      openAdmin
    );
  }

  // Fechar administração
  if ($("#closeAdmin")) {
    $("#closeAdmin").addEventListener(
      "click",
      closeAdmin
    );
  }

  // Entrar
  if ($("#unlockBtn")) {
    $("#unlockBtn").addEventListener(
      "click",
      unlockAdmin
    );
  }

  // Formulário admin
  if ($("#adminForm")) {
    $("#adminForm").addEventListener(
      "submit",
      saveAdmin
    );
  }

  // Reset
  if ($("#resetBtn")) {
    $("#resetBtn").addEventListener(
      "click",
      resetClass
    );
  }

  // Limpar histórico
  if ($("#clearHistory")) {
    $("#clearHistory").addEventListener(
      "click",
      clearHistory
    );
  }

  // Sair da administração
  if ($("#adminLogout")) {
    $("#adminLogout").addEventListener(
      "click",
      closeAdmin
    );
  }

  // Enter no campo PIN
  if ($("#pinInput")) {
    $("#pinInput").addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          unlockAdmin();
        }
      }
    );
  }

  // Escape fecha administração
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        $("#adminModal") &&
        !$("#adminModal").classList.contains("hidden")
      ) {
        closeAdmin();
      }
    }
  );
}

// ------------------------------------------------------------
// ESCAPAR HTML
// ------------------------------------------------------------

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

// ------------------------------------------------------------
// DATA
// ------------------------------------------------------------

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  try {
    const date =
      new Date(dateString);

    return date.toLocaleString(
      "pt-PT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  } catch {
    return "";
  }
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO AUTOMÁTICA
// ------------------------------------------------------------

async function autoSync() {
  if (!supabaseClient) {
    return;
  }

  // Não alteramos o estado de administrador
  // durante a sincronização.
  await loadRemote();
}

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------

async function init() {
  console.log(
    "A iniciar Desafio da Turma..."
  );

  history = loadLocalHistory();

  data.score = Math.max(
    0,
    Number(data.score) || 0
  );

  setupEvents();

  render();

  initSupabase();

  if (supabaseClient) {
    await loadRemote();
  }

  // Sincronização automática a cada 5 segundos.
  setInterval(
    autoSync,
    5000
  );

  console.log(
    "Desafio da Turma iniciado."
  );
}

// ------------------------------------------------------------
// COMEÇAR
// ------------------------------------------------------------

document.addEventListener(
  "DOMContentLoaded",
  init
);
