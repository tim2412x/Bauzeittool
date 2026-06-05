/* ===== GANTT.JS — Gantt-Rendering ===== */

function renderGantt(project) {
  const inner = document.getElementById('gantt-inner');
  const emptyState = document.getElementById('gantt-empty-state');

  if (!project || project.contractors.length === 0) {
    inner.innerHTML = '';
    if (emptyState) { inner.appendChild(emptyState); emptyState.style.display = 'flex'; }
    updateDurationInfo(project);
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  // Dynamischer Bereich aus Contractors berechnen
  const range = getGanttRange(project);
  const cols = buildWeekColumns(range.start, range.end);
  updateDurationInfo(project);

  // Toolbar-Info aktualisieren
  const kwInfo = document.getElementById('gantt-kw-info');
  if (kwInfo) {
    const startW = cols[0];
    const endW   = cols[cols.length - 1];
    kwInfo.textContent = `KW ${startW.week}/${startW.year} – KW ${endW.week}/${endW.year}  ·  ${cols.length} Wochen  ·  ${project.contractors.length} Gewerk${project.contractors.length !== 1 ? 'e' : ''}`;
  }

  const frag = document.createDocumentFragment();
  const table = document.createElement('table');
  table.className = 'gantt-table';
  table.setAttribute('aria-label', 'Bauzeitenplan');

  // Dynamische Breite der Gewerk-Spalte: längster Name bestimmt die Breite (gedeckelt)
  const labelW = computeLabelWidth(project.contractors);
  table.style.setProperty('--label-w', labelW + 'px');

  table.appendChild(buildGanttHead(cols));

  const tbody = document.createElement('tbody');
  const sorted = [...project.contractors].sort((a, b) => a.sortOrder - b.sortOrder);
  sorted.forEach(c => tbody.appendChild(buildGanttRow(c, cols, project.settings)));
  table.appendChild(tbody);

  frag.appendChild(table);
  inner.innerHTML = '';
  inner.appendChild(frag);

  markCurrentWeek(cols);
}

// Misst die nötige Breite der Gewerk-Spalte mit echter Textmessung (Canvas).
// So bricht der Text nur dann um, wenn der Name wirklich zu lang ist.
let _measureCtx = null;
function measureTextWidth(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}

function computeLabelWidth(contractors) {
  // Tätigkeit: 14px, halbfett · Firma: 13px, normal (eigene Zeile)
  const tradeFont = '500 14px Inter, system-ui, sans-serif';
  const firmFont  = '400 13px Inter, system-ui, sans-serif';
  let maxPx = measureTextWidth('Gewerk', '500 13px Inter, sans-serif'); // Header-Minimum

  contractors.forEach(c => {
    const tradeW = measureTextWidth(c.trade || '', tradeFont);
    const firmW  = c.firm ? measureTextWidth(c.firm, firmFont) : 0;
    const w = Math.max(tradeW, firmW);
    if (w > maxPx) maxPx = w;
  });
  // Innenabstand: links 12 + rechts 30 (Stift-Icon) + 4 Reserve
  const px = Math.round(maxPx + 46);
  return Math.max(210, Math.min(440, px));
}

// Deutsche Monatsnamen (kurz)
const MONTH_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// ===== KOPFZEILE (3 Ebenen: Jahr → Monat → KW) =====
function buildGanttHead(cols) {
  const thead = document.createElement('thead');

  // ── Zeile 1: Gewerk-Label (rowSpan=3) + Datum-Spalte (rowSpan=3) + Jahres-Spalten ──
  const rowYear = document.createElement('tr');

  const thLabel = document.createElement('th');
  thLabel.className = 'label-col';
  thLabel.textContent = 'Gewerk';
  thLabel.rowSpan = 3;
  rowYear.appendChild(thLabel);

  const thDate = document.createElement('th');
  thDate.className = 'date-col';
  thDate.textContent = 'Datum';
  thDate.rowSpan = 3;
  rowYear.appendChild(thDate);

  const yearGroups = {};
  cols.forEach(({ year }) => { yearGroups[year] = (yearGroups[year] || 0) + 1; });
  Object.entries(yearGroups).sort(([a],[b])=>Number(a)-Number(b)).forEach(([year, count], i, arr) => {
    const th = document.createElement('th');
    th.className = 'year-col' + (i < arr.length - 1 ? ' year-boundary' : '');
    th.colSpan = count;
    th.textContent = String(year);
    rowYear.appendChild(th);
  });
  thead.appendChild(rowYear);

  // ── Zeile 2: Monats-Spalten ──
  const rowMonth = document.createElement('tr');
  // Monatsgruppen berechnen: Montag der KW bestimmt den Monat
  const monthGroups = [];
  cols.forEach(({ year, week }) => {
    const monday = getMondayOfISOWeek(year, week);
    const monthKey = `${monday.getFullYear()}-${monday.getMonth()}`;
    if (monthGroups.length === 0 || monthGroups[monthGroups.length - 1].key !== monthKey) {
      monthGroups.push({ key: monthKey, month: monday.getMonth(), year: monday.getFullYear(), count: 1, isLastOfYear: false });
    } else {
      monthGroups[monthGroups.length - 1].count++;
    }
  });
  // Jahresgrenzen in Monaten markieren
  monthGroups.forEach((mg, i) => {
    if (i < monthGroups.length - 1 && mg.year !== monthGroups[i+1].year) mg.isLastOfYear = true;
  });
  monthGroups.forEach(mg => {
    const th = document.createElement('th');
    th.className = 'month-col' + (mg.isLastOfYear ? ' year-boundary' : '');
    th.colSpan = mg.count;
    th.textContent = MONTH_SHORT[mg.month];
    th.dataset.month = mg.month;
    th.dataset.year = mg.year;
    rowMonth.appendChild(th);
  });
  thead.appendChild(rowMonth);

  // ── Zeile 3: KW-Spalten ──
  const rowWeek = document.createElement('tr');
  cols.forEach(({ year, week, isLastOfYear }) => {
    const isToday = isCurrentWeek(year, week);
    const th = document.createElement('th');
    th.className = 'week-col'
      + (isToday ? ' week-col-today' : '')
      + (isLastOfYear ? ' year-boundary' : '');
    th.textContent = week;
    th.dataset.year = year;
    th.dataset.week = week;
    rowWeek.appendChild(th);
  });
  thead.appendChild(rowWeek);

  return thead;
}

// ===== LAUFZEIT-INFO IN SIDEBAR =====
function updateDurationInfo(project) {
  const el = document.getElementById('project-duration-info');
  if (!el) return;
  if (!project || project.contractors.length === 0) {
    el.classList.add('is-empty');
    el.innerHTML = '<span class="duration-hint">Laufzeit wird automatisch aus den Gewerken berechnet.</span>';
    return;
  }
  el.classList.remove('is-empty');
  const range = getProjectRange(project);
  const start = new Date(range.start);
  const end   = new Date(range.end);
  const weeks = Math.max(1, Math.round((end - start) / (7 * 24 * 3600 * 1000)));
  // Zweizeilig: Zeitraum oben, Dauer darunter (gut bei engem Layout)
  el.innerHTML =
    `<span class="duration-range">${formatDateDE(range.start)} &ndash; ${formatDateDE(range.end)}</span>` +
    `<span class="duration-weeks">ca. ${weeks} Woche${weeks === 1 ? '' : 'n'}</span>`;
}

// Modul-Variable: ID des aktuell inline bearbeiteten Gewerks
let ganttEditId = null;

// ===== GANTT-ZEILE =====
function buildGanttRow(contractor, cols) {
  const tr = document.createElement('tr');
  tr.className = 'gantt-row';
  tr.dataset.id = contractor.id;

  const single = isSingleDay(contractor);
  const editing = ganttEditId === contractor.id;
  if (editing) tr.classList.add('gantt-row-editing');

  // Datumsbezeichnung für Tooltip
  const dateLabel = single
    ? formatDateDE(contractor.startDate)
    : `${formatDateDE(contractor.startDate)} – ${formatDateDE(contractor.endDate)}`;
  const rowTitle = `${contractor.trade}${contractor.firm ? ' · ' + contractor.firm : ''}\n${dateLabel}`;

  // ── Gewerk-Label (sticky Spalte) ──
  const tdLabel = document.createElement('td');
  tdLabel.className = 'gantt-cell-label';

  if (editing) {
    // Eingabefeld für den Gewerk-Namen
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'gantt-edit-trade';
    inp.value = contractor.trade;
    inp.maxLength = 150;
    inp.addEventListener('input', () => { ganttEditTrade(contractor.id, inp.value); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishGanttEdit();
      if (e.key === 'Escape') finishGanttEdit();
    });
    tdLabel.appendChild(inp);
  } else {
    tdLabel.title = rowTitle;
    if (contractor.firm && contractor.firm.trim()) {
      tdLabel.innerHTML = `<span>${escHtmlGantt(contractor.trade)}<span class="gantt-firm-hint">${escHtmlGantt(contractor.firm)}</span></span>`;
    } else {
      tdLabel.textContent = contractor.trade;
    }
    // Stift-Icon zum Bearbeiten
    const editBtn = document.createElement('button');
    editBtn.className = 'gantt-edit-btn';
    editBtn.title = 'Bearbeiten';
    editBtn.innerHTML = '&#9998;';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); editGanttRow(contractor.id); });
    tdLabel.appendChild(editBtn);
  }
  tr.appendChild(tdLabel);

  // ── Datum-Zelle ──
  const tdDate = document.createElement('td');
  tdDate.className = 'gantt-cell-date';

  if (editing) {
    // Zwei Datumsfelder + Aktionen
    const wrap = document.createElement('div');
    wrap.className = 'gantt-edit-dates';

    const inStart = document.createElement('input');
    inStart.type = 'date';
    inStart.value = contractor.startDate;
    inStart.addEventListener('change', () => ganttEditDate(contractor.id, 'start', inStart.value));

    const inEnd = document.createElement('input');
    inEnd.type = 'date';
    inEnd.value = contractor.endDate;
    inEnd.addEventListener('change', () => ganttEditDate(contractor.id, 'end', inEnd.value));

    const actions = document.createElement('div');
    actions.className = 'gantt-edit-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'gantt-edit-save';
    saveBtn.innerHTML = '&#10003; Fertig';
    saveBtn.addEventListener('click', finishGanttEdit);
    actions.appendChild(saveBtn);

    wrap.appendChild(inStart);
    wrap.appendChild(inEnd);
    wrap.appendChild(actions);
    tdDate.appendChild(wrap);
  } else if (single) {
    tdDate.textContent = formatDateDE(contractor.startDate);
    tdDate.style.color = 'var(--accent)';
    tdDate.style.fontWeight = '500';
    tdDate.title = dateLabel;
  } else {
    tdDate.innerHTML = formatDateRangeCompact(contractor.startDate, contractor.endDate);
    tdDate.title = dateLabel;
  }
  tr.appendChild(tdDate);

  // KW-Zellen
  cols.forEach(({ year, week, isLastOfYear }) => {
    const td = document.createElement('td');
    const inRange = isWeekInContractorRange(year, week, contractor);
    const isToday = isCurrentWeek(year, week);

    let classes = 'gantt-cell-week';
    if (isToday)      classes += ' gantt-cell-today';
    if (isLastOfYear) classes += ' gantt-cell-year-boundary';

    if (inRange) {
      classes += ' gantt-cell-bar';
      if (single) classes += ' gantt-cell-single-day';
      td.style.backgroundColor = contractor.color;
      td.title = rowTitle;
      // Datum steht jetzt in der eigenen Datum-Spalte — kein Text im Balken
    }
    td.className = classes;
    tr.appendChild(td);
  });

  return tr;
}

