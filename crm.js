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

function normalizeLegacyCliente(c) {
  return {
    id: `legacy-${c.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
    legacyId: c.id || null,
    nombre: c.nombre || c.clienteNombre || 'Sin nombre',
    telefono: c.telefono || '',
    ubicacion: c.ubicacion || c.clienteUbicacion || '',
    origen: 'Cotizador',
    etapa: etapaFromStatus(c.estatus),
    temperatura: 'tibio',
    proximo: '',
    total: c.total || c.precioCliente || '',
    notas: '',
    fechaAlta: c.fecha || todayISO(),
    ultimoContacto: '',
    dataCompleta: c.dataCompleta || null,
    creadoDesde: 'legacy'
  };
}
function normalizeFullCliente(c) {
  const d = c.dataCompleta || {};
  return {
    id: `full-${c.id || Date.now()}-${Math.random().toString(16).slice(2)}`,
    legacyId: c.id || null,
    nombre: c.nombre || d.clienteNombre || 'Sin nombre',
    telefono: c.telefono || '',
    ubicacion: d.clienteUbicacion || '',
    origen: 'Cotizador',
    etapa: 'recibo',
    temperatura: 'tibio',
    proximo: '',
    total: d.costoSistema ? new Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN', maximumFractionDigits:0}).format(d.costoSistema) : '',
    notas: '',
    fechaAlta: c.fecha || todayISO(),
    ultimoContacto: '',
    dataCompleta: d,
    creadoDesde: 'full'
  };
}
function etapaFromStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('cerr')) return 'cerrado';
  if (s.includes('cal')) return 'caliente';
  if (s.includes('prop')) return 'propuesta';
  if (s.includes('segu')) return 'seguimiento';
  return 'nuevo';
}

function importarExistentesUnaVez() {
  if (localStorage.getItem('solregio_crm_imported_v1')) return;
  const crm = getCRM();
  const legacy = loadJSON(LEGACY_KEY, []).map(normalizeLegacyCliente);
  const full = loadJSON(FULL_KEY, []).map(normalizeFullCliente);
  const merged = [...crm, ...legacy, ...full];
  saveCRM(merged);
  localStorage.setItem('solregio_crm_imported_v1', '1');
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
  $('btnExportarCrm').addEventListener('click', exportCRM);
  $('btnImportarCrm').addEventListener('click', () => $('inputImportarCrm').click());
  $('inputImportarCrm').addEventListener('change', e => importCRM(e.target.files[0]));
});
