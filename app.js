// ============================================================
// DESAFIO DA TURMA
// app.js
// ============================================================

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_ANON_KEY;

const KEY = "desafioTurmaV2";

let supabase = null;
let data = null;
let history = [];
let adminUnlocked = false;


// ============================================================
// DADOS POR DEFEITO
// ============================================================

const DEFAULT_DATA = {

  className: "Turma",

  pin: "1234",

  score: 0,

  levels: [
    {
      name: "Sair mais cedo",
      points: 20,
      emoji: "🟦"
    },
    {
      name: "Aula livre",
      points: 35,
      emoji: "🟩"
    },
    {
      name: "Torneio",
      points: 50,
      emoji: "🟨"
    },
    {
      name: "Aula na rua",
      points: 70,
      emoji: "🟧"
    },
    {
      name: "Festa 1h",
      points: 100,
      emoji: "🟪"
    },
    {
      name: "Festa 2h",
      points: 130,
      emoji: "🏆"
    }
  ],

  actions: [
    {
      name: "Semana sem ocorrências nem faltas",
      delta: 3,
      emoji: "🟢"
    },
    {
      name: "Elogio",
      delta: 4,
      emoji: "⭐"
    },
    {
      name: "Ocorrência",
      delta: -3,
      emoji: "🔴"
    },
    {
      name: "Falta injustificada",
      delta: -2,
      emoji: "🟠"
    },
    {
      name: "Falta disciplinar",
      delta: -10,
      emoji: "🚨"
    }
  ]
};


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

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


function cloneDefaults() {

  return JSON.parse(
    JSON.stringify(DEFAULT_DATA)
  );
}


function normaliseLevels(levels) {

  if (
    !Array.isArray(levels) ||
    levels.length === 0
  ) {

    return cloneDefaults().levels;
  }

  return levels.map(level => ({

    name:
      String(
        level?.name ||
        "Prémio"
      ),

    points:
      Number(level?.points) || 0,

    emoji:
      String(
        level?.emoji ||
        "🎁"
      )

  }));
}


function normaliseActions(actions) {

  if (
    !Array.isArray(actions) ||
    actions.length === 0
  ) {

    return cloneDefaults().actions;
  }

  return actions.map(action => ({

    name:
      String(
        action?.name ||
        "Ação"
      ),

    delta:
      Number(action?.delta) || 0,

    emoji:
      String(
        action?.emoji ||
        "⭐"
      )

  }));
}


// ============================================================
// LOCAL STORAGE
// ============================================================

function loadLocalData() {

  try {

    const saved =
      localStorage.getItem(KEY);

    if (!saved) {

      return cloneDefaults();
    }

    const parsed =
      JSON.parse(saved);

    return {

      className:
        parsed.className ||
        DEFAULT_DATA.className,

      pin:
        parsed.pin ||
        DEFAULT_DATA.pin,

      score:
        Math.max(
          0,
          Number(parsed.score) || 0
        ),

      levels:
        normaliseLevels(
          parsed.levels
        ),

      actions:
        normaliseActions(
          parsed.actions
        )
    };

  } catch (error) {

    console.error(
      "Erro ao carregar dados locais:",
      error
    );

    return cloneDefaults();
  }
}


function saveLocalData() {

  try {

    localStorage.setItem(
      KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error(
      "Erro ao guardar dados:",
      error
    );
  }
}


// ============================================================
// SUPABASE
// ============================================================

function initSupabase() {

  try {

    if (
      window.supabase &&
      SUPABASE_URL &&
      SUPABASE_KEY
    ) {

      supabase =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );
    }

  } catch (error) {

    console.error(
      "Erro Supabase:",
      error
    );

    supabase = null;
  }
}


// ============================================================
// CARREGAR TURMA
// ============================================================

async function loadClassroom() {

  data =
    loadLocalData();

  renderAll();


  if (!supabase) {
    return;
  }


  try {

    const {
      data: remote,
      error
    } =
      await supabase
        .from("classrooms")
        .select("*")
        .limit(1)
        .maybeSingle();


    if (error) {

      console.error(
        "Erro Supabase:",
        error
      );

      return;
    }


    if (!remote) {

      await createClassroom();

      renderAll();

      return;
    }


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
        normaliseLevels(
          remote.levels
        ),

      actions:
        normaliseActions(
          remote.actions
        )
    };


    saveLocalData();


    await loadHistory(
      remote.id
    );


    renderAll();

  } catch (error) {

    console.error(
      "Erro ao carregar turma:",
      error
    );
  }
}


