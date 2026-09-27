// ==========================================
// DESAFIO DA TURMA - APP.JS
// ==========================================

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_ANON_KEY;

const KEY = "desafioTurmaV2";

let supabaseClient = null;
let classroomId = null;
let data = null;
let history = [];

let adminUnlocked = false;


// ==========================================
// DADOS POR DEFEITO
// ==========================================

const DEFAULT_DATA = {
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


// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function $(selector) {
  return document.querySelector(selector);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function cloneDefaultData() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}


// ==========================================
// LOCAL STORAGE
// ==========================================

function loadLocalData() {
  try {
    const saved = localStorage.getItem(KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Erro ao ler dados locais:", error);
  }

  return cloneDefaultData();
}


function saveLocalData() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Erro ao guardar dados locais:", error);
  }
}


// ==========================================
// SUPABASE
// ==========================================

function initSupabase() {

  if (
    !SUPABASE_URL ||
    !SUPABASE_KEY ||
    !window.supabase
  ) {
    console.warn("Supabase não está disponível.");
    return;
  }

  try {

    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

  } catch (error) {

    console.error(
      "Erro ao iniciar Supabase:",
      error
    );

  }
}


// ==========================================
// CARREGAR TURMA
// ==========================================

async function loadClassroom() {

  if (!supabaseClient) {
    return;
  }

  try {

    const { data: rows, error } =
      await supabaseClient
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


    if (rows && rows.length > 0) {

      const remote = rows[0];

      classroomId = remote.id;

      data = {
        className:
          remote.name ||
          DEFAULT_DATA.className,

        pin:
          remote.pin ||
          DEFAULT_DATA.pin,

        score:
          Math.max(
            0,
            Number(remote.score) || 0
          ),

        levels:
          Array.isArray(remote.levels)
            ? remote.levels
            : DEFAULT_DATA.levels,

        actions:
          Array.isArray(remote.actions)
            ? remote.actions
            : DEFAULT_DATA.actions
      };

      saveLocalData();

    } else {

      await createClassroom();

    }

  } catch (error) {

    console.error(
      "Erro ao carregar turma:",
      error
    );

  }
}


// ==========================================
// CRIAR TURMA
// ==========================================

async function createClassroom() {

  data = cloneDefaultData();
  saveLocalData();

  if (!supabaseClient) {
    return;
  }

  try {

    const { data: created, error } =
      await supabaseClient
        .from("classrooms")
        .insert({
          name: data.className,
          pin: data.pin,
          score: data.score,
          levels: data.levels,
          actions: data.actions
        })
        .select()
        .single();

    if (error) {
      console.error(
        "Erro ao criar turma:",
        error
      );
      return;
    }

    if (created) {
      classroomId = created.id;
    }

  } catch (error) {

    console.error(
      "Erro ao criar turma:",
      error
    );

  }
}


// ==========================================
// GUARDAR TURMA
// ==========================================

async function saveClassroom() {

  data.score = Math.max(
    0,
    Number(data.score) || 0
  );

  saveLocalData();

  if (
    !supabaseClient ||
    !classroomId
  ) {
    return;
  }

  try {

    const { error } =
      await supabaseClient
        .from("classrooms")
        .update({
          name: data.className,
          pin: data.pin,
          score: data.score,
          levels: data.levels,
          actions: data.actions,
          updated_at: new Date().toISOString()
        })
        .eq("id", classroomId);

    if (error) {
      console.error(
        "Erro ao guardar turma:",
        error
      );
    }

  } catch (error) {

    console.error(
      "Erro ao guardar turma:",
      error
    );

  }
}


// ==========================================
// HISTÓRICO
// ==========================================

async function loadHistory() {

  history = [];

  if (
    !supabaseClient ||
    !classroomId
  ) {
    renderHistory();
    renderChart();
    return;
  }

  try {

    const { data: rows, error } =
      await supabaseClient
        .from("score_history")
        .select("*")
        .eq("classroom_id", classroomId)
        .order("created_at", {
          ascending: true
        });

    if (error) {

      console.error(
        "Erro ao carregar histórico:",
        error
      );

      return;
    }

    history = rows || [];

    renderHistory();
    renderChart();

  } catch (error) {

    console.error(
      "Erro no histórico:",
      error
    );

  }
}


