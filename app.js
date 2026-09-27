const KEY = "desafioTurmaV2";

const defaults = {
  className: "Turma",
  pin: "1234",
  score: 0,
  history: [],
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


/* =========================
   ESTADO DO ADMINISTRADOR
========================= */

let adminUnlocked = false;


/* =========================
   SUPABASE
========================= */

const configured =
  window.SUPABASE_URL &&
  window.SUPABASE_ANON_KEY;

const sb = configured
  ? supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    )
  : null;


let classroomId =
  localStorage.getItem("desafioClassroomId");

let data =
  JSON.parse(
    localStorage.getItem(KEY) || "null"
  ) || structuredClone(defaults);


const $ = (selector) =>
  document.querySelector(selector);


/* =========================
   GUARDAR LOCAL
========================= */

function saveLocal() {
  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}


/* =========================
   DATA
========================= */

function fmtDate(iso) {
  return new Date(iso).toLocaleString(
    "pt-PT",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================
   SUPABASE
========================= */

async function connectRemote() {

  if (!sb) return;

  try {

    let q;

    if (classroomId) {

      q = sb
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .maybeSingle();

    } else {

      q = sb
        .from("classrooms")
        .select("*")
        .order("created_at", {
          ascending: true
        })
        .limit(1);
    }


    const {
      data: result,
      error
    } = await q;


    if (error) {

      console.error(
        "Erro Supabase:",
        error
      );

      return;
    }


    const row =
      classroomId
        ? result
        : result?.[0];


    if (row) {

      classroomId = row.id;

      localStorage.setItem(
        "desafioClassroomId",
        classroomId
      );


      data.className =
        row.name || defaults.className;

      data.pin =
        row.pin || defaults.pin;

      data.score =
        Math.max(
          0,
          Number(row.score) || 0
        );


      data.levels =
        Array.isArray(row.levels)
          ? row.levels
          : structuredClone(defaults.levels);


      data.actions =
        Array.isArray(row.actions)
          ? row.actions
          : structuredClone(defaults.actions);


      await loadHistory();

      saveLocal();

      render();

    } else {

      const {
        data: newRow,
        error: insertError
      } = await sb
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


      if (!insertError) {

        classroomId =
          newRow.id;

        localStorage.setItem(
          "desafioClassroomId",
          classroomId
        );
      }
    }

  } catch (error) {

    console.error(error);
  }
}


/* =========================
   HISTÓRICO
========================= */

async function loadHistory() {

  if (!sb || !classroomId) return;


  const {
    data: result,
    error
  } = await sb
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

    return;
  }


  data.history =
    (result || []).map(
      h => ({
        id: h.id,
        date: h.created_at,
        name: h.name,
        emoji: h.emoji,
        delta: h.delta,
        before: h.before_score,
        after: h.after_score
      })
    );
}


/* =========================
   GUARDAR SUPABASE
========================= */

async function pushClassroom() {

  if (!sb || !classroomId) return;


  const {
    error
  } = await sb
    .from("classrooms")
    .update({
      name: data.className,
      pin: data.pin,
      score: data.score,
      levels: data.levels,
      actions: data.actions,
      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      classroomId
    );


  if (error) {

    console.error(
      "Erro ao guardar:",
      error
    );
  }
}


/* =========================
   BOTÕES DE PONTOS
========================= */

function actionHTML(action, index) {

  return `
    <button
      class="action ${
        action.points > 0
          ? "positive"
          : "negative"
      }"
      data-i="${index}"
    >

      <span class="label">
        ${action.emoji}
        ${action.name}
      </span>

      <span class="value">
        ${
          action.points > 0
            ? "+"
            : ""
        }${action.points}
      </span>

    </button>
  `;
}


/* =========================
   MOSTRAR / ESCONDER
   BOTÕES DE PONTOS
========================= */

function updateAdminVisibility() {

  const actionsArea =
    document.querySelector(
      "#positiveActions"
    );

  const negativeArea =
    document.querySelector(
      "#negativeActions"
    );


  if (!actionsArea || !negativeArea) {
    return;
  }


  if (!adminUnlocked) {

    actionsArea.innerHTML = `
      <div class="adminLocked">
        🔒 <strong>Área do administrador</strong>
        <br>
        Entre na Administração para ganhar pontos.
      </div>
    `;


    negativeArea.innerHTML = `
      <div class="adminLocked">
        🔒 <strong>Área do administrador</strong>
        <br>
        Entre na Administração para retirar pontos.
      </div>
    `;

    return;
  }


  actionsArea.innerHTML =
    data.actions
      .map(
        (action, index) =>
          action.points > 0
            ? actionHTML(
                action,
                index
              )
            : ""
      )
      .join("");


  negativeArea.innerHTML =
    data.actions
      .map(
        (action, index) =>
          action.points < 0
            ? actionHTML(
                action,
                index
              )
            : ""
      )
      .join("");


  document
    .querySelectorAll(".action")
    .forEach(
      button => {

        button.onclick =
          () =>
            change(
              Number(
                button.dataset.i
              )
            );
      }
    );
}


/* =========================
   GRÁFICO
========================= */

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


  let history =
    [...data.history]
      .reverse();


  let values;


  if (history.length) {

    values =
      history.map(
        h =>
          Math.max(
            0,
            Number(h.after)
          )
      );

  } else {

    values = [
      0,
      Math.max(
        0,
        Number(data.score)
      )
    ];
  }


  values = [
    0,
    ...values
  ];


  const width = 600;
  const height = 220;
  const padding = 30;


  const minValue = 0;

  const maxValue =
    Math.max(
      10,
      ...values
    );


  const range =
    Math.max(
      1,
      maxValue - minValue
    );


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
          (
            width -
            padding * 2
          );


        const y =
          height -
          padding -
          (
            (value - minValue) /
            range
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


  if (current) {

    current.textContent =
      `${data.score} pontos`;
  }


  if (empty) {

    empty.classList.toggle(
      "hidden",
      data.history.length > 0
    );
  }
}


/* =========================
   RENDER
========================= */

function render() {

  if ($("#classTitle")) {

    $("#classTitle").textContent =
      data.className;
  }


  if ($("#score")) {

    $("#score").textContent =
      Math.max(
        0,
        data.score
      );
  }


  const next =
    data.levels.find(
      level =>
        level.points >
        data.score
    );


  const previous =
    data.levels.filter(
      level =>
        level.points <=
        data.score
    );


  const prev =
    previous.length
      ? previous[
          previous.length - 1
        ]
      : null;


  const from =
    prev?.points || 0;


  const to =
    next?.points ||
    Math.max(
      data.score,
      1
    );


  const percentage =
    next
      ? Math.max(
          0,
          Math.min(
            100,
            (
              (data.score - from) /
              (to - from)
            ) * 100
          )
        )
      : 100;


  if ($("#progressBar")) {

    $("#progressBar").style.width =
      `${percentage}%`;
  }


  if ($("#nextText")) {

    $("#nextText").textContent =
      next
        ? `Próximo objetivo: ${next.emoji} ${next.name} — faltam ${
            next.points -
            data.score
          } pontos`
        : "🏆 Todos os prémios desbloqueados!";
  }


  /* NÍVEIS */

  if ($("#levels")) {

    $("#levels").innerHTML =
      data.levels
        .map(
          level => `
            <div
              class="level ${
                data.score >= level.points
                  ? "unlocked"
                  : ""
              }"
            >

              <span class="emoji">
                ${level.emoji}
              </span>

              <div class="info">

                <div class="name">
                  ${level.name}
                </div>

                <div class="pts">
                  ${level.points} pontos
                </div>

              </div>

              ${
                data.score >= level.points
                  ? `
                    <span class="badge">
                      ✓ Desbloqueado
                    </span>
                  `
                  : ""
              }

            </div>
          `
        )
        .join("");
  }


  /* AÇÕES */

  updateAdminVisibility();


  /* HISTÓRICO */

  if ($("#history")) {

    if (!data.history.length) {

      $("#history").innerHTML =
        `
          <p style="color:#94a3b8">
            Ainda não há alterações.
          </p>
        `;

    } else {

      $("#history").innerHTML =
        data.history
          .map(
            (historyItem, index) => `
              <div class="historyItem">

                <span class="when">
                  ${fmtDate(
                    historyItem.date
                  )}
                </span>

                <span class="desc">
                  ${historyItem.emoji}
                  ${historyItem.name}
                </span>

                <span
                  class="delta ${
                    historyItem.delta >= 0
                      ? "pos"
                      : "neg"
                  }"
                >
                  ${
                    historyItem.delta > 0
                      ? "+"
                      : ""
                  }${historyItem.delta}
                </span>

                ${
                  adminUnlocked
                    ? `
                      <button
                        class="undo"
                        title="Desfazer"
                        onclick="undo(${index})"
                      >
                        ↩
                      </button>
                    `
                    : ""
                }

              </div>
            `
          )
          .join("");
    }
  }


  renderChart();
}


/* =========================
   ALTERAR PONTOS
========================= */

async function change(index) {

  /*
   * SEGURANÇA DA INTERFACE:
   * sem administrador desbloqueado,
   * não é possível alterar pontos.
   */

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
    data.score;


  /*
   * A pontuação nunca fica
   * abaixo de zero.
   */

  data.score =
    Math.max(
      0,
      data.score +
        action.points
    );


  const actualChange =
    data.score - before;


  /*
   * Se retirar pontos quando
   * a turma já está a zero,
   * não criamos uma entrada
   * desnecessária no histórico.
   */

  if (actualChange === 0) {

    alert(
      "A turma já está com 0 pontos."
    );

    return;
  }


  const historyItem = {

    date:
      new Date().toISOString(),

    name:
      action.name,

    emoji:
      action.emoji,

    delta:
      actualChange,

    before:
      before,

    after:
      data.score
  };


  data.history.unshift(
    historyItem
  );


  saveLocal();

  render();


  /* SUPABASE */

  if (
    sb &&
    classroomId
  ) {

    const {
      data: inserted,
      error
    } = await sb
      .from("score_history")
      .insert({
        classroom_id:
          classroomId,

        name:
          historyItem.name,

        emoji:
          historyItem.emoji,

        delta:
          historyItem.delta,

        before_score:
          historyItem.before,

        after_score:
          historyItem.after
      })
      .select()
      .single();


    if (!error && inserted) {

      historyItem.id =
        inserted.id;
    }


    await pushClassroom();
  }


  /* MENSAGEM */

  if ($("#celebration")) {

    $("#celebration").textContent =
      `${
        actualChange > 0
          ? "🎉 +"
          : "📌 "
      }${actualChange} pontos — ${
        action.name
      }. Total: ${
        data.score
      }`;


    $("#celebration")
      .classList
      .remove("hidden");


    setTimeout(
      () => {

        $("#celebration")
          .classList
          .add("hidden");

      },
      2200
    );
  }


  /* PRÉMIO */

  const reached =
    data.levels.find(
      level =>
        level.points > before &&
        level.points <= data.score
    );


  if (reached) {

    setTimeout(
      () => {

        alert(
          `🎊 OBJETIVO ATINGIDO!\n\n` +
          `${reached.emoji} ${reached.name}\n\n` +
          `A turma chegou aos ${reached.points} pontos!`
        );

      },
      100
    );
  }
}


/* =========================
   DESFAZER
========================= */

window.undo =
  async function(index) {

    if (!adminUnlocked) {

      alert(
        "🔒 Apenas o administrador pode desfazer alterações."
      );

      return;
    }


    const historyItem =
      data.history[index];


    if (!historyItem) {
      return;
    }


    data.score =
      Math.max(
        0,
        historyItem.before
      );


    data.history.splice(
      index,
      1
    );


    saveLocal();

    render();


    if (
      sb &&
      classroomId
    ) {

      if (historyItem.id) {

        await sb
          .from("score_history")
          .delete()
          .eq(
            "id",
            historyItem.id
          );
      }


      await pushClassroom();
    }
  };


/* =========================
   ABRIR ADMINISTRAÇÃO
========================= */

if ($("#adminBtn")) {

  $("#adminBtn").onclick =
    () => {

      $("#adminModal")
        .classList
        .remove("hidden");


      $("#pinArea")
        .classList
        .remove("hidden");


      $("#adminForm")
        .classList
        .add("hidden");


      $("#pinInput").value = "";
    };
}


/* =========================
   FECHAR ADMINISTRAÇÃO
========================= */

if ($("#closeAdmin")) {

  $("#closeAdmin").onclick =
    () => {

      adminUnlocked = false;


      $("#adminModal")
        .classList
        .add("hidden");


      render();
    };
}


/* =========================
   ENTRAR ADMIN
========================= */

if ($("#unlockBtn")) {

  $("#unlockBtn").onclick =
    () => {

      const enteredPin =
        $("#pinInput")
          .value
          .trim();


      if (
        enteredPin &&
        enteredPin === data.pin
      ) {

        adminUnlocked = true;


        $("#pinArea")
          .classList
          .add("hidden");


        $("#adminForm")
          .classList
          .remove("hidden");


        loadAdmin();

        render();

      } else {

        alert(
          "PIN incorreto."
        );
      }
    };
}


/* =========================
   CARREGAR ADMIN
========================= */

function loadAdmin() {

  if ($("#classInput")) {

    $("#classInput").value =
      data.className;
  }


  if ($("#newPinInput")) {

    $("#newPinInput").value =
      data.pin;
  }


  if ($("#levelInputs")) {

    $("#levelInputs").innerHTML =
      data.levels
        .map(
          (level, index) => `
            <div class="levelRow">

              <input
                data-name="${index}"
                value="${level.name}"
                aria-label="Nome do prémio"
              >

              <input
                data-points="${index}"
                type="number"
                min="0"
                value="${level.points}"
                aria-label="Pontos"
              >

            </div>
          `
        )
        .join("");
  }
}


/* =========================
   GUARDAR ADMIN
========================= */

if ($("#adminForm")) {

  $("#adminForm").onsubmit =
    async function(event) {

      event.preventDefault();


      data.className =
        $("#classInput")
          .value
          .trim() ||
        "Turma";


      data.pin =
        $("#newPinInput")
          .value
          .trim() ||
        "1234";


      data.levels.forEach(
        (level, index) => {

          const nameInput =
            document.querySelector(
              `[data-name="${index}"]`
            );


          const pointsInput =
            document.querySelector(
              `[data-points="${index}"]`
            );


          if (nameInput) {

            level.name =
              nameInput.value
                .trim() ||
              level.name;
          }


          if (pointsInput) {

            level.points =
              Math.max(
                0,
                Number(
                  pointsInput.value
                ) || 0
              );
          }
        }
      );


      data.levels.sort(
        (a, b) =>
          a.points -
          b.points
      );


      saveLocal();

      render();


      if (
        sb &&
        classroomId
      ) {

        await pushClassroom();
      }


      $("#adminModal")
        .classList
        .add("hidden");


      alert(
        "Alterações guardadas com sucesso!"
      );
    };
}


/* =========================
   APAGAR HISTÓRICO
========================= */

if ($("#clearHistory")) {

  $("#clearHistory").onclick =
    async function() {

      if (!adminUnlocked) {

        alert(
          "🔒 Apenas o administrador pode apagar o histórico."
        );

        return;
      }


      if (
        !confirm(
          "Apagar todo o histórico?"
        )
      ) {

        return;
      }


      data.history = [];

      saveLocal();

      render();


      if (
        sb &&
        classroomId
      ) {

        await sb
          .from("score_history")
          .delete()
          .eq(
            "classroom_id",
            classroomId
          );
      }
    };
}


/* =========================
   REPOR DADOS
========================= */

if ($("#resetBtn")) {

  $("#resetBtn").onclick =
    async function() {

      if (!adminUnlocked) {

        alert(
          "🔒 Apenas o administrador pode fazer esta alteração."
        );

        return;
      }


      if (
        !confirm(
          "Repor todos os dados de exemplo?"
        )
      ) {

        return;
      }


      data =
        structuredClone(
          defaults
        );


      saveLocal();

      render();


      if (
        sb &&
        classroomId
      ) {

        await pushClassroom();
      }


      loadAdmin();
    };
}


/* =========================
   INICIAR
========================= */

render();

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register("sw.js")
    .catch(
      error =>
        console.warn(
          "Service Worker:",
          error
        )
    );
}


connectRemote();


/* =========================
   SINCRONIZAÇÃO
========================= */

if (sb) {

  setInterval(
    async () => {

      if (!classroomId) {
        return;
      }


      try {

        const {
          data: remote
        } = await sb
          .from("classrooms")
          .select("*")
          .eq(
            "id",
            classroomId
          )
          .maybeSingle();


        if (
          remote &&
          remote.updated_at !==
            undefined
        ) {

          if (
            Number(remote.score) !==
              Number(data.score) &&
            document.visibilityState ===
              "visible"
          ) {

            data.score =
              Math.max(
                0,
                Number(remote.score)
              );


            data.className =
              remote.name ||
              data.className;


            data.pin =
              remote.pin ||
              data.pin;


            data.levels =
              Array.isArray(
                remote.levels
              )
                ? remote.levels
                : data.levels;


            data.actions =
              Array.isArray(
                remote.actions
              )
                ? remote.actions
                : data.actions;


            await loadHistory();

            saveLocal();

            render();
          }
        }

      } catch (error) {

        console.warn(
          "Erro sincronização:",
          error
        );
      }

    },
    5000
  );
}
