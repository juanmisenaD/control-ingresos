document.addEventListener("DOMContentLoaded", () => {
  const deliveriesList = document.getElementById("deliveries-list");
  const btnAdd = document.getElementById("btn-add-delivery");
  const countDomiciliosEl = document.getElementById("count-domicilios");
  const lblSumaBrutaEl = document.getElementById("lbl-suma-bruta");
  const form = document.getElementById("cargo-form");
  const resumenBox = document.getElementById("resumen");

  const btnExport = document.getElementById("btn-export");
  const btnImportTrigger = document.getElementById("btn-import-trigger");
  const fileImport = document.getElementById("file-import");
  const btnCopyClipboard = document.getElementById("btn-copy-clipboard");
  const btnClearAll = document.getElementById("btn-clear-all");

  const tableBody = document.getElementById("table-body");
  const tableFoot = document.getElementById("table-foot");
  const inputFechaEl = document.getElementById("fecha-registro");

  const selectPeriodo = document.getElementById("select-periodo");
  const filterDesde = document.getElementById("filter-desde");
  const filterHasta = document.getElementById("filter-hasta");

  const inputTargetGoal = document.getElementById("input-target-goal");
  const lblGoalPercent = document.getElementById("lbl-goal-percent");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const alertHighExpenses = document.getElementById("alert-high-expenses");

  // ELEMENTOS MODAL
  const detailModal = document.getElementById("detail-modal");
  const modalDateTitle = document.getElementById("modal-date-title");
  const modalDeliveriesList = document.getElementById("modal-deliveries-list");
  const modalCostBici = document.getElementById("modal-cost-bici");
  const modalCostFood = document.getElementById("modal-cost-food");
  const modalDistSueldo = document.getElementById("modal-dist-sueldo");
  const modalDistBici = document.getElementById("modal-dist-bici");
  const modalDistAhorro = document.getElementById("modal-dist-ahorro");
  const modalCloseBtn = document.getElementById("modal-close-btn");

  // Clave para guardar únicamente el ÚLTIMO MES QUE FUE EXPORTADO
  const LAST_EXPORTED_MONTH_KEY = "cargo_bici_last_exported_month";
  const DB_KEY = "cargo_bici_domicilios_db";
  let historial = JSON.parse(localStorage.getItem(DB_KEY)) || [];

  // myFunChangeDate(historial, "2026-07-28", "2026-07-27");

  // INSTANCIAS DE GRÁFICOS
  let financeChartInstance = null;
  let distributionChartInstance = null;
  let deliveriesTrendChartInstance = null;

  /**
   * Función auxiliar para descargar archivos JSON
   */
  function triggerAutoDownloadJSON(data, filename) {
    const dataBlob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Retorna la clave YYYY-MM del mes anterior exacto.
   */
  function getPreviousMonthKey() {
    const hoy = new Date();
    const fechaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const anio = fechaMesAnterior.getFullYear();
    const mes = String(fechaMesAnterior.getMonth() + 1).padStart(2, "0");
    return `${anio}-${mes}`; // Ej: "2026-07"
  }

  /**
   * Verifica si el mes anterior ya fue respaldado.
   * Solo se ejecuta UNA VEZ por mes.
   */
  function checkAndAutoBackupMonth() {
    if (!historial || historial.length === 0) return;

    // 1. Calculamos el mes que debería estar respaldado (ej: "2026-07")
    const mesAnteriorClave = getPreviousMonthKey();

    const mesActualClave = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    
    // 2. Leemos cuál fue el último mes que YA respaldamos
    const ultimoMesExportado = localStorage.getItem(LAST_EXPORTED_MONTH_KEY);

    // 3. SI YA SE RESPALDÓ ESTE MES, NO HACEMOS NADA Y SALIMOS
    if (ultimoMesExportado === mesAnteriorClave) {
      // OPCIONAL: Dejar en el historial solo lo que sea del mes actual en adelante
      historial = historial.filter(item => item.fecha >= `${mesActualClave}-01`);
      localStorage.setItem(DB_KEY, JSON.stringify(historial, null, 2));
      return;
    }

    // 4. Si NO se ha respaldado, filtramos los datos de ese mes
    const datosMesAnterior = historial.filter(
      (item) => item.fecha && item.fecha.startsWith(mesAnteriorClave)
    );

    // 5. Si encontramos registros de ese mes cerrado
    if (datosMesAnterior.length > 0) {
      const nombreArchivo = `backup_cargo_bici_${mesAnteriorClave}.json`;
      
      // Descargamos el JSON
      triggerAutoDownloadJSON(datosMesAnterior, nombreArchivo);

      // 💡 MARCA CLAVE: Guardamos que "2026-07" YA se respaldó
      localStorage.setItem(LAST_EXPORTED_MONTH_KEY, mesAnteriorClave);

      setTimeout(() => {
        alert(
          `📦 ¡Respaldo Mensual Automático!\nSe descargó el reporte de ${mesAnteriorClave} (${datosMesAnterior.length} registros).`
        );
      }, 500);
    } else {
      // Si no había registros de ese mes en particular, igual marcamos como procesado
      // para que no siga evaluándolo en cada recarga.
      localStorage.setItem(LAST_EXPORTED_MONTH_KEY, mesAnteriorClave);
    }
  }

  function myFunChangeDate(arr, searchDate, toChangeDate) {
    const registro = arr.find((item) => item.fecha === searchDate);
    if (registro) {
      registro.fecha = toChangeDate;
    }
    localStorage.setItem(DB_KEY, JSON.stringify(arr, null, 4));
    console.log(arr, searchDate, toChangeDate);
  }

  function myFuncDefaultDate(date = new Date()) {
    const fecha = date;
    const an = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${an}-${mes}-${dia}`;
  }

  // Verificar backup automático de mes anterior al iniciar
  checkAndAutoBackupMonth();

  const formatCOP = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);

  const addDeliveryRow = (tariffValue = 8000, descText = "") => {
    const row = document.createElement("div");
    row.className = "delivery-entry";
    row.innerHTML = `
          <div><label>Tarifa ($ COP)</label><input type="number" class="input-tariff" min="1000" max="50000" step="1000" value="${tariffValue}" required></div>
          <div><label>Peso / Detalle</label><input type="text" class="input-desc" placeholder="Ej: Pesado (15kg)" value="${descText}"></div>
          <button type="button" class="btn-remove">✕</button>
        `;

    row.querySelector(".btn-remove").addEventListener("click", () => {
      if (deliveriesList.children.length > 1) {
        row.remove();
        calculateLiveTotal();
      }
    });

    row
      .querySelector(".input-tariff")
      .addEventListener("input", calculateLiveTotal);
    deliveriesList.appendChild(row);
    calculateLiveTotal();
  };

  function calculateLiveTotal() {
    const tariffInputs = deliveriesList.querySelectorAll(".input-tariff");
    let total = 0,
      count = 0;
    tariffInputs.forEach((input) => {
      total += parseFloat(input.value) || 0;
      count++;
    });
    countDomiciliosEl.textContent = count;
    lblSumaBrutaEl.textContent = formatCOP(total);
    return { total, count };
  }

  function getFilteredHistory() {
    if (!historial.length) return [];
    let filtrados = [...historial];
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const opcion = selectPeriodo.value;
    const hoy = new Date();

    if (opcion === "mes_actual") {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      filtrados = filtrados.filter((item) => new Date(item.fecha) >= inicioMes);
    } else if (opcion === "ultimos_7") {
      const hace7dias = new Date();
      hace7dias.setDate(hoy.getDate() - 7);
      filtrados = filtrados.filter((item) => new Date(item.fecha) >= hace7dias);
    } else if (opcion === "personalizado") {
      if (filterDesde.value)
        filtrados = filtrados.filter((item) => item.fecha >= filterDesde.value);
      if (filterHasta.value)
        filtrados = filtrados.filter((item) => item.fecha <= filterHasta.value);
    }
    return filtrados;
  }

  function renderTable() {
    const datosFiltrados = getFilteredHistory();

    const kpiAvgTicket = document.getElementById("kpi-avg-ticket");
    const kpiMargin = document.getElementById("kpi-margin");
    const kpiCostDelivery = document.getElementById("kpi-cost-delivery");

    if (datosFiltrados.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay registros para este periodo.</td></tr>';
      tableFoot.innerHTML = "";
      kpiAvgTicket.textContent = "$0 COP";
      kpiMargin.textContent = "0%";
      kpiCostDelivery.textContent = "$0 COP";

      lblGoalPercent.textContent = "0%";
      progressBarFill.style.width = "0%";
      alertHighExpenses.classList.add("hidden");
      updateAllCharts([]);
      return;
    }

    tableBody.innerHTML = "";
    let sumEnvios = 0,
      sumIngresos = 0,
      sumEgresos = 0,
      sumNeta = 0,
      sumSueldo = 0,
      sumFondo = 0,
      sumAhorro = 0;

    datosFiltrados.forEach((item) => {
      const realIndex = historial.findIndex(
        (x) =>
          x.fecha === item.fecha &&
          x.ingresos.totalIngresos === item.ingresos.totalIngresos,
      );
      const tr = document.createElement("tr");

      sumEnvios += item.ingresos.numeroDomicilios || 0;
      sumIngresos += item.ingresos.totalIngresos || 0;
      sumEgresos += item.egresos.totalEgresos || 0;
      sumNeta += item.balance.gananciaNeta || 0;
      sumSueldo += item.balance.distribucion.sueldoPersonal || 0;
      sumFondo += item.balance.distribucion.fondoBiciCarga || 0;
      sumAhorro += item.balance.distribucion.imprevistosAhorro || 0;

      tr.innerHTML = `
            <td><span class="date-link" onclick="openDayDetail(${realIndex})">${item.fecha}</span></td>
            <td style="text-align: center;">${item.ingresos.numeroDomicilios}</td>
            <td><input type="number" class="table-input" value="${item.ingresos.totalIngresos}" step="1000" onchange="updateHistoryRow(${realIndex}, 'ingresos', this.value)"></td>
            <td><input type="number" class="table-input" value="${item.egresos.totalEgresos}" step="1000" onchange="updateHistoryRow(${realIndex}, 'egresos', this.value)"></td>
            <td style="color: var(--accent-green); font-weight: bold;">${formatCOP(item.balance.gananciaNeta)}</td>
            <td style="color: #38bdf8;">${formatCOP(item.balance.distribucion.sueldoPersonal)}</td>
            <td style="color: #fbbf24;">${formatCOP(item.balance.distribucion.fondoBiciCarga)}</td>
            <td style="color: #a78bfa;">${formatCOP(item.balance.distribucion.imprevistosAhorro)}</td>
            <td><button class="btn-delete-item" onclick="deleteHistoryItem(${realIndex})" title="Eliminar este día">🗑️</button></td>
          `;
      tableBody.appendChild(tr);
    });

    // KPIS
    if (sumEnvios > 0) {
      const avgTicket = sumIngresos / sumEnvios;
      const costPerDelivery = sumEgresos / sumEnvios;
      const marginPercent =
        sumIngresos > 0 ? ((sumNeta / sumIngresos) * 100).toFixed(1) : 0;

      kpiAvgTicket.textContent = formatCOP(avgTicket);
      kpiMargin.textContent = `${marginPercent}%`;
      kpiCostDelivery.textContent = formatCOP(costPerDelivery);
    }

    // META DE INGRESOS
    const targetGoal = parseFloat(inputTargetGoal.value) || 1;
    const goalPercent = Math.min((sumIngresos / targetGoal) * 100, 100).toFixed(
      1,
    );
    lblGoalPercent.textContent = `${((sumIngresos / targetGoal) * 100).toFixed(0)}%`;
    progressBarFill.style.width = `${goalPercent}%`;

    // ALERTA EGRESOS (> 20%)
    if (sumIngresos > 0 && sumEgresos / sumIngresos > 0.2) {
      alertHighExpenses.classList.remove("hidden");
    } else {
      alertHighExpenses.classList.add("hidden");
    }

    const totalDias = datosFiltrados.length;
    const avgEnvios = (sumEnvios / totalDias).toFixed(1);

    tableFoot.innerHTML = `
          <tr class="row-total">
            <td><strong>Σ TOTALES</strong></td>
            <td style="text-align: center;"><strong>${sumEnvios}</strong></td>
            <td style="color: var(--accent-green);">${formatCOP(sumIngresos)}</td>
            <td style="color: var(--danger);">${formatCOP(sumEgresos)}</td>
            <td style="color: var(--accent-green);">${formatCOP(sumNeta)}</td>
            <td style="color: #38bdf8;">${formatCOP(sumSueldo)}</td>
            <td style="color: #fbbf24;">${formatCOP(sumFondo)}</td>
            <td style="color: #a78bfa;">${formatCOP(sumAhorro)}</td>
            <td>---</td>
          </tr>
          <tr class="row-avg">
            <td><strong>Ø PROMEDIO/DÍA</strong></td>
            <td style="text-align: center;">${avgEnvios}</td>
            <td>${formatCOP(sumIngresos / totalDias)}</td>
            <td>${formatCOP(sumEgresos / totalDias)}</td>
            <td>${formatCOP(sumNeta / totalDias)}</td>
            <td>${formatCOP(sumSueldo / totalDias)}</td>
            <td>${formatCOP(sumFondo / totalDias)}</td>
            <td>${formatCOP(sumAhorro / totalDias)}</td>
            <td>---</td>
          </tr>
        `;

    updateAllCharts(datosFiltrados);
  }

  // RENDERIZADO DE TODOS LOS GRÁFICOS
  function updateAllCharts(datos) {
    const datosCronologicos = [...datos].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha),
    );

    const labels = datosCronologicos.map((d) => d.fecha);
    const ingresos = datosCronologicos.map((d) => d.ingresos.totalIngresos);
    const egresos = datosCronologicos.map((d) => d.egresos.totalEgresos);
    const ganancias = datosCronologicos.map((d) => d.balance.gananciaNeta);
    const enviosNum = datosCronologicos.map((d) => d.ingresos.numeroDomicilios);

    // 1. GRÁFICO DE BARRAS PRINCIPAL
    const ctxFinance = document.getElementById("financeChart").getContext("2d");
    if (financeChartInstance) financeChartInstance.destroy();

    financeChartInstance = new Chart(ctxFinance, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Ganancia Neta",
            data: ganancias,
            backgroundColor: "#4ade80",
            borderRadius: 4,
          },
          {
            label: "Ingresos Brutos",
            data: ingresos,
            backgroundColor: "rgba(56, 189, 248, 0.4)",
            borderColor: "#38bdf8",
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: "Egresos",
            data: egresos,
            backgroundColor: "#ef4444",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#94a3b8", font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: $${ctx.raw.toLocaleString("es-CO")}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 9 } },
            grid: { color: "#334155" },
          },
          y: {
            ticks: { color: "#94a3b8", font: { size: 9 } },
            grid: { color: "#334155" },
          },
        },
      },
    });

    // 2. GRÁFICO DE DONA (DISTRIBUCIÓN 70/20/10)
    const totalNetaAcc = ganancias.reduce((a, b) => a + b, 0);
    const totalSueldo = totalNetaAcc * 0.7;
    const totalFondoBici = totalNetaAcc * 0.2;
    const totalEmergencias = totalNetaAcc * 0.1;

    const ctxDist = document
      .getElementById("distributionChart")
      .getContext("2d");
    if (distributionChartInstance) distributionChartInstance.destroy();

    distributionChartInstance = new Chart(ctxDist, {
      type: "doughnut",
      data: {
        labels: ["Sueldo (70%)", "Fondo Bici (20%)", "Ahorros (10%)"],
        datasets: [
          {
            data: [totalSueldo, totalFondoBici, totalEmergencias],
            backgroundColor: ["#38bdf8", "#fbbf24", "#a78bfa"],
            borderWidth: 2,
            borderColor: "#1e293b",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94a3b8", font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: $${ctx.raw.toLocaleString("es-CO")}`,
            },
          },
        },
      },
    });

    // 3. GRÁFICO DE LÍNEA (EVOLUCIÓN DE ENVÍOS)
    const ctxTrend = document
      .getElementById("deliveriesTrendChart")
      .getContext("2d");
    if (deliveriesTrendChartInstance) deliveriesTrendChartInstance.destroy();

    deliveriesTrendChartInstance = new Chart(ctxTrend, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Domicilios",
            data: enviosNum,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.15)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#38bdf8",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => `Envios: ${ctx.raw} paquetes` },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 9 } },
            grid: { color: "#334155" },
          },
          y: {
            ticks: { color: "#94a3b8", font: { size: 9 }, stepSize: 1 },
            grid: { color: "#334155" },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // MODAL
  window.openDayDetail = function (index) {
    if (index === -1 || !historial[index]) return;
    const item = historial[index];

    modalDateTitle.textContent = `📅 Detalle del ${item.fecha}`;
    modalDeliveriesList.innerHTML = "";

    if (item.ingresos.servicios && item.ingresos.servicios.length > 0) {
      item.ingresos.servicios.forEach((s, i) => {
        const li = document.createElement("li");
        li.className = "modal-list-item";
        li.innerHTML = `
              <span><strong>#${i + 1}</strong> ${s.detalle || "Sin descripción"}</span>
              <strong style="color: var(--accent-green);">${formatCOP(s.tarifa)}</strong>
            `;
        modalDeliveriesList.appendChild(li);
      });
    } else {
      modalDeliveriesList.innerHTML =
        '<li class="modal-list-item" style="color: var(--text-muted);">Sin desglose individual (ingreso global).</li>';
    }

    modalCostBici.textContent = formatCOP(item.egresos.mantenimientoBici || 0);
    modalCostFood.textContent = formatCOP(item.egresos.alimentacion || 0);

    modalDistSueldo.textContent = formatCOP(
      item.balance.distribucion.sueldoPersonal || 0,
    );
    modalDistBici.textContent = formatCOP(
      item.balance.distribucion.fondoBiciCarga || 0,
    );
    modalDistAhorro.textContent = formatCOP(
      item.balance.distribucion.imprevistosAhorro || 0,
    );

    detailModal.classList.remove("hidden");
  };

  const closeModal = () => detailModal.classList.add("hidden");
  modalCloseBtn.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  inputTargetGoal.addEventListener("input", renderTable);

  selectPeriodo.addEventListener("change", () => {
    const esPersonalizado = selectPeriodo.value === "personalizado";
    filterDesde.disabled = !esPersonalizado;
    filterHasta.disabled = !esPersonalizado;
    renderTable();
  });

  filterDesde.addEventListener("change", renderTable);
  filterHasta.addEventListener("change", renderTable);

  window.updateHistoryRow = function (index, campo, valorNuevo) {
    if (index === -1) return;
    let registro = historial[index];

    if (campo === "ingresos")
      registro.ingresos.totalIngresos = parseFloat(valorNuevo) || 0;
    else if (campo === "egresos")
      registro.egresos.totalEgresos = parseFloat(valorNuevo) || 0;

    const gananciaNeta =
      registro.ingresos.totalIngresos - registro.egresos.totalEgresos;
    registro.balance.gananciaNeta = gananciaNeta;
    registro.balance.distribucion.sueldoPersonal = gananciaNeta * 0.7;
    registro.balance.distribucion.fondoBiciCarga = gananciaNeta * 0.2;
    registro.balance.distribucion.imprevistosAhorro = gananciaNeta * 0.1;

    localStorage.setItem(DB_KEY, JSON.stringify(historial));
    renderTable();
  };

  window.deleteHistoryItem = function (index) {
    if (index === -1) return;
    if (confirm("¿Deseas eliminar este registro del localStorage?")) {
      historial.splice(index, 1);
      localStorage.setItem(DB_KEY, JSON.stringify(historial));
      renderTable();
    }
  };

  addDeliveryRow(5000, "Sobre / Liviano");
  addDeliveryRow(12000, "Carga Mediana");
  btnAdd.addEventListener("click", () => addDeliveryRow(8000, ""));

  renderTable();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fechaIngresada = inputFechaEl.value;
    const fechaFinal = fechaIngresada || myFuncDefaultDate();

    const entries = deliveriesList.querySelectorAll(".delivery-entry");
    let servicios = [];
    let totalIngresos = 0;

    entries.forEach((entry) => {
      const tarifa =
        parseFloat(entry.querySelector(".input-tariff").value) || 0;
      const detalle = entry.querySelector(".input-desc").value || "Sin detalle";
      servicios.push({ tarifa, detalle });
      totalIngresos += tarifa;
    });

    const gastoBici =
      parseFloat(document.getElementById("gasto-bici").value) || 0;
    const gastoComida =
      parseFloat(document.getElementById("gasto-comida").value) || 0;
    const totalEgresos = gastoBici + gastoComida;
    const gananciaNeta = totalIngresos - totalEgresos;

    const sueldo = gananciaNeta * 0.7;
    const fondoBici = gananciaNeta * 0.2;
    const emergencias = gananciaNeta * 0.1;

    document.getElementById("lbl-neta").textContent = formatCOP(gananciaNeta);
    document.getElementById("lbl-sueldo").textContent = formatCOP(sueldo);
    document.getElementById("lbl-bici").textContent = formatCOP(fondoBici);
    document.getElementById("lbl-ahorro").textContent = formatCOP(emergencias);
    resumenBox.classList.remove("hidden");

    const registroHoy = {
      fecha: fechaFinal,
      ingresos: {
        numeroDomicilios: servicios.length,
        totalIngresos,
        servicios,
      },
      egresos: {
        mantenimientoBici: gastoBici,
        alimentacion: gastoComida,
        totalEgresos,
      },
      balance: {
        gananciaNeta,
        distribucion: {
          sueldoPersonal: sueldo,
          fondoBiciCarga: fondoBici,
          imprevistosAhorro: emergencias,
        },
      },
    };

    historial.push(registroHoy);
    localStorage.setItem(DB_KEY, JSON.stringify(historial));
    renderTable();

    inputFechaEl.value = "";
    alert(`¡Registro guardado exitosamente para: ${fechaFinal}!`);
  });

  btnExport.addEventListener("click", () => {
    if (!historial.length) return alert("No hay datos para exportar.");
    const dataBlob = new Blob([JSON.stringify(historial, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzas_cargo_bici_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  });

  btnImportTrigger.addEventListener("click", () => fileImport.click());

  fileImport.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData))
          return alert("El archivo debe ser una lista JSON válida.");

        const deseaCombinar = confirm(
          "¿Deseas COMBINAR los datos importados con los actuales?\n\n- [Aceptar]: Conserva lo actual y suma los nuevos.\n- [Cancelar]: Reemplaza todo el historial.",
        );

        if (deseaCombinar) {
          importedData.forEach((newItem) => {
            const existe = historial.some(
              (oldItem) =>
                oldItem.fecha === newItem.fecha &&
                oldItem.ingresos.totalIngresos ===
                  newItem.ingresos.totalIngresos,
            );
            if (!existe) historial.push(newItem);
          });
        } else {
          historial = importedData;
        }

        localStorage.setItem(DB_KEY, JSON.stringify(historial));
        renderTable();
        alert("¡Datos importados con éxito!");
      } catch (err) {
        alert("Ocurrió un error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
    fileImport.value = "";
  });

  btnCopyClipboard.addEventListener("click", () => {
    if (!historial.length) return alert("No hay datos cargados.");
    navigator.clipboard
      .writeText(JSON.stringify(historial, null, 2))
      .then(() => {
        alert("¡Historial copiado al portapapeles!");
      });
  });

  btnClearAll.addEventListener("click", () => {
    if (confirm("¿Estás seguro de vaciar todo el localStorage?")) {
      localStorage.removeItem(DB_KEY);
      historial = [];
      renderTable();
      resumenBox.classList.add("hidden");
      alert("LocalStorage borrado.");
    }
  });
});
