const KEY = "desafioTurmaV2";

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

let data = loadLocal();
let history = [];
let adminUnlocked = false;
let currentClassroomId = null;
let supabaseClient = null;

const $ = (selector) => document.querySelector(selector);


// ============================================================
// LOCAL STORAGE
// ============================================================

function loadLocal() {
  try {
    const saved = localStorage.getItem(KEY);

    if (!saved) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }

    const parsed = JSON.parse(saved);

    return {
      ...JSON.parse(JSON.stringify(DEFAULTS)),
      ...parsed,
      score: Math.max(0, Number(parsed.score) || 0),
      levels: Array.isArray(parsed.levels)
        ? parsed.levels
        : JSON.parse(JSON.stringify(DEFAULTS.levels)),
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
        : JSON.parse(JSON.stringify(DEFAULTS.actions))
    };
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}


function saveLocal() {
  data.score = Math.max(0, Number(data.score) || 0);

  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}


// ============================================================
// HISTÓRICO LOCAL
// ============================================================

function loadLocalHistory() {
  try {
    const saved =
      localStorage.getItem(KEY + "_history");

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}


function saveLocalHistory() {
  localStorage.setItem(
    KEY + "_history",
    JSON.stringify(history)
  );
}


// ============================================================
// SUPABASE
// ============================================================

function initSupabase() {
  try {
    if (
      typeof window.supabase !== "undefined" &&
      typeof SUPABASE_URL !== "undefined" &&
      typeof SUPABASE_KEY !== "undefined"
    ) {
      supabaseClient =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );

      console.log("Supabase ligado.");
    }
  } catch (error) {
    console.error(
      "Erro ao iniciar Supabase:",
      error
    );

    supabaseClient = null;
  }
}


// ============================================================
// CARREGAR DO SUPABASE
// ============================================================

async function loadRemote() {
  if (!supabaseClient) {
    return;
  }

  try {
    const {
      data: classrooms,
      error
    } = await supabaseClient
      .from("classrooms")
      .select("*")
      .limit(1);

    if (error) {
      console.error(
        "Erro ao carregar turma:",
        error
      );
      return;
    }

    if (
      !classrooms ||
      classrooms.length === 0
    ) {
      return;
    }

    const remote = classrooms[0];

    currentClassroomId = remote.id;

    data.className =
      remote.name ||
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

  } catch (error) {
    console.error(
      "Erro na sincronização:",
      error
    );
  }
}


// ============================================================
// GUARDAR NO SUPABASE
// ============================================================

async function saveRemote() {
  if (!supabaseClient) {
    return;
  }

  try {
    const payload = {
      name: data.className,
      pin: data.pin,
      score: Math.max(
        0,
        Number(data.score) || 0
      ),
      levels: data.levels,
      actions: data.actions,
      updated_at:
        new Date().toISOString()
    };

    if (currentClassroomId) {
      const { error } =
        await supabaseClient
          .from("classrooms")
          .update(payload)
          .eq(
            "id",
            currentClassroomId
          );

      if (error) {
        console.error(
          "Erro ao guardar:",
          error
        );
      }
    } else {
      const {
        data: inserted,
        error
      } = await supabaseClient
        .from("classrooms")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(
          "Erro ao criar turma:",
          error
        );
        return;
      }

      if (inserted) {
        currentClassroomId =
          inserted.id;
      }
    }
  } catch (error) {
    console.error(
      "Erro ao guardar no Supabase:",
      error
    );
  }
}


// ============================================================
// HISTÓRICO SUPABASE
// ============================================================

async function loadRemoteHistory() {
  if (
    !supabaseClient ||
    !currentClassroomId
  ) {
    return;
  }

  try {
    const {
      data: remoteHistory,
      error
    } = await supabaseClient
      .from("score_history")
      .select("*")
      .eq(
        "classroom_id",
        currentClassroomId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        "Erro ao carregar histórico:",
        error
      );
      return;
    }

    history =
      Array.isArray(remoteHistory)
        ? remoteHistory
        : [];

    saveLocalHistory();

  } catch (error) {
    console.error(
      "Erro no histórico:",
      error
    );
  }
}


