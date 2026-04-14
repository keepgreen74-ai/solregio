
Chart.register(ChartDataLabels);

const STORAGE_KEY = 'solregioProposalData';

const tariffPresets = {
  "1":   { limiteBasico: 75,  limiteIntermedio: 140, precioBasico: 1.08, precioIntermedio: 1.30, precioExcedente: 3.90 },
  "1A":  { limiteBasico: 100, limiteIntermedio: 185, precioBasico: 1.08, precioIntermedio: 1.30, precioExcedente: 3.90 },
  "1B":  { limiteBasico: 125, limiteIntermedio: 225, precioBasico: 1.08, precioIntermedio: 1.30, precioExcedente: 3.90 },
  "1C":  { limiteBasico: 150, limiteIntermedio: 280, precioBasico: 1.10, precioIntermedio: 1.35, precioExcedente: 3.95 },
  "1D":  { limiteBasico: 175, limiteIntermedio: 320, precioBasico: 1.10, precioIntermedio: 1.38, precioExcedente: 3.98 },
  "1E":  { limiteBasico: 200, limiteIntermedio: 400, precioBasico: 1.10, precioIntermedio: 1.40, precioExcedente: 4.05 },
  "1F":  { limiteBasico: 250, limiteIntermedio: 500, precioBasico: 1.12, precioIntermedio: 1.42, precioExcedente: 4.10 },
  "DAC": { limiteBasico: 0, limiteIntermedio: 0, precioBasico: 0, precioIntermedio: 0, precioExcedente: 6.25 },
  "PDBT": { limiteBasico: 0, limiteIntermedio: 0, precioBasico: 0, precioIntermedio: 0, precioExcedente: 4.85 }
};

const refs = {
  clienteNombre: document.getElementById('clienteNombre'),
  clienteFecha: document.getElementById('clienteFecha'),
  clienteUbicacion: document.getElementById('clienteUbicacion'),
  clienteTarifa: document.getElementById('clienteTarifa'),
  tipoPropiedad: document.getElementById('tipoPropiedad'),
  modoCalculo: document.getElementById('modoCalculo'),

  limiteBasico: document.getElementById('limiteBasico'),
  limiteIntermedio: document.getElementById('limiteIntermedio'),
  precioBasico: document.getElementById('precioBasico'),
  precioIntermedio: document.getElementById('precioIntermedio'),
  precioExcedente: document.getElementById('precioExcedente'),
  incrementoAnual: document.getElementById('incrementoAnual'),

  numMFV: document.getElementById('numMFV'),
  potenciaModulo: document.getElementById('potenciaModulo'),
  hsp: document.getElementById('hsp'),
  factorDesempeno: document.getElementById('factorDesempeno'),
  costoSistema: document.getElementById('costoSistema'),
  generacionBimestral: document.getElementById('generacionBimestral'),

  consumoBimestralEstimado: document.getElementById('consumoBimestralEstimado'),
  costoBimestralEstimado: document.getElementById('costoBimestralEstimado'),

  observacionesProyecto: document.getElementById('observacionesProyecto'),
  bloqueRecibos: document.getElementById('bloqueRecibos'),
  bloqueEstimado: document.getElementById('bloqueEstimado'),

  consumos: [...document.querySelectorAll('.consumo-recibo')],
  costos: [...document.querySelectorAll('.costo-recibo')],

  btnGeneracion: document.getElementById('btnGeneracion'),
  btnActualizar: document.getElementById('btnActualizar')
};

const quickOut = {
  consumo: document.getElementById('quickConsumo'),
  pago: document.getElementById('quickPago'),
  generacion: document.getElementById('quickGeneracion'),
  ahorro: document.getElementById('quickAhorro'),
  roi: document.getElementById('quickRoi'),
  cobertura: document.getElementById('quickCobertura')
};

let quickChartConsumo;
let quickChartCostos;
let debounceTimer;

function money(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function numberFmt(value, digits = 0) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: digits }).format(Number(value || 0));
}

function setToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  refs.clienteFecha.value = `${yyyy}-${mm}-${dd}`;
}

function applyTariffPreset() {
  const preset = tariffPresets[refs.clienteTarifa.value];
  if (!preset) return;
  refs.limiteBasico.value = preset.limiteBasico;
  refs.limiteIntermedio.value = preset.limiteIntermedio;
  refs.precioBasico.value = preset.precioBasico;
  refs.precioIntermedio.value = preset.precioIntermedio;
  refs.precioExcedente.value = preset.precioExcedente;
}

