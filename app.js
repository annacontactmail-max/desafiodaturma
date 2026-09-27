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


/* =========================
   DADOS LOCAIS
========================= */

let classroomId =
  localStorage.getItem("desafioClassroomId");

let data =
  JSON.parse(
    localStorage.getItem(KEY) || "null"
  ) || structuredClone(defaults);


/* =========================
   ATALHO PARA ELEMENTOS
========================= */

const $ = (selector) =>
  document.querySelector(selector);


/* =========================
   GUARDAR LOCALMENTE
========================= */

function saveLocal() {
  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}


/* =========================
   DATA/HORA
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
   LIGAR AO SUPABASE
========================= */

async function connectRemote() {

  if (!sb) {
    console.log(
      "Supabase não configurado. A funcionar apenas localmente."
    );
    return;
  }

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
        "Erro ao ligar ao Supabase:",
        error
      );

      return;
    }


    const row =
      classroomId
        ? result
        : result?.[0];


    /* =========================
       EXISTE TURMA
    ========================= */

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
        Number(row.score) || 0;

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

      return;
    }


    /* =========================
       CRIAR NOVA TURMA
    ========================= */

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


    if (insertError) {

      console.error(
        "Erro ao criar turma:",
        insertError
      );

      return;
    }


    classroomId = newRow.id;

    localStorage.setItem(
      "desafioClassroomId",
      classroomId
    );

    saveLocal();

    render();

  } catch (error) {

    console.error(
      "Erro de ligação:",
      error
    );
  }
}


/* =========================
   CARREGAR HISTÓRICO
========================= */

async function loadHistory() {

  if (!sb || !classroomId) {
    return;
  }

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
      "Erro ao carregar histórico:",
      error
    );

    return;
  }


  data.history =
    (result || []).map(
      (h) => ({
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
   ATUALIZAR TURMA
========================= */

async function pushClassroom() {

  if (!sb || !classroomId) {
    return;
  }

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
      "Erro ao guardar turma:",
      error
    );
  }
}


/* =========================
   BOTÃO DE AÇÃO
========================= */

function actionHTML(a, i) {

  return `
    <button
      class="action ${
        a.points > 0
          ? "positive"
          : "negative"
      }"
      data-i="${i}"
    >
      <span class="label">
        ${a.emoji} ${a.name}
      </span>

      <span class="value">
        ${
          a.points > 0
            ? "+"
            : ""
        }${a.points}
      </span>
    </button>
  `;
}


/* =========================
   GRÁFICO
========================= */

function renderChart() {

  const area =
    $("#chartArea");

  const line =
    $("#chartLine");

  const dots =
    $("#chartDots");

  const currentScore =
    $("#chartCurrentScore");

  const empty =
    $("#chartEmpty");


  if (
    !area ||
    !line ||
    !dots
  ) {
    return;
  }


  const history =
    [...data.history]
      .slice()
      .reverse();


  let values = [];


  if (history.length) {

    values =
      history.map(
        h => Number(h.after)
      );

  } else {

    values = [
      0,
      Number(data.score)
    ];
  }


  values = [
    0,
    ...values
  ];


  const width = 600;
  const height = 220;
  const padding = 30;


  const minValue =
    Math.min(
      0,
      ...values
    );

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
        (p, index) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${p.x} ${p.y}`
      )
      .join(" ");


  line.setAttribute(
    "d",
    path
  );


  dots.innerHTML =
    points
      .map(
        p => `
          <circle
            cx="${p.x}"
            cy="${p.y}"
            r="5"
          >
            <title>
              ${p.value} pontos
            </title>
          </circle>
        `
      )
      .join("");


  if (currentScore) {

    currentScore.textContent =
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
   RENDER DA APLICAÇÃO
========================= */

function render() {

  /* TÍTULO */

  if ($("#classTitle")) {

    $("#classTitle").textContent =
      data.className;
  }


  /* PONTUAÇÃO */

  if ($("#score")) {

    $("#score").textContent =
      data.score;
  }


  /* =========================
     PROGRESSO
  ========================= */

  const next =
    data.levels.find(
      l =>
        l.points >
        data.score
    );


  const previousLevels =
    data.levels.filter(
      l =>
        l.points <=
        data.score
    );


  const prev =
    previousLevels.length
      ? previousLevels[
          previousLevels.length - 1
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


  /* =========================
     NÍVEIS
  ========================= */

  if ($("#levels")) {

    $("#levels").innerHTML =
      data.levels
        .map(
          l => `
            <div
              class="level ${
                data.score >= l.points
                  ? "unlocked"
                  : ""
              }"
            >

              <span class="emoji">
                ${l.emoji}
              </span>

              <div class="info">

                <div class="name">
                  ${l.name}
                </div>

                <div class="pts">
                  ${l.points} pontos
                </div>

              </div>

              ${
                data.score >= l.points
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


  /* =========================
     AÇÕES POSITIVAS
  ========================= */

  if ($("#positiveActions")) {

    $("#positiveActions").innerHTML =
      data.actions
        .map(
          (a, i) =>
            a.points > 0
              ? actionHTML(a, i)
              : ""
        )
        .join("");
  }


  /* =========================
     AÇÕES NEGATIVAS
  ========================= */

  if ($("#negativeActions")) {

    $("#negativeActions").innerHTML =
      data.actions
        .map(
          (a, i) =>
            a.points < 0
              ? actionHTML(a, i)
              : ""
        )
        .join("");
  }


  /* =========================
     CLIQUES
  ========================= */

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


  /* =========================
     HISTÓRICO
  ========================= */

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
            (h, i) => `
              <div class="historyItem">

                <span class="when">
                  ${fmtDate(h.date)}
                </span>

                <span class="desc">
                  ${h.emoji} ${h.name}
                </span>

                <span
                  class="delta ${
                    h.delta >= 0
                      ? "pos"
                      : "neg"
                  }"
                >
                  ${
                    h.delta > 0
                      ? "+"
                      : ""
                  }${h.delta}
                </span>

                <button
                  class="undo"
                  title="Desfazer"
                  onclick="undo(${i})"
                >
                  ↩
                </button>

              </div>
            `
          )
          .join("");
    }
  }


  /* GRÁFICO */

  renderChart();
}