async function saveRemoteHistory(item) {
  if (
    !supabaseClient ||
    !currentClassroomId
  ) {
    return;
  }

  try {
    const { error } =
      await supabaseClient
        .from("score_history")
        .insert({
          classroom_id:
            currentClassroomId,

          name: item.name,
          emoji: item.emoji,
          delta: item.delta,

          before_score:
            item.before_score,

          after_score:
            item.after_score,

          created_at:
            item.created_at
        });

    if (error) {
      console.error(
        "Erro ao guardar histórico:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Erro no histórico:",
      error
    );
  }
}


// ============================================================
// RENDER PRINCIPAL
// ============================================================

function render() {
  data.score = Math.max(
    0,
    Number(data.score) || 0
  );

  if ($("#classTitle")) {
    $("#classTitle").textContent =
      data.className;
  }

  // PONTUAÇÃO
  if ($("#score")) {
    $("#score").textContent =
      data.score;
  }

  renderProgress();
  renderLevels();
  renderActions();
  renderHistory();
  renderChart();
  updateAdminVisibility();
}


// ============================================================
// PROGRESSO
// ============================================================

function renderProgress() {
  const score = Math.max(
    0,
    Number(data.score) || 0
  );

  const levels =
    [...data.levels].sort(
      (a, b) =>
        Number(a.points) -
        Number(b.points)
    );

  let previousPoints = 0;
  let nextLevel = null;

  for (const level of levels) {
    if (
      score <
      Number(level.points)
    ) {
      nextLevel = level;
      break;
    }

    previousPoints =
      Number(level.points);
  }

  // ----------------------------------------------------------
  // TODOS OS NÍVEIS CONQUISTADOS
  // ----------------------------------------------------------

  if (!nextLevel) {
    if ($("#progressBar")) {
      $("#progressBar").style.width =
        "100%";
    }

    if ($("#nextText")) {
      $("#nextText").textContent =
        "🏆 Todos os prémios conquistados!";
    }

    if ($("#celebration")) {
      $("#celebration").textContent =
        "🎉 Parabéns, turma!";
    }

    return;
  }

  // ----------------------------------------------------------
  // PROGRESSO PARA O PRÓXIMO NÍVEL
  // ----------------------------------------------------------

  const targetPoints =
    Number(nextLevel.points);

  const totalRange =
    targetPoints -
    previousPoints;

  const currentProgress =
    score -
    previousPoints;

  let percentage =
    totalRange > 0
      ? (currentProgress /
          totalRange) *
        100
      : 0;

  percentage =
    Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    );

  if ($("#progressBar")) {
    $("#progressBar").style.width =
      percentage + "%";
  }

  if ($("#nextText")) {
    const missing =
      Math.max(
        0,
        targetPoints - score
      );

    $("#nextText").textContent =
      `${missing} pontos para ${nextLevel.emoji} ${nextLevel.name}`;
  }

  if ($("#celebration")) {
    $("#celebration").textContent =
      `${nextLevel.emoji} Próximo prémio: ${nextLevel.name}`;
  }
}


// ============================================================
// NÍVEIS E PRÉMIOS
// ============================================================

function renderLevels() {
  const container =
    $("#levels");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const levels =
    [...data.levels].sort(
      (a, b) =>
        Number(a.points) -
        Number(b.points)
    );

  levels.forEach(
    (level) => {
      const card =
        document.createElement(
          "div"
        );

      card.className =
        "levelCard";

      const achieved =
        data.score >=
        Number(level.points);

      if (achieved) {
        card.classList.add(
          "achieved"
        );
      }

      card.innerHTML = `
        <div class="levelEmoji">
          ${level.emoji || "🏆"}
        </div>

        <div class="levelInfo">
          <strong>
            ${escapeHtml(level.name)}
          </strong>

          <span>
            ${Number(level.points)} pontos
          </span>
        </div>

        <div class="levelStatus">
          ${
            achieved
              ? "✅"
              : "🔒"
          }
        </div>
      `;

      container.appendChild(card);
    }
  );
}