function updateModeUI() {
  const isRecibos = refs.modoCalculo.value === 'recibos';
  refs.bloqueRecibos.classList.toggle('hidden', !isRecibos);
  refs.bloqueEstimado.classList.toggle('hidden', isRecibos);
}

function calcularGeneracion() {
  const mfv = Number(refs.numMFV.value || 0);
  const potenciaKW = Number(refs.potenciaModulo.value || 0) / 1000;
  const hsp = Number(refs.hsp.value || 0);
  const factor = Number(refs.factorDesempeno.value || 0);
  if (!mfv || !potenciaKW || !hsp || !factor) return;
  const generacionDiaria = mfv * potenciaKW * hsp * factor;
  refs.generacionBimestral.value = Math.round(generacionDiaria * 60);
}

function guardarCliente(data) {

  let clientes = JSON.parse(localStorage.getItem("clientes")) || [];

  clientes.push({
    id: Date.now(),
    fecha: new Date().toLocaleDateString(),
    ...data,
    estatus: "nuevo"
  });

  localStorage.setItem("clientes", JSON.stringify(clientes));

  alert("Cliente guardado correctamente");
}

function calcularCostoEscalonado(kwh) {
  const tarifa = refs.clienteTarifa.value;
  const b = Number(refs.limiteBasico.value || 0);
  const i = Number(refs.limiteIntermedio.value || 0);
  const pb = Number(refs.precioBasico.value || 0);
  const pi = Number(refs.precioIntermedio.value || 0);
  const pe = Number(refs.precioExcedente.value || 0);

  if (tarifa === 'DAC' || tarifa === 'PDBT') return kwh * pe;

  let total = 0;
  let restante = kwh;

  const tramoBasico = Math.min(restante, b);
  total += tramoBasico * pb;
  restante -= tramoBasico;

  const tramoIntermedio = Math.min(restante, Math.max(i - b, 0));
  total += tramoIntermedio * pi;
  restante -= tramoIntermedio;

  if (restante > 0) total += restante * pe;
  return total;
}

function guardarActual() {

  const data = {
    nombre: document.getElementById("nombre")?.value || "",
    telefono: document.getElementById("telefono")?.value || "",
    ubicacion: document.getElementById("ubicacion")?.value || "",
    consumo: document.getElementById("consumo")?.value || "",
    paneles: document.getElementById("paneles")?.innerText || "",
    kwp: document.getElementById("kwp")?.innerText || "",
    total: document.getElementById("total")?.innerText || ""
  };

  guardarCliente(data);
}

