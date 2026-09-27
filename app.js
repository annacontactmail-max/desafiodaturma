/* =========================================================
   DESAFIO DA TURMA
   app.js
   ========================================================= */

/* -------------------------
   CONFIGURAÇÃO
------------------------- */

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_ANON_KEY;

const STORAGE_KEY = "desafioTurmaV2";

let supabaseClient = null;
let classroomId = null;
let adminUnlocked = false;
let data = null;
let history = [];


/* -------------------------
   DADOS INICIAIS
------------------------- */

const DEFAULT_DATA = {
  className: "Turma",
  pin: "1234",
  score: 0,

  levels: [
    {
      points: 20,
      label: "Sair mais cedo",
      emoji: "🟦"
    },
    {
      points: 35,
      label: "Aula livre",
      emoji: "🟩"
    },
    {
      points: 50,
      label: "Torneio",
      emoji: "🟨"
    },
    {
      points: 70,
      label: "Aula na rua",
      emoji: "🟧"
    },
    {
      points: 100,
      label: "Festa 1h",
      emoji: "🟪"
    },
    {
      points: 130,
      label: "Festa 2h",
      emoji: "🏆"
    }
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


/* -------------------------
   FUNÇÃO $
------------------------- */

function $(selector) {
  return document.querySelector(selector);
}


/* -------------------------
   INICIALIZAÇÃO
------------------------- */

document.addEventListener("DOMContentLoaded", async () => {

  console.log("Desafio da Turma: iniciar aplicação...");

  data = loadLocalData();

  initSupabase();

  setupEvents();

  render();

  await loadClassroom();

  render();

  /*
    Atualiza os dados periodicamente.
    Só fazemos isto se não estivermos a editar
    a administração.
  */

  setInterval(async () => {

    if (!adminUnlocked) {
      await loadClassroom();
      render();
    }

  }, 5000);

});


/* =========================================================
   SUPABASE
========================================================= */

function initSupabase() {

  try {

    if (
      !window.supabase ||
      !SUPABASE_URL ||
      !SUPABASE_KEY
    ) {

      console.error(
        "Configuração do Supabase não encontrada."
      );

      return;
    }


    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );


    console.log(
      "Supabase ligado corretamente."
    );

  } catch (error) {

    console.error(
      "Erro ao iniciar Supabase:",
      error
    );

  }
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadLocalData() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);


    if (!saved) {

      return clone(DEFAULT_DATA);

    }


    const parsed =
      JSON.parse(saved);


    return {

      ...clone(DEFAULT_DATA),

      ...parsed,

      score:
        Math.max(
          0,
          Number(parsed.score || 0)
        ),

      levels:
        Array.isArray(parsed.levels)
          ? parsed.levels
          : clone(DEFAULT_DATA.levels),

      actions:
        Array.isArray(parsed.actions)
          ? parsed.actions
          : clone(DEFAULT_DATA.actions)

    };

  } catch (error) {

    console.error(
      "Erro ao carregar dados locais:",
      error
    );

    return clone(DEFAULT_DATA);
  }
}


function saveLocalData() {

  if (!data) return;

  data.score =
    Math.max(
      0,
      Number(data.score || 0)
    );


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}


function clone(value) {

  return JSON.parse(
    JSON.stringify(value)
  );
}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

  const adminBtn = $("#adminBtn");

  if (adminBtn) {

    adminBtn.addEventListener(
      "click",
      openAdmin
    );

  }


  const closeAdmin = $("#closeAdmin");

  if (closeAdmin) {

    closeAdmin.addEventListener(
      "click",
      closeAdminModal
    );

  }


  const unlockBtn = $("#unlockBtn");

  if (unlockBtn) {

    unlockBtn.addEventListener(
      "click",
      unlockAdmin
    );

  }


  const pinInput = $("#pinInput");

  if (pinInput) {

    pinInput.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          unlockAdmin();

        }

      }
    );

  }


  const adminForm = $("#adminForm");

  if (adminForm) {

    adminForm.addEventListener(
      "submit",
      saveAdminSettings
    );

  }


  const resetBtn = $("#resetBtn");

  if (resetBtn) {

    resetBtn.addEventListener(
      "click",
      resetClass
    );

  }


  const clearHistory = $("#clearHistory");

  if (clearHistory) {

    clearHistory.addEventListener(
      "click",
      clearHistoryData
    );

  }


  const adminLogout = $("#adminLogout");

  if (adminLogout) {

    adminLogout.addEventListener(
      "click",
      closeAdminModal
    );

  }

}