// ==========================================
// GUARDAR HISTÓRICO
// ==========================================

async function saveHistoryItem(item) {

  history.push(item);

  if (
    !supabaseClient ||
    !classroomId
  ) {
    renderHistory();
    renderChart();
    return;
  }

  try {

    const { error } =
      await supabaseClient
        .from("score_history")
        .insert({
          classroom_id: classroomId,
          name: item.name,
          emoji: item.emoji,
          delta: item.delta,
          before_score: item.before_score,
          after_score: item.after_score,
          created_at: item.created_at
        });

    if (error) {
      console.error(
        "Erro ao guardar histórico:",
        error
      );
    }

  } catch (error) {

    console.error(
      "Erro ao guardar histórico:",
      error
    );

  }

  renderHistory();
  renderChart();
}


// ==========================================
// RENDER PRINCIPAL
// ==========================================

function render() {

  if (!data) {
    return;
  }

  data.score = Math.max(
    0,
    Number(data.score) || 0
  );


  // Nome da turma

  if ($("#classTitle")) {
    $("#classTitle").textContent =
      data.className || "Turma";
  }


  // Pontuação

  if ($("#score")) {
    $("#score").textContent =
      Math.max(0, data.score);
  }


  renderProgress();
  renderLevels();
  renderActions();
  renderHistory();
  renderChart();
  updateAdminVisibility();
}


// ==========================================
// BARRA DE PROGRESSO
// ==========================================

function renderProgress() {

  if (!data || !data.levels) {
    return;
  }

  const score =
    Math.max(0, data.score);

  const sortedLevels =
    [...data.levels]
      .sort((a, b) =>
        Number(a.points) -
        Number(b.points)
      );


  let nextLevel = null;

  for (const level of sortedLevels) {

    if (
      Number(level.points) > score
    ) {
      nextLevel = level;
      break;
    }

  }


  let percentage = 100;

  if (nextLevel) {

    const previousLevel =
      [...sortedLevels]
        .filter(level =>
          Number(level.points) <= score
        )
        .pop();

    const start =
      previousLevel
        ? Number(previousLevel.points)
        : 0;

    const target =
      Number(nextLevel.points);

    if (target > start) {

      percentage =
        ((score - start) /
          (target - start)) * 100;

    }

  }


  percentage =
    Math.max(
      0,
      Math.min(100, percentage)
    );


  if ($("#progressBar")) {

    $("#progressBar").style.width =
      percentage + "%";

  }


  if ($("#nextText")) {

    if (nextLevel) {

      const missing =
        Math.max(
          0,
          Number(nextLevel.points) -
          score
        );

      $("#nextText").textContent =
        `Faltam ${missing} pontos para: ${nextLevel.emoji || "🎁"} ${nextLevel.name}`;

    } else {

      $("#nextText").textContent =
        "🎉 Todos os prémios foram alcançados!";

    }

  }


  if ($("#celebration")) {

    if (
      sortedLevels.length &&
      score >=
        Number(
          sortedLevels[
            sortedLevels.length - 1
          ].points
        )
    ) {

      $("#celebration").textContent =
        "🏆 Parabéns! A turma alcançou o objetivo máximo!";

      $("#celebration")
        .classList
        .remove("hidden");

    } else {

      $("#celebration")
        .classList
        .add("hidden");

    }

  }

}


// ==========================================
// PRÉMIOS
// ==========================================

function renderLevels() {

  const container =
    $("#levels");

  if (!container || !data) {
    return;
  }

  const sortedLevels =
    [...data.levels]
      .sort((a, b) =>
        Number(a.points) -
        Number(b.points)
      );


  if (!sortedLevels.length) {

    container.innerHTML =
      "<div class='adminLocked'>Ainda não existem prémios.</div>";

    return;
  }


  container.innerHTML =
    sortedLevels
      .map(level => {

        const unlocked =
          data.score >=
          Number(level.points);

        return `
          <div class="level ${unlocked ? "unlocked" : ""}">

            <div class="emoji">
              ${escapeHtml(level.emoji || "🎁")}
            </div>

            <div class="info">

              <div class="name">
                ${escapeHtml(level.name)}
              </div>

              <div class="pts">
                ${Number(level.points)} pontos
              </div>

            </div>

            ${
              unlocked
                ? `<div class="badge">✓ Alcançado</div>`
                : ""
            }

          </div>
        `;

      })
      .join("");

}


