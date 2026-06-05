/* ===== APP.JS — Hauptlogik & Event-Handling ===== */

let autosaveTimer = null;
let currentEditId = null; // null = neu, string = bearbeiten

// ===== INITIALISIERUNG =====
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  initNewProject();
  updateFormFromProject(AppData.currentProject);
  renderContractorList();
  renderGantt(AppData.currentProject);
  bindAllEvents();
  checkForAutosave();

  autosaveTimer = setInterval(() => {
    if (AppData.isDirty) autosave();
  }, 30000);

  window.addEventListener('beforeunload', (e) => {
    if (AppData.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}


// ===== EVENT-BINDING =====
function bindAllEvents() {
  // Header
  document.getElementById('btn-new').addEventListener('click', handleNewProject);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import-input').click());
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-export-pdf').addEventListener('click', handleExportPDF);
  document.getElementById('btn-export-excel').addEventListener('click', handleExportExcel);

  // Dropdown schließen bei Klick außerhalb
  document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.dropdown-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById('export-dropdown').classList.remove('open');
    }
  });
  document.getElementById('btn-export').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('export-dropdown').classList.toggle('open');
  });

  // Import
  document.getElementById('file-import-input').addEventListener('change', handleFileImport);

  // Projektinfo-Felder
  document.getElementById('input-project-title').addEventListener('input', handleProjectMetaChange);
  document.getElementById('input-customer').addEventListener('input', handleProjectMetaChange);
  // Projektleiter ist immer Jürgen Gehrke (hidden field, kein Listener nötig)

  // Heute-Button im Gantt
  document.getElementById('btn-scroll-today').addEventListener('click', scrollToToday);

  // Handwerker hinzufügen
  document.getElementById('btn-add-contractor').addEventListener('click', () => openContractorModal(null));

  // Modal
  document.getElementById('btn-modal-close').addEventListener('click', closeContractorModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeContractorModal);
  document.getElementById('btn-modal-save').addEventListener('click', handleContractorSave);
  document.getElementById('modal-color').addEventListener('input', updateModalColorPreview);
  document.getElementById('modal-trade').addEventListener('input', updateModalColorPreview);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeContractorModal();
  });

  // Farb-Presets
  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      document.getElementById('modal-color').value = color;
      updateModalColorPreview();
      document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Bestätigungs-Dialog
  document.getElementById('btn-confirm-cancel').addEventListener('click', () => resolveConfirm(false));
  document.getElementById('btn-confirm-ok').addEventListener('click', () => resolveConfirm(true));
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-overlay')) resolveConfirm(false);
  });

  // Keyboard-Shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC: Modal / Dialog schließen
    if (e.key === 'Escape') {
      closeContractorModal();
      resolveConfirm(false);
    }
    // Ctrl+S / Cmd+S: Speichern
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+N / Cmd+N: Neues Projekt
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      handleNewProject();
    }
  });

  // Drag & Drop initialisieren
  initContractorDragSort();
}

// ===== PROJEKTMETA-ÄNDERUNGEN =====
function handleProjectMetaChange(e) {
  const field = e.target.id;
  const map = {
    'input-project-title': 'projectTitle',
    'input-customer':      'customer'
  };
  if (map[field]) {
    AppData.currentProject.meta[map[field]] = e.target.value;
    if (e.target.value.trim()) e.target.classList.remove('field-invalid');
    markDirty();
  }
}

// ===== FORMULAR AUS PROJEKT BEFÜLLEN =====
function updateFormFromProject(project) {
  document.getElementById('input-project-title').value = project.meta.projectTitle || '';
  document.getElementById('input-customer').value      = project.meta.customer || '';
  // projectManager immer Jürgen Gehrke
  project.meta.projectManager = 'Jürgen Gehrke';
}

// ===== NEUES PROJEKT =====
async function handleNewProject() {
  if (AppData.isDirty) {
    const ok = await showConfirm('Neues Projekt', 'Alle nicht gespeicherten Änderungen gehen verloren. Trotzdem fortfahren?');
    if (!ok) return;
  }
  clearAutosave();
  initNewProject();
  updateFormFromProject(AppData.currentProject);
  renderContractorList();
  renderGantt(AppData.currentProject);
  showToast('Neues Projekt erstellt.', 'info');
}

// Neues Projekt nach Import ebenfalls Jahr-Selects entfernt


