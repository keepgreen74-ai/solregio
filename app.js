
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
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

function moneyMXN(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function numberMX(value, digits = 0) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: digits
  }).format(Number(value || 0));
}

function redondearMiles(value, base = 5000) {
  return Math.round(Number(value || 0) / base) * base;
}

function calcularSimuladorSolar() {
  const pagoEl = document.getElementById('simPago');
  const tipoEl = document.getElementById('simTipo');
  const zonaEl = document.getElementById('simZona');
  const estabilidadEl = document.getElementById('simEstabilidad');
  const outputEl = document.getElementById('simOutput');
  const emptyEl = document.getElementById('simEmpty');

  if (!pagoEl || !tipoEl || !zonaEl || !estabilidadEl || !outputEl || !emptyEl) return;

  const pago = Number(pagoEl.value || 0);
  if (!pago || pago < 500) {
    alert('Ingresa un pago bimestral aproximado válido.');
    pagoEl.focus();
    return;
  }

  const tipo = tipoEl.value;
  const zona = zonaEl.value;
  const estabilidad = estabilidadEl.value;

  const potenciaPanelKw = 0.62;
  const hsp = zona === 'monterrey' ? 5.5 : (zona === 'noreste' ? 5.3 : 5.0);
  const factorDesempeno = estabilidad === 'estable' ? 0.80 : (estabilidad === 'variable' ? 0.77 : 0.74);
  const energiaPorPanelAnual = potenciaPanelKw * hsp * 365 * factorDesempeno;

  const tarifaPromedioKwh = tipo === 'negocio'
    ? (zona === 'otra' ? 3.0 : 2.85)
    : (zona === 'otra' ? 2.65 : 2.5);

  const consumoBimestralEstimado = pago / tarifaPromedioKwh;
  const consumoAnualEstimado = consumoBimestralEstimado * 6;
  const paneles = Math.max(2, Math.ceil(consumoAnualEstimado / energiaPorPanelAnual));
  const potenciaSistema = paneles * potenciaPanelKw;
  const generacionAnual = paneles * energiaPorPanelAnual;
  const coberturaReal = consumoAnualEstimado > 0 ? (generacionAnual / consumoAnualEstimado) * 100 : 0;
  const cobertura = Math.max(55, Math.min(100, coberturaReal));

  const ahorroFactorBase = tipo === 'negocio' ? 0.76 : 0.82;
  const estabilidadFactor = estabilidad === 'estable' ? 1 : (estabilidad === 'variable' ? 0.95 : 0.9);
  const zonaAhorroFactor = zona === 'monterrey' ? 1 : (zona === 'noreste' ? 0.98 : 0.94);
  const ahorroBimestral = Math.min(pago * 0.92, pago * ahorroFactorBase * estabilidadFactor * zonaAhorroFactor);
  const ahorroAnual = ahorroBimestral * 6;

  const factorTipoInversion = tipo === 'negocio' ? 1.06 : 1;
  const factorZonaInversion = zona === 'otra' ? 1.08 : (zona === 'noreste' ? 1.03 : 1);
  const factorVariacionInversion = estabilidad === 'muy-variable' ? 1.04 : 1;
  const inversionMin = redondearMiles(paneles * 9500 * factorTipoInversion * factorZonaInversion, 5000);
  const inversionMax = redondearMiles(paneles * 12500 * factorTipoInversion * factorZonaInversion * factorVariacionInversion, 5000);

  const roiMin = ahorroAnual > 0 ? inversionMin / ahorroAnual : 0;
  const roiMax = ahorroAnual > 0 ? inversionMax / ahorroAnual : 0;

  let titulo = 'Proyecto con buen potencial de ahorro';
  let badge = 'Evaluación inicial';
  let lectura = 'La simulación ya usa un panel estándar de 620 W y una producción anual estimada para darte una orientación más realista. Aun así, la propuesta final se confirma con tu recibo real.';
  let siguientePaso = 'Envíanos tu recibo';

  if (pago < 1500) {
    titulo = 'Caso para validar con calma';
    badge = 'Revisión recomendada';
    lectura = 'Puede existir oportunidad, pero aquí conviene confirmar si el ahorro y el retorno justifican la inversión antes de dar por hecho el proyecto.';
    siguientePaso = 'Confirmar si conviene';
  } else if (pago >= 3000) {
    titulo = 'Proyecto fuerte para revisar';
    badge = 'Buen potencial';
    lectura = 'Por el nivel de pago reportado, este caso ya luce atractivo. La estimación se calculó con panel de 620 W y una productividad solar estándar, por lo que vale la pena revisar tu recibo y afinar la propuesta.';
    siguientePaso = 'Solicitar propuesta';
  }

  document.getElementById('simTituloResultado').textContent = titulo;
  document.getElementById('simBadge').textContent = badge;
  document.getElementById('simPaneles').textContent = `${numberMX(paneles)} paneles`;
  document.getElementById('simPotencia').textContent = `${numberMX(potenciaSistema, 2)} kWp`;
  document.getElementById('simGeneracion').textContent = `${numberMX(generacionAnual)} kWh/año`;
  document.getElementById('simCobertura').textContent = `${numberMX(cobertura, 0)}%`;
  document.getElementById('simAhorroBim').textContent = moneyMXN(ahorroBimestral);
  document.getElementById('simAhorroAnual').textContent = moneyMXN(ahorroAnual);
  document.getElementById('simRoi').textContent = `${numberMX(roiMin, 1)} a ${numberMX(roiMax, 1)} años`;
  document.getElementById('simInversion').textContent = `${moneyMXN(inversionMin)} a ${moneyMXN(inversionMax)}`;
  document.getElementById('simPaso').textContent = siguientePaso;
  document.getElementById('simLectura').textContent = lectura;

  const mensaje = encodeURIComponent(
    `Hola, hice la simulación en SolRegio.%0A%0A` +
    `Pago bimestral aproximado: ${moneyMXN(pago)}%0A` +
    `Tipo de propiedad: ${tipo === 'negocio' ? 'Negocio' : 'Casa'}%0A` +
    `Zona: ${zona === 'monterrey' ? 'Monterrey / área metropolitana' : zona === 'noreste' ? 'Noreste con buen sol' : 'Otra zona'}%0A` +
    `Paneles estimados: ${numberMX(paneles)}%0A` +
    `Potencia estimada: ${numberMX(potenciaSistema, 2)} kWp%0A` +
    `Generación anual estimada: ${numberMX(generacionAnual)} kWh/año%0A` +
    `Cobertura estimada: ${numberMX(cobertura, 0)}%25%0A` +
    `Ahorro bimestral estimado: ${moneyMXN(ahorroBimestral)}%0A` +
    `Ahorro anual estimado: ${moneyMXN(ahorroAnual)}%0A` +
    `Inversión estimada: ${moneyMXN(inversionMin)} a ${moneyMXN(inversionMax)}%0A` +
    `ROI estimado: ${numberMX(roiMin, 1)} a ${numberMX(roiMax, 1)} años%0A%0A` +
    `¿Me ayudas a confirmar esta simulación con mi recibo real?`
  );

  const wa = document.getElementById('simWhatsApp');
  if (wa) wa.href = `https://wa.me/528118103610?text=${mensaje}`;

  emptyEl.classList.add('hidden');
  outputEl.classList.remove('hidden');
}

document.getElementById('btnSimular')?.addEventListener('click', calcularSimuladorSolar);