/* =========================
   ALTERAR PONTUAÇÃO
========================= */

async function change(i) {

  const action =
    data.actions[i];

  if (!action) {
    return;
  }


  const before =
    data.score;


  data.score +=
    action.points;


  const historyItem = {

    date:
      new Date().toISOString(),

    name:
      action.name,

    emoji:
      action.emoji,

    delta:
      action.points,

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


  /* =========================
     SUPABASE
  ========================= */

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


  /* =========================
     MENSAGEM
  ========================= */

  if ($("#celebration")) {

    $("#celebration").textContent =
      `${
        action.points > 0
          ? "🎉"
          : "📌"
      } ${
        action.points > 0
          ? "+"
          : ""
      }${action.points} pontos — ${
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


  /* =========================
     VERIFICAR PRÉMIO ATINGIDO
  ========================= */

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
  async function(i) {

    const h =
      data.history[i];


    if (!h) {
      return;
    }


    data.score =
      h.before;


    data.history.splice(
      i,
      1
    );


    saveLocal();

    render();


    if (
      sb &&
      classroomId
    ) {

      if (h.id) {

        await sb
          .from("score_history")
          .delete()
          .eq(
            "id",
            h.id
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
    () =>
      $("#adminModal")
        .classList
        .add("hidden");
}


/* =========================
   ENTRAR NA ADMINISTRAÇÃO
========================= */

if ($("#unlockBtn")) {

  $("#unlockBtn").onclick =
    () => {

      const enteredPin =
        $("#pinInput")
          .value
          .trim();


      /*
       * O PIN atualmente guardado
       * na turma é o PIN válido.
       *
       * Se a aplicação ainda estiver
       * a usar os dados locais iniciais,
       * o PIN é 1234.
       */

      if (
        enteredPin &&
        enteredPin === data.pin
      ) {

        $("#pinArea")
          .classList
          .add("hidden");


        $("#adminForm")
          .classList
          .remove("hidden");


        loadAdmin();

      } else {

        alert(
          "PIN incorreto."
        );
      }
    };
}


/* =========================
   CARREGAR ADMINISTRAÇÃO
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
          (level, i) => `
            <div class="levelRow">

              <input
                data-name="${i}"
                value="${level.name}"
                aria-label="Nome do prémio"
              >

              <input
                data-points="${i}"
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
   GUARDAR ADMINISTRAÇÃO
========================= */

if ($("#adminForm")) {

  $("#adminForm").onsubmit =
    async function(e) {

      e.preventDefault();


      /* TURMA */

      data.className =
        $("#classInput")
          .value
          .trim() ||
        "Turma";


      /* PIN */

      data.pin =
        $("#newPinInput")
          .value
          .trim() ||
        "1234";


      /* NÍVEIS */

      data.levels.forEach(
        (level, i) => {

          const nameInput =
            document.querySelector(
              `[data-name="${i}"]`
            );


          const pointsInput =
            document.querySelector(
              `[data-points="${i}"]`
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


      /* ORDENAR NÍVEIS */

      data.levels.sort(
        (a, b) =>
          a.points -
          b.points
      );


      saveLocal();

      render();


      /* SUPABASE */

      if (
        sb &&
        classroomId
      ) {

        await pushClassroom();
      }


      /* FECHAR */

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

        const {
          error
        } = await sb
          .from("score_history")
          .delete()
          .eq(
            "classroom_id",
            classroomId
          );


        if (error) {

          console.error(
            "Erro ao apagar histórico:",
            error
          );
        }
      }
    };
}


/* =========================
   REPOR DADOS
========================= */

if ($("#resetBtn")) {

  $("#resetBtn").onclick =
    async function() {

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
   INICIALIZAÇÃO
========================= */

render();


/* =========================
   SERVICE WORKER
========================= */

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


/* =========================
   LIGAÇÃO INICIAL
========================= */

connectRemote();


/* =========================
   SINCRONIZAÇÃO
========================= */

if (sb) {

  setInterval(
    async function() {

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

          /*
           * Atualiza a pontuação e
           * configurações quando houve
           * alteração noutro dispositivo.
           */

          if (
            Number(remote.score) !==
              Number(data.score) &&
            document.visibilityState ===
              "visible"
          ) {

            data.score =
              Number(remote.score);


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
          "Erro na sincronização:",
          error
        );
      }

    },
    5000
  );
}