// ===== SPEICHERN =====
function handleSave() {
  const validation = validateProject(AppData.currentProject);
  if (!validation.valid) {
    // Felder visuell hervorheben
    highlightEmptyRequiredFields();
    showToast('Bitte ausfüllen: ' + validation.errors.join(', '), 'error');
    // Sidebar nach oben scrollen damit User die Fehler sieht
    document.getElementById('sidebar').scrollTop = 0;
    return;
  }
  clearProjectFieldHighlights();
  downloadProjectFile(AppData.currentProject);
  AppData.isDirty = false;
  clearAutosave();
  showToast('Bauzeitenplan gespeichert.', 'success');
}

function highlightEmptyRequiredFields() {
  const fields = [
    { id: 'input-project-title', value: AppData.currentProject.meta.projectTitle },
    { id: 'input-customer',      value: AppData.currentProject.meta.customer },
  ];
  fields.forEach(({ id, value }) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('field-invalid', !value || !value.trim());
  });
}

function clearProjectFieldHighlights() {
  ['input-project-title','input-customer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('field-invalid');
  });
}

// ===== IMPORT =====
async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const result = await importProjectFile(file);
  if (!result.success) {
    showToast('Fehler: ' + result.error, 'error');
    event.target.value = '';
    return;
  }
  AppData.currentProject = result.data;
  AppData.isDirty = false;
  updateFormFromProject(AppData.currentProject);
  renderContractorList();
  renderGantt(AppData.currentProject);
  setTimeout(scrollToToday, 100);
  showToast('Bauzeitenplan importiert.', 'success');
  event.target.value = '';
}

// ===== EXPORT-STUBS (werden in Schritt 2 fertig) =====
function handleExportPDF() {
  if (typeof exportToPDF === 'function') {
    exportToPDF(AppData.currentProject);
  } else {
    showToast('PDF-Export wird in der nächsten Version verfügbar sein.', 'info');
  }
  document.getElementById('export-dropdown').classList.remove('open');
}

function handleExportExcel() {
  if (typeof exportToExcel === 'function') {
    exportToExcel(AppData.currentProject);
  } else {
    showToast('Excel-Export wird in der nächsten Version verfügbar sein.', 'info');
  }
  document.getElementById('export-dropdown').classList.remove('open');
}

// ===== HANDWERKER-LISTE RENDERN =====
function renderContractorList() {
  const list = document.getElementById('contractor-list');
  const contractors = AppData.currentProject.contractors;

  // Nur Contractor-Cards entfernen — Hint-Element BLEIBT im DOM
  list.querySelectorAll('.contractor-card').forEach(el => el.remove());

  // Hint-Element finden oder neu erstellen falls es verloren ging
  let hint = document.getElementById('contractor-empty-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.id = 'contractor-empty-hint';
    hint.innerHTML = 'Noch keine Gewerke eingetragen.<br>Klicke auf &laquo;+ Hinzufügen&raquo;.';
    list.appendChild(hint);
  }

  if (contractors.length === 0) {
    hint.style.display = '';
    return;
  }

  hint.style.display = 'none';

  const sorted = [...contractors].sort((a, b) => a.sortOrder - b.sortOrder);
  sorted.forEach(c => list.appendChild(buildContractorCard(c)));

  initContractorDragSort();
}

function buildContractorCard(contractor) {
  const div = document.createElement('div');
  div.className = 'contractor-card';
  div.dataset.id = contractor.id;
  div.draggable = true;

  const badge = document.createElement('div');
  badge.className = 'contractor-color-badge';
  badge.style.backgroundColor = contractor.color;

  const info = document.createElement('div');
  info.className = 'contractor-info';
  const firmLine = contractor.firm && contractor.firm.trim()
    ? `<span class="contractor-firm">${escHtml(contractor.firm)}</span>`
    : '';
  // Einzeltermin: kein „ – " anzeigen
  const dateStr = contractor.startDate === contractor.endDate
    ? `<strong>${formatDateDE(contractor.startDate)}</strong> <span class="single-day-badge">Einzeltermin</span>`
    : `${formatDateDE(contractor.startDate)} – ${formatDateDE(contractor.endDate)}`;
  info.innerHTML = `
    <span class="contractor-trade">${escHtml(contractor.trade)}</span>
    ${firmLine}
    <span class="contractor-dates">${dateStr}</span>
  `;

  const actions = document.createElement('div');
  actions.className = 'contractor-actions';

  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn-icon btn-edit';
  btnEdit.title = 'Bearbeiten';
  btnEdit.innerHTML = '&#9998;';
  btnEdit.addEventListener('click', () => openContractorModal(contractor.id));

  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-icon btn-delete';
  btnDelete.title = 'Löschen';
  btnDelete.innerHTML = '&#10005;';
  btnDelete.addEventListener('click', () => handleDeleteContractor(contractor.id));

  actions.appendChild(btnEdit);
  actions.appendChild(btnDelete);
  div.appendChild(badge);
  div.appendChild(info);
  div.appendChild(actions);
  return div;
}

