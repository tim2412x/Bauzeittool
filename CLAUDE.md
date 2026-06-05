# CLAUDE.md — Bauzeitenplan Tool
## Vollständige Softwarearchitektur für Claude Code

---

## 1. Projektübersicht

**Projektname:** Bauzeitenplan-Generator  
**Ziel:** Eine browserbasierte Single-Page Application (SPA), die ohne Backend auskommt und über GitHub Pages gehostet wird. Der Projektleiter ohne technische Kenntnisse kann damit professionelle Bauzeitpläne (Gantt-Diagramme) erstellen, verwalten und exportieren.

**Deployment-Ziel:** GitHub Pages (`https://<username>.github.io/<repo-name>/`)  
**Technologie-Stack:** Reines HTML5 + CSS3 + Vanilla JavaScript (kein Framework, kein Build-System) — maximale Einfachheit für wartbaren Code.

---

## 2. Repository-Struktur

```
bauzeitenplan/
├── index.html              # Einzige HTML-Datei (SPA)
├── css/
│   ├── styles.css          # Hauptstylesheet (CI/Corporate Identity)
│   └── gantt.css           # Gantt-spezifische Styles
├── js/
│   ├── app.js              # Hauptlogik & Event-Handling
│   ├── gantt.js            # Gantt-Rendering (SVG/Canvas)
│   ├── export-pdf.js       # PDF-Export (jsPDF)
│   ├── export-excel.js     # Excel-Export (SheetJS/xlsx.js)
│   └── data.js             # Datenverwaltung (Import/Export JSON)
├── assets/
│   └── logo.svg            # Unternehmenslogo (Platzhalter; ggf. ersetzen)
├── lib/
│   ├── jspdf.umd.min.js    # jsPDF v2.x (lokal, kein CDN-Zwang)
│   ├── jspdf.plugin.autotable.min.js  # AutoTable Plugin für jsPDF
│   └── xlsx.full.min.js    # SheetJS für Excel-Export
└── README.md
```

> **Wichtig:** Alle Bibliotheken werden **lokal** im `lib/`-Ordner abgelegt, damit GitHub Pages auch ohne Internetverbindung funktioniert und CDN-Ausfälle keine Rolle spielen. Bibliotheken können von ihren jeweiligen offiziellen Quellen heruntergeladen werden:
> - jsPDF: https://github.com/parallax/jsPDF/releases
> - SheetJS: https://cdn.sheetjs.com/

---

## 3. Corporate Identity (CI) — Gehrke Bauberatung und -betreuung UG

Die CI-Werte wurden direkt aus der Unternehmenswebsite **gehrkebauberatung.de** extrahiert und sind vollständig definiert. Es sind **keine Platzhalter** mehr enthalten — alle Werte werden 1:1 aus dem bestehenden Webauftritt übernommen.

**Markencharakter:** Seriös, hochwertig, handwerklich. Dunkles Marineblau als Hauptfarbe, warmes Bronze-/Goldbraun als Akzentfarbe, cremefarbene Hintergründe. Klare, serifenlose Schrift für UI-Elemente; Libre Baskerville (Serif) für Überschriften und Dokument-Titel. Keine runden Ecken — das Design setzt auf geradlinige, professionelle Formen (border-radius: 0 oder minimal).

### 3.1 Farbpalette

| CSS-Variable (Website)  | Hex-Wert  | Verwendung auf Website               | Verwendung im Tool                        |
|-------------------------|-----------|--------------------------------------|-------------------------------------------|
| `--navy`                | `#0d1c2a` | Header, Footer, dunkle Sektionen     | App-Header, Gantt-Header, Buttons primär  |
| `--navy-mid`            | `#162534` | Dropdowns, Hover auf Navy-Elementen  | Hover-Zustand auf Navy-Buttons/Header     |
| `--navy-light`          | `#1e3347` | Karten auf dunklem Grund             | Aktive Zustände, dunklere Panels          |
| `--cream`               | `#f4efe6` | Helle Sektionen, Karten-Hintergrund  | Sidebar-Hintergrund, Panel-Hintergrund    |
| `--warm-white`          | `#f9f6f1` | Body-Hintergrund                     | App-Gesamt-Hintergrund                    |
| `--stone`               | `#857d70` | Sekundärtext, Icons                  | Sekundärtext, Platzhalter                 |
| `--stone-light`         | `#c4bbb0` | Trennlinien, Rahmen auf Creme-Grund  | Borders, Trennlinien in Sidebar           |
| `--accent`              | `#b8763a` | CTA-Buttons, Highlights, Icons       | Export-Button, Akzent-Elemente, KW-Heute  |
| `--accent-h`            | `#c4854a` | Hover auf Accent-Elementen           | Hover-Zustand Accent-Buttons              |
| `--text`                | `#18140f` | Haupttext (fast Schwarz)             | Alle primären Textelemente                |
| `--text-mid`            | `#46403a` | Sekundärtext, Fließtext              | Beschreibungen, Labels, sekundäre Infos   |

### 3.2 CSS Custom Properties für das Tool

