function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads') || ss.insertSheet('Leads');

  var headers = [
    'Fecha',
    'Nombre',
    'WhatsApp',
    'Pago bimestral',
    'Tipo de propiedad',
    'Zona',
    'Estabilidad recibo',
    'Paneles estimados',
    'Potencia kWp',
    'Generación anual kWh',
    'Cobertura estimada',
    'Ahorro bimestral',
    'Ahorro anual',
    'Inversión estimada',
    'ROI estimado',
    'Lectura',
    'Origen'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  var p = e.parameter || {};
  sheet.appendRow([
    p.fecha || new Date(),
    p.nombre || '',
    p.whatsapp || '',
    p.pago_bimestral || '',
    p.tipo_propiedad || '',
    p.zona || '',
    p.estabilidad_recibo || '',
    p.paneles_estimados || '',
    p.potencia_kwp || '',
    p.generacion_anual_kwh || '',
    p.cobertura_estimada || '',
    p.ahorro_bimestral || '',
    p.ahorro_anual || '',
    p.inversion_estimada || '',
    p.roi_estimado || '',
    p.lectura || '',
    p.origen || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