// ===== MODAL: HANDWERKER HINZUFÜGEN / BEARBEITEN =====
function openContractorModal(contractorId) {
  currentEditId = contractorId;
  const modal = document.getElementById('modal-contractor');
  const title = document.getElementById('modal-title');
  const project = AppData.currentProject;

  clearModalErrors();

  if (contractorId) {
    const c = project.contractors.find(x => x.id === contractorId);
    if (!c) return;
    title.textContent = 'Gewerk bearbeiten';
    document.getElementById('modal-firm').value       = c.firm;
    document.getElementById('modal-trade').value      = c.trade;
    document.getElementById('modal-start-date').value = c.startDate;
    document.getElementById('modal-end-date').value   = c.endDate;
    document.getElementById('modal-color').value      = c.color;
  } else {
    title.textContent = 'Gewerk hinzufügen';
    document.getElementById('modal-firm').value       = '';
    document.getElementById('modal-trade').value      = '';
    // Defaultdatum: aus bestehendem Bereich oder aktuelles Datum
    const range = getProjectRange(project);
    const today = new Date();
    const todayStr = toISODate(today);
    document.getElementById('modal-start-date').value = range ? range.start : todayStr;
    document.getElementById('modal-end-date').value   = range ? range.end   : todayStr;
    document.getElementById('modal-color').value      = getNextColor();
  }

  updateModalColorPreview();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-firm').focus();
}

function closeContractorModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  currentEditId = null;
}

function handleContractorSave() {
  const data = {
    firm:      document.getElementById('modal-firm').value.trim(),
    trade:     document.getElementById('modal-trade').value.trim(),
    startDate: document.getElementById('modal-start-date').value,
    endDate:   document.getElementById('modal-end-date').value,
    color:     document.getElementById('modal-color').value
  };

  const errors = validateContractor(data);
  clearModalErrors();

  if (Object.keys(errors).length > 0) {
    if (errors.trade) showFieldError('err-trade', errors.trade);
    if (errors.start) showFieldError('err-start', errors.start);
    if (errors.end)   showFieldError('err-end', errors.end);
    return;
  }

  const contractors = AppData.currentProject.contractors;

  if (currentEditId) {
    const idx = contractors.findIndex(x => x.id === currentEditId);
    if (idx !== -1) Object.assign(contractors[idx], data);
  } else {
    contractors.push({
      id: generateId(),
      ...data,
      sortOrder: contractors.length
    });
  }

  const wasEditing = !!currentEditId;
  closeContractorModal();
  // Robust: renderGantt MUSS laufen, auch falls renderContractorList scheitert
  try { renderContractorList(); } catch (e) { console.error('renderContractorList:', e); }
  try { renderGantt(AppData.currentProject); } catch (e) { console.error('renderGantt:', e); }
  markDirty();
  showToast(wasEditing ? 'Gewerk aktualisiert.' : 'Gewerk hinzugefügt.', 'success');
}

async function handleDeleteContractor(id) {
  const c = AppData.currentProject.contractors.find(x => x.id === id);
  if (!c) return;
  const label = c.firm ? `${c.trade} (${c.firm})` : c.trade;
  const ok = await showConfirm('Gewerk löschen', `"${label}" wirklich aus dem Plan entfernen?`);
  if (!ok) return;
  AppData.currentProject.contractors = AppData.currentProject.contractors.filter(x => x.id !== id);
  // sortOrder neu vergeben
  AppData.currentProject.contractors.forEach((c, i) => c.sortOrder = i);
  renderContractorList();
  renderGantt(AppData.currentProject);
  markDirty();
  showToast('Handwerker entfernt.', 'info');
}

// ===== MODAL COLOR PREVIEW =====
function updateModalColorPreview() {
  const color = document.getElementById('modal-color').value;
  const bar   = document.getElementById('modal-preview-bar');
  const label = document.getElementById('modal-preview-label');
  // Gewerk-Name anzeigen (primär), Fallback wenn noch leer
  const trade = document.getElementById('modal-trade').value.trim() || 'Gewerk-Bezeichnung';
  bar.style.backgroundColor = color;
  label.style.color = getContrastColor(color);
  label.textContent = trade;
}