```css
/* ==============================
   CI — GEHRKE BAUBERATUNG
   Direkt aus gehrkebauberatung.de extrahiert
   ============================== */
:root {

  /* ── KERNFARBEN (1:1 von Website) ── */
  --navy:        #0d1c2a;
  --navy-mid:    #162534;
  --navy-light:  #1e3347;
  --cream:       #f4efe6;
  --warm-white:  #f9f6f1;
  --stone:       #857d70;
  --stone-light: #c4bbb0;
  --accent:      #b8763a;
  --accent-h:    #c4854a;
  --text:        #18140f;
  --text-mid:    #46403a;

  /* ── TOOL-SPEZIFISCHE ALIASE (verwenden obige Kernfarben) ── */
  --ci-primary:         var(--navy);        /* App-Header, Gantt-Kopfzeile, Primär-Buttons */
  --ci-primary-mid:     var(--navy-mid);    /* Hover-Zustände auf Primär-Elementen */
  --ci-primary-light:   var(--navy-light);  /* Aktive Zustände, Sekundär-Panels */
  --ci-accent:          var(--accent);      /* CTAs (Export, Speichern), Markierungen */
  --ci-accent-hover:    var(--accent-h);    /* Hover auf Accent-Buttons */
  --ci-background:      var(--warm-white);  /* App-Gesamt-Hintergrund */
  --ci-surface:         var(--cream);       /* Sidebar, Panel-Hintergründe, Karten */
  --ci-border:          var(--stone-light); /* Alle Rahmenlinien */
  --ci-text-primary:    var(--text);        /* Haupttext */
  --ci-text-secondary:  var(--text-mid);    /* Sekundärtext, Labels */
  --ci-text-muted:      var(--stone);       /* Dezenter Text, Platzhalter */
  --ci-text-on-dark:    #ffffff;            /* Text auf Navy/Accent-Hintergrund */
  --ci-text-on-dark-muted: rgba(255,255,255,0.62); /* Gedämpfter Text auf dunklem Grund */
  --ci-danger:          #c0392b;            /* Fehlermeldungen (passt zum Erdton-Schema) */
  --ci-success:         #5a8a4a;            /* Erfolgsmeldungen (gedämpftes Grün) */

  /* ── TYPOGRAFIE (1:1 von Website) ── */
  --font-sans:    'Inter', system-ui, sans-serif;       /* UI-Elemente, Buttons, Formulare */
  --font-serif:   'Libre Baskerville', Georgia, serif;  /* Überschriften, Dokumententitel */

  /* WICHTIG für Claude Code: Die Webfonts Inter und Libre Baskerville werden
     über Google Fonts geladen. Im <head> von index.html einfügen:
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
     Alternativ als lokale Webfonts in /assets/fonts/ ablegen (bevorzugt für Offline-Betrieb). */

  --font-size-base:     14px;
  --font-size-small:    12px;
  --font-size-large:    18px;
  --font-size-heading:  clamp(20px, 2vw, 28px);

  /* ── DESIGN-PARAMETER ── */
  --border-radius:      0px;   /* Website verwendet KEINE runden Ecken — geradlinig, professionell */
  --border-radius-sm:   0px;   /* Auch für kleine Elemente: keine Rundung */
  --shadow:             0 2px 8px rgba(13,28,42,0.07);  /* Sehr dezenter Schatten (Navy-basiert) */
  --shadow-card:        0 14px 34px rgba(13,28,42,0.08); /* Karten-Schatten (von Website) */
  --spacing-unit:       8px;

  /* Trennlinien */
  --divider-on-light:   1px solid var(--stone-light);
  --divider-on-dark:    1px solid rgba(255,255,255,0.07);
  --accent-bar:         3px solid var(--accent);        /* Charakteristischer Akzentbalken oben */

  /* ── GANTT-DIAGRAMM ── */
  --gantt-row-height:        36px;
  --gantt-header-bg:         var(--navy);          /* Kopfzeile: Navy (wie Website-Header) */
  --gantt-header-text:       #ffffff;               /* Text auf Navy: Weiß */
  --gantt-year-bg:           var(--navy-mid);       /* Jahres-Zeile etwas heller als KW-Zeile */
  --gantt-week-bg:           var(--navy);           /* KW-Zeile: volles Navy */
  --gantt-grid-color:        var(--stone-light);    /* Gitternetz-Linien: Stone-Light */
  --gantt-today-line:        var(--accent);         /* Aktuelle KW: Akzentfarbe (Bronze) */
  --gantt-today-bg:          rgba(184,118,58,0.12); /* Subtiler Hintergrund heutiger KW */
  --gantt-weekend-bg:        rgba(196,187,176,0.15); /* Wochenend-KWs: ganz dezent Stone */
  --gantt-label-bg:          var(--cream);          /* Firma/Gewerk-Spalten: Creme */
  --gantt-label-border:      var(--stone-light);    /* Rahmen der Label-Spalten */
  --gantt-row-hover:         rgba(13,28,42,0.03);   /* Zeilen-Hover: minimaler Navy-Hauch */
  --gantt-row-alt:           rgba(244,239,230,0.5); /* Alternierend: leichter Creme-Hauch */
}
```

### 3.3 Button-Stile (direkt von Website übernommen)

```css
/* Primär-Button (Navy, wie .btn-navy auf Website) */
.btn-primary {
  background: var(--navy);
  color: #fff;
  padding: 10px 20px;
  font-size: 13px;
  font-family: var(--font-sans);
  font-weight: 500;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
  letter-spacing: 0.01em;
}
.btn-primary:hover { background: var(--navy-mid); }

/* Akzent-Button (Bronze/Gold, wie .btn-primary/.nav-cta auf Website) */
.btn-accent {
  background: var(--accent);
  color: #fff;
  padding: 10px 20px;
  font-size: 13px;
  font-family: var(--font-sans);
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-accent:hover { background: var(--accent-h); }

/* Ghost-Button (wie .btn-ghost auf Website — für sekundäre Aktionen) */
.btn-outline {
  background: transparent;
  color: var(--navy);
  border: 1px solid var(--stone-light);
  padding: 9px 18px;
  font-size: 13px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-outline:hover { border-color: var(--navy); color: var(--navy); }

/* Kleiner Danger-Button */
.btn-danger {
  background: transparent;
  color: var(--ci-danger);
  border: 1px solid var(--ci-danger);
  padding: 5px 10px;
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.btn-danger:hover { background: var(--ci-danger); color: #fff; }
```

### 3.4 Panel / Karten-Stil

```css
/* Panels in der Sidebar (wie Leistungs-Karten auf Website) */
.panel {
  background: var(--cream);
  border: 1px solid var(--stone-light);
  border-top: var(--accent-bar);   /* Charakteristischer oranger Balken oben */
  padding: 24px;
  margin-bottom: 16px;
  transition: box-shadow 0.25s;
}

/* Panel-Titel */
.panel-title {
  font-family: var(--font-serif);   /* Serif für Titel — wie auf Website */
  font-size: 16px;
  font-weight: 400;
  color: var(--navy);
  margin-bottom: 18px;
}
```

### 3.5 Anwendung im PDF-Export

Im PDF-Export werden die Farben als RGB-Werte übergeben (jsPDF akzeptiert kein CSS):

```javascript
// CI-Farben als RGB für jsPDF
const CI = {
  navy:       [13,  28,  42],   // #0d1c2a
  navyMid:    [22,  37,  52],   // #162534
  accent:     [184, 118, 58],   // #b8763a
  cream:      [244, 239, 230],  // #f4efe6
  warmWhite:  [249, 246, 241],  // #f9f6f1
  stonLight:  [196, 187, 176],  // #c4bbb0
  stone:      [133, 125, 112],  // #857d70
  text:       [24,  20,  15],   // #18140f
  textMid:    [70,  64,  58],   // #46403a
  white:      [255, 255, 255],
};

// Verwendung:
// doc.setFillColor(...CI.navy);       → Navy-Hintergrund
// doc.setTextColor(...CI.white);      → Weißer Text
// doc.setFillColor(...CI.accent);     → Bronze-Akzentbalken
// doc.setDrawColor(...CI.stonLight);  → Rahmenlinien
```

