// ============================================================
// DESAFIO DA TURMA
// app.js
// ============================================================

const SUPABASE_URL =
  window.SUPABASE_URL || "";

const SUPABASE_KEY =
  window.SUPABASE_ANON_KEY || "";

const KEY =
  "desafioTurmaV3";

let supabase = null;
let data = null;
let history = [];
let adminUnlocked = false;
let classroomId = null;


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
// AUXILIARES
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

  if (!Array.isArray(levels) || !levels.length) {

    return cloneDefaults().levels;
  }

  return levels.map(level => ({

    name:
      String(
        level?.name ||
        "Prémio"
      ),

    points:
      Number.isFinite(
        Number(level?.points)
      )
        ? Math.max(
            0,
            Number(level.points)
          )
        : 0,

    emoji:
      String(
        level?.emoji ||
        "🎁"
      )

  }));
}


function normaliseActions(actions) {

  if (!Array.isArray(actions) || !actions.length) {

    return cloneDefaults().actions;
  }

  return actions.map(action => ({

    name:
      String(
        action?.name ||
        "Ação"
      ),

    delta:
      Number.isFinite(
        Number(action?.delta)
      )
        ? Number(action.delta)
        : 0,

    emoji:
      String(
        action?.emoji ||
        "⭐"
      )

  }));
}


function buildData(source) {

  source =
    source || {};


  return {

    className:
      source.className ||
      source.name ||
      DEFAULT_DATA.className,

    pin:
      source.pin ||
      DEFAULT_DATA.pin,

    score:
      Math.max(
        0,
        Number(source.score) || 0
      ),

    levels:
      normaliseLevels(
        source.levels
      ),

    actions:
      normaliseActions(
        source.actions
      )

  };
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


    return buildData(parsed);

  } catch (error) {

    console.error(
      "Erro ao carregar dados locais:",
      error
    );

    return cloneDefaults();
  }
}


function saveLocalData() {

  if (!data) {
    return;
  }


  try {

    localStorage.setItem(
      KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error(
      "Erro ao guardar dados locais:",
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
      !window.supabase ||
      !SUPABASE_URL ||
      !SUPABASE_KEY
    ) {

      console.warn(
        "Supabase não configurado. A aplicação funcionará em modo local."
      );

      return;
    }


    supabase =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );


    console.log(
      "Supabase inicializado."
    );

  } catch (error) {

    console.error(
      "Erro ao iniciar Supabase:",
      error
    );

    supabase = null;
  }
}


// ============================================================
// CARREGAR TURMA
// ============================================================

async function loadClassroom() {

  // Primeiro mostra sempre os dados locais.
  data =
    loadLocalData();

  renderAll();


  // Se não houver Supabase, termina aqui.
  if (!supabase) {
    return;
  }


  try {

    const result =
      await supabase
        .from("classrooms")
        .select("*")
        .limit(1)
        .maybeSingle();


    if (result.error) {

      console.warn(
        "Supabase indisponível. A aplicação continuará em modo local.",
        result.error
      );

      return;
    }


    const remote =
      result.data;


    // Não existe turma no Supabase.
    if (!remote) {

      await createClassroom();

      return;
    }


    classroomId =
      remote.id;


    // Só substituímos os dados locais depois de
    // termos recebido realmente dados válidos.
    data =
      buildData(remote);


    saveLocalData();

    renderAll();


    await loadHistory(
      classroomId
    );

  } catch (error) {

    console.warn(
      "Não foi possível sincronizar com o Supabase.",
      error
    );

    // IMPORTANTE:
    // não apagamos os dados locais.
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

    const result =
      await supabase
        .from("classrooms")
        .insert({

          name:
            data.className,

          pin:
            data.pin,

          score:
            data.score,

          levels:
            data.levels,

          actions:
            data.actions

        })
        .select()
        .single();


    if (result.error) {

      console.warn(
        "Não foi possível criar a turma no Supabase:",
        result.error
      );

      return;
    }


    if (result.data) {

      classroomId =
        result.data.id;

      data =
        buildData(
          result.data
        );

      saveLocalData();

      renderAll();
    }

  } catch (error) {

    console.warn(
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
    return false;
  }


  try {

    if (!classroomId) {

      const result =
        await supabase
          .from("classrooms")
          .select("id")
          .limit(1)
          .maybeSingle();


      if (result.error) {

        console.warn(
          "Não foi possível localizar a turma:",
          result.error
        );

        return false;
      }


      if (result.data) {

        classroomId =
          result.data.id;
      }
    }


    if (!classroomId) {

      return false;
    }


    const result =
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
          classroomId
        );


    if (result.error) {

      console.warn(
        "Erro ao guardar no Supabase:",
        result.error
      );

      return false;
    }


    return true;

  } catch (error) {

    console.warn(
      "Erro ao guardar turma:",
      error
    );

    return false;
  }
}