/* =========================================================
   CARREGAR TURMA DO SUPABASE
========================================================= */

async function loadClassroom() {

  if (!supabaseClient) {

    console.warn(
      "Supabase indisponível. A usar dados locais."
    );

    return;

  }


  try {

    const result =
      await supabaseClient
        .from("classrooms")
        .select("*")
        .limit(1);


    if (result.error) {

      console.error(
        "Erro ao carregar classrooms:",
        result.error
      );

      return;

    }


    const rows =
      result.data || [];


    /*
      Se ainda não existir nenhuma turma,
      criamos uma automaticamente.
    */

    if (!rows.length) {

      console.log(
        "Não existe nenhuma turma. A criar uma..."
      );

      await createClassroom();

      return;

    }


    const remote =
      rows[0];


    classroomId =
      remote.id;


    data.className =
      remote.name ||
      data.className;


    if (
      remote.pin !== null &&
      remote.pin !== undefined
    ) {

      data.pin =
        String(remote.pin);

    }


    data.score =
      Math.max(
        0,
        Number(remote.score || 0)
      );


    if (Array.isArray(remote.levels)) {

      data.levels =
        remote.levels;

    }


    if (Array.isArray(remote.actions)) {

      data.actions =
        remote.actions;

    }


    saveLocalData();


    await loadHistory();


    console.log(
      "Turma carregada:",
      data.className
    );


  } catch (error) {

    console.error(
      "Erro ao carregar turma:",
      error
    );

  }

}


/* =========================================================
   CRIAR TURMA
========================================================= */

async function createClassroom() {

  if (!supabaseClient) return;


  try {

    const result =
      await supabaseClient
        .from("classrooms")
        .insert({

          name:
            data.className,

          pin:
            data.pin,

          score:
            0,

          levels:
            data.levels,

          actions:
            data.actions,

          updated_at:
            new Date().toISOString()

        })
        .select()
        .single();


    if (result.error) {

      console.error(
        "Erro ao criar turma:",
        result.error
      );

      return;

    }


    if (result.data) {

      classroomId =
        result.data.id;

      console.log(
        "Turma criada:",
        classroomId
      );

    }

  } catch (error) {

    console.error(
      "Erro ao criar turma:",
      error
    );

  }

}


/* =========================================================
   GUARDAR TURMA
========================================================= */

async function saveClassroom() {

  saveLocalData();


  if (
    !supabaseClient ||
    !classroomId
  ) {

    return;

  }


  try {

    const result =
      await supabaseClient
        .from("classrooms")
        .update({

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

        })
        .eq(
          "id",
          classroomId
        );


    if (result.error) {

      console.error(
        "Erro ao guardar turma:",
        result.error
      );

    }

  } catch (error) {

    console.error(
      "Erro ao guardar turma:",
      error
    );

  }

}


/* =========================================================
   HISTÓRICO
========================================================= */

async function loadHistory() {

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
      "Erro no histórico:",
      error
    );

  }

}


async function saveHistory(item) {

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
      "Erro ao guardar histórico:",
      error
    );

  }

}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function render() {

  if (!data) return;


  data.score =
    Math.max(
      0,
      Number(data.score || 0)
    );


  const classTitle =
    $("#classTitle");


  if (classTitle) {

    classTitle.textContent =
      data.className ||
      "Turma";

  }


  const score =
    $("#score");


  if (score) {

    score.textContent =
      data.score;

  }


  renderProgress();

  renderLevels();

  renderActions();

  renderHistory();

  renderChart();

}


/* =========================================================
   PROGRESSO
========================================================= */

