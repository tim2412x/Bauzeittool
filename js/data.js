/* ===== DATA.JS — Datenverwaltung ===== */

window.AppData = {
  currentProject: null,
  isDirty: false
};

// ===== PROJEKT INITIALISIERUNG =====
function initNewProject() {
  const now = new Date().toISOString();
  AppData.currentProject = {
    format: 'bauzeitenplan/v1',
    meta: {
      projectTitle: '',
      projectManager: 'Jürgen Gehrke',  // Immer Jürgen Gehrke, nicht im UI sichtbar
      customer: '',
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    },
    settings: {
      timeUnit: 'week',
      showWeekends: true,
      showCurrentWeek: true
      // projectStart/projectEnd werden dynamisch aus Contractors berechnet
    },
    contractors: []
  };
  AppData.isDirty = false;
}

// ===== DYNAMISCHER PROJEKTBEREICH AUS CONTRACTORS =====
// Berechnet Start/Ende aus dem frühesten/spätesten Contractor-Datum
// Gibt null zurück wenn keine Contractors vorhanden
function getProjectRange(project) {
  const contractors = project.contractors;
  if (!contractors || contractors.length === 0) return null;

  let minDate = contractors[0].startDate;
  let maxDate = contractors[0].endDate;
  contractors.forEach(c => {
    if (c.startDate < minDate) minDate = c.startDate;
    if (c.endDate   > maxDate) maxDate = c.endDate;
  });
  return { start: minDate, end: maxDate };
}

// Berechnet den Gantt-Bereich: Contractor-Bereich + 2 Wochen Puffer auf jeder Seite
function getGanttRange(project) {
  const range = getProjectRange(project);
  if (!range) {
    // Fallback: aktuelles Quartal
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const qStart = new Date(y, Math.floor(m/3)*3, 1);
    const qEnd   = new Date(y, Math.floor(m/3)*3 + 6, 0);
    return { start: toISODate(qStart), end: toISODate(qEnd) };
  }
  // 2 Wochen Puffer
  const s = new Date(range.start);
  s.setDate(s.getDate() - 14);
  const e = new Date(range.end);
  e.setDate(e.getDate() + 14);
  return { start: toISODate(s), end: toISODate(e) };
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ===== VALIDIERUNG =====
function validateProject(project) {
  const errors = [];
  if (!project.meta.projectTitle || !project.meta.projectTitle.trim()) {
    errors.push('Projektname fehlt');
  }
  if (!project.meta.customer || !project.meta.customer.trim()) {
    errors.push('Kunde fehlt');
  }
  if (project.contractors.length === 0) {
    errors.push('Mindestens ein Gewerk erforderlich');
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

function validateContractor(data) {
  const errors = {};
  // Firma ist optional — keine Validierung
  if (!data.trade || !data.trade.trim()) errors.trade = 'Gewerk erforderlich';
  if (!data.startDate) errors.start = 'Startdatum erforderlich';
  if (!data.endDate) errors.end = 'Enddatum erforderlich';
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    errors.end = 'Enddatum darf nicht vor dem Startdatum liegen';
  }
  // Einzeltermin (Start = Ende) ist erlaubt
  return errors;
}

// ===== SERIALISIERUNG =====
function serializeProject(project) {
  const p = JSON.parse(JSON.stringify(project));
  p.meta.updatedAt = new Date().toISOString();
  return JSON.stringify(p, null, 2);
}

function deserializeProject(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.format && data.format !== 'bauzeitenplan/v1') {
      return { success: false, error: 'Diese Datei stammt von einer neueren Programmversion und kann nicht geöffnet werden.' };
    }
    if (!data.meta || !data.contractors) {
      return { success: false, error: 'Ungültiges Dateiformat.' };
    }
    if (!data.format) data.format = 'bauzeitenplan/v1';
    return { success: true, data };
  } catch (e) {
    return { success: false, error: 'Die Datei konnte nicht gelesen werden. Bitte prüfen Sie das Format.' };
  }
}

// ===== DATEI DOWNLOAD =====
function downloadProjectFile(project) {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: 'application/json' });
  const safeName = (project.meta.projectTitle || 'Bauzeitenplan').replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_]/g, '');
  const filename = `Bauzeitenplan_${safeName}_${new Date().toISOString().slice(0, 10)}.bpz`;

  // Safari-Fallback via data URI
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    const reader = new FileReader();
    reader.onload = () => {
      const a = document.createElement('a');
      a.href = reader.result;
      a.download = filename;
      a.click();
    };
    reader.readAsDataURL(blob);
  }
}