// ============================================================
// CRIAR TURMA
// ============================================================

async function createClassroom() {

  if (!supabase) {
    return;
  }


  try {

    const {
      data: created,
      error
    } =
      await supabase
        .from("classrooms")
        .insert({

          name:
            DEFAULT_DATA.className,

          pin:
            DEFAULT_DATA.pin,

          score: 0,

          levels:
            DEFAULT_DATA.levels,

          actions:
            DEFAULT_DATA.actions

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

      data = {

        className:
          created.name,

        pin:
          created.pin,

        score:
          Math.max(
            0,
            Number(created.score) || 0
          ),

        levels:
          normaliseLevels(
            created.levels
          ),

        actions:
          normaliseActions(
            created.actions
          )
      };


      saveLocalData();
    }

  } catch (error) {

    console.error(
      "Erro ao criar turma:",
      error
    );
  }
}


// ============================================================
// GUARDAR TURMA
// ============================================================

async function saveClassroom() {

  saveLocalData();


  if (!supabase) {
    return;
  }


  try {

    const {
      data: classroom,
      error
    } =
      await supabase
        .from("classrooms")
        .select("id")
        .limit(1)
        .maybeSingle();


    if (error || !classroom) {
      return;
    }


    await supabase
      .from("classrooms")
      .update({

        name:
          data.className,

        pin:
          data.pin,

        score:
          Math.max(
            0,
            Number(data.score) || 0
          ),

        levels:
          normaliseLevels(
            data.levels
          ),

        actions:
          normaliseActions(
            data.actions
          ),

        updated_at:
          new Date().toISOString()

      })
      .eq(
        "id",
        classroom.id
      );

  } catch (error) {

    console.error(
      "Erro ao guardar:",
      error
    );
  }
}


// ============================================================
// HISTÓRICO
// ============================================================

async function loadHistory(classroomId) {

  history = [];


  if (!supabase || !classroomId) {

    renderHistory();

    return;
  }


  try {

    const {
      data: rows,
      error
    } =
      await supabase
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
        );


    if (error) {

      console.error(
        "Erro histórico:",
        error
      );

      renderHistory();

      return;
    }


    history =
      rows || [];


    renderHistory();

  } catch (error) {

    console.error(
      "Erro histórico:",
      error
    );
  }
}


// ============================================================
// GUARDAR HISTÓRICO
// ============================================================

