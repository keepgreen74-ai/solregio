const CRM_KEY = 'solregio_crm_v1';
const LEGACY_KEY = 'clientes';
const FULL_KEY = 'solregio_clientes_v2';
const PROPOSAL_KEY = 'solregioProposalData';
const WHATSAPP = '528118103610';

const stages = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'recibo', label: 'Recibo recibido' },
  { id: 'llamada', label: 'Llamada / visita' },
  { id: 'propuesta', label: 'Propuesta enviada' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'caliente', label: 'Caliente' },
  { id: 'cerrado', label: 'Cerrado' }
];

const $ = (id) => document.getElementById(id);
const cleanPhone = (v) => String(v || '').replace(/\D/g, '');
const normalizeText = (v) => String(v || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();
const stableKey = (item = {}) => {
  const phone = cleanPhone(item.telefono);
  const name = normalizeText(item.nombre || item.clienteNombre);
  const loc = normalizeText(item.ubicacion || item.clienteUbicacion);
  const scenario = normalizeText(item.escenario || 'A');
  return [name, phone, loc, scenario].join('|');
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function loadJSON(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function saveCRM(items) { localStorage.setItem(CRM_KEY, JSON.stringify(items)); }
function getCRM() { return loadJSON(CRM_KEY, []); }

function getCotizacionFromCliente(c = {}) {
  return c.snapshot?.cotizacion || c.dataCompleta || null;
}
function normalizeLegacyCliente(c) {
  const rawId = c.id || c.legacyId || c.clienteCotizadorId || `tmp-${stableKey(c)}`;
  const cot = getCotizacionFromCliente(c) || {};
  const escenario = c.escenario || cot.escenario || 'A';
  const item = {
    id: String(c.syncKey || c.clave || `cotizador-${rawId}`),
    syncKey: String(c.syncKey || c.clave || `cotizador-${rawId}`),
    clienteCotizadorId: rawId,
    legacyId: c.legacyId || rawId,
    nombre: c.nombre || cot.clienteNombre || c.clienteNombre || 'Sin nombre',
    telefono: c.telefono || cot.clienteTelefono || '',
    ubicacion: c.ubicacion || cot.clienteUbicacion || c.clienteUbicacion || '',
    origen: c.origen || 'Cotizador',
    etapa: etapaFromStatus(c.estatus || c.etapa || 'recibo'),
    temperatura: c.temperatura || 'tibio',
    proximo: c.proximo || c.proximoSeguimiento || '',
    total: c.total || c.precioCliente || '',
    notas: c.notas || c.notaSeguimiento || '',
    fechaAlta: c.fechaAlta || c.fecha || todayISO(),
    ultimoContacto: c.ultimoContacto || '',
    dataCompleta: cot,
    creadoDesde: c.creadoDesde || 'cotizador',
    escenario
  };
  item.fingerprint = stableKey(item);
  return item;
}
function normalizeFullCliente(c) {
  const d = c.dataCompleta || c.snapshot?.cotizacion || {};
  const rawId = c.id || c.legacyId || c.clienteCotizadorId || `tmp-${stableKey(c)}`;
  const item = {
    id: String(c.syncKey || c.clave || `full-${rawId}`),
    syncKey: String(c.syncKey || c.clave || `full-${rawId}`),
    clienteCotizadorId: rawId,
    legacyId: c.legacyId || rawId,
    nombre: c.nombre || d.clienteNombre || 'Sin nombre',
    telefono: c.telefono || d.clienteTelefono || '',
    ubicacion: c.ubicacion || d.clienteUbicacion || '',
    origen: c.origen || 'Cotizador',
    etapa: etapaFromStatus(c.estatus || c.etapa || 'recibo'),
    temperatura: c.temperatura || 'tibio',
    proximo: c.proximo || c.proximoSeguimiento || '',
    total: c.total || c.precioCliente || (d.costoSistema ? new Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN', maximumFractionDigits:0}).format(d.costoSistema) : ''),
    notas: c.notas || c.notaSeguimiento || '',
    fechaAlta: c.fechaAlta || c.fecha || todayISO(),
    ultimoContacto: c.ultimoContacto || '',
    dataCompleta: d,
    creadoDesde: c.creadoDesde || 'full',
    escenario: c.escenario || d.escenario || 'A'
  };
  item.fingerprint = stableKey(item);
  return item;
}
function etapaFromStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('cerr')) return 'cerrado';
  if (s.includes('cal')) return 'caliente';
  if (s.includes('prop')) return 'propuesta';
  if (s.includes('segu')) return 'seguimiento';
  return 'nuevo';
}

function mergeLeadList(base, incoming) {
  const merged = [...base].map(item => ({ ...item, fingerprint: item.fingerprint || stableKey(item) }));
  let added = 0;
  let updated = 0;
  let ignored = 0;

  incoming.forEach(item => {
    if (!item || !item.nombre || item.nombre === 'Sin nombre') {
      ignored += 1;
      return;
    }

    item.fingerprint = item.fingerprint || stableKey(item);
    const phone = cleanPhone(item.telefono);
    const name = normalizeText(item.nombre);
    const loc = normalizeText(item.ubicacion);

    let idx = merged.findIndex(existing =>
      (item.syncKey && existing.syncKey === item.syncKey) ||
      (item.clienteCotizadorId && String(existing.clienteCotizadorId || '') === String(item.clienteCotizadorId)) ||
      (item.fingerprint && existing.fingerprint === item.fingerprint)
    );

    if (idx < 0 && phone) {
      idx = merged.findIndex(existing => cleanPhone(existing.telefono) === phone && normalizeText(existing.nombre) === name);
    }

    if (idx < 0 && name && loc) {
      idx = merged.findIndex(existing => normalizeText(existing.nombre) === name && normalizeText(existing.ubicacion) === loc);
    }

    if (idx >= 0) {
      const keep = merged[idx];
      merged[idx] = {
        ...item,
        ...keep,
        nombre: item.nombre || keep.nombre,
        telefono: item.telefono || keep.telefono,
        ubicacion: item.ubicacion || keep.ubicacion,
        total: item.total || keep.total,
        dataCompleta: item.dataCompleta || keep.dataCompleta,
        clienteCotizadorId: item.clienteCotizadorId || keep.clienteCotizadorId,
        syncKey: item.syncKey || keep.syncKey,
        fingerprint: item.fingerprint || keep.fingerprint,
        escenario: item.escenario || keep.escenario
      };
      updated += 1;
    } else {
      merged.push(item);
      added += 1;
    }
  });

  // dedupe final pass
  const seen = new Map();
  const finalList = [];
  merged.forEach(item => {
    const key = item.syncKey || item.fingerprint || stableKey(item) || item.id;
    if (seen.has(key)) {
      const idx = seen.get(key);
      finalList[idx] = { ...item, ...finalList[idx], dataCompleta: item.dataCompleta || finalList[idx].dataCompleta };
    } else {
      seen.set(key, finalList.length);
      finalList.push(item);
    }
  });

  return { items: finalList, added, updated, ignored };
}

function sincronizarClientesCotizador() {
  const crm = getCRM();
  const legacyRaw = loadJSON(LEGACY_KEY, []);
  const fullRaw = loadJSON(FULL_KEY, []);
  const legacy = Array.isArray(legacyRaw) ? legacyRaw.map(normalizeLegacyCliente) : [];
  const full = Array.isArray(fullRaw) ? fullRaw.map(normalizeFullCliente) : [];
  const result = mergeLeadList(crm, [...legacy, ...full]);
  saveCRM(result.items);
  return result;
}
function importarExistentesUnaVez() {
  return sincronizarClientesCotizador();
}

function renderStageOptions() {
  $('crmEtapa').innerHTML = stages.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
}
function filteredItems() {
  const q = $('crmSearch').value.trim().toLowerCase();
  const temp = $('crmFiltroTemp').value;
  const vence = $('crmFiltroVence').value;
  const today = todayISO();
  return getCRM().filter(item => {
    const text = [item.nombre, item.telefono, item.ubicacion, item.origen, item.etapa, item.notas, item.total].join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (temp && item.temperatura !== temp) return false;
    if (vence === 'hoy' && item.proximo !== today) return false;
    if (vence === 'vencido' && (!item.proximo || item.proximo >= today)) return false;
    return true;
  });
}
function renderStats(items) {
  const hoy = todayISO();
  const vencidos = items.filter(i => i.proximo && i.proximo < hoy && i.etapa !== 'cerrado').length;
  const hoyCount = items.filter(i => i.proximo === hoy && i.etapa !== 'cerrado').length;
  const calientes = items.filter(i => i.temperatura === 'caliente' && i.etapa !== 'cerrado').length;
  const cerrados = items.filter(i => i.etapa === 'cerrado').length;
  $('crmStats').innerHTML = [
    ['Prospectos activos', items.filter(i => i.etapa !== 'cerrado').length],
    ['Seguimiento hoy', hoyCount],
    ['Vencidos', vencidos],
    ['Calientes', calientes],
    ['Cerrados', cerrados]
  ].map(([label, value]) => `<article class="crm-mini-stat"><span>${label}</span><strong>${value}</strong></article>`).join('');
}
function renderBoard() {
  const items = filteredItems();
  renderStats(items);
  $('crmBoard').innerHTML = stages.map(stage => {
    const cards = items.filter(i => i.etapa === stage.id);
    return `<section class="crm-column" data-stage="${stage.id}">
      <div class="crm-column-head"><h2>${stage.label}</h2><span>${cards.length}</span></div>
      <div class="crm-column-cards">
        ${cards.length ? cards.map(renderCard).join('') : '<p class="crm-column-empty">Sin prospectos</p>'}
      </div>
    </section>`;
  }).join('');
}
function tempLabel(t) {
  if (t === 'caliente') return 'Caliente';
  if (t === 'frio') return 'Frío';
  return 'Tibio';
}
function followupClass(date) {
  if (!date) return 'muted';
  const today = todayISO();
  if (date < today) return 'danger';
  if (date === today) return 'warning';
  return 'success';
}
function renderCard(item) {
  const phone = cleanPhone(item.telefono);
  const wa = phone ? `https://wa.me/52${phone.startsWith('52') ? phone.slice(2) : phone}` : '#';
  return `<article class="crm-lead-card">
    <div class="crm-card-top">
      <button type="button" class="crm-card-title" onclick="openLead('${item.id}')">${escapeHTML(item.nombre || 'Sin nombre')}</button>
      <span class="crm-temp ${item.temperatura || 'tibio'}">${tempLabel(item.temperatura)}</span>
    </div>
    <p class="crm-card-sub">${escapeHTML(item.ubicacion || item.origen || 'Sin ubicación')}</p>
    <div class="crm-card-meta">
      <span>${escapeHTML(item.total || 'Sin total')}</span>
      <span class="follow-${followupClass(item.proximo)}">${item.proximo ? 'Seg. ' + item.proximo : 'Sin seguimiento'}</span>
    </div>
    ${item.notas ? `<p class="crm-note-preview">${escapeHTML(item.notas).slice(0, 110)}</p>` : ''}
    <div class="crm-card-actions">
      <a class="crm-mini-action" href="${wa}" target="_blank" ${phone ? '' : 'aria-disabled="true"'}>WhatsApp</a>
      <button class="crm-mini-action" type="button" onclick="openCotizador('${item.id}')">Cotizador</button>
      <button class="crm-mini-action" type="button" onclick="quickMove('${item.id}')">Mover</button>
      <button class="crm-mini-action" type="button" onclick="openLead('${item.id}')">Editar</button>
    </div>
  </article>`;
}
function escapeHTML(str) {
  return String(str || '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

function openLead(id = '') {
  const item = id ? getCRM().find(i => i.id === id) : null;
  $('crmModalTitle').textContent = item ? 'Editar prospecto' : 'Nuevo prospecto';
  $('crmId').value = item?.id || '';
  $('crmNombre').value = item?.nombre || '';
  $('crmTelefono').value = item?.telefono || '';
  $('crmUbicacion').value = item?.ubicacion || '';
  $('crmOrigen').value = item?.origen || 'WhatsApp conocido';
  $('crmEtapa').value = item?.etapa || 'nuevo';
  $('crmTemperatura').value = item?.temperatura || 'tibio';
  $('crmProximo').value = item?.proximo || addDaysISO(2);
  $('crmTotal').value = item?.total || '';
  $('crmNotas').value = item?.notas || '';
  $('btnEliminarLead').classList.toggle('hidden', !item);
  $('crmModal').classList.remove('hidden');
}
function closeModal() { $('crmModal').classList.add('hidden'); }
function saveLead(e) {
  e.preventDefault();
  const id = $('crmId').value || `manual-${Date.now()}`;
  const crm = getCRM();
  const prev = crm.find(i => i.id === id) || {};
  const item = {
    ...prev,
    id,
    nombre: $('crmNombre').value.trim(),
    telefono: $('crmTelefono').value.trim(),
    ubicacion: $('crmUbicacion').value.trim(),
    origen: $('crmOrigen').value,
    etapa: $('crmEtapa').value,
    temperatura: $('crmTemperatura').value,
    proximo: $('crmProximo').value,
    total: $('crmTotal').value.trim(),
    notas: $('crmNotas').value.trim(),
    fechaAlta: prev.fechaAlta || todayISO(),
    ultimoContacto: todayISO(),
    creadoDesde: prev.creadoDesde || 'manual'
  };
  const index = crm.findIndex(i => i.id === id);
  if (index >= 0) crm[index] = item; else crm.push(item);
  saveCRM(crm);
  closeModal();
  renderBoard();
}
function deleteLead() {
  const id = $('crmId').value;
  if (!id || !confirm('¿Eliminar este prospecto del CRM?')) return;
  saveCRM(getCRM().filter(i => i.id !== id));
  closeModal();
  renderBoard();
}
function quickMove(id) {
  const crm = getCRM();
  const item = crm.find(i => i.id === id);
  if (!item) return;
  const idx = stages.findIndex(s => s.id === item.etapa);
  item.etapa = stages[Math.min(idx + 1, stages.length - 1)].id;
  item.ultimoContacto = todayISO();
  if (!item.proximo && item.etapa !== 'cerrado') item.proximo = addDaysISO(3);
  saveCRM(crm);
  renderBoard();
}

function openCotizador(id) {
  const item = getCRM().find(i => String(i.id) === String(id));
  if (!item) {
    alert('No encontré ese prospecto.');
    return;
  }

  localStorage.setItem('solregio_crm_to_cotizador', JSON.stringify({
    crmId: item.id,
    nombre: item.nombre || '',
    telefono: item.telefono || '',
    ubicacion: item.ubicacion || '',
    total: item.total || '',
    origen: item.origen || '',
    notas: item.notas || '',
    etapa: item.etapa || 'nuevo',
    temperatura: item.temperatura || 'tibio',
    dataCompleta: item.dataCompleta || null
  }));

  window.open('cotizador.html?crm=' + encodeURIComponent(item.id), '_blank');
}

function exportCRM() {
  const blob = new Blob([JSON.stringify(getCRM(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solregio-crm-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importCRM(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      saveCRM(data);
      renderBoard();
      alert('CRM importado correctamente');
    } catch (err) {
      alert('No se pudo importar el archivo');
    }
  };
  reader.readAsText(file);
}


/* ===== SOLREGIO V13.7 CRM SYNC ROBUSTO ===== */
function solCrmNormalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function solCrmScenario(value = 'A') {
  const safe = String(value || 'A').toUpperCase();
  return ['A','B','C'].includes(safe) ? safe : 'A';
}
function solCrmFingerprint(item = {}) {
  const d = item.dataCompleta || item.snapshot?.cotizacion || {};
  return [
    item.nombre || d.clienteNombre,
    item.telefono || d.clienteTelefono,
    item.ubicacion || d.clienteUbicacion,
    item.escenario || d.escenario || 'A'
  ].map(solCrmNormalize).join('|');
}
function solCrmCotizadorLead(c = {}) {
  const d = c.snapshot?.cotizacion || c.dataCompleta || {};
  const scenario = solCrmScenario(c.escenario || d.escenario || 'A');
  const id = c.id || c.legacyId || c.clienteCotizadorId || `tmp-${solCrmFingerprint(c)}`;
  return {
    id: `cotizador-${id}`,
    syncKey: `cotizador-${id}`,
    clienteCotizadorId: id,
    nombre: c.nombre || d.clienteNombre || 'Sin nombre',
    telefono: c.telefono || d.clienteTelefono || '',
    ubicacion: c.ubicacion || d.clienteUbicacion || '',
    origen: c.origen || 'Cotizador',
    etapa: c.etapa || (c.estatus === 'cerrado' ? 'cerrado' : 'recibo'),
    temperatura: c.temperatura || 'tibio',
    proximo: c.proximo || c.proximoSeguimiento || '',
    total: c.total || c.precioCliente || (d.costoSistema ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(d.costoSistema) : ''),
    notas: c.notas || c.notaSeguimiento || '',
    fechaAlta: c.fechaAlta || c.fecha || new Date().toISOString().slice(0,10),
    ultimoContacto: c.ultimoContacto || '',
    escenario: scenario,
    dataCompleta: d && Object.keys(d).length ? { ...d, escenario: scenario } : null,
    creadoDesde: 'cotizador'
  };
}
function sincronizarClientesCotizador() {
  const crm = getCRM();
  const raw = loadJSON('clientes', []);
  const cotizador = Array.isArray(raw) ? raw.map(solCrmCotizadorLead) : [];
  let added = 0, updated = 0, ignored = 0;
  const result = [...crm];

  cotizador.forEach(item => {
    const fingerprint = solCrmFingerprint(item);
    let idx = result.findIndex(x => String(x.clienteCotizadorId || '') === String(item.clienteCotizadorId || ''));
    if (idx < 0) idx = result.findIndex(x => String(x.syncKey || '') === String(item.syncKey || ''));
    if (idx < 0) idx = result.findIndex(x => solCrmFingerprint(x) === fingerprint);

    if (idx >= 0) {
      result[idx] = {
        ...result[idx],
        ...item,
        id: result[idx].id || item.id,
        etapa: result[idx].etapa || item.etapa,
        temperatura: result[idx].temperatura || item.temperatura,
        proximo: result[idx].proximo || item.proximo,
        notas: result[idx].notas || item.notas,
        dataCompleta: item.dataCompleta || result[idx].dataCompleta || null
      };
      updated++;
    } else {
      result.push(item);
      added++;
    }
  });

  const final = [];
  const seen = new Set();
  result.forEach(item => {
    const key = item.syncKey || `${item.clienteCotizadorId || ''}` || solCrmFingerprint(item);
    const fp = solCrmFingerprint(item);
    const dedupeKey = key && key !== '' ? key : fp;
    if (seen.has(dedupeKey) || seen.has(fp)) {
      ignored++;
      return;
    }
    seen.add(dedupeKey);
    seen.add(fp);
    final.push(item);
  });

  saveCRM(final);
  return { items: final, added, updated, ignored };
}
function openCotizador(id) {
  const item = getCRM().find(i => String(i.id) === String(id));
  if (!item) { alert('No encontré ese prospecto.'); return; }
  localStorage.setItem('solregio_crm_to_cotizador', JSON.stringify({
    crmId: item.id,
    clienteCotizadorId: item.clienteCotizadorId || '',
    nombre: item.nombre || '',
    telefono: item.telefono || '',
    ubicacion: item.ubicacion || '',
    total: item.total || '',
    origen: item.origen || '',
    notas: item.notas || '',
    etapa: item.etapa || 'nuevo',
    temperatura: item.temperatura || 'tibio',
    escenario: item.escenario || 'A',
    dataCompleta: item.dataCompleta || null
  }));
  window.open('cotizador.html?crm=' + encodeURIComponent(item.id), '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  renderStageOptions();
  importarExistentesUnaVez();
  renderBoard();
  $('btnNuevoLead').addEventListener('click', () => openLead());
  $('btnCerrarModal').addEventListener('click', closeModal);
  $('crmModal').addEventListener('click', (e) => { if (e.target.id === 'crmModal') closeModal(); });
  $('crmForm').addEventListener('submit', saveLead);
  $('btnEliminarLead').addEventListener('click', deleteLead);
  $('crmSearch').addEventListener('input', renderBoard);
  $('crmFiltroTemp').addEventListener('change', renderBoard);
  $('crmFiltroVence').addEventListener('change', renderBoard);
  $('btnSincronizarCotizador')?.addEventListener('click', () => {
    const r = sincronizarClientesCotizador();
    renderBoard();
    alert(`Sincronización lista: ${r.added} nuevos, ${r.updated} actualizados, ${r.ignored} ignorados.`);
  });
  $('btnExportarCrm').addEventListener('click', exportCRM);
  $('btnImportarCrm').addEventListener('click', () => $('inputImportarCrm').click());
  $('inputImportarCrm').addEventListener('change', e => importCRM(e.target.files[0]));
});