### 3.6 PDF-Header-Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Navy-Hintergrund #0d1c2a, volle Breite, Höhe ~22mm]                    │
│                                                                           │
│  [LOGO links]    BAUZEITENPLAN         Erstellt: 04.06.2026              │
│                  ━━━━━━━━━━━━          [Bronze-Linie #b8763a, 0.5mm]    │
│                  Projekt: Musterhaus Mustergasse 1                        │
│                  Projektleiter: Jürgen Gehrke  |  Kunde: Musterkunde GmbH │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
[Creme-Hintergrund #f4efe6 für Gantt-Tabelle]
```

### 3.7 Excel-Export CI

```javascript
// ExcelJS Stile für den Excel-Export
const excelStyles = {
  // Kopfzeile (Titel, Jahr-Zeile, KW-Zeile)
  header: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1C2A' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: false, name: 'Arial', size: 9 },
    alignment: { horizontal: 'center', vertical: 'middle' }
  },
  // Jahres-Kopfzeile (etwas heller)
  yearHeader: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162534' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Arial', size: 9 }
  },
  // Heutige KW hervorheben
  todayHeader: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8763A' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Arial', size: 9 }
  },
  // Label-Spalten (Firma, Gewerk)
  labelCell: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4EFE6' } }, // cream
    font: { color: { argb: 'FF18140F' }, name: 'Arial', size: 9 },
    border: {
      right: { style: 'thin', color: { argb: 'FFC4BBB0' } },
      bottom: { style: 'thin', color: { argb: 'FFC4BBB0' } }
    }
  },
  // Dokument-Titel (Zeile 1)
  docTitle: {
    font: { name: 'Arial', size: 14, bold: false, color: { argb: 'FF0D1C2A' } }
  }
};
```

---

## 4. Datenmodell (JavaScript)

Das gesamte Datenmodell lebt im Arbeitsspeicher (JavaScript-Objekte) und wird für Persistenz als JSON in eine `.bpz`-Datei (Bauzeitenplan-ZIP = eigentlich JSON mit benutzerdefinierter Endung) exportiert/importiert.

```javascript
// Gesamtprojekt-Datenstruktur
const projectData = {
  meta: {
    projectTitle:   "Musterhaus Mustergasse 1",  // Pflichtfeld
    projectManager: "Max Mustermann",             // Pflichtfeld
    customer:       "Musterkunde GmbH",           // Pflichtfeld
    createdAt:      "2026-01-01T00:00:00Z",        // ISO 8601
    updatedAt:      "2026-01-01T00:00:00Z",        // ISO 8601
    version:        "1.0.0"                        // Dateiformat-Version
  },
  settings: {
    startYear:      2026,     // Erstes Jahr der Zeitachse
    endYear:        2027,     // Letztes Jahr der Zeitachse
    timeUnit:       "week",   // Immer "week" (Kalenderwochen) in V1
    showWeekends:   true,     // Wochenenden in Gantt hervorheben
    showCurrentWeek: true     // Heutige KW markieren
  },
  contractors: [              // Array aller Handwerker/Gewerke
    {
      id:          "uuid-v4-string",       // Eindeutige ID (wird von crypto.randomUUID() generiert)
      firm:        "Müller Elektro GmbH",  // Firmenname (wird als erste Spalte angezeigt)
      trade:       "Elektrik OG",          // Gewerk/Tätigkeitsbeschreibung (zweite Spalte)
      color:       "#E74C3C",              // Hex-Farbe für die Gantt-Balken
      startDate:   "2026-03-01",           // ISO 8601 Datum (YYYY-MM-DD)
      endDate:     "2026-04-20",           // ISO 8601 Datum (YYYY-MM-DD)
      sortOrder:   0                       // Reihenfolge im Diagramm (0 = oben)
    }
    // weitere Einträge...
  ]
};
```

**Validierungsregeln:**
- `meta.projectTitle`: Nicht leer, max. 200 Zeichen
- `contractors[].firm`: Nicht leer, max. 100 Zeichen
- `contractors[].trade`: Nicht leer, max. 150 Zeichen
- `contractors[].color`: Gültiger Hex-Farbcode (#RRGGBB)
- `contractors[].startDate`: Muss vor `endDate` liegen
- `contractors[].endDate`: Muss nach `startDate` liegen
- Beide Datumsfelder müssen auf den Zeitraum der Zeitachse passen

---

## 5. UI-Architektur (Single Page Application)

Die App gliedert sich in drei logische Bereiche, die durch CSS-Klassen gesteuert werden. Es gibt **keine Seitennavigation** — alles ist auf einer Seite, Bereiche werden per `display: none/block` ein- und ausgeblendet.

### 5.1 Layout-Struktur (HTML Skelett)

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bauzeitenplan</title>
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/gantt.css">
</head>
<body>

  <!-- ===== HEADER ===== -->
  <header id="app-header">
    <div class="header-logo">
      <img src="assets/logo.svg" alt="Firmenlogo" id="company-logo">
    </div>
    <div class="header-title">
      <h1>Bauzeitenplan</h1>
    </div>
    <div class="header-actions">
      <button id="btn-new"      class="btn btn-outline">⊕ Neu</button>
      <button id="btn-import"   class="btn btn-outline">↑ Importieren</button>
      <button id="btn-save"     class="btn btn-primary">↓ Speichern</button>
      <button id="btn-export"   class="btn btn-secondary dropdown-trigger">
        Exportieren ▾
        <div class="dropdown-menu" id="export-dropdown">
          <button id="btn-export-pdf">Als PDF exportieren</button>
          <button id="btn-export-excel">Als Excel exportieren</button>
        </div>
      </button>
    </div>
  </header>

  <!-- ===== HAUPTBEREICH (zweispaltig) ===== -->
  <main id="app-main">

    <!-- LINKE SPALTE: Projektinfo + Handwerker-Liste -->
    <aside id="sidebar">

      <!-- Panel 1: Projektinformationen -->
      <section class="panel" id="panel-project-info">
        <h2 class="panel-title">Projektinformationen</h2>
        <div class="form-group">
          <label for="input-project-title">Projektname *</label>
          <input type="text" id="input-project-title" placeholder="z.B. Neubau Musterstraße 5">
        </div>
        <div class="form-group">
          <label for="input-project-manager">Projektleiter *</label>
          <input type="text" id="input-project-manager" placeholder="Vor- und Nachname">
        </div>
        <div class="form-group">
          <label for="input-customer">Kunde *</label>
          <input type="text" id="input-customer" placeholder="Kundenname oder Firma">
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label for="input-start-year">Von Jahr</label>
            <select id="input-start-year">
              <!-- Wird durch JS befüllt: aktuelles Jahr ± 5 -->
            </select>
          </div>
          <div class="form-group half">
            <label for="input-end-year">Bis Jahr</label>
            <select id="input-end-year">
              <!-- Wird durch JS befüllt -->
            </select>
          </div>
        </div>
      </section>

      <!-- Panel 2: Handwerker verwalten -->
      <section class="panel" id="panel-contractors">
        <div class="panel-header-row">
          <h2 class="panel-title">Handwerker / Gewerke</h2>
          <button id="btn-add-contractor" class="btn btn-primary btn-small">+ Hinzufügen</button>
        </div>

        <!-- Liste der eingetragenen Handwerker -->
        <div id="contractor-list">
          <!-- Wird dynamisch durch JS befüllt -->
          <!-- Jede Karte hat folgende Struktur: -->
          <!--
          <div class="contractor-card" data-id="uuid">
            <div class="contractor-color-badge" style="background-color: #E74C3C;"></div>
            <div class="contractor-info">
              <span class="contractor-firm">Müller Elektro GmbH</span>
              <span class="contractor-trade">Elektrik OG</span>
              <span class="contractor-dates">01.03.2026 – 20.04.2026</span>
            </div>
            <div class="contractor-actions">
              <button class="btn-icon btn-edit" title="Bearbeiten">✎</button>
              <button class="btn-icon btn-delete" title="Löschen">✕</button>
              <button class="btn-icon btn-drag" title="Reihenfolge ändern">⠿</button>
            </div>
          </div>
          -->
        </div>
      </section>

    </aside>

    <!-- RECHTE SPALTE: Gantt-Diagramm -->
    <section id="gantt-container">
      <div id="gantt-header-row">
        <div id="gantt-label-header">
          <span>Firma</span>
          <span>Gewerk</span>
        </div>
        <div id="gantt-timeline-header">
          <!-- Wird durch gantt.js gerendert: Jahres- und KW-Zeilen -->
        </div>
      </div>
      <div id="gantt-body">
        <!-- Wird durch gantt.js gerendert -->
      </div>
    </section>

  </main>

  <!-- ===== MODALES FORMULAR: Handwerker hinzufügen/bearbeiten ===== -->
  <div id="modal-overlay" class="modal-overlay hidden">
    <div class="modal" id="modal-contractor">
      <div class="modal-header">
        <h3 id="modal-title">Handwerker hinzufügen</h3>
        <button class="modal-close" id="btn-modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="modal-firm">Firmenname *</label>
          <input type="text" id="modal-firm" placeholder="z.B. Müller Elektro GmbH">
        </div>
        <div class="form-group">
          <label for="modal-trade">Gewerk / Tätigkeit *</label>
          <input type="text" id="modal-trade" placeholder="z.B. Elektrik OG, Sanitär EG+OG">
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label for="modal-start-date">Startdatum *</label>
            <input type="date" id="modal-start-date">
          </div>
          <div class="form-group half">
            <label for="modal-end-date">Enddatum *</label>
            <input type="date" id="modal-end-date">
          </div>
        </div>
        <div class="form-group">
          <label for="modal-color">Farbe im Plan</label>
          <div class="color-picker-row">
            <input type="color" id="modal-color" value="#3498DB">
            <div id="color-presets">
              <!-- 12 Voreingestellte Farben als klickbare Farbfelder -->
              <!-- Farben: #E74C3C, #E67E22, #F1C40F, #2ECC71, #1ABC9C, #3498DB,
                           #9B59B6, #34495E, #E91E63, #009688, #FF5722, #607D8B -->
            </div>
          </div>
        </div>
        <!-- Vorschau des Gantt-Balkens -->
        <div class="form-group">
          <label>Vorschau</label>
          <div id="modal-preview-bar" style="height: 28px; border-radius: 4px; background: #3498DB;"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="btn-modal-cancel" class="btn btn-outline">Abbrechen</button>
        <button id="btn-modal-save"   class="btn btn-primary">Speichern</button>
      </div>
    </div>
  </div>

  <!-- ===== TOAST-BENACHRICHTIGUNGEN ===== -->
  <div id="toast-container"></div>

  <!-- ===== UNSICHTBARES FILE-INPUT für Import ===== -->
  <input type="file" id="file-import-input" accept=".bpz,.json" style="display:none">

  <!-- ===== BIBLIOTHEKEN (lokal) ===== -->
  <script src="lib/xlsx.full.min.js"></script>
  <script src="lib/jspdf.umd.min.js"></script>
  <script src="lib/jspdf.plugin.autotable.min.js"></script>

  <!-- ===== APP-CODE ===== -->
  <script src="js/data.js"></script>
  <script src="js/gantt.js"></script>
  <script src="js/export-pdf.js"></script>
  <script src="js/export-excel.js"></script>
  <script src="js/app.js"></script>

</body>
</html>
```

