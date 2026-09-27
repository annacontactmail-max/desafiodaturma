<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desafio da Turma</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html {
      width: 100%;
      overflow-x: hidden;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      color: #25324a;
      overflow-x: hidden;
    }

    button,
    input {
      font: inherit;
    }

    .container {
      width: min(1200px, calc(100% - 32px));
      margin: 0 auto;
      padding: 24px 0 50px;
    }

    /* =========================
       CABEÇALHO
    ========================= */

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .title-icon {
      font-size: 36px;
    }

    h1 {
      margin: 0;
      font-size: clamp(26px, 4vw, 40px);
      color: #4c3f8f;
      line-height: 1.05;
    }

    #classTitle {
      margin-top: 4px;
      font-size: 15px;
      color: #7b8499;
    }

    .admin-button {
      border: 0;
      background: white;
      color: #51458d;
      width: 48px;
      height: 48px;
      border-radius: 15px;
      cursor: pointer;
      font-size: 22px;
      box-shadow: 0 5px 18px rgba(63, 52, 112, 0.10);
      transition: transform .2s, box-shadow .2s;
    }

    .admin-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 22px rgba(63, 52, 112, 0.15);
    }

    /* =========================
       PONTUAÇÃO EM GRANDE DESTAQUE
    ========================= */

    .score-card {
      background: white;
      border-radius: 28px;
      padding: 34px 38px 30px;
      box-shadow: 0 12px 35px rgba(63, 52, 112, 0.10);
      margin-bottom: 22px;
      border: 1px solid rgba(125, 110, 190, 0.08);
      text-align: center;
    }

    .score-label {
      margin: 0 0 8px;
      color: #7b8499;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    #score {
      font-size: clamp(58px, 10vw, 105px);
      line-height: 1;
      font-weight: 900;
      color: #5b4bb7;
      margin: 5px 0 22px;
    }

    .points-word {
      font-size: .28em;
      vertical-align: middle;
      font-weight: 800;
      letter-spacing: 0;
    }

    .progress-track {
      width: 100%;
      height: 25px;
      background: #eeeafb;
      border-radius: 999px;
      overflow: hidden;
      box-shadow: inset 0 2px 5px rgba(70, 55, 130, 0.08);
    }

    #progressBar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #8b7be8, #6552c5);
      border-radius: 999px;
      transition: width .5s ease;
    }

    #nextText {
      margin: 15px 0 0;
      font-size: 17px;
      color: #69738a;
      font-weight: 600;
    }

    #celebration {
      margin-top: 14px;
      font-size: 20px;
      font-weight: 800;
      color: #5b4bb7;
    }

    /* =========================
       PRÉMIOS + GRÁFICO
    ========================= */

    .lower-top {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      margin-bottom: 22px;
    }

    .card {
      background: white;
      border-radius: 24px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(63, 52, 112, 0.08);
      border: 1px solid rgba(125, 110, 190, 0.07);
    }

    .card-title {
      margin: 0 0 20px;
      font-size: 21px;
      color: #4c3f8f;
    }

    /* Prémios */

    #levels {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .level {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 15px;
      border-radius: 15px;
      background: #f7f5ff;
      border: 1px solid #ece8ff;
      transition: transform .2s, background .2s;
    }

    .level:hover {
      transform: translateX(3px);
    }

    .level.reached {
      background: #eeeaff;
      border-color: #dcd5ff;
    }

    .level-name {
      font-weight: 700;
      color: #4c5368;
    }

    .level-points {
      white-space: nowrap;
      font-weight: 800;
      color: #6658a8;
      font-size: 14px;
    }

    /* Gráfico */

    .chart-wrap {
      position: relative;
      width: 100%;
    }

    #progressChart {
      width: 100%;
      height: 280px;
      display: block;
      overflow: visible;
    }

    #chartLine {
      fill: none;
      stroke: #705cc7;
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    #chartDots circle {
      fill: #705cc7;
      stroke: white;
      stroke-width: 3;
    }

    .chart-empty {
      fill: #9299aa;
      font-size: 14px;
    }

    #chartCurrentScore {
      fill: #51458d;
      font-size: 18px;
      font-weight: 800;
    }

    /* =========================
       AÇÕES
    ========================= */

    .actions-card {
      margin-bottom: 22px;
    }

    .actions-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .action-section {
      padding: 20px;
      border-radius: 20px;
    }

    .positive-section {
      background: #f0faf4;
      border: 1px solid #d8f1e1;
    }

    .negative-section {
      background: #fff5f1;
      border: 1px solid #f8ddd4;
    }

    .action-title {
      margin: 0 0 14px;
      font-size: 18px;
    }

    .positive-section .action-title {
      color: #28794d;
    }

    .negative-section .action-title {
      color: #a34b39;
    }

    #positiveActions,
    #negativeActions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .action-button {
      width: 100%;
      border: 0;
      border-radius: 14px;
      padding: 13px 15px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      transition: transform .2s, box-shadow .2s;
    }

    .action-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(0,0,0,.08);
    }

    .positive-section .action-button {
      background: white;
      color: #28794d;
    }

    .negative-section .action-button {
      background: white;
      color: #a34b39;
    }

    .admin-lock {
      font-size: 14px;
      color: #7b8499;
      padding: 10px;
      text-align: center;
    }

    /* =========================
       HISTÓRICO
    ========================= */

    .history-card {
      margin-bottom: 22px;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .history-header .card-title {
      margin: 0;
    }

    #history {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 13px 15px;
      border-radius: 13px;
      background: #f8f9fc;
    }

    .history-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .history-name {
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .history-delta {
      font-weight: 900;
      white-space: nowrap;
    }

    .positive {
      color: #2e8b57;
    }

    .negative {
      color: #c85c49;
    }

    .small-button {
      border: 0;
      background: #f0eefb;
      color: #5b4f96;
      border-radius: 10px;
      padding: 9px 12px;
      cursor: pointer;
      font-weight: 700;
    }

    .small-button:hover {
      background: #e6e1f8;
    }

    /* =========================
       MODAL ADMIN
    ========================= */

    .hidden {
      display: none !important;
    }

    #adminModal {
      position: fixed;
      inset: 0;
      background: rgba(35, 30, 60, .45);
      backdrop-filter: blur(5px);
      z-index: 1000;
      padding: 20px;
      overflow-y: auto;
    }

    .modal-box {
      width: min(600px, 100%);
      margin: 30px auto;
      background: white;
      border-radius: 25px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(30, 25, 60, .25);
      position: relative;
    }

    .modal-box h2 {
      margin: 0 0 22px;
      color: #4c3f8f;
    }

    #closeAdmin {
      position: absolute;
      right: 18px;
      top: 18px;
      border: 0;
      background: #f2f1f8;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
    }

    .form-group {
      margin-bottom: 17px;
    }

    .form-group label {
      display: block;
      margin-bottom: 7px;
      font-weight: 700;
      color: #4e566b;
    }

    .form-group input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #dfe2ec;
      border-radius: 12px;
      outline: none;
    }

    .form-group input:focus {
      border-color: #8c7ddd;
      box-shadow: 0 0 0 3px #eeeafd;
    }

    .primary-button,
    .danger-button {
      border: 0;
      border-radius: 12px;
      padding: 12px 17px;
      cursor: pointer;
      font-weight: 800;
    }

    .primary-button {
      background: #6655b7;
      color: white;
    }

    .danger-button {
      background: #f8e4df;
      color: #a34b39;
    }

    #adminForm {
      margin-top: 22px;
    }

    #levelInputs {
      display: grid;
      gap: 10px;
      margin-bottom: 20px;
    }

    .level-admin-row {
      display: grid;
      grid-template-columns: 1fr 100px;
      gap: 10px;
    }

    .admin-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    /* =========================
       RESPONSIVO
    ========================= */

    @media (max-width: 850px) {
      .lower-top {
        grid-template-columns: 1fr;
      }

      .score-card {
        padding: 28px 24px;
      }

      .actions-columns {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .container {
        width: min(100% - 20px, 1200px);
        padding-top: 15px;
      }

      header {
        margin-bottom: 14px;
      }

      .title-icon {
        font-size: 28px;
      }

      h1 {
        font-size: 27px;
      }

      .admin-button {
        width: 43px;
        height: 43px;
      }

      .score-card {
        border-radius: 22px;
        padding: 25px 18px;
      }

      #score {
        font-size: 68px;
      }

      .progress-track {
        height: 20px;
      }

      .card {
        border-radius: 20px;
        padding: 20px 17px;
      }

      .actions-columns {
        gap: 12px;
      }

      .action-section {
        padding: 16px;
      }

      #progressChart {
        height: 230px;
      }

      .history-item {
        align-items: flex-start;
      }
    }

    @media (max-width: 380px) {
      #score {
        font-size: 58px;
      }

      .card-title {
        font-size: 19px;
      }

      .level {
        padding: 11px;
      }

      .level-points {
        font-size: 13px;
      }
    }
  </style>