// ============================================================
// BOTÕES DE PONTOS
// ============================================================

function renderActions() {
  const positive =
    $("#positiveActions");

  const negative =
    $("#negativeActions");

  if (positive) {
    positive.innerHTML = "";
  }

  if (negative) {
    negative.innerHTML = "";
  }

  data.actions.forEach(
    (action, index) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "actionButton";

      button.innerHTML = `
        <span class="actionEmoji">
          ${action.emoji || "⭐"}
        </span>

        <span class="actionName">
          ${escapeHtml(action.name)}
        </span>

        <strong>
          ${
            Number(action.points) > 0
              ? "+"
              : ""
          }${Number(action.points)}
        </strong>
      `;

      button.addEventListener(
        "click",
        () => change(index)
      );

      if (
        Number(action.points) >= 0
      ) {
        if (positive) {
          positive.appendChild(
            button
          );
        }
      } else {
        if (negative) {
          negative.appendChild(
            button
          );
        }
      }
    }
  );

  updateAdminVisibility();
}


// ============================================================
// BLOQUEAR BOTÕES PARA QUEM NÃO É ADMIN
// ============================================================

function updateAdminVisibility() {
  const positive =
    $("#positiveActions");

  const negative =
    $("#negativeActions");

  if (adminUnlocked) {
    if (positive) {
      positive.style.display = "";
    }

    if (negative) {
      negative.style.display = "";
    }

    const positiveLocked =
      $("#positiveLocked");

    const negativeLocked =
      $("#negativeLocked");

    if (positiveLocked) {
      positiveLocked.style.display =
        "none";
    }

    if (negativeLocked) {
      negativeLocked.style.display =
        "none";
    }

  } else {
    if (positive) {
      positive.style.display =
        "none";
    }

    if (negative) {
      negative.style.display =
        "none";
    }

    const positiveLocked =
      $("#positiveLocked");

    const negativeLocked =
      $("#negativeLocked");

    if (positiveLocked) {
      positiveLocked.style.display =
        "";
      positiveLocked.textContent =
        "🔒 Só o administrador pode ganhar pontos.";
    }

    if (negativeLocked) {
      negativeLocked.style.display =
        "";
      negativeLocked.textContent =
        "🔒 Só o administrador pode retirar pontos.";
    }
  }
}


// ============================================================
// ADICIONAR / RETIRAR PONTOS
// ============================================================

async function change(index) {
  if (!adminUnlocked) {
    alert(
      "🔒 Apenas o administrador pode alterar os pontos."
    );
    return;
  }

  const action =
    data.actions[index];

  if (!action) {
    return;
  }

  const before =
    Math.max(
      0,
      Number(data.score) || 0
    );

  const delta =
    Number(action.points) || 0;

  // NUNCA DEIXAR ABAIXO DE ZERO
  const after =
    Math.max(
      0,
      before + delta
    );

  const actualDelta =
    after - before;

  // Se tentar retirar pontos quando já está a 0
  if (actualDelta === 0) {
    alert(
      "A turma já está com 0 pontos."
    );
    return;
  }

  data.score = after;

  const historyItem = {
    name: action.name,
    emoji:
      action.emoji || "⭐",
    delta: actualDelta,
    before_score: before,
    after_score: after,
    created_at:
      new Date().toISOString()
  };

  history.unshift(
    historyItem
  );

  saveLocal();
  saveLocalHistory();

  render();

  await saveRemote();
  await saveRemoteHistory(
    historyItem
  );
}


// ============================================================
// DESFAZER
// ============================================================

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

  const last =
    history.shift();

  data.score =
    Math.max(
      0,
      Number(last.before_score) || 0
    );

  saveLocal();
  saveLocalHistory();

  render();

  await saveRemote();
}


// ============================================================
// HISTÓRICO
// ============================================================

