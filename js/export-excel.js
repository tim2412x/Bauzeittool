/* ===== EXPORT-EXCEL.JS — ExcelJS ===== */

async function exportToExcel(projectData) {
  if (typeof ExcelJS === 'undefined') {
    showToast('Excel-Bibliothek nicht geladen. Bitte Seite neu laden.', 'error', 5000);
    return;
  }

  const validation = validateProject(projectData);
  if (!validation.valid) {
    showToast('Bitte zuerst Pflichtfelder ausfüllen: ' + validation.errors.join(', '), 'error');
    return;
  }

  showToast('Excel wird erstellt …', 'info', 2000);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gehrke Bauberatung';
  wb.created = new Date();

  const ws = wb.addWorksheet('Bauzeitenplan', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }]
  });

  const range = getGanttRange(projectData);
  const cols = buildWeekColumns(range.start, range.end);
  const today = getISOWeekData(new Date());
  const sorted = [...projectData.contractors].sort((a, b) => a.sortOrder - b.sortOrder);

  // ===== SPALTENBREITEN =====
  ws.getColumn(1).width = 28; // Gewerk
  cols.forEach((_, i) => { ws.getColumn(i + 2).width = 3.5; });

  // ===== ZEILE 1: Dokumententitel =====
  ws.mergeCells(1, 1, 1, cols.length + 1);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'BAUZEITENPLAN';
  titleCell.font = { name: 'Arial', size: 16, bold: false, color: { argb: 'FF0D1C2A' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // ===== ZEILE 2: leer =====
  ws.getRow(2).height = 4;

  // ===== ZEILE 3: Projektinfos =====
  ws.getRow(3).height = 18;
  const infoRow = ws.getRow(3);
  infoRow.getCell(1).value = `${projectData.meta.projectTitle}   |   Projektleiter: ${projectData.meta.projectManager}   |   Kunde: ${projectData.meta.customer}   |   Erstellt: ${formatDateDE(new Date().toISOString())}`;
  infoRow.getCell(1).font = { name: 'Arial', size: 9, color: { argb: 'FF46403A' } };
  ws.mergeCells(3, 1, 3, cols.length + 1);

  // ===== ZEILE 4: leer =====
  ws.getRow(4).height = 4;

  // ===== ZEILE 5: Jahres-Kopfzeile =====
  const yearGroups = {};
  cols.forEach(({ year }) => { yearGroups[year] = (yearGroups[year] || 0) + 1; });

  ws.getRow(5).height = 16;
  const yearCell = ws.getCell(5, 1);
  yearCell.value = 'Gewerk';
  applyExcelHeaderStyle(yearCell, 'label');

  let colOffset = 2;
  Object.entries(yearGroups).forEach(([year, count]) => {
    const startCol = colOffset;
    const endCol = colOffset + count - 1;
    if (count > 1) ws.mergeCells(5, startCol, 5, endCol);
    const cell = ws.getCell(5, startCol);
    cell.value = Number(year);
    applyExcelHeaderStyle(cell, 'year');
    colOffset += count;
  });

  // ===== ZEILE 6: KW-Kopfzeile =====
  ws.getRow(6).height = 14;
  const kwLabelCell = ws.getCell(6, 1);
  kwLabelCell.value = 'KW';
  applyExcelHeaderStyle(kwLabelCell, 'label');

  cols.forEach(({ year, week }, i) => {
    const cell = ws.getCell(6, i + 2);
    cell.value = week;
    const isToday = today.year === year && today.week === week;
    applyExcelHeaderStyle(cell, isToday ? 'today' : 'week');
  });

  // ===== DATENZEILEN =====
  sorted.forEach((contractor, rowIdx) => {
    const xlRow = ws.getRow(7 + rowIdx);
    xlRow.height = 20;

    // Gewerk-Zelle
    const labelCell = xlRow.getCell(1);
    labelCell.value = contractor.trade + (contractor.firm ? ` (${contractor.firm})` : '');
    labelCell.font = { name: 'Arial', size: 9, color: { argb: 'FF18140F' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4EFE6' } };
    labelCell.border = {
      right: { style: 'thin', color: { argb: 'FFC4BBB0' } },
      bottom: { style: 'thin', color: { argb: 'FFC4BBB0' } }
    };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // KW-Zellen
    const rowBgArgb = rowIdx % 2 === 0 ? 'FFF9F6F1' : 'FFF4EFE6';
    const barArgb = 'FF' + contractor.color.slice(1).toUpperCase();

    cols.forEach(({ year, week }, i) => {
      const cell = xlRow.getCell(i + 2);
      const inRange = isWeekInContractorRange(year, week, contractor);
      const isToday = today.year === year && today.week === week;

      if (inRange) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: barArgb } };
      } else if (isToday) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEEDD' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgArgb } };
      }
      cell.border = {
        right: { style: 'hair', color: { argb: 'FFC4BBB0' } },
        bottom: { style: 'hair', color: { argb: 'FFC4BBB0' } }
      };
    });
  });

  // ===== VERSTECKTES BLATT: PROJEKTDATEN (JSON für Round-Trip-Import) =====
  const wsData = wb.addWorksheet('_Projektdaten', { state: 'veryHidden' });
  wsData.getCell('A1').value = 'BAUZEITENPLAN_DATA_V1';
  wsData.getCell('A2').value = serializeProject(projectData);

  // ===== DATEI SPEICHERN =====
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = (projectData.meta.projectTitle || 'Bauzeitenplan').replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_]/g, '');
  const filename = `Bauzeitenplan_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast('Excel gespeichert.', 'success');
  } catch (e) {
    showToast('Fehler beim Speichern der Excel-Datei.', 'error');
  }
}

// Hilfsfunktion: Excel-Kopfzeilen-Style anwenden
function applyExcelHeaderStyle(cell, type) {
  const styles = {
    label: {
      fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1C2A' } },
      font:  { name: 'Arial', size: 8, bold: false, color: { argb: 'FFFFFFFF' } },
      align: { horizontal: 'left', vertical: 'middle', indent: 1 }
    },
    year: {
      fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162534' } },
      font:  { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } },
      align: { horizontal: 'center', vertical: 'middle' }
    },
    week: {
      fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1C2A' } },
      font:  { name: 'Arial', size: 7, color: { argb: 'FFCCCCCC' } },
      align: { horizontal: 'center', vertical: 'middle' }
    },
    today: {
      fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8763A' } },
      font:  { name: 'Arial', size: 7, bold: true, color: { argb: 'FFFFFFFF' } },
      align: { horizontal: 'center', vertical: 'middle' }
    }
  };
  const s = styles[type] || styles.week;
  cell.fill      = s.fill;
  cell.font      = s.font;
  cell.alignment = s.align;
}