async function saveHistoryItem(item) {

  history.unshift(item);

  renderHistory();


  if (!supabase) {
    return;
  }


  try {

    const {
      data: classroom
    } =
      await supabase
        .from("classrooms")
        .select("id")
        .limit(1)
        .maybeSingle();


    if (!classroom) {
      return;
    }


    await supabase
      .from("score_history")
      .insert({

        classroom_id:
          classroom.id,

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

  } catch (error) {

    console.error(
      "Erro histórico:",
      error
    );
  }
}


// ============================================================
// RENDER
// ============================================================

function renderAll() {

  if (!data) {
    return;
  }

  renderHeader();

  renderScore();

  renderProgress();

  renderLevels();

  renderActions();

  renderHistory();

  renderChart();
}


// ============================================================
// CABEÇALHO
// ============================================================

function renderHeader() {

  const title =
    $("#classTitle");

  if (title) {

    title.textContent =
      data.className ||
      "Turma";
  }
}


// ============================================================
// PONTUAÇÃO
// ============================================================

function renderScore() {

  const score =
    $("#score");

  if (score) {

    score.textContent =
      Math.max(
        0,
        Number(data.score) || 0
      );
  }
}


// ============================================================
// PROGRESSO
// ============================================================

function renderProgress() {

  const score =
    Math.max(
      0,
      Number(data.score) || 0
    );


  const levels =
    normaliseLevels(
      data.levels
    ).sort(
      (a, b) =>
        Number(a.points) -
        Number(b.points)
    );


  const progressBar =
    $("#progressBar");

  const nextText =
    $("#nextText");

  const celebration =
    $("#celebration");


  if (!levels.length) {
    return;
  }


  const next =
    levels.find(
      level =>
        score <
        Number(level.points)
    );


  if (!next) {

    if (progressBar) {
      progressBar.style.width =
        "100%";
    }

    if (nextText) {
      nextText.textContent =
        "🎉 Todos os prémios alcançados!";
    }

    if (celebration) {
      celebration.textContent =
        "🏆 Parabéns!";
    }

    return;
  }


  const previous =
    levels.filter(
      level =>
        Number(level.points) <=
        score
    );


  const previousPoints =
    previous.length
      ? Number(
          previous[
            previous.length - 1
          ].points
        )
      : 0;


  const target =
    Number(next.points);


  const range =
    target - previousPoints;


  const current =
    score - previousPoints;


  let percentage =
    range > 0
      ? (current / range) * 100
      : 0;


  percentage =
    Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    );


  if (progressBar) {

    progressBar.style.width =
      `${percentage}%`;
  }


  if (nextText) {

    nextText.textContent =
      `${next.emoji} Próximo prémio: ${next.name} — faltam ${Math.max(
        0,
        target - score
      )} pontos`;
  }


  if (celebration) {

    celebration.textContent =
      previous.length
        ? `🎉 ${previous[previous.length - 1].name} alcançado!`
        : "";
  }
}


// ============================================================
// PRÉMIOS
// ============================================================

function renderLevels() {

  const container =
    $("#levels");

  if (!container) {
    return;
  }


  let levels =
    Array.isArray(data.levels) &&
    data.levels.length
      ? data.levels
      : cloneDefaults().levels;


  data.levels =
    normaliseLevels(levels);


  data.levels.sort(
    (a, b) =>
      Number(a.points) -
      Number(b.points)
  );


  container.innerHTML =
    data.levels
      .map(level => {

        const unlocked =
          Number(data.score) >=
          Number(level.points);


        return `

          <div class="level ${unlocked ? "unlocked" : ""}">

            <div class="emoji">
              ${escapeHtml(level.emoji)}
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
                ? `
                  <div class="badge">
                    ✓ Alcançado
                  </div>
                `
                : ""
            }

          </div>

        `;
      })
      .join("");
}


// ============================================================
// GANHAR / RETIRAR PONTOS
// ============================================================

function renderActions() {

  const positive =
    $("#positiveActions");

  const negative =
    $("#negativeActions");


  if (!positive || !negative) {
    return;
  }


  const actions =
    normaliseActions(
      data.actions
    );


  data.actions =
    actions;


  const positiveActions =
    actions.filter(
      action =>
        Number(action.delta) > 0
    );


  const negativeActions =
    actions.filter(
      action =>
        Number(action.delta) < 0
    );


  // ----------------------------------------------------------
  // GANHAR PONTOS
  // ----------------------------------------------------------

  positive.innerHTML = `

    <div class="actionsTitle">
      ${adminUnlocked
        ? "Escolhe uma ação:"
        : "🔒 Disponível apenas na Administração"}
    </div>

    ${
      positiveActions
        .map(action => {

          const index =
            actions.indexOf(action);


          return `

            <button
              type="button"
              class="actionBtn positive"
              data-action-index="${index}"
              ${adminUnlocked ? "" : "disabled"}
            >

              <span class="actionEmoji">
                ${escapeHtml(action.emoji)}
              </span>

              <span class="actionName">
                ${escapeHtml(action.name)}
              </span>

              <strong>
                +${Math.abs(Number(action.delta))}
              </strong>

            </button>

          `;
        })
        .join("")
    }

  `;


  // ----------------------------------------------------------
  // RETIRAR PONTOS
  // ----------------------------------------------------------

  negative.innerHTML = `

    <div class="actionsTitle">
      ${adminUnlocked
        ? "Escolhe uma ação:"
        : "🔒 Disponível apenas na Administração"}
    </div>

    ${
      negativeActions
        .map(action => {

          const index =
            actions.indexOf(action);


          return `

            <button
              type="button"
              class="actionBtn negative"
              data-action-index="${index}"
              ${adminUnlocked ? "" : "disabled"}
            >

              <span class="actionEmoji">
                ${escapeHtml(action.emoji)}
              </span>

              <span class="actionName">
                ${escapeHtml(action.name)}
              </span>

              <strong>
                -${Math.abs(Number(action.delta))}
              </strong>

            </button>

          `;
        })
        .join("")
    }

  `;
}


// ============================================================
// ALTERAR PONTOS
// ============================================================

async function changePoints(action) {

  if (!adminUnlocked) {

    alert(
      "Entra primeiro na Administração."
    );

    return;
  }


  if (!action) {
    return;
  }


  const before =
    Math.max(
      0,
      Number(data.score) || 0
    );


  const delta =
    Number(action.delta) || 0;


  const after =
    Math.max(
      0,
      before + delta
    );


  data.score =
    after;


  const item = {

    name:
      action.name,

    emoji:
      action.emoji,

    delta:
      after - before,

    before_score:
      before,

    after_score:
      after,

    created_at:
      new Date().toISOString()
  };


  saveLocalData();

  renderAll();

  await saveClassroom();

  await saveHistoryItem(item);
}


// ============================================================
// DESFAZER
// ============================================================

async function undo() {

  if (!adminUnlocked) {

    alert(
      "Entra primeiro na Administração."
    );

    return;
  }


  if (!history.length) {

    alert(
      "Não existem alterações para desfazer."
    );

    return;
  }


  const item =
    history[0];


  data.score =
    Math.max(
      0,
      Number(item.before_score) || 0
    );


  history.shift();


  saveLocalData();

  renderAll();

  await saveClassroom();


  if (
    supabase &&
    item.id
  ) {

    await supabase
      .from("score_history")
      .delete()
      .eq(
        "id",
        item.id
      );
  }
}


// ============================================================
// LIMPAR HISTÓRICO
// ============================================================

async function clearHistory() {

  if (!adminUnlocked) {

    alert(
      "Entra primeiro na Administração."
    );

    return;
  }


  if (!history.length) {
    return;
  }


  if (
    !confirm(
      "Queres apagar todo o histórico?"
    )
  ) {
    return;
  }


  history = [];

  renderHistory();


  if (!supabase) {
    return;
  }


  const {
    data: classroom
  } =
    await supabase
      .from("classrooms")
      .select("id")
      .limit(1)
      .maybeSingle();


  if (classroom) {

    await supabase
      .from("score_history")
      .delete()
      .eq(
        "classroom_id",
        classroom.id
      );
  }
}


// ============================================================
// RESET
// ============================================================

async function resetScore() {

  if (!adminUnlocked) {

    alert(
      "Entra primeiro na Administração."
    );

    return;
  }


  if (
    !confirm(
      "Queres mesmo colocar a pontuação a zero?"
    )
  ) {
    return;
  }


  data.score = 0;


  saveLocalData();

  renderAll();

  await saveClassroom();
}


// ============================================================
// HISTÓRICO VISUAL
// ============================================================

function renderHistory() {

  const container =
    $("#history");

  if (!container) {
    return;
  }


  if (!history.length) {

    container.innerHTML = `
      <div class="empty">
        Ainda não existem alterações.
      </div>
    `;

    return;
  }


  container.innerHTML =
    history
      .map(item => {

        const delta =
          Number(item.delta) || 0;


        const date =
          item.created_at
            ? new Date(
                item.created_at
              ).toLocaleString(
                "pt-PT"
              )
            : "";


        return `

          <div class="historyItem">

            <div class="historyEmoji">
              ${escapeHtml(
                item.emoji || "⭐"
              )}
            </div>

            <div class="historyInfo">

              <div class="historyName">
                ${escapeHtml(
                  item.name
                )}
              </div>

              <div class="historyDate">
                ${escapeHtml(date)}
              </div>

            </div>

            <div
              class="historyDelta ${
                delta >= 0
                  ? "positive"
                  : "negative"
              }"
            >
              ${
                delta >= 0
                  ? "+"
                  : ""
              }${delta}
            </div>

          </div>

        `;
      })
      .join("");
}


// ============================================================
// GRÁFICO
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


  if (current) {

    current.textContent =
      data.score;
  }


  if (!history.length) {

    line.setAttribute(
      "d",
      ""
    );

    dots.innerHTML = "";

    if (empty) {
      empty.style.display =
        "block";
    }

    return;
  }


  if (empty) {
    empty.style.display =
      "none";
  }


  const values =
    [...history]
      .reverse()
      .map(
        item =>
          Number(item.after_score) || 0
      );


  const max =
    Math.max(
      10,
      ...values,
      Number(data.score) || 0
    );


  const width = 600;
  const height = 240;
  const padding = 20;


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
              (
                width -
                padding * 2
              );


        const y =
          height -
          padding -
          (
            value / max
          ) *
          (
            height -
            padding * 2
          );


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


  dots.innerHTML =
    points
      .map(
        point => `

          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="5"
          >
            <title>
              ${point.value} pontos
            </title>
          </circle>

        `
      )
      .join("");
}