---

## 6. JavaScript-Module (Detailspezifikation)

### 6.1 `js/data.js` — Datenverwaltung

Exportiert folgende Funktionen in den globalen Scope (kein ES-Modul-System, da GitHub Pages kein Build-System hat):

```javascript
// Initialer leerer Zustand
window.AppData = {
  currentProject: null,    // Lädt projektData oder null
  isDirty: false           // true wenn ungespeicherte Änderungen vorhanden
};

// Initialisiert ein neues leeres Projekt
function initNewProject() { ... }

// Validiert das gesamte projectData-Objekt
// Returns: { valid: true } oder { valid: false, errors: ["Fehlermeldung 1", ...] }
function validateProject(projectData) { ... }

// Serialisiert projectData zu JSON-String
function serializeProject(projectData) { ... }

// Deserialisiert JSON-String zu projectData mit Migrationslogik
// Returns: { success: true, data: projectData } oder { success: false, error: "..." }
function deserializeProject(jsonString) { ... }

// Löst Browser-Download einer .bpz-Datei aus
function downloadProjectFile(projectData) { ... }

// Datei-Import: Liest File-Objekt ein und gibt deserialisiertes Projekt zurück
// Returns: Promise<{ success: true, data: projectData } | { success: false, error: "..." }>
async function importProjectFile(fileObject) { ... }

// Generiert UUID v4
function generateId() {
  return crypto.randomUUID();
}

// Hilfsfunktion: ISO-Datum zu KW-Nummer
// Returns: { year: 2026, week: 12 }
function dateToWeek(isoDateString) { ... }

// Hilfsfunktion: Berechnet KW-Spaltenindex für ein Datum
// Returns: number (0-basierter Index in der Gantt-Tabelle)
function dateToColumnIndex(isoDateString, startYear) { ... }

// Hilfsfunktion: ISO-Datum zu deutschem Anzeigeformat (DD.MM.YYYY)
function formatDateDE(isoDateString) { ... }
```

