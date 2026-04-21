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
  const date = new Date(value + 'T12:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function chartOptions(currency = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: {
      padding: { top: 8, right: 8, bottom: 4, left: 4 }
    },
    plugins: {
      legend: {
        labels: {
          color: '#101828',
          font: { family: 'Inter', size: 11 }
        }
      },
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
      x: {
        ticks: { color: '#667085', maxRotation: 45, minRotation: 0 },
        grid: { color: 'rgba(16,24,40,.05)' }
      },
      y: {
        ticks: {
          color: '#667085',
          callback: (value) => currency ? money(value) : numberFmt(value)
        },
        grid: { color: 'rgba(16,24,40,.05)' }
      }
    }
  };
}

function destroyCharts() {
  [chartConsumo, chartCostos, chartRoi].forEach((chart, index) => {
    if (chart) chart.destroy();
    if (index === 0) chartConsumo = null;
    if (index === 1) chartCostos = null;
    if (index === 2) chartRoi = null;
  });
}

function buildCanvasesIfMissing() {
  const defs = [
    ['presChartConsumo', 'Consumo vs generación'],
    ['presChartCostos', 'Costo actual vs costo con paneles'],
    ['presChartRoi', 'Retorno de inversión']
  ];

  defs.forEach(([id]) => {
    const box = document.getElementById(id)?.closest('.chart-box');
    const existing = document.getElementById(id);
    if (box && !existing) {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      box.prepend(canvas);
    }
  });
}