// ===== DATEI IMPORT =====
async function importProjectFile(fileObject) {
  const name = fileObject.name.toLowerCase();

  // Excel-Datei: verstecktes _Projektdaten-Blatt auslesen
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return importFromExcel(fileObject);
  }

  // .bpz oder .json
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(deserializeProject(e.target.result));
    reader.onerror = () => resolve({ success: false, error: 'Datei konnte nicht gelesen werden.' });
    reader.readAsText(fileObject, 'UTF-8');
  });
}

// Excel-Import: liest JSON aus dem versteckten _Projektdaten-Blatt
async function importFromExcel(fileObject) {
  if (typeof ExcelJS === 'undefined') {
    return { success: false, error: 'Excel-Bibliothek nicht verfügbar. Bitte .bpz-Datei verwenden.' };
  }
  try {
    const buffer = await fileObject.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const wsData = wb.getWorksheet('_Projektdaten');
    if (!wsData) {
      return { success: false, error: 'Diese Excel-Datei enthält keine importierbaren Projektdaten. Bitte eine .bpz-Datei verwenden.' };
    }
    const marker = wsData.getCell('A1').value;
    if (marker !== 'BAUZEITENPLAN_DATA_V1') {
      return { success: false, error: 'Excel-Format wird nicht erkannt.' };
    }
    const json = wsData.getCell('A2').value;
    if (!json) return { success: false, error: 'Projektdaten leer.' };
    return deserializeProject(json);
  } catch (e) {
    return { success: false, error: 'Excel-Datei konnte nicht gelesen werden: ' + e.message };
  }
}

// ===== UUID =====
function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ===== KW-HILFSFUNKTIONEN =====

// ISO-KW und Jahr für ein Datum
function getISOWeekData(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return { year: d.getFullYear(), week: weekNum };
}

// Montag einer ISO-KW
function getMondayOfISOWeek(year, week) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day + (week - 1) * 7);
  return monday;
}

// Freitag einer ISO-KW
function getFridayOfISOWeek(year, week) {
  const monday = getMondayOfISOWeek(year, week);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
}

// Anzahl ISO-KWs in einem Jahr
function getWeeksInYear(year) {
  const dec28 = new Date(year, 11, 28);
  return getISOWeekData(dec28).week;
}

// Alle KWs zwischen zwei ISO-Datumstrings (inkl. 2-Wochen-Puffer, der schon im range steckt)
function buildWeekColumns(projectStart, projectEnd) {
  const cols = [];
  if (!projectStart || !projectEnd) return cols;

  const startWD = getISOWeekData(new Date(projectStart));
  const endWD   = getISOWeekData(new Date(projectEnd));

  let { year, week } = startWD;
  const endYear = endWD.year;
  const endWeek = endWD.week;

  while (year < endYear || (year === endYear && week <= endWeek)) {
    const numWeeks = getWeeksInYear(year);
    const isLastOfYear = week === numWeeks;
    cols.push({ year, week, isLastOfYear });
    week++;
    if (week > numWeeks) { week = 1; year++; }
  }
  return cols;
}

// Prüft ob eine KW im Zeitraum eines Contractors liegt
// Einzeltermine (start = end) werden korrekt behandelt
function isWeekInContractorRange(year, week, contractor) {
  const monday = getMondayOfISOWeek(year, week);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const start  = new Date(contractor.startDate + 'T00:00:00');
  const end    = new Date(contractor.endDate   + 'T23:59:59');
  return start <= sunday && end >= monday;
}

// Prüft ob ein Contractor ein Einzeltermin ist (Start = Ende)
function isSingleDay(contractor) {
  return contractor.startDate === contractor.endDate;
}

// Prüft ob eine KW die aktuelle Woche ist
function isCurrentWeek(year, week) {
  const today = getISOWeekData(new Date());
  return today.year === year && today.week === week;
}

// Deutsches Datumsformat DD.MM.YYYY
function formatDateDE(isoDateString) {
  if (!isoDateString) return '';
  const d = new Date(isoDateString);
  if (isNaN(d)) return isoDateString;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Kontrastfarbe (Schwarz/Weiß) für Hintergrundfarbe
function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// ===== AUTOSAVE (localStorage) =====
const AUTOSAVE_KEY = 'bauzeitenplan_autosave';

function autosave() {
  if (!AppData.currentProject) return;
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeProject(AppData.currentProject));
  } catch (e) { /* localStorage voll */ }
}

function loadAutosave() {
  try {
    return localStorage.getItem(AUTOSAVE_KEY);
  } catch (e) { return null; }
}

function clearAutosave() {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
}