function renderProgress() {

  const progressBar =
    $("#progressBar");

  const nextText =
    $("#nextText");

  const celebration =
    $("#celebration");


  if (!data.levels.length) {

    if (progressBar) {
      progressBar.style.width = "0%";
    }

    if (nextText) {
      nextText.textContent =
        "Ainda não existem prémios.";
    }

    return;

  }


  const levels =
    [...data.levels]
      .sort(
        (a, b) =>
          Number(a.points) -
          Number(b.points)
      );


  const score =
    Math.max(
      0,
      Number(data.score)
    );


  const next =
    levels.find(
      level =>
        Number(level.points) >
        score
    );


  /*
    Todos os prémios alcançados.
  */

  if (!next) {

    if (progressBar) {

      progressBar.style.width =
        "100%";

    }


    if (nextText) {

      nextText.textContent =
        "🎉 Todos os prémios foram alcançados!";

    }


    if (celebration) {

      celebration.textContent =
        "🏆 Parabéns, turma!";

    }


    return;

  }


  const previous =
    [...levels]
      .reverse()
      .find(
        level =>
          Number(level.points) <=
          score
      );


  const start =
    previous
      ? Number(previous.points)
      : 0;


  const target =
    Number(next.points);


  const total =
    target - start;


  const current =
    score - start;


  let percentage =
    total > 0
      ? (current / total) * 100
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

    const remaining =
      Math.max(
        0,
        target - score
      );


    nextText.textContent =
      `Faltam ${remaining} pontos para ${next.emoji} ${next.label}`;

  }


  if (celebration) {

    const reached =
      levels.filter(
        level =>
          Number(level.points) <=
          score
      );


    if (reached.length) {

      const last =
        reached[reached.length - 1];


      celebration.textContent =
        `🎉 Último prémio alcançado: ${last.emoji} ${last.label}`;

    } else {

      celebration.textContent =
        "";

    }

  }

}


/* =========================================================
   PRÉMIOS
========================================================= */

function renderLevels() {

  const container =
    $("#levels");


  if (!container) return;


  container.innerHTML =
    "";


  const levels =
    [...data.levels]
      .sort(
        (a, b) =>
          Number(a.points) -
          Number(b.points)
      );


  levels.forEach(level => {

    const card =
      document.createElement("div");


    card.className =
      "level-card";


    if (
      data.score >=
      Number(level.points)
    ) {

      card.classList.add(
        "reached"
      );

    }


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
        ${
          data.score >= Number(level.points)
            ? "✅ Conquistado"
            : "🔒 Por conquistar"
        }
      </div>

    `;


    container.appendChild(card);

  });

}


/* =========================================================
   AÇÕES
========================================================= */

function renderActions() {

  const positive =
    $("#positiveActions");

  const negative =
    $("#negativeActions");


  if (!positive || !negative) {

    return;

  }


  /*
    IMPORTANTE:
    Os botões não aparecem enquanto
    o administrador não estiver autenticado.
  */

  if (!adminUnlocked) {

    positive.innerHTML = `
      <div class="admin-lock-message">
        🔒 Área do administrador
        <small>
          Entre na Administração para ganhar pontos.
        </small>
      </div>
    `;


    negative.innerHTML = `
      <div class="admin-lock-message">
        🔒 Área do administrador
        <small>
          Entre na Administração para retirar pontos.
        </small>
      </div>
    `;


    return;

  }


  positive.innerHTML =
    "";

  negative.innerHTML =
    "";


  data.actions.forEach(
    (action, index) => {

      const button =
        document.createElement("button");


      button.type =
        "button";


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
          ${
            Number(action.points) > 0
              ? "+"
              : ""
          }${Number(action.points)}
        </strong>

      `;


      button.addEventListener(
        "click",
        () => changePoints(index)
      );


      if (
        Number(action.points) >= 0
      ) {

        positive.appendChild(
          button
        );

      } else {

        negative.appendChild(
          button
        );

      }

    }
  );

}


/* =========================================================
   ALTERAR PONTOS
========================================================= */

async function changePoints(index) {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode alterar os pontos."
    );

    return;

  }


  const action =
    data.actions[index];


  if (!action) return;


  const before =
    Math.max(
      0,
      Number(data.score || 0)
    );


  const requested =
    Number(action.points || 0);


  const after =
    Math.max(
      0,
      before + requested
    );


  const actualChange =
    after - before;


  if (actualChange === 0) {

    alert(
      "A turma já está com 0 pontos."
    );

    return;

  }


  data.score =
    after;


  const item = {

    name:
      action.name,

    emoji:
      action.emoji,

    delta:
      actualChange,

    before_score:
      before,

    after_score:
      after,

    created_at:
      new Date().toISOString()

  };


  /*
    Primeiro atualizamos a interface.
  */

  history.unshift(item);

  saveLocalData();

  render();


  /*
    Depois guardamos no Supabase.
  */

  await saveHistory(item);

  await saveClassroom();

}