function renderCharts(data) {
  buildCanvasesIfMissing();
  destroyCharts();

  const consumoCanvas = document.getElementById('presChartConsumo');
  const costosCanvas = document.getElementById('presChartCostos');
  const roiCanvas = document.getElementById('presChartRoi');
  if (!consumoCanvas || !costosCanvas || !roiCanvas) return;

  const labels = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const generacionSerie = labels.map(() => Number(data.generacionBimestral || 0));
  const years = Array.from({ length: 25 }, (_, i) => `Año ${i + 1}`);

  chartConsumo = new Chart(consumoCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Consumo',
          data: data.consumos || [],
          borderColor: '#101828',
          backgroundColor: 'rgba(16,24,40,.08)',
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.28,
          datalabels: { display: false }
        },
        {
          label: 'Generación',
          data: generacionSerie,
          borderColor: '#00C853',
          backgroundColor: 'rgba(0,200,83,.12)',
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.28,
          datalabels: { display: false }
        }
      ]
    },
    options: {
      ...chartOptions(false),
      plugins: {
        ...chartOptions(false).plugins,
        legend: {
          ...chartOptions(false).plugins.legend,
          position: 'bottom'
        }
      }
    }
  });

  chartCostos = new Chart(costosCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Costo actual', data: data.costosActuales || [], backgroundColor: '#1f2937', borderRadius: 10 },
        { label: 'Costo con paneles', data: data.costosConSolar || [], backgroundColor: '#00E676', borderRadius: 10 }
      ]
    },
    options: {
      ...chartOptions(true),
      plugins: {
        ...chartOptions(true).plugins,
        legend: {
          ...chartOptions(true).plugins.legend,
          position: 'bottom'
        },
        datalabels: {
          ...chartOptions(true).plugins.datalabels,
          display: false
        }
      }
    }
  });

  chartRoi = new Chart(roiCanvas, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Ahorro acumulado',
          data: data.cumulative || [],
          borderColor: '#00C853',
          backgroundColor: 'rgba(0,200,83,.12)',
          borderWidth: 3,
          fill: true,
          pointRadius: 0,
          tension: 0.2,
          datalabels: { display: false }
        },
        {
          label: 'Costo del sistema',
          data: years.map(() => Number(data.costoSistema || 0)),
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

function deriveFinancials(data) {
  const total = Number(data?.interno?.precioFinalConIva || data?.costoSistema || 0);
  const subtotal = Number(data?.interno?.subtotalSinIva || (total ? (total / 1.16) : 0));
  const iva = Number(data?.interno?.iva || (total - subtotal));
  return { total, subtotal, iva };
}

function getDecisionText(data) {
  if ((data?.roiYears || 0) > 0 && data.roiYears <= 5) return 'Proyecto con retorno sólido y alto potencial de ahorro.';
  if ((data?.roiYears || 0) > 0 && data.roiYears <= 7) return 'Proyecto conveniente con buen equilibrio entre inversión y ahorro.';
  if ((data?.roiYears || 0) > 0) return 'Proyecto viable, sujeto a validación final para optimizar configuración.';
  return 'Pendiente de validar configuración final del sistema.';
}

function render(data) {
  setText('outCliente', data.clienteNombre || '-');
  setText('outUbicacion', data.clienteUbicacion || '-');
  setText('outFecha', formatDate(data.clienteFecha));
  setText('outTarifa', data.clienteTarifa || '-');
  setText('outPropiedad', data.tipoPropiedad || '-');
  setText('outModo', data.modoCalculo === 'gdmth' ? 'GDMTH 12 meses' : (data.modoCalculo === 'recibos' ? 'Con 6 recibos' : 'Estimado rápido'));

  setText('metricConsumo', `${numberFmt(data.consumoAnual)} kWh`);
  setText('metricPago', money(data.pagoAnualActual));
  setText('metricGeneracion', `${numberFmt(data.generacionAnual)} kWh`);
  setText('metricPotencia', `${numberFmt(data.potenciaSistemaKW, 2)} kW`);
  setText('metricPaneles', `${numberFmt(data.numMFV)} paneles`);
  const financials = deriveFinancials(data);
  const coberturaMostrada = Math.min(Number(data.cobertura || 0), 100);

  setText('metricCobertura', `Hasta ${numberFmt(coberturaMostrada, 1)} %`);
  setText('metricAhorro', money(data.ahorroAnual));
  setText('metricRoi', data.roiYears > 0 ? `${numberFmt(data.roiYears, 1)} años` : 'N/A');

  setText('sum5', money((data.cumulative || [])[4] || 0));
  setText('sum10', money((data.cumulative || [])[9] || 0));
  setText('sum15', money((data.cumulative || [])[14] || 0));
  setText('sum20', money((data.cumulative || [])[19] || 0));
  setText('sum25', money((data.cumulative || [])[24] || 0));

  setText('pdfSubtotal', money(financials.subtotal || 0));
  setText('pdfIva', money(financials.iva || 0));
  setText('pdfTotal', money(financials.total || 0));
  setText('invAhorro', money(data.ahorroAnual || 0));
  setText('invRoi', data.roiYears > 0 ? `${numberFmt(data.roiYears, 1)} años` : 'N/A');
  setText('decisionText', getDecisionText(data));

  setText('techPotencia', `${numberFmt(data.potenciaSistemaKW, 2)} kW`);
  setText('techMfvs', `${numberFmt(data.numMFV)} módulos`);
  setText('techPotenciaModulo', `${numberFmt(data.potenciaModulo)} W`);
  setText('techConsumoAnual', `${numberFmt(data.consumoAnual)} kWh`);
  setText('techProduccionAnual', `${numberFmt(data.generacionAnual)} kWh`);
  setText('techObservaciones', data.observacionesProyecto || '-');

  renderCharts(data);
}

function replaceChartsWithImages() {
  document.querySelectorAll('.chart-box').forEach((box) => {
    const oldImg = box.querySelector('img.chart-export');
    if (oldImg) oldImg.remove();
    const canvas = box.querySelector('canvas');
    if (!canvas) return;
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png', 1.0);
    img.alt = 'Gráfica exportada';
    img.className = 'chart-export';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    canvas.style.display = 'none';
    box.appendChild(img);
  });
}

function restoreCanvases() {
  document.querySelectorAll('.chart-box').forEach((box) => {
    const img = box.querySelector('img.chart-export');
    if (img) img.remove();
    const canvas = box.querySelector('canvas');
    if (canvas) canvas.style.display = '';
  });
}

function prepararPDF() {
  replaceChartsWithImages();
  window.print();
  setTimeout(restoreCanvases, 1000);
}

function init() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const btnPrint = document.getElementById('btnPrint');
  if (btnPrint) btnPrint.addEventListener('click', prepararPDF);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    render(data);
  } catch (e) {
    console.warn('No se pudo cargar la presentación', e);
  }
}

window.prepararPDF = prepararPDF;
window.addEventListener('load', init);
