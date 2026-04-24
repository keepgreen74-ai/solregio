const WHATSAPP_NUMBER = '528118103610';

// Para guardar leads en Google Sheets:
// 1) Crea el Apps Script con el archivo google-apps-script.gs incluido en este paquete.
// 2) Publica como Web App.
// 3) Pega aquí la URL que termina en /exec.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwljTGMB5BId_7FTR66Sfn2Iu66JeA61VBlohrsdJagVkXvYlhUcbYXq7y0_piwduU9Fg/exec'; // Ejemplo: 'https://script.google.com/macros/s/AKfycb.../exec'

let pendingSimulation = null;

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
  let clientes = JSON.parse(localStorage.getItem('clientes')) || [];

  clientes.push({
    id: Date.now(),
    fecha: new Date().toLocaleDateString(),
    ...data,
    estatus: 'nuevo'
  });

  localStorage.setItem('clientes', JSON.stringify(clientes));
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

function limpiarTelefono(value) {
  return String(value || '').replace(/\D/g, '');
}

function zonaTexto(zona) {
  if (zona === 'monterrey') return 'Monterrey / área metropolitana';
  if (zona === 'noreste') return 'Noreste con buen sol';
  return 'Otra zona';
}

function tipoTexto(tipo) {
  return tipo === 'negocio' ? 'Negocio' : 'Casa';
}

function estabilidadTexto(estabilidad) {
  if (estabilidad === 'estable') return 'Sí, casi siempre';
  if (estabilidad === 'variable') return 'Varía a veces';
  return 'Cambia mucho';
}

function calcularDatosSimulacion() {
  const pagoEl = document.getElementById('simPago');
  const tipoEl = document.getElementById('simTipo');
  const zonaEl = document.getElementById('simZona');
  const estabilidadEl = document.getElementById('simEstabilidad');

  if (!pagoEl || !tipoEl || !zonaEl || !estabilidadEl) return null;

  const pago = Number(pagoEl.value || 0);
  if (!pago || pago < 500) {
    alert('Ingresa un pago bimestral aproximado válido.');
    pagoEl.focus();
    return null;
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

  return {
    fecha: new Date().toLocaleString('es-MX'),
    pago,
    tipo,
    zona,
    estabilidad,
    tipoTexto: tipoTexto(tipo),
    zonaTexto: zonaTexto(zona),
    estabilidadTexto: estabilidadTexto(estabilidad),
    potenciaPanelKw,
    hsp,
    factorDesempeno,
    tarifaPromedioKwh,
    consumoBimestralEstimado,
    consumoAnualEstimado,
    paneles,
    potenciaSistema,
    generacionAnual,
    cobertura,
    ahorroBimestral,
    ahorroAnual,
    inversionMin,
    inversionMax,
    roiMin,
    roiMax,
    titulo,
    badge,
    lectura,
    siguientePaso
  };
}

function calcularPotencialAhorro(data) {
  if (!data) return '-';
  if (data.pago >= 3000 || data.ahorroBimestral >= 2200) return 'Alto';
  if (data.pago >= 1500 || data.ahorroBimestral >= 1100) return 'Medio';
  return 'Por revisar';
}

function renderTeaser(data) {
  if (!data) return;

  const potencial = calcularPotencialAhorro(data);
  const freePaneles = document.getElementById('simFreePaneles');
  const freePotencial = document.getElementById('simFreePotencial');
  const freeMensaje = document.getElementById('simFreeMensaje');

  if (freePaneles) freePaneles.textContent = `${numberMX(data.paneles)} paneles`;
  if (freePotencial) freePotencial.textContent = potencial;
  if (freeMensaje) {
    freeMensaje.textContent = 'Para ver inversión estimada, ROI, ahorro anual y recomendación personalizada, deja tu WhatsApp y te lo muestro aquí mismo.';
  }
}

function calcularSimuladorSolar() {
  const data = calcularDatosSimulacion();
  if (!data) return;

  pendingSimulation = data;

  const emptyEl = document.getElementById('simEmpty');
  const teaserEl = document.getElementById('simTeaser');
  const leadGateEl = document.getElementById('simLeadGate');
  const outputEl = document.getElementById('simOutput');
  const statusEl = document.getElementById('leadStatus');

  renderTeaser(data);

  emptyEl?.classList.add('hidden');
  outputEl?.classList.add('hidden');
  teaserEl?.classList.remove('hidden');
  leadGateEl?.classList.remove('hidden');

  if (statusEl) {
    statusEl.textContent = 'Tus datos se usan solo para dar seguimiento a esta simulación.';
  }

  setTimeout(() => {
    document.getElementById('leadNombre')?.focus();
  }, 100);
}

function renderResultado(data) {
  if (!data) return;

  document.getElementById('simTituloResultado').textContent = data.titulo;
  document.getElementById('simBadge').textContent = data.badge;
  document.getElementById('simPaneles').textContent = `${numberMX(data.paneles)} paneles`;
  document.getElementById('simPotencia').textContent = `${numberMX(data.potenciaSistema, 2)} kWp`;
  document.getElementById('simGeneracion').textContent = `${numberMX(data.generacionAnual)} kWh/año`;
  document.getElementById('simCobertura').textContent = `${numberMX(data.cobertura, 0)}%`;
  document.getElementById('simAhorroBim').textContent = moneyMXN(data.ahorroBimestral);
  document.getElementById('simAhorroAnual').textContent = moneyMXN(data.ahorroAnual);
  document.getElementById('simRoi').textContent = `${numberMX(data.roiMin, 1)} a ${numberMX(data.roiMax, 1)} años`;
  document.getElementById('simInversion').textContent = `${moneyMXN(data.inversionMin)} a ${moneyMXN(data.inversionMax)}`;
  document.getElementById('simPaso').textContent = data.siguientePaso;
  document.getElementById('simLectura').textContent = data.lectura;

  document.getElementById('simLeadGate')?.classList.add('hidden');
  document.getElementById('simTeaser')?.classList.add('hidden');
  document.getElementById('simEmpty')?.classList.add('hidden');
  document.getElementById('simOutput')?.classList.remove('hidden');
}

function construirMensajeWhatsApp(data, lead) {
  return (
`Hola, hice la simulación en SolRegio.

Nombre: ${lead.nombre}
WhatsApp: ${lead.whatsapp}

Pago bimestral aproximado: ${moneyMXN(data.pago)}
Tipo de propiedad: ${data.tipoTexto}
Zona: ${data.zonaTexto}
Recibo: ${data.estabilidadTexto}

Paneles estimados: ${numberMX(data.paneles)}
Potencia estimada: ${numberMX(data.potenciaSistema, 2)} kWp
Generación anual estimada: ${numberMX(data.generacionAnual)} kWh/año
Cobertura estimada: ${numberMX(data.cobertura, 0)}%
Ahorro bimestral estimado: ${moneyMXN(data.ahorroBimestral)}
Ahorro anual estimado: ${moneyMXN(data.ahorroAnual)}
Inversión estimada: ${moneyMXN(data.inversionMin)} a ${moneyMXN(data.inversionMax)}
ROI estimado: ${numberMX(data.roiMin, 1)} a ${numberMX(data.roiMax, 1)} años

¿Me ayudas a confirmar esta simulación con mi recibo real?`
  );
}

function guardarLeadLocal(payload) {
  const leads = JSON.parse(localStorage.getItem('solregioLeadsSimulador')) || [];
  leads.push({
    id: Date.now(),
    ...payload
  });
  localStorage.setItem('solregioLeadsSimulador', JSON.stringify(leads));
}

function guardarLeadGoogle(payload) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PEGA') || !GOOGLE_SCRIPT_URL.startsWith('http')) {
    return;
  }

  const formData = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // Se envía en segundo plano para no frenar el WhatsApp.
  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formData.toString()
  }).catch(() => {
    // Si falla internet o la URL todavía no está configurada, el lead queda guardado localmente.
  });
}

