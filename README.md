# Bauzeitenplan — Gehrke Bauberatung

Browserbasiertes Tool zur Erstellung professioneller Bauzeitpläne (Gantt-Diagramme) für die **Gehrke Bauberatung und -betreuung UG**.

## Funktionen

- 📅 Interaktiver Gantt-Diagramm mit Kalenderwochen
- ➕ Gewerke hinzufügen, bearbeiten, löschen und per Drag & Drop sortieren
- 💾 Projekt als `.bpz`-Datei speichern und wieder importieren
- 📄 Export als **PDF** (A3 Querformat, mit CI-Header)
- 📊 Export als **Excel** (.xlsx, mit farbigen Gantt-Balken)
- 🔔 Automatisches Speichern im Browser (localStorage)
- ✅ Funktioniert komplett offline — keine Internetverbindung nötig

## Verwendung

### Option 1: GitHub Pages (empfohlen)
Die App ist unter folgender Adresse erreichbar:
```
https://<username>.github.io/bauzeitenplan/
```

### Option 2: Lokal öffnen
1. Das Repository herunterladen oder klonen
2. `index.html` direkt im Browser öffnen (Doppelklick)

## Projekt einrichten

1. **Projektname, Projektleiter und Kunde** in der linken Sidebar eintragen
2. **Projektstart und -ende** mit den Datumspickern festlegen
3. Über **„+ Hinzufügen"** Gewerke mit Zeitraum und Farbe eintragen
4. Der Bauzeitenplan wird sofort angezeigt

## Speichern und Exportieren

| Aktion | Format | Beschreibung |
|--------|--------|-------------|
| Speichern | `.bpz` | Projektdatei (JSON), kann wieder importiert werden |
| Als PDF exportieren | `.pdf` | A3 Querformat, druckfertig |
| Als Excel exportieren | `.xlsx` | Mit farbigen Gantt-Balken |

## CI anpassen

Alle Unternehmensfarben sind in `css/styles.css` als CSS Custom Properties definiert:

```css
:root {
  --navy:   #0d1c2a;   /* Header, primäre Elemente */
  --accent: #b8763a;   /* Bronze-Akzent, CTAs */
  --cream:  #f4efe6;   /* Sidebar, Panel-Hintergründe */
  /* ... weitere Variablen ... */
}
```

## Technologie

- Reines **HTML5 + CSS3 + Vanilla JavaScript** — kein Framework, kein Build-System
- Bibliotheken (lokal in `lib/`):
  - [jsPDF](https://github.com/parallax/jsPDF) — PDF-Export
  - [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) — Tabellen in PDF
  - [ExcelJS](https://github.com/exceljs/exceljs) — Excel-Export mit Zellfarben

## Lizenz

Internes Tool der Gehrke Bauberatung und -betreuung UG. Alle Rechte vorbehalten.