function getData() {
  const modo = refs.modoCalculo.value;
  const generacionBimestral = Number(refs.generacionBimestral.value || 0);
  const costoSistema = Number(refs.costoSistema.value || 0);
  const incrementoAnual = Number(refs.incrementoAnual.value || 4) / 100;

  let consumos = [];
  let costosActuales = [];

  if (modo === 'recibos') {
    consumos = refs.consumos.map(i => Number(i.value || 0));
    const costosCapturados = refs.costos.map(i => Number(i.value || 0));
    costosActuales = consumos.map((kwh, idx) => {
      const real = costosCapturados[idx];
      return real > 0 ? real : calcularCostoEscalonado(kwh);
    });
  } else {
    const consumoEstimado = Number(refs.consumoBimestralEstimado.value || 0);
    const costoEstimado = Number(refs.costoBimestralEstimado.value || 0);
    consumos = Array(6).fill(consumoEstimado);
    costosActuales = Array(6).fill(costoEstimado > 0 ? costoEstimado : calcularCostoEscalonado(consumoEstimado));
  }

  const costosConSolar = consumos.map(kwh => calcularCostoEscalonado(Math.max(kwh - generacionBimestral, 0)));

  const consumoAnual = consumos.reduce((a, b) => a + b, 0);
  const pagoAnualActual = costosActuales.reduce((a, b) => a + b, 0);
  const pagoAnualConSolar = costosConSolar.reduce((a, b) => a + b, 0);
  const ahorroAnual = Math.max(pagoAnualActual - pagoAnualConSolar, 0);
  const generacionAnual = generacionBimestral * 6;
  const potenciaSistemaKW = (Number(refs.numMFV.value || 0) * Number(refs.potenciaModulo.value || 0)) / 1000;
  const cobertura = consumoAnual > 0 ? Math.min((generacionAnual / consumoAnual) * 100, 100) : 0;
  const roiYears = ahorroAnual > 0 ? costoSistema / ahorroAnual : 0;

  const cumulative = [];
  let acumulado = 0;
  let ahorroEscalado = ahorroAnual;
  for (let year = 1; year <= 25; year++) {
    acumulado += ahorroEscalado;
    cumulative.push(acumulado);
    ahorroEscalado *= 1 + incrementoAnual;
  }

  return {
    clienteNombre: refs.clienteNombre.value || '',
    clienteFecha: refs.clienteFecha.value || '',
    clienteUbicacion: refs.clienteUbicacion.value || '',
    clienteTarifa: refs.clienteTarifa.value || '',
    tipoPropiedad: refs.tipoPropiedad.value || '',
    modoCalculo: refs.modoCalculo.value,
    limiteBasico: Number(refs.limiteBasico.value || 0),
    limiteIntermedio: Number(refs.limiteIntermedio.value || 0),
    precioBasico: Number(refs.precioBasico.value || 0),
    precioIntermedio: Number(refs.precioIntermedio.value || 0),
    precioExcedente: Number(refs.precioExcedente.value || 0),
    incrementoAnual: Number(refs.incrementoAnual.value || 0),
    numMFV: Number(refs.numMFV.value || 0),
    potenciaModulo: Number(refs.potenciaModulo.value || 0),
    hsp: Number(refs.hsp.value || 0),
    factorDesempeno: Number(refs.factorDesempeno.value || 0),
    costoSistema,
    generacionBimestral,
    observacionesProyecto: refs.observacionesProyecto.value || '',
    consumos,
    costosActuales,
    costosConSolar,
    consumoAnual,
    pagoAnualActual,
    pagoAnualConSolar,
    ahorroAnual,
    generacionAnual,
    potenciaSistemaKW,
    cobertura,
    roiYears,
    cumulative
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function renderQuickStats(data) {
  quickOut.consumo.textContent = `${numberFmt(data.consumoAnual)} kWh`;
  quickOut.pago.textContent = money(data.pagoAnualActual);
  quickOut.generacion.textContent = `${numberFmt(data.generacionAnual)} kWh`;
  quickOut.ahorro.textContent = money(data.ahorroAnual);
  quickOut.roi.textContent = data.roiYears > 0 ? `${numberFmt(data.roiYears, 1)} años` : 'N/A';
  quickOut.cobertura.textContent = `${numberFmt(data.cobertura, 1)} %`;
}

function chartOptions(currency = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#101828', font: { family: 'Inter', size: 11 } } },
      datalabels: {
        color: '#344054',
        anchor: 'end',
        align: 'top',
        offset: 2,
        clamp: true,
        font: { size: 10, weight: '700' },
        formatter: (value) => currency ? money(value) : numberFmt(value),
        display: (ctx) => ctx.dataset.type !== 'line'
      }
    },
    scales: {
      x: { ticks: { color: '#667085' }, grid: { color: 'rgba(16,24,40,.05)' } },
      y: {
        ticks: { color: '#667085', callback: (value) => currency ? money(value) : numberFmt(value) },
        grid: { color: 'rgba(16,24,40,.05)' }
      }
    }
  };
}

function renderQuickCharts(data) {
  if (quickChartConsumo) quickChartConsumo.destroy();
  if (quickChartCostos) quickChartCostos.destroy();

  const labels = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const generacionSerie = labels.map(() => data.generacionBimestral);

  quickChartConsumo = new Chart(document.getElementById('quickChartConsumo'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Consumo',
          data: data.consumos,
          borderColor: '#101828',
          backgroundColor: 'rgba(16,24,40,.08)',
          borderWidth: 3,
          pointRadius: 4,
          tension: .28,
          datalabels: { display: false }
        },
        {
          label: 'Generación',
          data: generacionSerie,
          borderColor: '#00C853',
          backgroundColor: 'rgba(0,200,83,.12)',
          borderWidth: 3,
          pointRadius: 4,
          tension: .28,
          datalabels: { display: false }
        }
      ]
    },
    options: chartOptions(false)
  });

  quickChartCostos = new Chart(document.getElementById('quickChartCostos'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Costo actual', data: data.costosActuales, backgroundColor: '#1f2937', borderRadius: 10 },
        { label: 'Costo con paneles', data: data.costosConSolar, backgroundColor: '#00E676', borderRadius: 10 }
      ]
    },
    options: chartOptions(true)
  });
}

