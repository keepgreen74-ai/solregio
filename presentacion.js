
Chart.register(ChartDataLabels);
const STORAGE_KEY = 'solregioProposalData';

let chartConsumo;
let chartCostos;
let chartRoi;

function money(value) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function numberFmt(value, digits = 0) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: digits }).format(Number(value || 0));
}
function formatDate(value) {
  if (!value) return '-';
  return new Date(value + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
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

function renderCharts(data) {
  if (chartConsumo) chartConsumo.destroy();
  if (chartCostos) chartCostos.destroy();
  if (chartRoi) chartRoi.destroy();

  const labels = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const generacionSerie = labels.map(() => data.generacionBimestral);
  const years = Array.from({ length: 25 }, (_, i) => `Año ${i + 1}`);

  chartConsumo = new Chart(document.getElementById('presChartConsumo'), {
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

  chartCostos = new Chart(document.getElementById('presChartCostos'), {
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

  chartRoi = new Chart(document.getElementById('presChartRoi'), {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Ahorro acumulado',
          data: data.cumulative,
          borderColor: '#00C853',
          backgroundColor: 'rgba(0,200,83,.12)',
          borderWidth: 3,
          fill: true,
          pointRadius: 0,
          tension: .2,
          datalabels: { display: false }
        },
        {
          label: 'Costo del sistema',
          data: years.map(() => data.costoSistema),
          borderColor: '#F4B400',
          borderWidth: 2,
          borderDash: [8, 6],
          pointRadius: 0,
          fill: false,
          datalabels: { display: false }
        }
      ]
    },
    options: chartOptions(true)
  });
}

function render(data) {
  document.getElementById('outCliente').textContent = data.clienteNombre || '-';
  document.getElementById('outUbicacion').textContent = data.clienteUbicacion || '-';
  document.getElementById('outFecha').textContent = formatDate(data.clienteFecha);
  document.getElementById('outTarifa').textContent = data.clienteTarifa || '-';
  document.getElementById('outPropiedad').textContent = data.tipoPropiedad || '-';
  document.getElementById('outModo').textContent = data.modoCalculo === 'recibos' ? 'Con 6 recibos' : 'Estimado rápido';

  document.getElementById('metricConsumo').textContent = `${numberFmt(data.consumoAnual)} kWh`;
  document.getElementById('metricPago').textContent = money(data.pagoAnualActual);
  document.getElementById('metricGeneracion').textContent = `${numberFmt(data.generacionAnual)} kWh`;
  document.getElementById('metricPotencia').textContent = `${numberFmt(data.potenciaSistemaKW, 2)} kW`;
  document.getElementById('metricPaneles').textContent = `${numberFmt(data.numMFV)} paneles`;
  document.getElementById('metricCobertura').textContent = `${numberFmt(data.cobertura, 1)} %`;
  document.getElementById('metricAhorro').textContent = money(data.ahorroAnual);
  document.getElementById('metricRoi').textContent = data.roiYears > 0 ? `${numberFmt(data.roiYears, 1)} años` : 'N/A';

  document.getElementById('sum5').textContent = money(data.cumulative[4] || 0);
  document.getElementById('sum10').textContent = money(data.cumulative[9] || 0);
  document.getElementById('sum15').textContent = money(data.cumulative[14] || 0);
  document.getElementById('sum20').textContent = money(data.cumulative[19] || 0);
  document.getElementById('sum25').textContent = money(data.cumulative[24] || 0);

  document.getElementById('techPotencia').textContent = `${numberFmt(data.potenciaSistemaKW, 2)} kW`;
  document.getElementById('techMfvs').textContent = `${numberFmt(data.numMFV)} módulos`;
  document.getElementById('techPotenciaModulo').textContent = `${numberFmt(data.potenciaModulo)} W`;
  document.getElementById('techConsumoAnual').textContent = `${numberFmt(data.consumoAnual)} kWh`;
  document.getElementById('techProduccionAnual').textContent = `${numberFmt(data.generacionAnual)} kWh`;
  document.getElementById('techObservaciones').textContent = data.observacionesProyecto || '-';

  document.getElementById('invCosto').textContent = money(data.costoSistema);
  document.getElementById('invAhorro').textContent = money(data.ahorroAnual);
  document.getElementById('invRoi').textContent = data.roiYears > 0 ? `${numberFmt(data.roiYears, 1)} años` : 'N/A';

  renderCharts(data);
}

function init() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const btnPrint = document.getElementById('btnPrint');
  btnPrint.addEventListener('click', () => window.print());

  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    render(data);
  } catch (e) {}
}

init();
