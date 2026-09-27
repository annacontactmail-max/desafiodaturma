/* =========================================================
   DESAFIO DA TURMA
   app.js
   ========================================================= */

const KEY = "desafioTurmaV2";

const defaultData = {
  className: "Turma",
  pin: "1234",
  score: 0,

  levels: [
    { points: 20, label: "Sair mais cedo", emoji: "🟦" },
    { points: 35, label: "Aula livre", emoji: "🟩" },
    { points: 50, label: "Torneio", emoji: "🟨" },
    { points: 70, label: "Aula na rua", emoji: "🟧" },
    { points: 100, label: "Festa 1h", emoji: "🟪" },
    { points: 130, label: "Festa 2h", emoji: "🏆" }
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


/* =========================================================
   ESTADO
   ========================================================= */

let data = loadLocalData();
let history = [];

let adminUnlocked = false;
let classroomId = null;

let supabaseClient = null;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);


/* =========================================================
   SUPABASE
   ========================================================= */

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
    } else {
      console.warn(
        "Supabase não está configurado. A aplicação irá usar armazenamento local."
      );
    }
  } catch (error) {
    console.error("Erro ao iniciar Supabase:", error);
    supabaseClient = null;
  }
}


/* =========================================================
   DADOS LOCAIS
   ========================================================= */

function loadLocalData() {
  try {
    const saved = localStorage.getItem(KEY);

    if (!saved) {
      return structuredClone(defaultData);
    }

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(defaultData),
      ...parsed,
      score: Math.max(0, Number(parsed.score || 0)),
      levels: Array.isArray(parsed.levels)
        ? parsed.levels
        : structuredClone(defaultData.levels),
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
        : structuredClone(defaultData.actions)
    };
  } catch (error) {
    console.error("Erro ao carregar dados locais:", error);
    return structuredClone(defaultData);
  }
}


function saveLocalData() {
  try {
    data.score = Math.max(0, Number(data.score || 0));

    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao guardar dados locais:", error);
  }
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  initSupabase();

  setupEvents();

  render();

  await loadFromSupabase();

  render();

  setInterval(async () => {
    await loadFromSupabase();
    render();
  }, 5000);
});


/* =========================================================
   EVENTOS
   ========================================================= */

function setupEvents() {

  // Abrir administração
  const adminBtn = $("#adminBtn");

  if (adminBtn) {
    adminBtn.addEventListener("click", openAdmin);
  }


  // Fechar administração
  const closeAdmin = $("#closeAdmin");

  if (closeAdmin) {
    closeAdmin.addEventListener("click", closeAdminModal);
  }


  // Entrar na administração
  const unlockBtn = $("#unlockBtn");

  if (unlockBtn) {
    unlockBtn.addEventListener("click", unlockAdmin);
  }


  // Enter no campo PIN
  const pinInput = $("#pinInput");

  if (pinInput) {
    pinInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        unlockAdmin();
      }
    });
  }


  // Guardar configurações
  const adminForm = $("#adminForm");

  if (adminForm) {
    adminForm.addEventListener("submit", saveAdminSettings);
  }


  // Reset
  const resetBtn = $("#resetBtn");

  if (resetBtn) {
    resetBtn.addEventListener("click", resetClass);
  }


  // Limpar histórico
  const clearHistory = $("#clearHistory");

  if (clearHistory) {
    clearHistory.addEventListener("click", clearHistoryData);
  }


  // Sair da administração
  const adminLogout = $("#adminLogout");

  if (adminLogout) {
    adminLogout.addEventListener("click", closeAdminModal);
  }
}


/* =========================================================
   ADMINISTRAÇÃO
   ========================================================= */

function openAdmin() {

  adminUnlocked = false;

  const modal = $("#adminModal");

  if (!modal) return;

  modal.classList.remove("hidden");

  showPinArea();

  loadAdmin();
}


function closeAdminModal() {

  adminUnlocked = false;

  const modal = $("#adminModal");

  if (modal) {
    modal.classList.add("hidden");
  }

  render();
}


function showPinArea() {

  const pinArea = $("#pinArea");
  const adminForm = $("#adminForm");

  if (pinArea) {
    pinArea.classList.remove("hidden");
  }

  if (adminForm) {
    adminForm.classList.add("hidden");
  }

  const pinInput = $("#pinInput");

  if (pinInput) {
    pinInput.value = "";
    pinInput.focus();
  }
}


