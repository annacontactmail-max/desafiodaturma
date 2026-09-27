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
  JSON.parse(localStorage.getItem(KEY) || "null") ||
  structuredClone(defaults);

const $ = selector =>
  document.querySelector(selector);

function saveLocal() {
  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );
}

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


/* =====================================================
   GRÁFICO
===================================================== */

function renderChart() {

  const chartLine = $("#chartLine");
  const chartArea = $("#chartArea");
  const chartDots = $("#chartDots");
  const chartEmpty = $("#chartEmpty");
  const current = $("#chartCurrentScore");

  if (!chartLine || !chartArea || !chartDots) {
    return;
  }

  current.textContent =
    `${data.score} pts`;

  /*
    Começamos em 0 e acrescentamos cada
    valor posterior do histórico.
  */

  const chronological =
    [...data.history]
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );

  let values = [0];

  chronological.forEach(h => {
    values.push(
      Number(h.after ?? 0)
    );
  });

  /*
    Se só houver o ponto inicial,
    mostramos uma pequena linha.
  */

  if (values.length < 2) {

    chartLine.setAttribute(
      "points",
      "20,190 580,190"
    );

    chartArea.setAttribute(
      "d",
      "M20 190 L580 190 L580 215 L20 215 Z"
    );

    chartDots.innerHTML = "";

    chartEmpty.classList.remove(
      "hidden"
    );

    return;
  }

  chartEmpty.classList.add(
    "hidden"
  );

  const width = 560;
  const height = 175;

  const startX = 20;
  const startY = 195;

  const maxValue =
    Math.max(
      10,
      ...values
    );

  const minValue =
    Math.min(
      0,
      ...values
    );

  const range =
    Math.max(
      10,
      maxValue - minValue
    );

  const points = values.map(
    (value, index) => {

      const x =
        startX +
        (
          index /
          Math.max(
            values.length - 1,
            1
          )
        ) *
        width;

      const y =
        startY -
        (
          (value - minValue) /
          range
        ) *
        height;

      return {
        x,
        y,
        value
      };
    }
  );

  const pointString =
    points
      .map(
        p =>
          `${p.x},${p.y}`
      )
      .join(" ");

  chartLine.setAttribute(
    "points",
    pointString
  );

  const first =
    points[0];

  const last =
    points[points.length - 1];

  const areaPath =
    `M ${first.x} ${first.y} ` +
    points
      .slice(1)
      .map(
        p =>
          `L ${p.x} ${p.y}`
      )
      .join(" ") +
    ` L ${last.x} 205 ` +
    `L ${first.x} 205 Z`;

  chartArea.setAttribute(
    "d",
    areaPath
  );

  /*
    Pontos do gráfico.
  */

  chartDots.innerHTML =
    points
      .map(
        p => `
          <circle
            cx="${p.x}"
            cy="${p.y}"
            r="7"
            fill="white"
            stroke="currentColor"
            stroke-width="4">
          </circle>
        `
      )
      .join("");
}


/* =====================================================
   SUPABASE
===================================================== */

async function connectRemote() {

  if (!sb) {
    console.warn(
      "Supabase não configurado."
    );

    return;
  }

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
      .order(
        "created_at",
        {
          ascending: true
        }
      )
      .limit(1);
  }

  const {
    data: remote,
    error
  } = await q;

  if (error) {

    console.warn(
      "Erro ao carregar turma:",
      error
    );

    return;
  }

  const row =
    classroomId
      ? remote
      : remote?.[0];

  if (row) {

    classroomId = row.id;

    localStorage.setItem(
      "desafioClassroomId",
      classroomId
    );

    data.className =
      row.name;

    data.pin =
      row.pin;

    data.score =
      Number(row.score || 0);

    data.levels =
      row.levels || data.levels;

    data.actions =
      row.actions || data.actions;

    await loadHistory();

    saveLocal();

    render();

  } else {

    const {
      data: created,
      error: createError
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

    if (createError) {

      console.warn(
        "Não foi possível criar a turma:",
        createError
      );

      return;
    }

    classroomId =
      created.id;

    localStorage.setItem(
      "desafioClassroomId",
      classroomId
    );

    await loadHistory();

    saveLocal();

    render();
  }
}


async function loadHistory() {

  if (!sb || !classroomId) {
    return;
  }

  const {
    data: rows,
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

    console.warn(
      "Erro ao carregar histórico:",
      error
    );

    return;
  }

  data.history =
    (rows || []).map(h => ({
      id: h.id,
      date: h.created_at,
      name: h.name,
      emoji: h.emoji,
      delta: h.delta,
      before: h.before_score,
      after: h.after_score
    }));
}


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

    console.warn(
      "Erro ao guardar turma:",
      error
    );
  }
}


/* =====================================================
   INTERFACE
===================================================== */