// ==========================================
// AÇÕES
// ==========================================

function renderActions() {

  const positive =
    $("#positiveActions");

  const negative =
    $("#negativeActions");


  if (!positive || !negative || !data) {
    return;
  }


  const positives =
    data.actions.filter(
      action =>
        Number(action.points) > 0
    );


  const negatives =
    data.actions.filter(
      action =>
        Number(action.points) < 0
    );


  positive.innerHTML =
    renderActionButtons(
      positives,
      true
    );


  negative.innerHTML =
    renderActionButtons(
      negatives,
      false
    );

}


function renderActionButtons(
  actions,
  isPositive
) {

  if (!actions.length) {

    return `
      <div class="adminLocked">
        ${
          adminUnlocked
            ? "Não existem ações configuradas."
            : "🔒 Entre na Administração para alterar os pontos."
        }
      </div>
    `;

  }


  if (!adminUnlocked) {

    return `
      <div class="adminLocked">
        🔒 <strong>Área do administrador</strong><br>
        Entre na Administração para ganhar ou retirar pontos.
      </div>
    `;

  }


  return actions
    .map((action, index) => {

      const originalIndex =
        data.actions.indexOf(action);

      return `
        <button
          type="button"
          class="action ${isPositive ? "positive" : "negative"}"
          data-action-index="${originalIndex}"
        >

          <span class="label">
            ${escapeHtml(action.emoji || "")}
            ${escapeHtml(action.name)}
          </span>

          <span class="value">
            ${
              Number(action.points) > 0
                ? "+"
                : ""
            }${Number(action.points)}
          </span>

        </button>
      `;

    })
    .join("");

}


// ==========================================
// CLIQUE NAS AÇÕES
// ==========================================

function setupActionClicks() {

  document.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest(
          "[data-action-index]"
        );

      if (!button) {
        return;
      }


      if (!adminUnlocked) {

        alert(
          "🔒 Apenas o administrador pode alterar os pontos."
        );

        return;
      }


      const index =
        Number(
          button.dataset.actionIndex
        );


      if (
        !Number.isInteger(index) ||
        !data.actions[index]
      ) {
        return;
      }


      const action =
        data.actions[index];


      changePoints(action);

    }
  );

}


// ==========================================
// ALTERAR PONTOS
// ==========================================

async function changePoints(action) {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode alterar os pontos."
    );

    return;
  }


  const before =
    Math.max(
      0,
      Number(data.score) || 0
    );


  const requestedDelta =
    Number(action.points) || 0;


  let after =
    before + requestedDelta;


  // Nunca abaixo de zero

  after =
    Math.max(0, after);


  const actualChange =
    after - before;


  // Se tentar retirar pontos quando já está a zero

  if (actualChange === 0) {

    alert(
      "A turma já está com 0 pontos."
    );

    return;
  }


  data.score = after;


  const historyItem = {

    classroom_id: classroomId,

    name: action.name,

    emoji: action.emoji || "",

    delta: actualChange,

    before_score: before,

    after_score: after,

    created_at:
      new Date().toISOString()

  };


  await saveClassroom();

  await saveHistoryItem(
    historyItem
  );

  render();

}


// ==========================================
// HISTÓRICO
// ==========================================