function enviarLeadSimulador() {
  if (!pendingSimulation) {
    calcularSimuladorSolar();
    return;
  }

  const nombreEl = document.getElementById('leadNombre');
  const whatsappEl = document.getElementById('leadWhatsapp');
  const statusEl = document.getElementById('leadStatus');

  const nombre = String(nombreEl?.value || '').trim();
  const whatsapp = limpiarTelefono(whatsappEl?.value || '');

  if (nombre.length < 2) {
    alert('Escribe tu nombre para enviarte la simulación.');
    nombreEl?.focus();
    return;
  }

  if (whatsapp.length < 10) {
    alert('Escribe un WhatsApp válido a 10 dígitos.');
    whatsappEl?.focus();
    return;
  }

  const data = pendingSimulation;
  const lead = { nombre, whatsapp };

  const payload = {
    fecha: data.fecha,
    nombre,
    whatsapp,
    pago_bimestral: moneyMXN(data.pago),
    tipo_propiedad: data.tipoTexto,
    zona: data.zonaTexto,
    estabilidad_recibo: data.estabilidadTexto,
    paneles_estimados: numberMX(data.paneles),
    potencia_kwp: numberMX(data.potenciaSistema, 2),
    generacion_anual_kwh: numberMX(data.generacionAnual),
    cobertura_estimada: `${numberMX(data.cobertura, 0)}%`,
    ahorro_bimestral: moneyMXN(data.ahorroBimestral),
    ahorro_anual: moneyMXN(data.ahorroAnual),
    inversion_estimada: `${moneyMXN(data.inversionMin)} a ${moneyMXN(data.inversionMax)}`,
    roi_estimado: `${numberMX(data.roiMin, 1)} a ${numberMX(data.roiMax, 1)} años`,
    lectura: data.lectura,
    origen: 'Simulador web SolRegio'
  };

  guardarLeadLocal(payload);
  guardarLeadGoogle(payload);

  renderResultado(data);

  const mensaje = construirMensajeWhatsApp(data, lead);
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

  const wa = document.getElementById('simWhatsApp');
  if (wa) wa.href = waUrl;

  if (statusEl) {
    statusEl.textContent = 'Listo. Te estamos abriendo WhatsApp con tu simulación.';
  }

  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

document.getElementById('btnSimular')?.addEventListener('click', calcularSimuladorSolar);
document.getElementById('btnEnviarLead')?.addEventListener('click', enviarLeadSimulador);

['leadNombre', 'leadWhatsapp'].forEach((id) => {
  document.getElementById(id)?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      enviarLeadSimulador();
    }
  });
});