// ============================================================
// ADMINISTRAÇÃO
// ============================================================

function openAdmin() {

  const modal =
    $("#adminModal");

  if (!modal) {
    return;
  }


  adminUnlocked = false;


  updateAdminVisibility();


  const pinInput =
    $("#pinInput");

  if (pinInput) {

    pinInput.value = "";
  }


  modal.classList.add(
    "show"
  );
}


function closeAdmin() {

  const modal =
    $("#adminModal");


  adminUnlocked = false;


  if (modal) {

    modal.classList.remove(
      "show"
    );
  }


  updateAdminVisibility();
}


function unlockAdmin() {

  const pinInput =
    $("#pinInput");


  if (!pinInput) {
    return;
  }


  const enteredPin =
    pinInput.value.trim();


  if (
    enteredPin &&
    enteredPin === data.pin
  ) {

    adminUnlocked = true;


    updateAdminVisibility();

    loadAdmin();


    alert(
      "Administração desbloqueada."
    );

  } else {

    alert(
      "PIN incorreto."
    );
  }
}


// ============================================================
// ADMIN VISIBILIDADE
// ============================================================

function updateAdminVisibility() {

  const pinArea =
    $("#pinArea");

  const adminForm =
    $("#adminForm");


  if (adminUnlocked) {

    if (pinArea) {
      pinArea.style.display =
        "none";
    }

    if (adminForm) {
      adminForm.style.display =
        "block";
    }

  } else {

    if (pinArea) {
      pinArea.style.display =
        "block";
    }

    if (adminForm) {
      adminForm.style.display =
        "none";
    }
  }


  // MUITO IMPORTANTE:
  // As secções Ganhar pontos e
  // Retirar pontos aparecem sempre.
  // Apenas os botões ficam bloqueados
  // quando não estamos na administração.

  renderActions();
}