### 6.2 `js/gantt.js` — Gantt-Rendering

Das Gantt-Diagramm wird als HTML-Tabelle (nicht SVG/Canvas) gerendert für einfachere Handhabung und bessere Browserkompatibilität.

```javascript
// Rendert das gesamte Gantt-Diagramm
// Schreibt in #gantt-header-row und #gantt-body
function renderGantt(projectData) { ... }

// Erstellt den Zeitachsen-Header (Jahr-Zeile + KW-Zeile)
// Returns: DocumentFragment
function buildGanttHeader(startYear, endYear) { ... }

// Erstellt eine Gantt-Zeile für einen Contractor
// Returns: HTMLTableRowElement
function buildGanttRow(contractor, startYear, endYear) { ... }

// Hebt die aktuelle Kalenderwoche hervor
function markCurrentWeek() { ... }

// Scrollt das Gantt zum heutigen Datum
function scrollToToday() { ... }
```

**Gantt-Rendering-Logik:**

Die Zeitachse zeigt **Kalenderwochen (KW)** von KW1 des `startYear` bis KW52/53 des `endYear`.

Die Kopfzeile hat zwei Ebenen:
1. **Jahr-Zeile:** Merged cells über alle KWs des jeweiligen Jahres (z.B. "2026" über 52 Spalten)
2. **KW-Zeile:** Eine Zelle pro Kalenderwoche, Inhalt ist die KW-Nummer

Jede Handwerker-Zeile besteht aus:
- Spalte 1: Firmenname (fest, nicht scrollbar → CSS `position: sticky; left: 0`)
- Spalte 2: Gewerk (fest, nicht scrollbar → CSS `position: sticky; left: <breite-col-1>`)
- Spalten 3–N: Eine Zelle pro KW. Zellen, die im Zeitraum des Contractors liegen, werden mit `background-color` der Contractor-Farbe eingefärbt.

**Berechnung Gantt-Balken:**
```
Für jede KW (year, weekNum):
  mondayOfWeek = ISO-Montag dieser KW
  fridayOfWeek = ISO-Freitag dieser KW

  if (contractor.startDate <= fridayOfWeek AND contractor.endDate >= mondayOfWeek):
    → Zelle einfärben
```

### 6.3 `js/export-pdf.js` — PDF-Export

```javascript
// Exportiert das Gantt-Diagramm als PDF
// Nutzt jsPDF und jsPDF-AutoTable
async function exportToPDF(projectData) {
  // 1. jsPDF-Instanz erstellen (Querformat A3 für breite Diagramme)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

  // 2. CI-Header einfügen (Logo links, Projekttitel mittig, Datum rechts)
  //    Logo: doc.addImage(base64, 'PNG', x, y, w, h)
  //    Projekttitel: doc.setFont / doc.setFontSize / doc.text(...)
  //    Datum: doc.text(formatDateDE(new Date().toISOString()), ...)

  // 3. Projektmetadaten-Block einfügen (Projektleiter, Kunde, Erstellungsdatum)

  // 4. Gantt-Tabelle mit AutoTable rendern
  //    Kopfzeile: ['Firma', 'Gewerk', 'KW 1', 'KW 2', ... 'KW 52', ...]
  //    Datenzeilen: Eine Zeile pro Contractor
  //    Zellfärbung: didParseCell-Callback färbt Gantt-Balken-Zellen

  // 5. Fußzeile: Seite x von y, Firmenname

  // 6. Datei speichern
  doc.save(`Bauzeitenplan_${projectData.meta.projectTitle}_${new Date().toISOString().slice(0,10)}.pdf`);
}
```

**PDF-Formatierungsdetails:**
- Format: A3 Querformat (für 104 KW-Spalten + 2 Label-Spalten)
- Schrift: Helvetica (jsPDF eingebaut; Libre Baskerville nicht nötig im PDF)
- Header-Block: Navy `#0d1c2a` als Hintergrund, weißer Text; Bronze-Trennlinie `#b8763a` (0.5mm)
- KW-Kopfzeile: Navy `#0d1c2a` Hintergrund, weiße Schrift
- Jahres-Zeile: `#162534` (navy-mid) Hintergrund, weiße Schrift
- Heutige KW in Kopfzeile: Bronze `#b8763a` Hintergrund, weiße Schrift
- Firmen-/Gewerk-Spalte: Creme `#f4efe6`, Rahmen in Stone-Light `#c4bbb0`
- Gantt-Balken: Farbige Tabellenfelder (Contractor-Farbe); keine Rahmen innerhalb des Balkens
- Zeilen alternierend: Creme `#f4efe6` / Warm-White `#f9f6f1`
- Fußzeile: Stone-Text `#857d70`, "Gehrke Bauberatung und -betreuung UG" links, Seitenzahl rechts

### 6.4 `js/export-excel.js` — Excel-Export

```javascript
// Exportiert das Gantt-Diagramm als .xlsx-Datei
// Orientiert sich an der bereitgestellten Vorlage Vorlage_Bauzeitenplan.xlsx
function exportToExcel(projectData) {
  // 1. SheetJS Workbook erstellen
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // 2. Zeile 1: Titel "Bauzeitenplan" (merged über gesamte Breite)
  // 3. Zeile 2: leer
  // 4. Zeile 3: Projektname, Projektleiter, Kunde, Datum
  // 5. Zeile 4: leer
  // 6. Zeile 5: Kopfzeile: ["Firma", "Gewerk", <Jahr 1 über KWs gemergt>, <Jahr 2 über KWs gemergt>]
  // 7. Zeile 6: KW-Kopfzeile: ["", "", 1, 2, 3, ..., 52, 1, 2, ..., 52]
  // 8. Datenzeilen: Eine Zeile pro Contractor
  //    - Spalte A: contractor.firm
  //    - Spalte B: contractor.trade
  //    - Spalten C+: Leer, ABER mit CellStyle { fgColor: { rgb: hexOhneHash } } für Gantt-Zellen

  // 9. Formatierung via SheetJS cell styles (benötigt SheetJS Pro oder css2xlsx-Alternative)
  //    HINWEIS: SheetJS Community (kostenlos) unterstützt keine Cell Styles.
  //    Workaround: Zellen im Gantt-Bereich mit dem Hex-Wert als Zelleninhalt beschreiben
  //    UND per VBA-ähnlichem Ansatz Conditional Formatting nutzen ODER
  //    ExcelJS als Alternative zu SheetJS verwenden, da ExcelJS Cell Styles unterstützt.
  //
  //    EMPFEHLUNG: ExcelJS statt SheetJS für den Excel-Export verwenden!
  //    ExcelJS CDN/Download: https://github.com/exceljs/exceljs
  //    lib/exceljs.min.js einbinden

  // 10. Spaltenbreiten: Spalten A, B breiter; KW-Spalten sehr schmal (ca. 25px)
  // 11. Datei speichern mit XLSX.writeFile oder exceljs-blob
  //     Dateiname: Bauzeitenplan_<Projektname>_<Datum>.xlsx
}
```