function updateAll() {
  const data = getData();
  saveData(data);
  renderQuickStats(data);
  renderQuickCharts(data);
}

function debounceUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updateAll, 180);
}

function preloadObservaciones() {
  if (!refs.observacionesProyecto.value.trim()) {
    refs.observacionesProyecto.value =
`1. Incluye seguro de Sistema fotovoltaico interconectado por el primer año.
2. Incluye 1 mantenimiento a los 6 meses.
3. Incluye capacidad para ampliar el sistema a 10 MFV.`;
  }
}

function preloadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    refs.clienteNombre.value = data.clienteNombre || '';
    refs.clienteFecha.value = data.clienteFecha || '';
    refs.clienteUbicacion.value = data.clienteUbicacion || '';
    refs.clienteTarifa.value = data.clienteTarifa || '1C';
    refs.tipoPropiedad.value = data.tipoPropiedad || '';
    refs.modoCalculo.value = data.modoCalculo || 'recibos';

    refs.limiteBasico.value = data.limiteBasico ?? refs.limiteBasico.value;
    refs.limiteIntermedio.value = data.limiteIntermedio ?? refs.limiteIntermedio.value;
    refs.precioBasico.value = data.precioBasico ?? refs.precioBasico.value;
    refs.precioIntermedio.value = data.precioIntermedio ?? refs.precioIntermedio.value;
    refs.precioExcedente.value = data.precioExcedente ?? refs.precioExcedente.value;
    refs.incrementoAnual.value = data.incrementoAnual ?? refs.incrementoAnual.value;

    refs.numMFV.value = data.numMFV || '';
    refs.potenciaModulo.value = data.potenciaModulo || refs.potenciaModulo.value;
    refs.hsp.value = data.hsp || refs.hsp.value;
    refs.factorDesempeno.value = data.factorDesempeno || refs.factorDesempeno.value;
    refs.costoSistema.value = data.costoSistema || '';
    refs.generacionBimestral.value = data.generacionBimestral || '';

    refs.observacionesProyecto.value = data.observacionesProyecto || refs.observacionesProyecto.value;

    (data.consumos || []).forEach((v, i) => { if (refs.consumos[i]) refs.consumos[i].value = v; });
    (data.costosActuales || []).forEach((v, i) => { if (refs.costos[i]) refs.costos[i].value = v; });

    if (document.getElementById('consumoBimestralEstimado')) {
      document.getElementById('consumoBimestralEstimado').value = data.modoCalculo === 'estimado' ? (data.consumos?.[0] || '') : '';
      document.getElementById('costoBimestralEstimado').value = data.modoCalculo === 'estimado' ? (data.costosActuales?.[0] || '') : '';
    }
  } catch (e) {}
}

function init() {
  if (!refs.clienteFecha.value) setToday();
  preloadObservaciones();
  preloadFromStorage();
  if (!refs.clienteFecha.value) setToday();
  applyTariffPreset();
  updateModeUI();
  updateAll();

  refs.clienteTarifa.addEventListener('change', () => {
    applyTariffPreset();
    debounceUpdate();
  });
  refs.modoCalculo.addEventListener('change', () => {
    updateModeUI();
    debounceUpdate();
  });
  refs.btnGeneracion.addEventListener('click', () => {
    calcularGeneracion();
    updateAll();
  });
  refs.btnActualizar.addEventListener('click', updateAll);

  const inputs = [
    refs.clienteNombre, refs.clienteFecha, refs.clienteUbicacion, refs.clienteTarifa, refs.tipoPropiedad,
    refs.limiteBasico, refs.limiteIntermedio, refs.precioBasico, refs.precioIntermedio, refs.precioExcedente,
    refs.incrementoAnual, refs.numMFV, refs.potenciaModulo, refs.hsp, refs.factorDesempeno, refs.costoSistema,
    refs.generacionBimestral, refs.observacionesProyecto,
    document.getElementById('consumoBimestralEstimado'),
    document.getElementById('costoBimestralEstimado'),
    ...refs.consumos, ...refs.costos
  ].filter(Boolean);

  inputs.forEach(el => {
    el.addEventListener('input', debounceUpdate);
    el.addEventListener('change', debounceUpdate);
  });
}

init();