function unlockAdmin() {

  const pinInput = $("#pinInput");

  if (!pinInput) return;

  const enteredPin = pinInput.value.trim();

  if (!enteredPin) {
    alert("Introduza o PIN.");
    return;
  }

  if (enteredPin === String(data.pin)) {

    adminUnlocked = true;

    const pinArea = $("#pinArea");
    const adminForm = $("#adminForm");

    if (pinArea) {
      pinArea.classList.add("hidden");
    }

    if (adminForm) {
      adminForm.classList.remove("hidden");
    }

    loadAdmin();

    updateAdminVisibility();

  } else {

    alert("PIN incorreto.");

    pinInput.value = "";
    pinInput.focus();
  }
}


/* =========================================================
   ADMIN - CARREGAR CONFIGURAÇÕES
   ========================================================= */

function loadAdmin() {

  const classInput = $("#classInput");

  if (classInput) {
    classInput.value = data.className || "";
  }


  /*
    IMPORTANTE:
    Nunca mostramos o PIN atual neste campo.
    O administrador só escreve aqui se quiser alterá-lo.
  */

  const newPinInput = $("#newPinInput");

  if (newPinInput) {
    newPinInput.value = "";
    newPinInput.placeholder =
      "Deixe vazio para manter o PIN atual";
  }


  const levelInputs = $("#levelInputs");

  if (!levelInputs) return;

  levelInputs.innerHTML = "";


  data.levels.forEach((level, index) => {

    const row = document.createElement("div");

    row.className = "admin-level-row";

    row.innerHTML = `
      <input
        type="number"
        min="0"
        value="${Number(level.points) || 0}"
        data-level-points="${index}"
        placeholder="Pontos"
      >

      <input
        type="text"
        value="${escapeHtml(level.label || "")}"
        data-level-label="${index}"
        placeholder="Nome do prémio"
      >

      <input
        type="text"
        value="${escapeHtml(level.emoji || "")}"
        data-level-emoji="${index}"
        placeholder="Emoji"
      >
    `;

    levelInputs.appendChild(row);
  });
}


/* =========================================================
   ADMIN - GUARDAR
   ========================================================= */

async function saveAdminSettings(event) {

  event.preventDefault();

  if (!adminUnlocked) {
    alert("🔒 Primeiro entre na Administração.");
    return;
  }


  const classInput = $("#classInput");

  if (classInput) {
    const newClassName = classInput.value.trim();

    if (newClassName) {
      data.className = newClassName;
    }
  }


  // Só altera o PIN se o administrador escrever um novo
  const newPinInput = $("#newPinInput");

  if (newPinInput) {

    const newPin = newPinInput.value.trim();

    if (newPin) {
      data.pin = newPin;
    }
  }


  // Atualizar níveis
  const levelInputs = $("#levelInputs");

  if (levelInputs) {

    data.levels = data.levels.map((level, index) => {

      const pointsInput =
        levelInputs.querySelector(
          `[data-level-points="${index}"]`
        );

      const labelInput =
        levelInputs.querySelector(
          `[data-level-label="${index}"]`
        );

      const emojiInput =
        levelInputs.querySelector(
          `[data-level-emoji="${index}"]`
        );

      return {
        points: Math.max(
          0,
          Number(pointsInput?.value || level.points || 0)
        ),

        label:
          labelInput?.value.trim() ||
          level.label,

        emoji:
          emojiInput?.value.trim() ||
          level.emoji
      };
    });
  }


  // Ordenar níveis por pontuação
  data.levels.sort((a, b) => {
    return Number(a.points) - Number(b.points);
  });


  saveLocalData();

  await saveToSupabase();

  alert("✅ Configurações guardadas.");

  render();
}


/* =========================================================
   VISIBILIDADE DOS BOTÕES DE PONTOS
   ========================================================= */

function updateAdminVisibility() {

  const positiveActions = $("#positiveActions");
  const negativeActions = $("#negativeActions");

  if (!positiveActions || !negativeActions) return;


  if (!adminUnlocked) {

    positiveActions.innerHTML = `
      <div class="admin-lock-message">
        🔒 Área do administrador
        <small>Entre na Administração para ganhar pontos.</small>
      </div>
    `;

    negativeActions.innerHTML = `
      <div class="admin-lock-message">
        🔒 Área do administrador
        <small>Entre na Administração para retirar pontos.</small>
      </div>
    `;

    return;
  }


  renderActions();
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  data.score = Math.max(0, Number(data.score || 0));

  saveLocalData();


  // Nome da turma
  const classTitle = $("#classTitle");

  if (classTitle) {
    classTitle.textContent = data.className || "Turma";
  }


  // Pontuação
  const score = $("#score");

  if (score) {
    score.textContent = data.score;
  }


  renderProgress();

  renderLevels();

  renderActions();

  renderHistory();

  renderChart();

  updateAdminVisibility();
}