> **Technische Entscheidung Excel-Export:** SheetJS (kostenlose Version) unterstützt keine Zellhintergrundfarben. Daher wird **ExcelJS** (`lib/exceljs.min.js`) verwendet, das Cell Styling in der Open-Source-Version unterstützt. ExcelJS muss zusätzlich in `lib/` abgelegt werden (Download von https://github.com/exceljs/exceljs/releases — die Browser-Build-Datei `dist/exceljs.min.js`).

### 6.5 `js/app.js` — Hauptlogik & Event-Handling

```javascript
// ===== INITIALISIERUNG =====
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  initNewProject();         // Neues Projekt laden
  populateYearSelectors();  // Jahr-Dropdowns befüllen
  renderGantt(AppData.currentProject);
  bindAllEvents();
  checkForAutosave();       // Prüft localStorage auf gespeicherten Entwurf
}

// ===== EVENT-BINDING =====
function bindAllEvents() {
  // Header-Buttons
  document.getElementById('btn-new').addEventListener('click', handleNewProject);
  document.getElementById('btn-import').addEventListener('click', handleImportClick);
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-export-pdf').addEventListener('click', handleExportPDF);
  document.getElementById('btn-export-excel').addEventListener('click', handleExportExcel);

  // Datei-Import
  document.getElementById('file-import-input').addEventListener('change', handleFileImport);

  // Projektinfo-Felder → Live-Aktualisierung
  document.getElementById('input-project-title').addEventListener('input', handleProjectMetaChange);
  document.getElementById('input-project-manager').addEventListener('input', handleProjectMetaChange);
  document.getElementById('input-customer').addEventListener('input', handleProjectMetaChange);
  document.getElementById('input-start-year').addEventListener('change', handleYearChange);
  document.getElementById('input-end-year').addEventListener('change', handleYearChange);

  // Handwerker-Aktionen
  document.getElementById('btn-add-contractor').addEventListener('click', () => openContractorModal(null));

  // Modal-Aktionen
  document.getElementById('btn-modal-close').addEventListener('click', closeContractorModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeContractorModal);
  document.getElementById('btn-modal-save').addEventListener('click', handleContractorSave);
  document.getElementById('modal-color').addEventListener('input', updateModalColorPreview);

  // Drag-and-Drop für Sortierung (HTML5 Drag API)
  initContractorDragSort();

  // Keyboard: ESC schließt Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeContractorModal();
  });
}

// ===== MODAL-LOGIK =====
// openContractorModal(null)       → Neuer Handwerker
// openContractorModal(contractorId) → Bestehenden bearbeiten
function openContractorModal(contractorId) { ... }
function closeContractorModal() { ... }
function handleContractorSave() {
  // 1. Eingaben lesen
  // 2. Validieren → bei Fehler: Fehlermeldung im Modal anzeigen, NICHT schließen
  // 3. In AppData.currentProject einfügen oder aktualisieren
  // 4. Modal schließen
  // 5. Contractor-Liste neu rendern
  // 6. Gantt neu rendern
  // 7. Autosave auslösen
}

// ===== IMPORT/EXPORT =====
function handleSave() {
  const validation = validateProject(AppData.currentProject);
  if (!validation.valid) {
    showToast('Bitte alle Pflichtfelder ausfüllen: ' + validation.errors.join(', '), 'error');
    return;
  }
  downloadProjectFile(AppData.currentProject);
  AppData.isDirty = false;
  showToast('Bauzeitenplan gespeichert.', 'success');
}

async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const result = await importProjectFile(file);
  if (!result.success) {
    showToast('Fehler beim Importieren: ' + result.error, 'error');
    return;
  }
  AppData.currentProject = result.data;
  AppData.isDirty = false;
  updateFormFromProject(AppData.currentProject);
  renderContractorList(AppData.currentProject.contractors);
  renderGantt(AppData.currentProject);
  showToast('Bauzeitenplan erfolgreich importiert.', 'success');
  event.target.value = ''; // Reset für erneuten Import
}

// ===== AUTOSAVE (localStorage) =====
// Alle 30 Sekunden wird der aktuelle Entwurf automatisch in localStorage gesichert.
// Key: 'bauzeitenplan_autosave'
// Beim Start wird geprüft, ob ein Autosave vorhanden ist → Toast mit "Entwurf wiederherstellen?"
function checkForAutosave() { ... }
function autosave() { ... }

// ===== TOAST-BENACHRICHTIGUNGEN =====
// type: 'success' | 'error' | 'info'
// duration: Millisekunden (Standard: 3000)
function showToast(message, type = 'info', duration = 3000) { ... }

// ===== BESTÄTIGUNGS-DIALOG =====
// Ersetzt window.confirm() für bessere UX
// Returns: Promise<boolean>
function showConfirm(title, message) { ... }
```

---

## 7. Gantt-Spezifische CSS-Klassen (`gantt.css`)

```css
/* Außenhülle */
#gantt-container { ... }        /* Horizontales Scrollen; background: var(--warm-white) */
#gantt-header-row { ... }       /* Sticky am oberen Rand; background: var(--navy) */

/* Tabelle */
.gantt-table { ... }            /* border-collapse: collapse; table-layout: fixed */
.gantt-table th.label-col { ... } /* Firmen- und Gewerk-Spalte: sticky left; background: var(--cream) */
.gantt-table th.year-col { ... }  /* Jahres-Kopfzeile: background: var(--navy-mid); color: #fff */
.gantt-table th.week-col { ... }  /* KW-Kopfzeile: background: var(--navy); color: #fff */

/* Datenzeilen */
.gantt-row { ... }                              /* background: var(--warm-white) */
.gantt-row:nth-child(even) { ... }             /* background: var(--cream) — alternierend Creme */
.gantt-row:hover { ... }                        /* background: var(--gantt-row-hover) — dezenter Navy-Hauch */
.gantt-cell-label { ... }                       /* background: var(--cream); border-right: var(--divider-on-light) */
.gantt-cell-week { ... }                        /* Standard KW-Zelle; border: 1px solid var(--stone-light) */
.gantt-cell-bar { ... }                         /* Gefärbte Balken-Zelle — background per JS gesetzt */
.gantt-cell-today { ... }                       /* Heutige KW: background: var(--gantt-today-bg); border-top: 2px solid var(--accent) */
.gantt-cell-weekend { ... }                     /* Wochenend-KWs: background: var(--gantt-weekend-bg) */
.gantt-table th.week-col-today { ... }          /* Heutige KW in Kopfzeile: background: var(--accent); color: #fff */
```

---

## 8. UX-Anforderungen (Nicht-technisch)

Diese Anforderungen sind für die Entwicklung bindend:

1. **Keine technischen Begriffe in der UI** — Alle Labels und Fehlermeldungen sind auf Deutsch und für Laien verständlich.

2. **Sofortiges visuelles Feedback** — Nach jeder Änderung (Datum, Farbe, Name) aktualisiert sich die Gantt-Vorschau innerhalb von 100ms.

3. **Verlustschutz** — Beim Klick auf "Neu" erscheint eine Bestätigung, wenn es ungespeicherte Änderungen gibt. Der Browser-Tab-Close-Event wird abgefangen (`beforeunload`).

4. **Fehlerverhinderung statt Fehlerbehandlung** — Datumsfelder sind `type="date"`, Farbfelder sind `type="color"`. Freitextfelder haben `maxlength`. Das Startdatum-Feld setzt automatisch `min="<aktuelles startYear>-01-01"` und `max="<endDate oder endYear-12-31>"`.

5. **Drag & Drop zur Sortierung** — Handwerker-Karten in der Sidebar können per Drag & Drop umsortiert werden. Die Gantt-Reihenfolge spiegelt dies sofort wider.

6. **Responsive Hinweis** — Das Tool ist primär für Desktop konzipiert. Auf mobilen Geräten erscheint ein informativer Hinweis ("Dieses Tool ist für Desktop optimiert"), das Tool bleibt aber benutzbar.

7. **Farb-Barrierefreiheit** — Die 12 Preset-Farben wurden so gewählt, dass sie ausreichend Kontrast zueinander haben und auch bei Rot-Grün-Schwäche unterscheidbar sind.

8. **Ladezeit** — Da alles lokal ist, muss die App in unter 500ms interaktiv sein. Kein Spinner nötig.

---

## 9. Export-Spezifikation (Detailliert)

### 9.1 PDF-Layout (A3 Querformat)

```
+══════════════════════════════════════════════════════════════════════+
║ [Navy #0d1c2a, volle Breite, ~22mm hoch]                             ║
║  [LOGO]     BAUZEITENPLAN                  Erstellt: DD.MM.YYYY      ║
║             ─────────────────  [Bronze-Linie #b8763a]                ║
║             Projekt: <Projektname>                                    ║
║             Projektleiter: <Name>  |  Kunde: <Kunde>                 ║
+══════════════════════════════════════════════════════════════════════+
║ [Navy-Mid #162534]    2026 (KW 1–52)      ║   2027 (KW 1–52)         ║  ← Jahres-Zeile
+----------+-----------+----+----+----------+----+----+----------------+
║ [Cream]  ║ [Cream]   ║[N] ║[N] ║ ... ║[B]║[N] ║[N] ║ ... ║          ║  ← KW-Zeile (N=Navy, B=Bronze/Heute)
║ Firma    ║ Gewerk    ║ 1  ║ 2  ║     ║▲  ║ 1  ║ 2  ║     ║          ║
+----------+-----------+----+----+----+--+----+----+-----+-------------+
║[Cream bg]║[Cream bg] ║    ║████████████║   ║    ║    ║               ║  ← Warm-White / Cream alternierend
║[Cream bg]║[Cream bg] ║    ║    ║  ██████████║   ║    ║               ║
+----------+-----------+----+----+----+--+----+----+-----+-------------+
║ [Stone #857d70]  Gehrke Bauberatung und -betreuung UG    Seite 1/1   ║  ← Fußzeile
+══════════════════════════════════════════════════════════════════════+
```

### 9.2 Excel-Layout

Die Excel-Ausgabe orientiert sich exakt an `Vorlage_Bauzeitenplan.xlsx`:

| Zeile | Inhalt |
|-------|--------|
| 1 | "Bauzeitenplan" (merged, fett, groß) |
| 2 | leer |
| 3 | "PROJEKTTITEL" / "PROJEKTMANAGER" / "KUNDE" / "DATUM" mit Werten |
| 4 | leer |
| 5 | Spaltenköpfe: "Firma", "Gewerk" + Jahr-Labels (über KWs gemergt) |
| 6 | KW-Zahlen: 1, 2, 3, ..., 52, 1, 2, ..., 52 |
| 7+ | Datenzeilen: Firma, Gewerk, danach Farbfelder |

**Spaltenbreiten:** Spalten A, B = 200px; KW-Spalten = 25px (sehr schmal, wie in Vorlage)  
**Zeilenhöhen:** Kopfzeilen = 20px; Datenzeilen = 28px  
**Schriftart:** Arial 10pt  
**Gantt-Zellen:** Hintergrundfarbe = contractor.color (via ExcelJS `cell.fill`)  
**Rahmen:** Stone-Light `#c4bbb0` (dünn) um alle Zellen; KW-Kopfzeile: Navy `#0d1c2a`; Jahres-Zeile: `#162534`  

---

## 10. Datei-Format (`.bpz`)

Die `.bpz`-Datei ist eine einfache **JSON-Textdatei** mit der Endung `.bpz` (Bauzeitenplan). Das erleichtert Import/Export und macht die Daten auch manuell bearbeitbar.

```json
{
  "format": "bauzeitenplan/v1",
  "meta": {
    "projectTitle": "Musterhaus Mustergasse 1",
    "projectManager": "Max Mustermann",
    "customer": "Musterkunde GmbH",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-06-04T10:30:00Z",
    "version": "1.0.0"
  },
  "settings": {
    "startYear": 2026,
    "endYear": 2027,
    "timeUnit": "week",
    "showWeekends": true,
    "showCurrentWeek": true
  },
  "contractors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firm": "Müller Elektro GmbH",
      "trade": "Elektrik OG",
      "color": "#E74C3C",
      "startDate": "2026-03-01",
      "endDate": "2026-04-20",
      "sortOrder": 0
    }
  ]
}
```

**Migrationslogik:** Wenn `format !== "bauzeitenplan/v1"`, wird in `deserializeProject()` ein Fehler geworfen mit dem Hinweis, dass die Datei von einer neueren Version stammt.

---

## 11. GitHub Pages Deployment

### 11.1 Repository-Setup

```bash
# 1. Repository erstellen (Name: bauzeitenplan)
# 2. Branch für GitHub Pages: main (oder gh-pages)
# 3. In den Repository-Einstellungen: Settings > Pages > Source: main / root
# 4. Die App ist dann unter https://<username>.github.io/bauzeitenplan/ erreichbar
```

### 11.2 `.github/workflows/deploy.yml` (Optional)

Da alles statisch ist, ist **kein Build-Step** nötig. GitHub Pages deployed automatisch bei jedem Push auf `main`. Ein Workflow-File ist optional, aber empfohlen für explizites Deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: .   # Deployed den root des Repos
```

### 11.3 `README.md`

Muss enthalten:
- Kurzbeschreibung des Tools
- Screenshot/Preview
- Anleitung: Wie man das Tool nutzt (3 Schritte)
- Anleitung: Wie man das CI anpasst (Verweis auf CSS Custom Properties in `styles.css`)
- Lizenzhinweis

---

## 12. Zukünftige Erweiterungen (V2 — Nicht in Scope V1)

Diese Features werden **in V1 nicht implementiert**, aber die Architektur muss sie ermöglichen:

1. **Budgets pro Handwerker** — `contractors[].budget: number` und `contractors[].actualCost: number` → Felder im Datenmodell schon vorsehen (aber weglassen aus UI)
2. **Meilensteine** — Separates Array `projectData.milestones: [{id, title, date, color}]`
3. **Mehrsprachigkeit** — Alle UI-Strings über ein `i18n`-Objekt statt Hardcoding
4. **Fortschrittsanzeige** — `contractors[].progress: 0-100` (Prozentsatz)
5. **Mehrbenutzer-Kommentare** — Würde ein Backend erfordern → außerhalb GitHub Pages
6. **Druckoptimierung** — CSS `@media print` für direktes Drucken aus dem Browser

---

## 13. Qualitätssicherung

### 13.1 Funktions-Checkliste (muss vor Abgabe erfüllt sein)

- [ ] Neues Projekt erstellen mit Pflichtfeldern
- [ ] Handwerker hinzufügen mit allen Feldern (Name, Gewerk, Datum, Farbe)
- [ ] Handwerker bearbeiten
- [ ] Handwerker löschen (mit Bestätigungsdialog)
- [ ] Reihenfolge der Handwerker per Drag & Drop ändern
- [ ] Gantt-Diagramm rendert korrekt (Balken in richtiger KW-Spalte)
- [ ] Gantt-Diagramm scrollt horizontal für 2 Jahres-Zeiträume
- [ ] Aktuelle KW ist hervorgehoben
- [ ] Projekt als `.bpz` speichern (Download im Browser)
- [ ] Projekt aus `.bpz` importieren
- [ ] Export als PDF (Download)
- [ ] Export als Excel (Download)
- [ ] Validierungsmeldungen bei fehlenden Pflichtfeldern
- [ ] Autosave in localStorage
- [ ] Warnung bei ungespeicherten Änderungen (vor "Neu" und Browser-Close)
- [ ] App funktioniert ohne Internetverbindung (alle Bibliotheken lokal)
- [ ] App funktioniert in: Chrome 120+, Firefox 120+, Edge 120+, Safari 17+

### 13.2 Bekannte Einschränkungen

- **Safari File Download:** `URL.createObjectURL` + `a.click()` funktioniert in Safari auf iOS nicht zuverlässig. Workaround: `data:` URI als Fallback implementieren.
- **ExcelJS in Browser:** ExcelJS ist relativ groß (~1.5MB). Die Datei wird nur geladen, wenn der User auf "Als Excel exportieren" klickt (Lazy Loading via dynamischem `script`-Tag, falls Performance-Problem).

---

## 14. Entwicklungshinweise für Claude Code

1. **Starte mit `index.html` und `css/styles.css`** — Baue zuerst das Layout und das CI, dann die Logik.

2. **Gantt-Rendering ist der komplexeste Teil** — Implementiere `gantt.js` nach `data.js`. Teste mit 5 Dummy-Contractors bevor du die UI verbindest.

3. **KW-Berechnung:** JavaScript hat keine eingebaute ISO-KW-Funktion. Nutze diesen Algorithmus:
   ```javascript
   function getISOWeek(date) {
     const d = new Date(date);
     d.setHours(0, 0, 0, 0);
     d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
     const week1 = new Date(d.getFullYear(), 0, 4);
     return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
   }
   ```

4. **Farb-Kontrast für Text auf Gantt-Balken:** Berechne per Luminanz, ob weißer oder schwarzer Text auf der Contractor-Farbe besser lesbar ist:
   ```javascript
   function getContrastColor(hexColor) {
     const r = parseInt(hexColor.slice(1,3), 16);
     const g = parseInt(hexColor.slice(3,5), 16);
     const b = parseInt(hexColor.slice(5,7), 16);
     const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
     return luminance > 0.5 ? '#000000' : '#FFFFFF';
   }
   ```

5. **CI-Farben in PDF:** jsPDF akzeptiert RGB-Arrays. Die Gehrke-CI-Farben als RGB:
   ```javascript
   doc.setFillColor(13, 28, 42);   // #0d1c2a — Navy (Header-Hintergrund)
   doc.setFillColor(22, 37, 52);   // #162534 — Navy-Mid (Jahres-Zeile)
   doc.setFillColor(184, 118, 58); // #b8763a — Accent Bronze (Trennlinie, Heute-KW)
   doc.setFillColor(244, 239, 230);// #f4efe6 — Cream (Label-Spalten, Zeilen-Alt)
   doc.setTextColor(255, 255, 255);// Weiß auf dunklem Grund
   doc.setTextColor(24, 20, 15);   // #18140f — Haupttext auf hellem Grund
   doc.setDrawColor(196, 187, 176);// #c4bbb0 — Stone-Light für Rahmen
   ```

6. **Webfonts laden:** Inter und Libre Baskerville via Google Fonts einbinden (siehe Kommentar in Abschnitt 3.2). Für Offline-Betrieb die Fontdateien in `/assets/fonts/` ablegen und per `@font-face` in `styles.css` einbinden.

6. **Kein `alert()` oder `confirm()`** — Alle Dialoge und Bestätigungen laufen über custom Modal-Komponenten oder die Toast-Benachrichtigung.

7. **Performance:** Bei 50+ Contractors kann das Gantt-Rendering träge werden. Nutze `DocumentFragment` beim Aufbau der Tabelle und füge sie einmalig zum DOM hinzu.

---

*Dokument-Version: 1.1 — Erstellt: 2026-06-04 — CI aktualisiert: 2026-06-04*  
*CI-Quelle: gehrkebauberatung.de (direkt aus dem CSS extrahiert, alle Hex-Werte verifiziert)*  
*Dieses Dokument ist die einzige Source of Truth für Claude Code. Bei Unklarheiten gilt: Einfachheit vor Perfektion, UX vor Technik.*