// Nächste Vorschlagsfarbe aus den Presets (rotierend)
function getNextColor() {
  const presets = ['#E74C3C','#E67E22','#F1C40F','#2ECC71','#1ABC9C','#3498DB','#9B59B6','#34495E','#E91E63','#009688','#FF5722','#607D8B'];
  const usedColors = AppData.currentProject.contractors.map(c => c.color);
  return presets.find(p => !usedColors.includes(p)) || presets[AppData.currentProject.contractors.length % presets.length];
}

// ===== FEHLER-ANZEIGE MODAL =====
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearModalErrors() {
  ['err-trade','err-start','err-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

// ===== DRAG & DROP SORTIERUNG =====
function initContractorDragSort() {
  const list = document.getElementById('contractor-list');
  let dragSrc = null;

  list.querySelectorAll('.contractor-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      dragSrc = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      list.querySelectorAll('.contractor-card').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.querySelectorAll('.contractor-card').forEach(c => c.classList.remove('drag-over'));
      if (card !== dragSrc) card.classList.add('drag-over');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragSrc || dragSrc === card) return;
      card.classList.remove('drag-over');

      // Neue Reihenfolge aus DOM ableiten
      const cards = [...list.querySelectorAll('.contractor-card')];
      const fromIdx = cards.indexOf(dragSrc);
      const toIdx   = cards.indexOf(card);
      const contractors = AppData.currentProject.contractors;

      // sortOrder neu setzen
      const sorted = [...contractors].sort((a, b) => a.sortOrder - b.sortOrder);
      const moved = sorted.splice(fromIdx, 1)[0];
      sorted.splice(toIdx, 0, moved);
      sorted.forEach((c, i) => c.sortOrder = i);

      renderContractorList();
      renderGantt(AppData.currentProject);
      markDirty();
    });
  });
}

// ===== AUTOSAVE-CHECK BEIM START =====
function checkForAutosave() {
  const saved = loadAutosave();
  if (!saved) return;
  let result;
  try {
    result = deserializeProject(saved);
  } catch (e) { clearAutosave(); return; }
  if (!result || !result.success) { clearAutosave(); return; }

  // Nur anbieten, wenn der Entwurf tatsächlich Inhalt hat
  const hasContent = result.data.meta.projectTitle ||
                     result.data.meta.customer ||
                     (result.data.contractors && result.data.contractors.length > 0);
  if (!hasContent) { clearAutosave(); return; }

  // Persistenter Toast (verschwindet NICHT automatisch) mit Wiederherstellen + Verwerfen
  showRestoreToast(
    'Nicht gespeicherter Entwurf gefunden.',
    () => {
      try {
        AppData.currentProject = result.data;
        AppData.isDirty = true;
        updateFormFromProject(AppData.currentProject);
        renderContractorList();
        renderGantt(AppData.currentProject);
        setTimeout(scrollToToday, 100);
        showToast('Entwurf wiederhergestellt.', 'success');
      } catch (e) {
        showToast('Fehler beim Wiederherstellen: ' + e.message, 'error', 5000);
      }
    },
    () => { clearAutosave(); }
  );
}

// ===== DIRTY FLAG =====
function markDirty() {
  AppData.isDirty = true;
}

// ===== TOAST-SYSTEM =====
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// Persistenter Wiederherstellen-Toast (verschwindet NICHT automatisch)
function showRestoreToast(message, onRestore, onDismiss) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast info toast-restore';

  const span = document.createElement('span');
  span.className = 'toast-restore-msg';
  span.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'toast-restore-actions';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'toast-btn toast-btn-primary';
  restoreBtn.textContent = 'Wiederherstellen';
  restoreBtn.addEventListener('click', () => { try { onRestore && onRestore(); } finally { toast.remove(); } });

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'toast-btn toast-btn-ghost';
  dismissBtn.textContent = 'Verwerfen';
  dismissBtn.addEventListener('click', () => { try { onDismiss && onDismiss(); } finally { toast.remove(); } });

  actions.appendChild(restoreBtn);
  actions.appendChild(dismissBtn);
  toast.appendChild(span);
  toast.appendChild(actions);
  container.appendChild(toast);
  // Bewusst KEIN Auto-Timeout — der Nutzer entscheidet.
}

// ===== BESTÄTIGUNGS-DIALOG =====
let confirmResolve = null;

function showConfirm(title, message) {
  document.getElementById('confirm-title').textContent   = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-overlay').classList.remove('hidden');
  return new Promise(resolve => { confirmResolve = resolve; });
}

function resolveConfirm(value) {
  document.getElementById('confirm-overlay').classList.add('hidden');
  if (confirmResolve) { confirmResolve(value); confirmResolve = null; }
}

// ===== HTML ESCAPING =====
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