// ============================================================
// HISTÓRICO
// ============================================================

async function loadHistory(id) {

  if (!supabase || !id) {

    renderHistory();

    return;
  }


  try {

    const result =
      await supabase
        .from("score_history")
        .select("*")
        .eq(
          "classroom_id",
          id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (result.error) {

      console.warn(
        "Não foi possível carregar o histórico:",
        result.error
      );

      return;
    }


    history =
      result.data || [];


    renderHistory();

    renderChart();

  } catch (error) {

    console.warn(
      "Erro ao carregar histórico:",
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

  renderChart();


  if (!supabase || !classroomId) {
    return;
  }


  try {

    const result =
      await supabase
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

      console.warn(
        "Histórico não foi guardado no Supabase:",
        result.error
      );
    }

  } catch (error) {

    console.warn(
      "Erro ao guardar histórico:",
      error
    );
  }
}


// ============================================================
// RENDER GERAL
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

      celebration.classList.remove(
        "hidden"
      );

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
    target -
    previousPoints;


  const current =
    score -
    previousPoints;


  let percentage =
    range > 0
      ? (
          current /
          range
        ) * 100
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

    if (previous.length) {

      celebration.classList.remove(
        "hidden"
      );

      celebration.textContent =
        `🎉 ${previous[previous.length - 1].name} alcançado!`;

    } else {

      celebration.classList.add(
        "hidden"
      );
    }
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


  const levels =
    normaliseLevels(
      data.levels
    ).sort(
      (a, b) =>
        Number(a.points) -
        Number(b.points)
    );


  data.levels =
    levels;


  container.innerHTML =
    levels
      .map(level => {

        const unlocked =
          Number(data.score) >=
          Number(level.points);


        return `

          <div class="level ${
            unlocked
              ? "unlocked"
              : ""
          }">

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
// AÇÕES
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


  positive.innerHTML = `

    ${
      !adminUnlocked
        ? `
          <div class="adminLocked">
            🔒 <strong>Administração necessária.</strong><br>
            Entra na Administração para alterar a pontuação.
          </div>
        `
        : positiveActions
            .map(
              (action, index) => {

                const realIndex =
                  actions.indexOf(
                    action
                  );


                return `

                  <button
                    type="button"
                    class="action ${
                      adminUnlocked
                        ? "positive"
                        : ""
                    }"
                    data-action-index="${realIndex}"
                  >

                    <span class="label">

                      <span
                        style="margin-right:8px;"
                      >
                        ${escapeHtml(
                          action.emoji
                        )}
                      </span>

                      ${escapeHtml(
                        action.name
                      )}

                    </span>

                    <span class="value">
                      +${Math.abs(
                        Number(
                          action.delta
                        )
                      )}
                    </span>

                  </button>

                `;
              }
            )
            .join("")
    }

  `;


  negative.innerHTML = `

    ${
      !adminUnlocked
        ? `
          <div class="adminLocked">
            🔒 <strong>Administração necessária.</strong><br>
            Entra na Administração para alterar a pontuação.
          </div>
        `
        : negativeActions
            .map(
              action => {

                const realIndex =
                  actions.indexOf(
                    action
                  );


                return `

                  <button
                    type="button"
                    class="action negative"
                    data-action-index="${realIndex}"
                  >

                    <span class="label">

                      <span
                        style="margin-right:8px;"
                      >
                        ${escapeHtml(
                          action.emoji
                        )}
                      </span>

                      ${escapeHtml(
                        action.name
                      )}

                    </span>

                    <span class="value">
                      -${Math.abs(
                        Number(
                          action.delta
                        )
                      )}
                    </span>

                  </button>

                `;
              }
            )
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
    classroomId &&
    item.id
  ) {

    try {

      const result =
        await supabase
          .from("score_history")
          .delete()
          .eq(
            "id",
            item.id
          );


      if (result.error) {

        console.warn(
          "Não foi possível apagar o registo no Supabase:",
          result.error
        );
      }

    } catch (error) {

      console.warn(
        "Erro ao apagar histórico:",
        error
      );
    }
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

  renderChart();


  if (
    !supabase ||
    !classroomId
  ) {

    return;
  }


  try {

    const result =
      await supabase
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );


    if (result.error) {

      console.warn(
        "Não foi possível apagar o histórico no Supabase:",
        result.error
      );
    }

  } catch (error) {

    console.warn(
      "Erro ao apagar histórico:",
      error
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


  data.score =
    0;


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

            <div class="when">
              ${escapeHtml(date)}
            </div>

            <div class="desc">

              ${escapeHtml(
                item.emoji || "⭐"
              )}

              ${escapeHtml(
                item.name || "Alteração"
              )}

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
              title="Desfazer"
              ${
                adminUnlocked
                  ? ""
                  : "disabled"
              }
              onclick="undo()"
            >
              ↩
            </button>

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
      `${Number(data?.score) || 0} pontos`;
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
          Number(
            item.after_score
          ) || 0
      );


  const max =
    Math.max(
      10,
      ...values,
      Number(data.score) || 0
    );


  const width =
    600;

  const height =
    240;

  const padding =
    20;


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


  adminUnlocked =
    false;


  updateAdminVisibility();


  const pinInput =
    $("#pinInput");


  if (pinInput) {

    pinInput.value =
      "";
  }


  modal.classList.remove(
    "hidden"
  );

  modal.classList.add(
    "show"
  );


  setTimeout(
    () => {

      pinInput?.focus();

    },
    50
  );
}


function closeAdmin() {

  const modal =
    $("#adminModal");


  adminUnlocked =
    false;


  if (modal) {

    modal.classList.remove(
      "show"
    );

    modal.classList.add(
      "hidden"
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
    enteredPin ===
      String(data.pin)
  ) {

    adminUnlocked =
      true;


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
// VISIBILIDADE ADMIN
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

      adminForm.classList.remove(
        "hidden"
      );

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

      adminForm.classList.add(
        "hidden"
      );
    }
  }


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

    newPinInput.value =
      "";
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

          <div
            class="levelRow"
            style="
              grid-template-columns:
              minmax(0, 1fr)
              100px
              70px;
            "
          >

            <input
              type="text"
              class="levelName"
              data-level="${index}"
              value="${escapeHtml(
                level.name
              )}"
              placeholder="Nome"
            >

            <input
              type="number"
              class="levelPoints"
              data-level="${index}"
              value="${Number(
                level.points
              )}"
              min="0"
              placeholder="Pontos"
            >

            <input
              type="text"
              class="levelEmoji"
              data-level="${index}"
              value="${escapeHtml(
                level.emoji
              )}"
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
      names[i]
        .value
        .trim();


    const pts =
      Number(
        points[i]?.value
      );


    const emoji =
      emojis[i]
        ?.value
        .trim() ||
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


  data.levels =
    levels.length
      ? levels
      : cloneDefaults().levels;


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


  // Nunca substituir os dados enquanto
  // a administração está aberta.
  if (adminUnlocked) {
    return;
  }


  try {

    const result =
      await supabase
        .from("classrooms")
        .select("*")
        .limit(1)
        .maybeSingle();


    if (
      result.error ||
      !result.data
    ) {

      return;
    }


    const remote =
      result.data;


    classroomId =
      remote.id;


    data =
      buildData(remote);


    saveLocalData();

    renderAll();


    await loadHistory(
      classroomId
    );

  } catch (error) {

    console.warn(
      "Atualização Supabase falhou:",
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

          event.preventDefault();

          unlockAdmin();
        }

      }
    );
  }


  const adminForm =
    $("#adminForm");


  if (adminForm) {

    adminForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        saveAdminSettings();
      }
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


  const undoBtn =
    $("#undoBtn");


  if (undoBtn) {

    undoBtn.addEventListener(
      "click",
      undo
    );
  }


  // ----------------------------------------------------------
  // BOTÕES DE PONTUAÇÃO
  // ----------------------------------------------------------

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
// INICIALIZAÇÃO
// ============================================================

async function init() {

  console.log(
    "Desafio da Turma: iniciar aplicação..."
  );


  // Primeiro dados locais.
  data =
    loadLocalData();


  // Depois interface.
  setupEvents();

  renderAll();


  // Depois Supabase.
  initSupabase();


  // Finalmente sincronização.
  await loadClassroom();


  // Atualização automática.
  setInterval(
    refreshFromSupabase,
    10000
  );


  console.log(
    "Desafio da Turma: aplicação pronta."
  );
}


// ============================================================
// ARRANQUE
// ============================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();
}