/* =========================================================
   DESFAZER
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
      "Não existem alterações para desfazer."
    );

    return;

  }


  const last =
    history[0];


  data.score =
    Math.max(
      0,
      Number(
        last.before_score || 0
      )
    );


  history.shift();


  saveLocalData();

  render();

  await saveClassroom();


  alert(
    "↩️ Última alteração desfeita."
  );

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


  if (
    !confirm(
      "Tem a certeza de que quer limpar o histórico?"
    )
  ) {

    return;

  }


  history = [];


  if (
    supabaseClient &&
    classroomId
  ) {

    const result =
      await supabaseClient
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );


    if (result.error) {

      console.error(
        "Erro ao limpar histórico:",
        result.error
      );

    }

  }


  render();

}


/* =========================================================
   RESET
========================================================= */

async function resetClass() {

  if (!adminUnlocked) {

    alert(
      "🔒 Apenas o administrador pode reiniciar a pontuação."
    );

    return;

  }


  if (
    !confirm(
      "Tem a certeza de que quer colocar a pontuação a 0?"
    )
  ) {

    return;

  }


  data.score =
    0;


  history =
    [];


  saveLocalData();

  render();


  await saveClassroom();


  if (
    supabaseClient &&
    classroomId
  ) {

    const result =
      await supabaseClient
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );


    if (result.error) {

      console.error(
        "Erro ao apagar histórico:",
        result.error
      );

    }

  }


  alert(
    "🔄 A pontuação foi reiniciada para 0."
  );

}


/* =========================================================
   ADMINISTRAÇÃO
========================================================= */

function openAdmin() {

  const modal =
    $("#adminModal");


  if (!modal) {

    console.error(
      "Elemento #adminModal não encontrado."
    );

    return;

  }


  adminUnlocked =
    false;


  modal.classList.remove(
    "hidden"
  );


  showPinArea();

}


function closeAdminModal() {

  adminUnlocked =
    false;


  const modal =
    $("#adminModal");


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }


  render();

}


/* =========================================================
   PIN
========================================================= */

function showPinArea() {

  const pinArea =
    $("#pinArea");

  const adminForm =
    $("#adminForm");


  if (pinArea) {

    pinArea.classList.remove(
      "hidden"
    );

  }


  if (adminForm) {

    adminForm.classList.add(
      "hidden"
    );

  }


  const pinInput =
    $("#pinInput");


  if (pinInput) {

    pinInput.value =
      "";

    pinInput.focus();

  }

}


function unlockAdmin() {

  const pinInput =
    $("#pinInput");


  if (!pinInput) {

    alert(
      "Não foi encontrado o campo do PIN."
    );

    return;

  }


  const enteredPin =
    pinInput.value.trim();


  if (!enteredPin) {

    alert(
      "Introduza o PIN."
    );

    return;

  }


  if (
    enteredPin ===
    String(data.pin)
  ) {

    adminUnlocked =
      true;


    const pinArea =
      $("#pinArea");


    const adminForm =
      $("#adminForm");


    if (pinArea) {

      pinArea.classList.add(
        "hidden"
      );

    }


    if (adminForm) {

      adminForm.classList.remove(
        "hidden"
      );

    }


    loadAdminSettings();

    render();

  } else {

    alert(
      "PIN incorreto."
    );


    pinInput.value =
      "";


    pinInput.focus();

  }

}


/* =========================================================
   CARREGAR ADMIN
========================================================= */