/* =========================================================
   PROGRESSO
   ========================================================= */

function renderProgress() {

  const progressBar = $("#progressBar");
  const nextText = $("#nextText");
  const celebration = $("#celebration");

  const levels = [...data.levels]
    .sort((a, b) => Number(a.points) - Number(b.points));


  if (!levels.length) {

    if (progressBar) {
      progressBar.style.width = "0%";
    }

    if (nextText) {
      nextText.textContent = "Ainda não existem prémios definidos.";
    }

    if (celebration) {
      celebration.textContent = "";
    }

    return;
  }


  const currentScore = Math.max(0, data.score);

  const nextLevel = levels.find(
    level => Number(level.points) > currentScore
  );


  if (!nextLevel) {

    if (progressBar) {
      progressBar.style.width = "100%";
    }

    if (nextText) {
      nextText.textContent =
        "🎉 A turma atingiu todos os prémios!";
    }

    if (celebration) {
      celebration.textContent = "🏆 Parabéns, turma!";
    }

    return;
  }


  const previousLevel =
    [...levels]
      .reverse()
      .find(
        level => Number(level.points) <= currentScore
      );


  const startPoints =
    previousLevel
      ? Number(previousLevel.points)
      : 0;

  const targetPoints =
    Number(nextLevel.points);


  const totalDistance =
    targetPoints - startPoints;

  const currentDistance =
    currentScore - startPoints;


  let percentage =
    totalDistance > 0
      ? (currentDistance / totalDistance) * 100
      : 0;


  percentage = Math.max(
    0,
    Math.min(100, percentage)
  );


  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }


  if (nextText) {

    const remaining =
      Math.max(
        0,
        targetPoints - currentScore
      );

    nextText.textContent =
      `Faltam ${remaining} pontos para ${nextLevel.emoji} ${nextLevel.label}`;
  }


  if (celebration) {

    const reached =
      levels.filter(
        level =>
          Number(level.points) <= currentScore
      );

    if (reached.length) {
      celebration.textContent =
        `🎉 Último prémio alcançado: ${reached[reached.length - 1].emoji} ${reached[reached.length - 1].label}`;
    } else {
      celebration.textContent = "";
    }
  }
}


/* =========================================================
   NÍVEIS / PRÉMIOS
   ========================================================= */

function renderLevels() {

  const container = $("#levels");

  if (!container) return;

  container.innerHTML = "";


  const levels = [...data.levels]
    .sort((a, b) => Number(a.points) - Number(b.points));


  levels.forEach(level => {

    const reached =
      data.score >= Number(level.points);


    const card = document.createElement("div");

    card.className =
      `level-card ${reached ? "reached" : ""}`;


    card.innerHTML = `
      <div class="level-emoji">
        ${escapeHtml(level.emoji || "🎁")}
      </div>

      <div class="level-points">
        ${Number(level.points)} pts
      </div>

      <div class="level-label">
        ${escapeHtml(level.label || "Prémio")}
      </div>

      <div class="level-status">
        ${reached ? "✅ Conquistado" : "🔒 Por conquistar"}
      </div>
    `;


    container.appendChild(card);
  });
}


/* =========================================================
   AÇÕES
   ========================================================= */

function renderActions() {

  const positiveActions = $("#positiveActions");
  const negativeActions = $("#negativeActions");


  if (!positiveActions || !negativeActions) {
    return;
  }


  // Se não estiver autenticado, mostramos o aviso
  if (!adminUnlocked) {
    return;
  }


  positiveActions.innerHTML = "";
  negativeActions.innerHTML = "";


  data.actions.forEach((action, index) => {

    const button = document.createElement("button");

    button.type = "button";

    button.className =
      action.points >= 0
        ? "action-btn positive"
        : "action-btn negative";


    button.innerHTML = `
      <span class="action-emoji">
        ${escapeHtml(action.emoji || "")}
      </span>

      <span class="action-name">
        ${escapeHtml(action.name || "Ação")}
      </span>

      <strong>
        ${action.points > 0 ? "+" : ""}
        ${Number(action.points)}
      </strong>
    `;


    button.addEventListener("click", () => {
      change(index);
    });


    if (action.points >= 0) {
      positiveActions.appendChild(button);
    } else {
      negativeActions.appendChild(button);
    }
  });
}


/* =========================================================
   ALTERAR PONTOS
   ========================================================= */