function actionHTML(a, i) {

  return `
    <button
      class="action ${
        a.points > 0
          ? "positive"
          : "negative"
      }"
      data-i="${i}">

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


function render() {

  $("#classTitle").textContent =
    data.className;

  $("#score").textContent =
    data.score;

  /*
    Próximo prémio.
  */

  const next =
    data.levels.find(
      level =>
        level.points >
        data.score
    );

  const previous =
    data.levels
      .filter(
        level =>
          level.points <=
          data.score
      )
      .at(-1);

  const from =
    previous?.points || 0;

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

  $("#progressBar").style.width =
    `${percentage}%`;

  $("#nextText").textContent =
    next
      ? `Próximo objetivo: ${next.emoji} ${next.name} — faltam ${next.points - data.score} pontos`
      : "🏆 Todos os prémios desbloqueados!";


  /*
    Níveis.
  */

  $("#levels").innerHTML =
    data.levels
      .map(level => {

        const unlocked =
          data.score >=
          level.points;

        return `
          <div class="level ${
            unlocked
              ? "unlocked"
              : ""
          }">

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
              unlocked
                ? `
                  <span class="badge">
                    ✓ Desbloqueado
                  </span>
                `
                : ""
            }

          </div>
        `;
      })
      .join("");


  /*
    Botões.
  */

  $("#positiveActions").innerHTML =
    data.actions
      .map(
        (a, i) =>
          a.points > 0
            ? actionHTML(a, i)
            : ""
      )
      .join("");

  $("#negativeActions").innerHTML =
    data.actions
      .map(
        (a, i) =>
          a.points < 0
            ? actionHTML(a, i)
            : ""
      )
      .join("");


  /*
    Eventos dos botões.
  */

  [
    ...document.querySelectorAll(
      ".action"
    )
  ].forEach(button => {

    button.onclick =
      () =>
        change(
          Number(
            button.dataset.i
          )
        );

  });


  /*
    Histórico.
  */

  $("#history").innerHTML =
    data.history.length

      ? data.history
          .map(
            (h, i) => `
              <div class="historyItem">

                <span class="when">
                  ${fmtDate(h.date)}
                </span>

                <span class="desc">
                  ${h.emoji} ${h.name}
                </span>

                <span class="delta ${
                  h.delta >= 0
                    ? "pos"
                    : "neg"
                }">
                  ${
                    h.delta > 0
                      ? "+"
                      : ""
                  }${h.delta}
                </span>

                <button
                  class="undo"
                  title="Desfazer"
                  onclick="undo(${i})">
                  ↩
                </button>

              </div>
            `
          )
          .join("")

      : `
        <p style="color:#94a3b8">
          Ainda não há alterações.
        </p>
      `;


  renderChart();
}


/* =====================================================
   ALTERAR PONTUAÇÃO
===================================================== */

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


  /*
    Guardar histórico no Supabase.
  */

  if (sb && classroomId) {

    const {
      data: remoteHistory,
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

    if (!error && remoteHistory) {

      historyItem.id =
        remoteHistory.id;
    }

    await pushClassroom();
  }


  /*
    Mensagem visual.
  */

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
    () =>
      $("#celebration")
        .classList
        .add("hidden"),
    2200
  );


  /*
    Verificar prémio atingido.
  */

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


/* =====================================================
   DESFAZER
===================================================== */

window.undo =
  async function(i) {

    const historyItem =
      data.history[i];

    if (!historyItem) {
      return;
    }

    data.score =
      historyItem.before;

    data.history.splice(
      i,
      1
    );

    saveLocal();

    render();


    if (sb && classroomId) {

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


/* =====================================================
   ADMINISTRAÇÃO
===================================================== */

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


$("#closeAdmin").onclick =
  () =>
    $("#adminModal")
      .classList
      .add("hidden");


$("#unlockBtn").onclick =
  () => {

    if (
      $("#pinInput").value ===
      data.pin
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


function loadAdmin() {

  $("#classInput").value =
    data.className;

  $("#newPinInput").value =
    data.pin;

  $("#levelInputs").innerHTML =
    data.levels
      .map(
        (level, i) => `
          <div class="levelRow">

            <input
              data-name="${i}"
              value="${level.name}"
              aria-label="Nome do prémio">

            <input
              data-points="${i}"
              type="number"
              min="0"
              value="${level.points}"
              aria-label="Pontos">

          </div>
        `
      )
      .join("");
}


$("#adminForm").onsubmit =
  async event => {

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
            nameInput.value.trim() ||
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

    if (sb && classroomId) {
      await pushClassroom();
    }

    $("#adminModal")
      .classList
      .add("hidden");
  };


/* =====================================================
   LIMPAR HISTÓRICO
===================================================== */

$("#clearHistory").onclick =
  async () => {

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

    if (sb && classroomId) {

      await sb
        .from("score_history")
        .delete()
        .eq(
          "classroom_id",
          classroomId
        );
    }
  };


/* =====================================================
   REPOR DADOS
===================================================== */

$("#resetBtn").onclick =
  async () => {

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

    if (sb && classroomId) {
      await pushClassroom();
    }

    loadAdmin();
  };


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

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


/* =====================================================
   SINCRONIZAÇÃO
===================================================== */

if (sb) {

  setInterval(
    async () => {

      if (!classroomId) {
        return;
      }

      const {
        data: remote,
        error
      } = await sb
        .from("classrooms")
        .select("*")
        .eq(
          "id",
          classroomId
        )
        .maybeSingle();

      if (error || !remote) {
        return;
      }

      /*
        Atualizar quando existir
        uma alteração feita noutro dispositivo.
      */

      if (
        Number(remote.score) !==
        Number(data.score)
      ) {

        data.score =
          Number(remote.score || 0);

        data.className =
          remote.name;

        data.levels =
          remote.levels ||
          data.levels;

        data.actions =
          remote.actions ||
          data.actions;

        await loadHistory();

        saveLocal();

        render();
      }

    },
    5000
  );
}