function loadAdminSettings() {

  const classInput =
    $("#classInput");


  if (classInput) {

    classInput.value =
      data.className || "";

  }


  /*
    O PIN NÃO é mostrado.
  */

  const newPinInput =
    $("#newPinInput");


  if (newPinInput) {

    newPinInput.value =
      "";

    newPinInput.placeholder =
      "Deixe vazio para manter o PIN atual";

  }


  const levelInputs =
    $("#levelInputs");


  if (!levelInputs) return;


  levelInputs.innerHTML =
    "";


  data.levels.forEach(
    (level, index) => {

      const row =
        document.createElement("div");


      row.className =
        "admin-level-row";


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


      levelInputs.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   GUARDAR ADMIN
========================================================= */

async function saveAdminSettings(event) {

  event.preventDefault();


  if (!adminUnlocked) {

    alert(
      "🔒 Primeiro entre na Administração."
    );

    return;

  }


  const classInput =
    $("#classInput");


  if (classInput) {

    const name =
      classInput.value.trim();


    if (name) {

      data.className =
        name;

    }

  }


  /*
    Só muda o PIN se escreveres
    um novo PIN.
  */

  const newPinInput =
    $("#newPinInput");


  if (newPinInput) {

    const newPin =
      newPinInput.value.trim();


    if (newPin) {

      data.pin =
        newPin;

    }

  }


  /*
    Atualizar prémios.
  */

  const levelInputs =
    $("#levelInputs");


  if (levelInputs) {

    data.levels =
      data.levels.map(
        (level, index) => {

          const points =
            levelInputs.querySelector(
              `[data-level-points="${index}"]`
            );


          const label =
            levelInputs.querySelector(
              `[data-level-label="${index}"]`
            );


          const emoji =
            levelInputs.querySelector(
              `[data-level-emoji="${index}"]`
            );


          return {

            points:
              Math.max(
                0,
                Number(
                  points?.value ||
                  level.points ||
                  0
                )
              ),

            label:
              label?.value.trim() ||
              level.label,

            emoji:
              emoji?.value.trim() ||
              level.emoji

          };

        }
      );

  }


  /*
    Ordenar prémios por pontos.
  */

  data.levels.sort(
    (a, b) =>
      Number(a.points) -
      Number(b.points)
  );


  saveLocalData();

  await saveClassroom();


  /*
    Limpar o campo do novo PIN.
  */

  if (newPinInput) {

    newPinInput.value =
      "";

  }


  render();


  alert(
    "✅ Configurações guardadas."
  );

}


/* =========================================================
   GRÁFICO
========================================================= */

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


  if (!history.length) {

    line.setAttribute(
      "points",
      ""
    );


    dots.innerHTML =
      "";


    if (currentScore) {

      currentScore.textContent =
        data.score;

    }


    if (empty) {

      empty.classList.remove(
        "hidden"
      );

    }


    return;

  }


  if (empty) {

    empty.classList.add(
      "hidden"
    );

  }


  /*
    Histórico vem do mais recente
    para o mais antigo.

    Para o gráfico queremos o contrário.
  */

  const ordered =
    [...history].reverse();


  const values =
    [0];


  ordered.forEach(
    item => {

      values.push(
        Math.max(
          0,
          Number(
            item.after_score || 0
          )
        )
      );

    }
  );


  const width =
    700;

  const height =
    260;

  const padding =
    30;


  const max =
    Math.max(
      10,
      ...values
    );


  const usableWidth =
    width - padding * 2;

  const usableHeight =
    height - padding * 2;


  const points =
    values.map(
      (value, index) => {

        const x =
          padding +
          (
            index /
            Math.max(
              1,
              values.length - 1
            )
          ) *
          usableWidth;


        const ratio =
          value /
          max;


        const y =
          height -
          padding -
          ratio *
          usableHeight;


        return {
          x,
          y,
          value
        };

      }
    );


  line.setAttribute(
    "points",
    points
      .map(
        p =>
          `${p.x},${p.y}`
      )
      .join(" ")
  );


  dots.innerHTML =
    "";


  points.forEach(
    point => {

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


      circle.appendChild(
        title
      );


      dots.appendChild(
        circle
      );

    }
  );


  if (currentScore) {

    currentScore.textContent =
      data.score;

  }

}


/* =========================================================
   HISTÓRICO VISUAL
========================================================= */

function renderHistory() {

  const container =
    $("#history");


  if (!container) return;


  if (!history.length) {

    container.innerHTML = `
      <div class="empty-history">
        Ainda não existem movimentos.
      </div>
    `;

    return;

  }


  container.innerHTML =
    "";


  history
    .slice(0, 50)
    .forEach(item => {

      const row =
        document.createElement("div");


      row.className =
        "history-row";


      const delta =
        Number(
          item.delta || 0
        );


      const sign =
        delta > 0
          ? "+"
          : "";


      let dateText =
        "";


      if (item.created_at) {

        try {

          dateText =
            new Date(
              item.created_at
            ).toLocaleString(
              "pt-PT"
            );

        } catch {

          dateText =
            "";

        }

      }


      row.innerHTML = `

        <div class="history-icon">
          ${escapeHtml(item.emoji || "•")}
        </div>

        <div class="history-info">

          <strong>
            ${escapeHtml(item.name || "Movimento")}
          </strong>

          <small>
            ${dateText}
          </small>

        </div>

        <div
          class="history-points ${
            delta >= 0
              ? "positive"
              : "negative"
          }"
        >
          ${sign}${delta}
        </div>

      `;


      container.appendChild(
        row
      );

    });

}


/* =========================================================
   SEGURANÇA HTML
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
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