function renderHistory() {
  const container =
    $("#history");

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

  history.forEach(
    (item) => {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "historyItem";

      const delta =
        Number(item.delta) || 0;

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
          ${
            delta > 0
              ? "+"
              : ""
          }${delta}
        </div>
      `;

      container.appendChild(
        row
      );
    }
  );
}


// ============================================================
// GRÁFICO DE PROGRESSO
// ============================================================

function renderChart() {
  const line =
    $("#chartLine");

  const dots =
    $("#chartDots");

  const current =
    $("#chartCurrentScore");

  const empty =
    $("#chartEmpty");

  if (!line || !dots) {
    return;
  }

  const values = [];

  if (history.length) {
    const chronological =
      [...history].reverse();

    values.push(
      Math.max(
        0,
        Number(
          chronological[0]
            .before_score
        ) || 0
      )
    );

    chronological.forEach(
      (item) => {
        values.push(
          Math.max(
            0,
            Number(
              item.after_score
            ) || 0
          )
        );
      }
    );
  } else {
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

  const max =
    Math.max(
      ...values,
      1
    );

  const usableWidth =
    width -
    padding * 2;

  const usableHeight =
    height -
    padding * 2;

  const points =
    values.map(
      (value, index) => {
        const x =
          values.length === 1
            ? width / 2
            : padding +
              (
                index /
                (values.length - 1)
              ) *
                usableWidth;

        const y =
          height -
          padding -
          (
            value / max
          ) *
            usableHeight;

        return {
          x,
          y
        };
      }
    );

  const path =
    points
      .map(
        (point, index) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${point.x} ${point.y}`
      )
      .join(" ");

  line.setAttribute(
    "d",
    path
  );

  dots.innerHTML = "";

  points.forEach(
    (point) => {
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

      dots.appendChild(
        circle
      );
    }
  );

  if (current) {
    current.textContent =
      `${data.score} pontos`;
  }

  if (empty) {
    empty.style.display =
      values.length > 1
        ? "none"
        : "";
  }
}


// ============================================================
// ABRIR ADMINISTRAÇÃO
// ============================================================

function openAdmin() {
  const modal =
    $("#adminModal");

  if (!modal) {
    return;
  }

  adminUnlocked = false;

  modal.classList.remove(
    "hidden"
  );

  if ($("#pinArea")) {
    $("#pinArea").style.display =
      "";
  }

  if ($("#adminForm")) {
    $("#adminForm").style.display =
      "none";
  }

  if ($("#pinInput")) {
    $("#pinInput").value = "";
    $("#pinInput").focus();
  }

  // NÃO MOSTRAR O PIN ATUAL
  if ($("#newPinInput")) {
    $("#newPinInput").value = "";

    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";
  }
}


// ============================================================
// FECHAR ADMINISTRAÇÃO
// ============================================================

function closeAdmin() {
  adminUnlocked = false;

  if ($("#adminModal")) {
    $("#adminModal").classList.add(
      "hidden"
    );
  }

  if ($("#pinInput")) {
    $("#pinInput").value = "";
  }

  if ($("#newPinInput")) {
    $("#newPinInput").value = "";
  }

  render();
}


// ============================================================
// VERIFICAR PIN
// ============================================================

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

  // O PIN continua a ser validado
  // contra o PIN verdadeiro guardado.
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


// ============================================================
// CARREGAR ADMIN
// ============================================================

function loadAdmin() {
  if (!adminUnlocked) {
    return;
  }

  if ($("#classInput")) {
    $("#classInput").value =
      data.className;
  }

  // IMPORTANTE:
  // O PIN ATUAL NUNCA É MOSTRADO.
  if ($("#newPinInput")) {
    $("#newPinInput").value = "";

    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";
  }

  renderAdminLevels();
}


// ============================================================
// NÍVEIS NO ADMIN
// ============================================================

function renderAdminLevels() {
  const container =
    $("#levelInputs");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  data.levels.forEach(
    (level, index) => {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "adminLevelRow";

      row.innerHTML = `
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

      container.appendChild(
        row
      );
    }
  );
}


// ============================================================
// GUARDAR ADMIN
// ============================================================

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

  // ----------------------------------------------------------
  // NOME DA TURMA
  // ----------------------------------------------------------

  if ($("#classInput")) {
    const name =
      $("#classInput")
        .value
        .trim();

    if (name) {
      data.className =
        name;
    }
  }

  // ----------------------------------------------------------
  // NOVO PIN
  // ----------------------------------------------------------

  if ($("#newPinInput")) {
    const newPin =
      $("#newPinInput")
        .value
        .trim();

    // Só muda se o administrador escrever algo.
    if (newPin) {
      data.pin = newPin;
    }
  }

  // ----------------------------------------------------------
  // NÍVEIS
  // ----------------------------------------------------------

  const names =
    document.querySelectorAll(
      ".levelNameInput"
    );

  const points =
    document.querySelectorAll(
      ".levelPointsInput"
    );

  const emojis =
    document.querySelectorAll(
      ".levelEmojiInput"
    );

  const newLevels =
    data.levels.map(
      (level, index) => ({
        name:
          names[index]
            ? names[index].value.trim() ||
              level.name
            : level.name,

        points:
          points[index]
            ? Math.max(
                0,
                Number(
                  points[index].value
                ) || 0
              )
            : Number(level.points),

        emoji:
          emojis[index]
            ? emojis[index].value.trim() ||
              level.emoji
            : level.emoji
      })
    );

  data.levels =
    newLevels;

  data.score =
    Math.max(
      0,
      Number(data.score) || 0
    );

  saveLocal();

  render();

  await saveRemote();

  // Limpar o campo do novo PIN.
  if ($("#newPinInput")) {
    $("#newPinInput").value = "";

    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";
  }

  alert(
    "✅ Definições guardadas!"
  );
}


// ============================================================
// REINICIAR PONTUAÇÃO
// ============================================================

async function resetClass() {
  if (!adminUnlocked) {
    alert(
      "🔒 Apenas o administrador pode reiniciar a pontuação."
    );
    return;
  }

  const confirmed =
    confirm(
      "Tem a certeza de que quer colocar a pontuação a 0?"
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


// ============================================================
// LIMPAR HISTÓRICO
// ============================================================

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

  const confirmed =
    confirm(
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
      await supabaseClient
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          currentClassroomId
        );
    } catch (error) {
      console.error(
        "Erro ao limpar histórico:",
        error
      );
    }
  }

  renderHistory();
}


// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {
  if ($("#adminBtn")) {
    $("#adminBtn").addEventListener(
      "click",
      openAdmin
    );
  }

  if ($("#closeAdmin")) {
    $("#closeAdmin").addEventListener(
      "click",
      closeAdmin
    );
  }

  if ($("#unlockBtn")) {
    $("#unlockBtn").addEventListener(
      "click",
      unlockAdmin
    );
  }

  if ($("#adminForm")) {
    $("#adminForm").addEventListener(
      "submit",
      saveAdmin
    );
  }

  if ($("#resetBtn")) {
    $("#resetBtn").addEventListener(
      "click",
      resetClass
    );
  }

  if ($("#clearHistory")) {
    $("#clearHistory").addEventListener(
      "click",
      clearHistory
    );
  }

  if ($("#adminLogout")) {
    $("#adminLogout").addEventListener(
      "click",
      closeAdmin
    );
  }

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

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        $("#adminModal") &&
        !$("#adminModal")
          .classList
          .contains("hidden")
      ) {
        closeAdmin();
      }
    }
  );
}


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function escapeHtml(value) {
  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  try {
    return new Date(
      dateString
    ).toLocaleString(
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


// ============================================================
// SINCRONIZAÇÃO AUTOMÁTICA
// ============================================================

async function autoSync() {
  if (!supabaseClient) {
    return;
  }

  await loadRemote();
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function init() {
  history =
    loadLocalHistory();

  data.score =
    Math.max(
      0,
      Number(data.score) || 0
    );

  setupEvents();

  render();

  initSupabase();

  if (supabaseClient) {
    await loadRemote();
  }

  // Atualiza os dados de todos os dispositivos
  // aproximadamente a cada 5 segundos.
  setInterval(
    autoSync,
    5000
  );

  console.log(
    "Desafio da Turma iniciado."
  );
}


// ============================================================
// INICIAR
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  init
);
