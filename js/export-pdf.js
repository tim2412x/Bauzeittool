/* ===== EXPORT-PDF.JS — jsPDF + AutoTable ===== */

// CI-Farben als RGB für jsPDF
const PDF_CI = {
  navy:      [13,  28,  42],
  navyMid:   [22,  37,  52],
  navyLight: [30,  51,  71],
  accent:    [184, 118, 58],
  cream:     [244, 239, 230],
  warmWhite: [249, 246, 241],
  stonLight: [196, 187, 176],
  stone:     [133, 125, 112],
  text:      [24,  20,  15],
  textMid:   [70,  64,  58],
  white:     [255, 255, 255],
};

// Deutsche Monatskürzel für PDF
const PDF_MONTH = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// Datumstext für PDF (Plain, ohne HTML) — Einzeltermin oder Zeitraum
function pdfDateText(startISO, endISO) {
  const pad = n => String(n).padStart(2, '0');
  const s = new Date(startISO + 'T00:00:00');
  const e = new Date(endISO + 'T00:00:00');
  const full = d => `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
  const dm   = d => `${pad(d.getDate())}.${pad(d.getMonth()+1)}.`;
  if (startISO === endISO) return full(s);
  if (s.getFullYear() === e.getFullYear()) return `${dm(s)}-\n${full(e)}`;
  return `${full(s)}-\n${full(e)}`;
}

async function exportToPDF(projectData) {
  const jspdfLib = window.jspdf;
  if (!jspdfLib || !jspdfLib.jsPDF) {
    showToast('PDF-Bibliothek nicht geladen. Bitte Seite neu laden.', 'error', 5000);
    return;
  }

  const validation = validateProject(projectData);
  if (!validation.valid) {
    showToast('Bitte zuerst Pflichtfelder ausfüllen: ' + validation.errors.join(', '), 'error');
    return;
  }

  showToast('PDF wird erstellt …', 'info', 2000);

  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ===== HEADER-BLOCK =====
  const headerH = 24;
  doc.setFillColor(...PDF_CI.navy);
  doc.rect(0, 0, pageW, headerH, 'F');
  // Charakteristischer Bronze-Akzentbalken am oberen Rand (wie Website)
  doc.setFillColor(...PDF_CI.accent);
  doc.rect(0, 0, pageW, 1.2, 'F');

  // Logo einfügen — bevorzugt eingebettetes Base64 (funktioniert offline/file://),
  // sonst Fallback auf Datei. Seitenverhältnis EXAKT erhalten → keine Verzerrung.
  try {
    let logoUri = null, logoW = 0, logoH = 0;
    if (window.LOGO_DATA_URI) {
      logoUri = window.LOGO_DATA_URI;
      logoW = window.LOGO_W || 500;
      logoH = window.LOGO_H || 196;
    } else {
      const logo = await loadImageAsDataUrl('assets/logo-dark.png');
      if (logo && logo.dataUrl) { logoUri = logo.dataUrl; logoW = logo.width; logoH = logo.height; }
    }
    if (logoUri && logoW && logoH) {
      const maxH = 14, maxW = 48;
      const ratio = logoW / logoH;
      let h = maxH, w = h * ratio;
      if (w > maxW) { w = maxW; h = w / ratio; }
      const logoY = (headerH - h) / 2 + 0.6;
      doc.addImage(logoUri, 'PNG', margin, logoY, w, h, undefined, 'FAST');
    }
  } catch (e) { /* Logo nicht kritisch */ }

  // ÜBERSCHRIFT = Projektname (kein "BAUZEITENPLAN" mehr)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PDF_CI.white);
  doc.text(projectData.meta.projectTitle, pageW / 2, 11, { align: 'center' });

  // Bronze-Trennlinie unter dem Projektnamen
  doc.setDrawColor(...PDF_CI.accent);
  doc.setLineWidth(0.6);
  doc.line(pageW / 2 - 38, 14, pageW / 2 + 38, 14);

  // Projektmeta in gedämpftem Stein-Ton
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(180, 172, 160);
  doc.text(`Projektleiter: Jürgen Gehrke      Kunde: ${projectData.meta.customer}`, pageW / 2, 19.5, { align: 'center' });

  // Datum rechts oben
  doc.setFontSize(9.5);
  doc.setTextColor(180, 172, 160);
  doc.text(`Erstellt am ${formatDateDE(new Date().toISOString())}`, pageW - margin, 9.5, { align: 'right' });

  // ===== GANTT-TABELLE =====
  const range = getGanttRange(projectData);
  const cols = buildWeekColumns(range.start, range.end);

  // Kopfzeile aufbauen
  const sorted = [...projectData.contractors].sort((a, b) => a.sortOrder - b.sortOrder);

  // Jahres-Gruppen
  const yearGroups = {};
  cols.forEach(({ year }) => { yearGroups[year] = (yearGroups[year] || 0) + 1; });

  // Monats-Gruppen (Montag der KW bestimmt den Monat)
  const monthGroups = [];
  cols.forEach(({ year, week }) => {
    const monday = getMondayOfISOWeek(year, week);
    const key = `${monday.getFullYear()}-${monday.getMonth()}`;
    const last = monthGroups[monthGroups.length - 1];
    if (!last || last.key !== key) {
      monthGroups.push({ key, month: monday.getMonth(), count: 1 });
    } else {
      last.count++;
    }
  });

  // Head rows für autoTable (3 Ebenen: Jahr → Monat → KW)
  const head = [
    // Zeile 1: Gewerk + Datum + Jahre
    [
      { content: 'Gewerk', rowSpan: 3, styles: { fillColor: PDF_CI.navy, textColor: PDF_CI.white, fontStyle: 'bold', valign: 'middle', halign: 'center', fontSize: 10 } },
      { content: 'Datum',  rowSpan: 3, styles: { fillColor: PDF_CI.navy, textColor: PDF_CI.white, fontStyle: 'bold', valign: 'middle', halign: 'center', fontSize: 10 } },
      ...Object.entries(yearGroups).map(([year, count]) => ({
        content: String(year),
        colSpan: count,
        styles: { fillColor: PDF_CI.navyMid, textColor: PDF_CI.white, halign: 'center', fontStyle: 'bold', fontSize: 10 }
      }))
    ],
    // Zeile 2: Monate
    [
      ...monthGroups.map(mg => ({
        content: PDF_MONTH[mg.month],
        colSpan: mg.count,
        styles: { fillColor: PDF_CI.navyLight, textColor: PDF_CI.white, halign: 'center', fontSize: 10 }
      }))
    ],
    // Zeile 3: KW-Nummern mit "KW"-Präfix — weiß & zentriert wie die Monate
    [
      ...cols.map(({ week }) => ({
        content: 'KW ' + week,
        styles: {
          fillColor: PDF_CI.navy,
          textColor: PDF_CI.white,
          halign: 'center',
          valign: 'middle',
          fontSize: 10,
          cellPadding: { top: 1, right: 1, bottom: 1, left: 1 }
        }
      }))
    ]
  ];

  // Datenzeilen
  const hexToRgb = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  const body = sorted.map((contractor, rowIdx) => {
    const rowBg = rowIdx % 2 === 0 ? PDF_CI.warmWhite : PDF_CI.cream;
    const barColor = hexToRgb(contractor.color);
    const single = contractor.startDate === contractor.endDate;
    const dateText = pdfDateText(contractor.startDate, contractor.endDate);

    return [
      {
        // Inhalt nur zur Höhenberechnung; Text wird in didDrawCell zweifarbig gezeichnet
        content: contractor.trade + (contractor.firm ? '\n' + contractor.firm : ''),
        styles: {
          fillColor: rowBg,
          textColor: rowBg,        // unsichtbar (= Hintergrund) — manuelles Zeichnen übernimmt
          fontStyle: 'normal',
          fontSize: 9.5,
          valign: 'middle',
          cellPadding: { top: 2, left: 3.5, bottom: 2, right: 2 }
        }
      },
      {
        content: dateText,
        styles: {
          fillColor: rowBg,
          textColor: single ? PDF_CI.accent : PDF_CI.textMid,
          fontStyle: single ? 'bold' : 'normal',
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          cellPadding: { top: 1, left: 1, bottom: 1, right: 1 }
        }
      },
      ...cols.map(({ year, week }) => {
        const inRange = isWeekInContractorRange(year, week, contractor);
        return {
          content: '',
          styles: { fillColor: inRange ? barColor : rowBg, cellPadding: 0 }
        };
      })
    ];
  });

  // Spaltenbreiten: A3-Seite exakt ausnutzen
  const labelWidth = 66;
  const dateWidth  = 44;
  const usableW    = pageW - margin * 2;
  const kwColWidth = (usableW - labelWidth - dateWidth) / cols.length;

  doc.autoTable({
    head,
    body,
    startY: headerH + 2,
    margin: { left: margin, right: margin },
    tableWidth: usableW,
    styles: {
      fontSize: 8,
      cellPadding: { top: 1, right: 0, bottom: 1, left: 1 },
      lineColor: PDF_CI.stonLight,
      lineWidth: 0.1,
      overflow: 'linebreak',  // ← Gewerk-Namen umbrechen statt abschneiden
      minCellHeight: 6,
      minCellWidth: 0
    },
    headStyles:   { minCellHeight: 6, fontSize: 7, overflow: 'hidden' },
    bodyStyles:   { minCellHeight: 11 },
    columnStyles: (() => {
      const cs = {
        0: { cellWidth: labelWidth, overflow: 'linebreak' },
        1: { cellWidth: dateWidth,  overflow: 'linebreak' }
      };
      cols.forEach((_, i) => { cs[i + 2] = { cellWidth: kwColWidth, halign: 'center', overflow: 'hidden' }; });
      return cs;
    })(),
    tableLineColor: PDF_CI.stonLight,
    tableLineWidth: 0.1,
    // Gewerk-Zelle zweifarbig zeichnen: Tätigkeit dunkel, Firma im Stein-Ton (wie Website)
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0) return;
      const c = sorted[data.row.index];
      if (!c) return;
      const padL = 3.5;
      const x = data.cell.x + padL;
      const wText = data.cell.width - padL - 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const tradeLines = doc.splitTextToSize(c.trade, wText);
      let firmLines = [];
      if (c.firm) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        firmLines = doc.splitTextToSize(c.firm, wText);
      }
      const lineH = 3.9; // Tätigkeit und Firma gleiche Zeilenhöhe (gleiche Größe)
      const totalH = (tradeLines.length + firmLines.length) * lineH;
      let y = data.cell.y + (data.cell.height - totalH) / 2 + 2.9;

      // Tätigkeit (dunkel, fett)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...PDF_CI.text);
      tradeLines.forEach(line => { doc.text(line, x, y); y += lineH; });

      // Firma (gleiche Größe, gedämpfter Stein-Ton zur Unterscheidung)
      if (firmLines.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...PDF_CI.stone);
        firmLines.forEach(line => { doc.text(line, x, y); y += lineH; });
      }
    }
  });

  // ===== FUSSZEILE =====
  const finalY = pageH - 8;
  doc.setDrawColor(...PDF_CI.stonLight);
  doc.setLineWidth(0.3);
  doc.line(margin, finalY - 2, pageW - margin, finalY - 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_CI.stone);
  doc.text('Gehrke Bauberatung und -betreuung UG', margin, finalY + 1);

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(`Seite ${i} / ${totalPages}`, pageW - margin, finalY + 1, { align: 'right' });
  }

  // ===== SPEICHERN =====
  const safeName = (projectData.meta.projectTitle || 'Bauzeitenplan').replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_]/g, '');
  doc.save(`Bauzeitenplan_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast('PDF gespeichert.', 'success');
}

// Hilfsfunktion: Bild als Base64 laden — gibt dataUrl + Originalmaße zurück
function loadImageAsDataUrl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      try {
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src + '?v=' + Date.now();
  });
}