</head>

<body>

  <div class="container">

    <!-- =========================
         CABEÇALHO
    ========================== -->

    <header>
      <div class="title-area">
        <div class="title-icon">🏆</div>

        <div>
          <h1>DESAFIO DA TURMA</h1>
          <div id="classTitle">Turma</div>
        </div>
      </div>

      <button id="adminBtn" class="admin-button" title="Administração">
        ⚙️
      </button>
    </header>


    <!-- =========================
         PONTUAÇÃO / PROGRESSO
    ========================== -->

    <section class="score-card">

      <p class="score-label">Pontuação da turma</p>

      <div id="score">
        0
      </div>

      <div class="progress-track">
        <div id="progressBar"></div>
      </div>

      <p id="nextText">
        Próximo objetivo: —
      </p>

      <div id="celebration"></div>

    </section>


    <!-- =========================
         PRÉMIOS + GRÁFICO
    ========================== -->

    <section class="lower-top">

      <!-- PERCURSO DE PRÉMIOS -->

      <div class="card prizes-card">

        <h2 class="card-title">
          🎁 Percurso de prémios
        </h2>

        <div id="levels"></div>

      </div>


      <!-- GRÁFICO -->

      <div class="card chart-card">

        <h2 class="card-title">
          📈 Progresso
        </h2>

        <div class="chart-wrap">

          <svg
            id="progressChart"
            viewBox="0 0 600 280"
            preserveAspectRatio="none"
            aria-label="Gráfico da evolução dos pontos"
          >

            <line
              x1="45"
              y1="235"
              x2="570"
              y2="235"
              stroke="#e5e7ef"
              stroke-width="2"
            />

            <line
              x1="45"
              y1="35"
              x2="45"
              y2="235"
              stroke="#e5e7ef"
              stroke-width="2"
            />

            <polyline
              id="chartLine"
              points=""
            ></polyline>

            <g id="chartDots"></g>

            <text
              id="chartCurrentScore"
              x="55"
              y="55"
            ></text>

            <text
              id="chartEmpty"
              class="chart-empty"
              x="300"
              y="145"
              text-anchor="middle"
            >
              Ainda não existem dados
            </text>

          </svg>

        </div>

      </div>

    </section>


    <!-- =========================
         AÇÕES
    ========================== -->

    <section class="card actions-card">

      <div class="actions-columns">

        <!-- GANHAR PONTOS -->

        <div class="action-section positive-section">

          <h2 class="action-title">
            ➕ Ganhar pontos
          </h2>

          <div id="positiveActions"></div>

        </div>


        <!-- PERDER PONTOS -->

        <div class="action-section negative-section">

          <h2 class="action-title">
            ➖ Perder pontos
          </h2>

          <div id="negativeActions"></div>

        </div>

      </div>

    </section>


    <!-- =========================
         HISTÓRICO
    ========================== -->

    <section class="card history-card">

      <div class="history-header">

        <h2 class="card-title">
          📋 Histórico
        </h2>

        <button
          id="clearHistory"
          class="small-button"
        >
          Limpar
        </button>

      </div>

      <div id="history"></div>

    </section>

  </div>


  <!-- =========================
       MODAL ADMINISTRAÇÃO
  ========================== -->

  <div id="adminModal" class="hidden">

    <div class="modal-box">

      <button id="closeAdmin">
        ✕
      </button>

      <h2>
        ⚙️ Administração
      </h2>


      <!-- PIN -->

      <div id="pinArea">

        <div class="form-group">

          <label for="pinInput">
            PIN de administrador
          </label>

          <input
            id="pinInput"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Introduza o PIN"
          >

        </div>

        <button
          id="unlockBtn"
          class="primary-button"
        >
          Entrar na administração
        </button>

      </div>


      <!-- FORMULÁRIO ADMIN -->

      <div
        id="adminForm"
        class="hidden"
      >

        <div class="form-group">

          <label for="classInput">
            Nome da turma
          </label>

          <input
            id="classInput"
            type="text"
            autocomplete="off"
          >

        </div>


        <div class="form-group">

          <label for="newPinInput">
            Alterar PIN
          </label>

          <input
            id="newPinInput"
            type="password"
            inputmode="numeric"
            autocomplete="new-password"
            placeholder="Deixe vazio para manter o PIN atual"
          >

        </div>


        <h3>
          🏆 Níveis e prémios
        </h3>

        <div id="levelInputs"></div>


        <div class="admin-actions">

          <button
            id="resetBtn"
            class="danger-button"
          >
            🔄 Reiniciar pontuação
          </button>

          <button
            id="adminLogout"
            class="small-button"
          >
            🔒 Sair da Administração
          </button>

        </div>

      </div>

    </div>

  </div>


  <!-- =========================
       SCRIPTS
  ========================== -->

  <script src="config.js"></script>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <script src="app.js"></script>


  <script>
    /*
      Botão para sair da área de administração.
      Mantém a lógica principal no app.js.
    */

    document.addEventListener("DOMContentLoaded", () => {

      const logoutButton = document.getElementById("adminLogout");
      const closeButton = document.getElementById("closeAdmin");

      if (logoutButton && closeButton) {
        logoutButton.addEventListener("click", () => {
          closeButton.click();
        });
      }

    });
  </script>

</body>
</html>
