/**
 * Tablero del equipo — Plan Futbol (opcional)
 *
 * 1. Crea una hoja de Google nueva.
 * 2. Menú Extensiones > Apps Script. Borra lo que haya y pega este archivo completo.
 * 3. Cambia CLAVE por una palabra que solo conozca el equipo.
 * 4. Implementar > Nueva implementación > Tipo: Aplicación web.
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
 * 5. Autoriza los permisos y copia la URL que termina en /exec.
 * 6. Pega esa URL en SYNC_URL y la misma clave en SYNC_KEY (arriba del index.html).
 *
 * Cada sesión guardada en la app llega como una fila a la pestaña "Registros".
 */
const CLAVE = 'cambia-esta-clave';
const HOJA = 'Registros';
const COLS = ['id', 'jugador', 'dorsal', 'posicion', 'nivel', 'fecha', 'tipo', 'dia', 'semana',
  'rpe', 'minutos', 'carga', 'series_hechas', 'series_total', 'saltos', 'ligera', 'actualizado'];

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange('F:F').setNumberFormat('@'); // la fecha se guarda como texto AAAA-MM-DD
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fecha_(v) {
  return (v instanceof Date) ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);
}

function sumarDias_(s, n) {
  const p = s.split('-').map(Number);
  return Utilities.formatDate(new Date(p[0], p[1] - 1, p[2] + n), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// La app manda aquí cada sesión o partido guardado. Si ya existía ese día, se actualiza.
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'json' }); }
  if (d.key !== CLAVE) return json_({ ok: false, error: 'clave' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = hoja_();
    const fila = COLS.map(c => c === 'actualizado' ? new Date() : (d[c] === undefined || d[c] === null ? '' : d[c]));
    const datos = sh.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][0]) === String(d.id) && fecha_(datos[i][5]) === d.fecha && String(datos[i][6]) === d.tipo) {
        sh.getRange(i + 1, 1, 1, COLS.length).setValues([fila]);
        return json_({ ok: true, actualizado: true });
      }
    }
    sh.appendRow(fila);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// La app pide aquí el resumen de la semana para el tablero.
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.key !== CLAVE) return json_({ ok: false, error: 'clave' });
  const lunes = p.semana || '';
  const fin = lunes ? sumarDias_(lunes, 7) : '';
  const filas = hoja_().getDataRange().getValues().slice(1);
  const jug = {};
  filas.forEach(r => {
    const id = String(r[0]);
    if (!id) return;
    const f = fecha_(r[5]), tipo = String(r[6]);
    const j = jug[id] || (jug[id] = { id: id, sesiones: 0, carga: 0, partido_min: 0, total: 0, ultima: '' });
    j.nombre = r[1]; j.dorsal = r[2]; j.posicion = r[3];
    if (tipo === 'sesion') j.total++;
    if (f > j.ultima) j.ultima = f;
    if (lunes && f >= lunes && f < fin) {
      if (tipo === 'sesion') j.sesiones++;
      else j.partido_min += Number(r[10]) || 0;
      j.carga += Number(r[11]) || 0;
    }
  });
  return json_({ ok: true, semana: lunes, jugadores: Object.values(jug) });
}