// ============================================================
// CARREGAR ADMIN
// ============================================================

function loadAdmin() {

  const classInput =
    $("#classInput");

  const newPinInput =
    $("#newPinInput");


  if (classInput) {

    classInput.value =
      data.className || "";
  }


  if (newPinInput) {

    newPinInput.value = "";
  }


  renderLevelInputs();
}


// ============================================================
// INPUTS DOS PRÉMIOS
// ============================================================

function renderLevelInputs() {

  const container =
    $("#levelInputs");

  if (!container) {
    return;
  }


  const levels =
    normaliseLevels(
      data.levels
    );


  container.innerHTML =
    levels
      .map(
        (level, index) => `

          <div class="levelInput">

            <input
              type="text"
              class="levelName"
              data-level="${index}"
              value="${escapeHtml(level.name)}"
              placeholder="Nome do prémio"
            >

            <input
              type="number"
              class="levelPoints"
              data-level="${index}"
              value="${Number(level.points)}"
              min="0"
              placeholder="Pontos"
            >

            <input
              type="text"
              class="levelEmoji"
              data-level="${index}"
              value="${escapeHtml(level.emoji)}"
              placeholder="Emoji"
            >

          </div>

        `
      )
      .join("");
}


// ============================================================
// GUARDAR ADMIN
// ============================================================