function renderHistory() {

  const container =
    $("#history");

  if (!container) {
    return;
  }


  if (!history.length) {

    container.innerHTML = `
      <div class="adminLocked">
        Ainda não existem movimentos de pontos.
      </div>
    `;

    return;
  }


  const latest =
    [...history]
      .slice()
      .reverse();


  container.innerHTML =
    latest
      .map((item, reversedIndex) => {

        const originalIndex =
          history.length -
          1 -
          reversedIndex;


        const delta =
          Number(item.delta) || 0;


        const date =
          item.created_at
            ? new Date(
                item.created_at
              ).toLocaleString(
                "pt-PT",
                {
                  dateStyle: "short",
                  timeStyle: "short"
                }
              )
            : "";


        return `
          <div class="historyItem">

            <div class="when">
              ${escapeHtml(date)}
            </div>

            <div class="desc">
              ${escapeHtml(item.emoji || "")}
              ${escapeHtml(item.name || "Movimento")}
            </div>

            <div
              class="delta ${
                delta >= 0
                  ? "pos"
                  : "neg"
              }"
            >
              ${
                delta >= 0
                  ? "+"
                  : ""
              }${delta}
            </div>

            <button
              type="button"
              class="undo"
              data-undo-index="${originalIndex}"
              title="Desfazer"
            >
              ↩
            </button>

          </div>
        `;

      })
      .join("");

}


// ==========================================
// DESFAZER
// ==========================================

async function undo(index) {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode desfazer alterações."
    );

    return;
  }


  const item =
    history[index];


  if (!item) {
    return;
  }


  const current =
    Math.max(
      0,
      Number(data.score) || 0
    );


  data.score =
    Math.max(
      0,
      Number(item.before_score) || 0
    );


  await saveClassroom();


  // Apaga o movimento do Supabase

  if (
    supabaseClient &&
    item.id
  ) {

    const { error } =
      await supabaseClient
        .from("score_history")
        .delete()
        .eq("id", item.id);

    if (error) {

      console.error(
        "Erro ao apagar movimento:",
        error
      );

    }

  }


  history.splice(index, 1);


  render();

}


// ==========================================
// CLIQUE DESFAZER
// ==========================================

function setupUndoClicks() {

  document.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest(
          "[data-undo-index]"
        );

      if (!button) {
        return;
      }


      if (!adminUnlocked) {

        alert(
          "🔒 Apenas o administrador pode desfazer alterações."
        );

        return;
      }


      const index =
        Number(
          button.dataset.undoIndex
        );


      undo(index);

    }
  );

}


// ==========================================
// APAGAR HISTÓRICO
// ==========================================

async function clearHistory() {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode apagar o histórico."
    );

    return;
  }


  if (!history.length) {
    return;
  }


  const confirmed =
    confirm(
      "Tem a certeza que quer apagar todo o histórico?"
    );


  if (!confirmed) {
    return;
  }


  if (
    supabaseClient &&
    classroomId
  ) {

    const { error } =
      await supabaseClient
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );


    if (error) {

      alert(
        "Não foi possível apagar o histórico."
      );

      console.error(error);

      return;
    }

  }


  history = [];

  render();

}


// ==========================================
// RESET
// ==========================================

async function resetData() {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode repor os dados."
    );

    return;
  }


  const confirmed =
    confirm(
      "Repor os dados originais? A pontuação voltará a 0."
    );


  if (!confirmed) {
    return;
  }


  data = cloneDefaultData();


  await saveClassroom();


  if (
    supabaseClient &&
    classroomId
  ) {

    await supabaseClient
      .from("score_history")
      .delete()
      .eq(
        "classroom_id",
        classroomId
      );

  }


  history = [];


  render();


  loadAdmin();


  alert(
    "Os dados foram repostos."
  );

}


// ==========================================
// GRÁFICO
// ==========================================