async function change(index) {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode alterar os pontos."
    );

    return;
  }


  const action = data.actions[index];

  if (!action) return;


  const before =
    Math.max(0, Number(data.score || 0));


  const requestedChange =
    Number(action.points || 0);


  const newScore =
    Math.max(
      0,
      before + requestedChange
    );


  const actualChange =
    newScore - before;


  // Se tentar retirar pontos quando já está a 0
  if (actualChange === 0) {

    alert(
      "A turma já está com 0 pontos."
    );

    return;
  }


  data.score = newScore;


  // Guardar no histórico
  const historyItem = {

    name: action.name,

    emoji: action.emoji,

    delta: actualChange,

    before_score: before,

    after_score: newScore,

    created_at:
      new Date().toISOString()
  };


  history.unshift(historyItem);


  saveLocalData();

  render();


  await saveHistoryToSupabase(historyItem);

  await saveToSupabase();
}


/* =========================================================
   HISTÓRICO
   ========================================================= */

function renderHistory() {

  const container = $("#history");

  if (!container) return;


  if (!history.length) {

    container.innerHTML = `
      <div class="empty-history">
        Ainda não existem movimentos.
      </div>
    `;

    return;
  }


  container.innerHTML = "";


  history.slice(0, 50).forEach(item => {

    const row = document.createElement("div");

    row.className = "history-row";


    const delta =
      Number(item.delta || 0);


    const sign =
      delta > 0 ? "+" : "";


    const date =
      item.created_at
        ? new Date(item.created_at)
            .toLocaleString("pt-PT")
        : "";


    row.innerHTML = `
      <div class="history-icon">
        ${escapeHtml(item.emoji || "•")}
      </div>

      <div class="history-info">
        <strong>
          ${escapeHtml(item.name || "Movimento")}
        </strong>

        <small>
          ${date}
        </small>
      </div>

      <div class="history-points ${delta >= 0 ? "positive" : "negative"}">
        ${sign}${delta}
      </div>
    `;


    container.appendChild(row);
  });
}


/* =========================================================
   DESFAZER ÚLTIMA ALTERAÇÃO
   ========================================================= */

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


  data.score =
    Math.max(
      0,
      Number(last.before_score || 0)
    );


  saveLocalData();

  render();

  await saveToSupabase();


  alert("↩️ Última alteração desfeita.");
}


/* =========================================================
   LIMPAR HISTÓRICO
   ========================================================= */

async function clearHistoryData() {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode limpar o histórico."
    );

    return;
  }


  const confirmed =
    confirm(
      "Tem a certeza de que quer limpar o histórico?"
    );


  if (!confirmed) return;


  history = [];

  render();


  if (
    supabaseClient &&
    classroomId
  ) {

    try {

      await supabaseClient
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );

    } catch (error) {

      console.error(
        "Erro ao limpar histórico:",
        error
      );
    }
  }
}


/* =========================================================
   RESET
   ========================================================= */

async function resetClass() {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode fazer o reset."
    );

    return;
  }


  const confirmed =
    confirm(
      "Tem a certeza de que quer colocar a pontuação a 0?"
    );


  if (!confirmed) return;


  data.score = 0;

  history = [];


  saveLocalData();

  render();

  await saveToSupabase();


  if (
    supabaseClient &&
    classroomId
  ) {

    try {

      await supabaseClient
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );

    } catch (error) {

      console.error(
        "Erro ao apagar histórico:",
        error
      );
    }
  }


  alert(
    "🔄 A pontuação foi reiniciada para 0."
  );
}


/* =========================================================
   GRÁFICO
   ========================================================= */

function renderChart() {

  const line = $("#chartLine");
  const dots = $("#chartDots");
  const currentScore = $("#chartCurrentScore");
  const empty = $("#chartEmpty");


  if (!line || !dots) return;


  if (!history.length) {

    line.setAttribute(
      "points",
      ""
    );

    dots.innerHTML = "";


    if (currentScore) {
      currentScore.textContent =
        data.score;
    }


    if (empty) {
      empty.classList.remove("hidden");
    }

    return;
  }


  if (empty) {
    empty.classList.add("hidden");
  }


  /*
    Criamos a evolução:
    ponto inicial + alterações do histórico.
  */

  const orderedHistory =
    [...history]
      .reverse();


  const values = [0];


  orderedHistory.forEach(item => {

    values.push(
      Math.max(
        0,
        Number(item.after_score || 0)
      )
    );
  });


  values.push(
    Math.max(0, data.score)
  );


  const width = 700;
  const height = 260;
  const padding = 30;


  const maxValue =
    Math.max(
      10,
      ...values
    );


  const minValue = 0;


  const usableWidth =
    width - padding * 2;

  const usableHeight =
    height - padding * 2;


  const points =
    values.map((value, index) => {

      const x =
        padding +
        (
          index /
          Math.max(1, values.length - 1)
        ) *
        usableWidth;


      const ratio =
        (value - minValue) /
        Math.max(1, maxValue - minValue);


      const y =
        height -
        padding -
        ratio * usableHeight;


      return {
        x,
        y,
        value
      };
    });


  line.setAttribute(
    "points",
    points
      .map(p => `${p.x},${p.y}`)
      .join(" ")
  );


  dots.innerHTML = "";


  points.forEach(point => {

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
      "6"
    );


    const title =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title"
      );


    title.textContent =
      `${point.value} pontos`;


    circle.appendChild(title);

    dots.appendChild(circle);
  });


  if (currentScore) {
    currentScore.textContent =
      data.score;
  }
}