async function saveAdminSettings() {

  if (!adminUnlocked) {

    alert(
      "Entra primeiro na Administração."
    );

    return;
  }


  const classInput =
    $("#classInput");

  const newPinInput =
    $("#newPinInput");


  if (classInput) {

    const name =
      classInput.value.trim();

    if (name) {
      data.className =
        name;
    }
  }


  if (newPinInput) {

    const pin =
      newPinInput.value.trim();

    if (pin) {
      data.pin =
        pin;
    }
  }


  const names =
    document.querySelectorAll(
      ".levelName"
    );

  const points =
    document.querySelectorAll(
      ".levelPoints"
    );

  const emojis =
    document.querySelectorAll(
      ".levelEmoji"
    );


  const levels = [];


  for (
    let i = 0;
    i < names.length;
    i++
  ) {

    const name =
      names[i].value.trim();


    const pts =
      Number(
        points[i]?.value
      );


    const emoji =
      emojis[i]?.value.trim() ||
      "🎁";


    if (!name) {
      continue;
    }


    levels.push({

      name,

      points:
        Number.isFinite(pts)
          ? Math.max(
              0,
              pts
            )
          : 0,

      emoji
    });
  }


  if (levels.length) {

    data.levels =
      levels;

  } else {

    data.levels =
      cloneDefaults().levels;
  }


  data.levels.sort(
    (a, b) =>
      Number(a.points) -
      Number(b.points)
  );


  saveLocalData();

  renderAll();

  await saveClassroom();


  alert(
    "Definições guardadas."
  );
}


// ============================================================
// ATUALIZAÇÃO AUTOMÁTICA
// ============================================================

async function refreshFromSupabase() {

  if (!supabase) {
    return;
  }


  // Não alterar o ecrã enquanto
  // o administrador está a trabalhar.

  if (adminUnlocked) {
    return;
  }


  try {

    const {
      data: remote,
      error
    } =
      await supabase
        .from("classrooms")
        .select("*")
        .limit(1)
        .maybeSingle();


    if (error || !remote) {
      return;
    }


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
        normaliseLevels(
          remote.levels
        ),

      actions:
        normaliseActions(
          remote.actions
        )
    };


    saveLocalData();

    renderAll();

  } catch (error) {

    console.error(
      "Erro de atualização:",
      error
    );
  }
}


// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {

  const adminBtn =
    $("#adminBtn");

  if (adminBtn) {

    adminBtn.addEventListener(
      "click",
      openAdmin
    );
  }


  const closeAdminBtn =
    $("#closeAdmin");

  if (closeAdminBtn) {

    closeAdminBtn.addEventListener(
      "click",
      closeAdmin
    );
  }


  const unlockBtn =
    $("#unlockBtn");

  if (unlockBtn) {

    unlockBtn.addEventListener(
      "click",
      unlockAdmin
    );
  }


  const pinInput =
    $("#pinInput");

  if (pinInput) {

    pinInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          unlockAdmin();
        }
      }
    );
  }


  const saveBtn =
    $("#saveAdmin");

  if (saveBtn) {

    saveBtn.addEventListener(
      "click",
      saveAdminSettings
    );
  }


  const resetBtn =
    $("#resetBtn");

  if (resetBtn) {

    resetBtn.addEventListener(
      "click",
      resetScore
    );
  }


  const logoutBtn =
    $("#adminLogout");

  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      closeAdmin
    );
  }


  const clearBtn =
    $("#clearHistory");

  if (clearBtn) {

    clearBtn.addEventListener(
      "click",
      clearHistory
    );
  }


  // ==========================================================
  // BOTÕES GANHAR / RETIRAR PONTOS
  // ==========================================================

  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-action-index]"
        );


      if (!button) {
        return;
      }


      // Se não estiver na administração,
      // não deixa alterar pontos.

      if (!adminUnlocked) {

        alert(
          "Entra primeiro na Administração para alterar os pontos."
        );

        return;
      }


      const index =
        Number(
          button.dataset.actionIndex
        );


      if (
        !Number.isInteger(index)
      ) {
        return;
      }


      const action =
        data.actions[index];


      if (!action) {
        return;
      }


      changePoints(action);
    }
  );


  const undoBtn =
    $("#undoBtn");

  if (undoBtn) {

    undoBtn.addEventListener(
      "click",
      undo
    );
  }


  const modal =
    $("#adminModal");

  if (modal) {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          closeAdmin();
        }
      }
    );
  }
}


// ============================================================
// INICIAR
// ============================================================

async function init() {

  initSupabase();

  setupEvents();

  data =
    loadLocalData();

  renderAll();

  await loadClassroom();


  setInterval(
    refreshFromSupabase,
    5000
  );
}


document.addEventListener(
  "DOMContentLoaded",
  init
);