// ===== HEUTE MARKIEREN =====
function markCurrentWeek(cols) {
  const today = getISOWeekData(new Date());
  const inRange = cols.some(c => c.year === today.year && c.week === today.week);
  // Heute-Button hervorheben wenn aktuelle KW im Zeitraum liegt
  const btn = document.getElementById('btn-scroll-today');
  if (btn) btn.style.color = inRange ? 'var(--accent)' : '';
}

// ===== ZU HEUTE SCROLLEN =====
function scrollToToday() {
  const todayTh = document.querySelector('.week-col-today');
  const wrapper = document.getElementById('gantt-wrapper');
  if (!todayTh || !wrapper) {
    // Aktuelle KW nicht im Projektbereich
    return;
  }
  // Horizontale Mitte des Viewports
  const wrapperRect = wrapper.getBoundingClientRect();
  const thRect = todayTh.getBoundingClientRect();
  const scrollOffset = thRect.left - wrapperRect.left + wrapper.scrollLeft - (wrapperRect.width / 2);
  wrapper.scrollTo({ left: Math.max(0, scrollOffset), behavior: 'smooth' });
}

// Hilfsfunktion: Farbe mit Alpha-Kanal für Rahmen
function adjustColorAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// HTML-Escaping für Gantt (eigene Funktion da escHtml in app.js lebt)
function escHtmlGantt(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== INLINE-EDITING IM GANTT =====

// Startet den Bearbeitungsmodus für ein Gewerk
function editGanttRow(id) {
  ganttEditId = id;
  renderGantt(AppData.currentProject);
  // Fokus auf das Namensfeld der bearbeiteten Zeile
  const row = document.querySelector(`.gantt-row[data-id="${id}"]`);
  const inp = row && row.querySelector('.gantt-edit-trade');
  if (inp) { inp.focus(); inp.select(); }
}

// Beendet den Bearbeitungsmodus und aktualisiert alles
function finishGanttEdit() {
  ganttEditId = null;
  renderGantt(AppData.currentProject);
  if (typeof renderContractorList === 'function') renderContractorList();
  if (typeof markDirty === 'function') markDirty();
}

// Gewerk-Name live aktualisieren (ohne Re-Render, damit Fokus erhalten bleibt)
function ganttEditTrade(id, value) {
  const c = AppData.currentProject.contractors.find(x => x.id === id);
  if (c) { c.trade = value; if (typeof markDirty === 'function') markDirty(); }
}

// Datum live aktualisieren → Gantt-Balken aktualisieren sich sofort
function ganttEditDate(id, which, value) {
  const c = AppData.currentProject.contractors.find(x => x.id === id);
  if (!c || !value) return;
  if (which === 'start') {
    c.startDate = value;
    if (c.endDate < value) c.endDate = value; // Ende nie vor Start
  } else {
    c.endDate = value;
    if (c.startDate > value) c.startDate = value; // Start nie nach Ende
  }
  if (typeof markDirty === 'function') markDirty();
  renderGantt(AppData.currentProject); // bleibt im Edit-Modus (ganttEditId gesetzt)
}

// Kompaktes Datumsformat für die Datum-Spalte
// Gleiche Jahres: "02.03. – 20.03.2026"
// Unterschiedliche Jahre: "15.12.2026 – 10.01.2027"
function formatDateRangeCompact(startISO, endISO) {
  const s = new Date(startISO + 'T00:00:00');
  const e = new Date(endISO   + 'T00:00:00');
  const pad = n => String(n).padStart(2, '0');
  const dayMonth = d => `${pad(d.getDate())}.${pad(d.getMonth()+1)}.`;
  const full     = d => `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;

  if (s.getFullYear() === e.getFullYear()) {
    // Gleiches Jahr: Start ohne Jahr, Ende mit Jahr
    return `${dayMonth(s)}&thinsp;–&thinsp;${full(e)}`;
  }
  return `${full(s)}&thinsp;–&thinsp;${full(e)}`;
}