/* =========================================================
   SUPABASE - CARREGAR
   ========================================================= */

async function loadFromSupabase() {

  if (!supabaseClient) {
    return;
  }


  try {

    const result =
      await supabaseClient
        .from("classrooms")
        .select("*")
        .limit(1);


    if (result.error) {

      console.warn(
        "Não foi possível carregar do Supabase:",
        result.error
      );

      return;
    }


    const rows =
      result.data || [];


    if (!rows.length) {

      console.log(
        "Ainda não existe uma turma no Supabase."
      );

      return;
    }


    const remote =
      rows[0];


    classroomId =
      remote.id || null;


    data.className =
      remote.name ||
      data.className;


    /*
      O PIN só é atualizado se vier efetivamente
      da base de dados.
    */

    if (
      remote.pin !== undefined &&
      remote.pin !== null
    ) {

      data.pin =
        String(remote.pin);
    }


    data.score =
      Math.max(
        0,
        Number(remote.score || 0)
      );


    if (
      Array.isArray(remote.levels)
    ) {

      data.levels =
        remote.levels;
    }


    if (
      Array.isArray(remote.actions)
    ) {

      data.actions =
        remote.actions;
    }


    saveLocalData();


    await loadHistoryFromSupabase();

  } catch (error) {

    console.error(
      "Erro ao sincronizar com Supabase:",
      error
    );
  }
}


/* =========================================================
   SUPABASE - GUARDAR
   ========================================================= */

async function saveToSupabase() {

  if (!supabaseClient) {
    return;
  }


  try {

    const payload = {

      name:
        data.className,

      pin:
        data.pin,

      score:
        Math.max(
          0,
          Number(data.score || 0)
        ),

      levels:
        data.levels,

      actions:
        data.actions,

      updated_at:
        new Date().toISOString()
    };


    let result;


    if (classroomId) {

      result =
        await supabaseClient
          .from("classrooms")
          .update(payload)
          .eq("id", classroomId);

    } else {

      result =
        await supabaseClient
          .from("classrooms")
          .insert(payload)
          .select()
          .single();


      if (
        result.data &&
        result.data.id
      ) {

        classroomId =
          result.data.id;
      }
    }


    if (result.error) {

      console.error(
        "Erro ao guardar no Supabase:",
        result.error
      );
    }

  } catch (error) {

    console.error(
      "Erro ao guardar dados:",
      error
    );
  }
}


/* =========================================================
   SUPABASE - HISTÓRICO
   ========================================================= */

async function saveHistoryToSupabase(item) {

  if (
    !supabaseClient ||
    !classroomId
  ) {
    return;
  }


  try {

    const result =
      await supabaseClient
        .from("score_history")
        .insert({

          classroom_id:
            classroomId,

          name:
            item.name,

          emoji:
            item.emoji,

          delta:
            item.delta,

          before_score:
            item.before_score,

          after_score:
            item.after_score,

          created_at:
            item.created_at
        });


    if (result.error) {

      console.error(
        "Erro ao guardar histórico:",
        result.error
      );
    }

  } catch (error) {

    console.error(
      "Erro no histórico:",
      error
    );
  }
}


/* =========================================================
   SUPABASE - CARREGAR HISTÓRICO
   ========================================================= */

async function loadHistoryFromSupabase() {

  if (
    !supabaseClient ||
    !classroomId
  ) {
    return;
  }


  try {

    const result =
      await supabaseClient
        .from("score_history")
        .select("*")
        .eq(
          "classroom_id",
          classroomId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(100);


    if (result.error) {

      console.error(
        "Erro ao carregar histórico:",
        result.error
      );

      return;
    }


    history =
      result.data || [];


  } catch (error) {

    console.error(
      "Erro ao carregar histórico:",
      error
    );
  }
}


/* =========================================================
   UTILITÁRIO DE SEGURANÇA
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