function renderChart() {

  const line =
    $("#chartLine");

  const dots =
    $("#chartDots");

  const empty =
    $("#chartEmpty");

  const current =
    $("#chartCurrentScore");


  if (
    !line ||
    !dots ||
    !empty ||
    !current
  ) {
    return;
  }


  const currentScore =
    Math.max(
      0,
      Number(data?.score) || 0
    );


  current.textContent =
    `${currentScore} pontos`;


  if (!history.length) {

    line.setAttribute(
      "d",
      ""
    );

    dots.innerHTML = "";

    empty.style.display =
      "block";

    return;
  }


  empty.style.display =
    "none";


  const values =
    history.map(
      item =>
        Math.max(
          0,
          Number(item.after_score) || 0
        )
    );


  if (!values.length) {
    return;
  }


  const allValues =
    [0, ...values];


  const maxValue =
    Math.max(
      10,
      ...allValues
    );


  const minX = 35;
  const maxX = 565;

  const minY = 25;
  const maxY = 215;


  const points =
    allValues.map(
      (value, index) => {

        const x =
          minX +
          (
            index /
            Math.max(
              1,
              allValues.length - 1
            )
          ) *
          (maxX - minX);


        const y =
          maxY -
          (
            value /
            maxValue
          ) *
          (maxY - minY);


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
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");


  line.setAttribute(
    "d",
    path
  );


  dots.innerHTML =
    points
      .map(
        point =>
          `<circle cx="${point.x}" cy="${point.y}" r="5"></circle>`
      )
      .join("");

}


// ==========================================
// ADMINISTRAÇÃO
// ==========================================

function openAdmin() {

  if (!$("#adminModal")) {
    return;
  }

  $("#adminModal")
    .classList
    .remove("hidden");


  adminUnlocked = false;


  if ($("#pinArea")) {
    $("#pinArea")
      .classList
      .remove("hidden");
  }


  if ($("#adminForm")) {
    $("#adminForm")
      .classList
      .add("hidden");
  }


  if ($("#pinInput")) {

    $("#pinInput").value = "";

    setTimeout(
      () => $("#pinInput").focus(),
      100
    );

  }


  render();

}


function closeAdmin() {

  adminUnlocked = false;


  if ($("#adminModal")) {

    $("#adminModal")
      .classList
      .add("hidden");

  }


  if ($("#pinInput")) {
    $("#pinInput").value = "";
  }


  render();

}


// ==========================================
// DESBLOQUEAR ADMIN
// ==========================================

function unlockAdmin() {

  if (!data) {
    return;
  }


  const enteredPin =
    $("#pinInput")
      ? $("#pinInput").value.trim()
      : "";


  if (
    enteredPin &&
    enteredPin ===
      String(data.pin)
  ) {

    adminUnlocked = true;


    if ($("#pinArea")) {
      $("#pinArea")
        .classList
        .add("hidden");
    }


    if ($("#adminForm")) {
      $("#adminForm")
        .classList
        .remove("hidden");
    }


    loadAdmin();


    render();


  } else {

    alert(
      "PIN incorreto."
    );

  }

}


// ==========================================
// CARREGAR DADOS NO ADMIN
// ==========================================

function loadAdmin() {

  if (!adminUnlocked) {
    return;
  }


  if ($("#classInput")) {

    $("#classInput").value =
      data.className || "";

  }


  // IMPORTANTE:
  // Nunca mostramos o PIN atual.

  if ($("#newPinInput")) {

    $("#newPinInput").value = "";

    $("#newPinInput").placeholder =
      "Deixe vazio para manter o PIN atual";

  }


  renderLevelInputs();

}


// ==========================================
// CAMPOS DOS PRÉMIOS
// ==========================================

function renderLevelInputs() {

  const container =
    $("#levelInputs");

  if (!container || !data) {
    return;
  }


  container.innerHTML =
    data.levels
      .map(
        (level, index) => `

          <div class="levelRow">

            <input
              type="text"
              data-level-name="${index}"
              value="${escapeHtml(level.name)}"
              placeholder="Nome do prémio"
            >

            <input
              type="number"
              data-level-points="${index}"
              value="${Number(level.points)}"
              min="0"
              placeholder="Pontos"
            >

          </div>

        `
      )
      .join("");

}


// ==========================================
// GUARDAR ADMIN
// ==========================================

async function saveAdminSettings(
  event
) {

  event.preventDefault();


  if (!adminUnlocked) {

    alert(
      "🔒 A área de administração está bloqueada."
    );

    return;
  }


  const className =
    $("#classInput")
      ? $("#classInput").value.trim()
      : "";


  if (className) {
    data.className =
      className;
  }


  // PIN:
  // só muda se escrever um novo.

  const newPin =
    $("#newPinInput")
      ? $("#newPinInput").value.trim()
      : "";


  if (newPin) {
    data.pin = newPin;
  }


  // Guardar prémios

  data.levels =
    data.levels.map(
      (level, index) => {

        const nameInput =
          document.querySelector(
            `[data-level-name="${index}"]`
          );


        const pointsInput =
          document.querySelector(
            `[data-level-points="${index}"]`
          );


        return {

          name:
            nameInput
              ? nameInput.value.trim()
              : level.name,

          points:
            pointsInput
              ? Math.max(
                  0,
                  Number(
                    pointsInput.value
                  ) || 0
                )
              : Number(level.points),

          emoji:
            level.emoji || "🎁"

        };

      }
    );


  await saveClassroom();


  // Limpa o campo do novo PIN

  if ($("#newPinInput")) {
    $("#newPinInput").value = "";
  }


  render();


  alert(
    "Alterações guardadas."
  );

}


// ==========================================
// VISIBILIDADE DAS AÇÕES
// ==========================================

function updateAdminVisibility() {

  if (!data) {
    return;
  }


  // Se não estiver desbloqueado,
  // mostra bloqueio.

  if (!adminUnlocked) {

    if ($("#positiveActions")) {

      $("#positiveActions").innerHTML =
        `
          <div class="adminLocked">
            🔒 <strong>Área do administrador</strong><br>
            Entre na Administração para ganhar pontos.
          </div>
        `;

    }


    if ($("#negativeActions")) {

      $("#negativeActions").innerHTML =
        `
          <div class="adminLocked">
            🔒 <strong>Área do administrador</strong><br>
            Entre na Administração para retirar pontos.
          </div>
        `;

    }

  } else {

    renderActions();

  }

}


// ==========================================
// SINCRONIZAÇÃO
// ==========================================

async function refreshFromSupabase() {

  if (
    !supabaseClient ||
    !classroomId
  ) {
    return;
  }


  try {

    const { data: remote, error } =
      await supabaseClient
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .single();


    if (error || !remote) {
      return;
    }


    data.className =
      remote.name ||
      data.className;


    data.score =
      Math.max(
        0,
        Number(remote.score) || 0
      );


    data.pin =
      remote.pin ||
      data.pin;


    if (Array.isArray(remote.levels)) {
      data.levels =
        remote.levels;
    }


    if (Array.isArray(remote.actions)) {
      data.actions =
        remote.actions;
    }


    saveLocalData();

    render();

  } catch (error) {

    console.error(
      "Erro na sincronização:",
      error
    );

  }

}


// ==========================================
// EVENTOS
// ==========================================

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


  // Enter no PIN

  if ($("#pinInput")) {

    $("#pinInput").addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Enter") {

          event.preventDefault();

          unlockAdmin();

        }

      }
    );

  }


  // Guardar administração

  if ($("#adminForm")) {

    $("#adminForm").addEventListener(
      "submit",
      saveAdminSettings
    );

  }


  // Apagar histórico

  if ($("#clearHistory")) {

    $("#clearHistory").addEventListener(
      "click",
      clearHistory
    );

  }


  // Repor dados

  if ($("#resetBtn")) {

    $("#resetBtn").addEventListener(
      "click",
      resetData
    );

  }


  // Fechar clicando fora

  if ($("#adminModal")) {

    $("#adminModal").addEventListener(
      "click",
      function (event) {

        if (
          event.target ===
          $("#adminModal")
        ) {
          closeAdmin();
        }

      }
    );

  }

}


// ==========================================
// INICIAR
// ==========================================

async function init() {

  data =
    loadLocalData();


  // Garantir pontuação nunca negativa

  data.score =
    Math.max(
      0,
      Number(data.score) || 0
    );


  initSupabase();

  setupEvents();
  setupActionClicks();
  setupUndoClicks();

  render();


  // Tentar carregar do Supabase

  if (supabaseClient) {

    await loadClassroom();

    render();

    await loadHistory();

  }


  // Sincronização periódica

  setInterval(
    refreshFromSupabase,
    5000
  );

}


// ==========================================
// ARRANQUE
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  init
);
