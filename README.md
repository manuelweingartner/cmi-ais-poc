# CMI AIS - Prototyp

Klickbarer Angular-Prototyp für "CMI AIS": ein Archivinformationssystem nach dem OAIS-Modell im CMI WebClient. Zweiter POC analog [`workflow-app`](https://github.com/manuelweingartner/workflow-app).

**Live:** https://manuelweingartner.github.io/cmi-ais-poc/

Fiktive Daten des **Staatsarchivs des Kantons Dossikon** (fiktiver Kanton) mit echten generierten Beispieldateien (PDF, DOCX, EML, CSV, XML, PNG, TIFF, XLSX, SIP-ZIP) inkl. echter SHA-512-Fixity-Werte.

## Anwendungen

| Gruppe | Anwendung | Inhalt |
| --- | --- | --- |
| ARCHIV | **Tektonik** | ISAD(G)-Baum (Bestand/Serie/Dossier/Einzelstück), Sideview, VE-Detail mit Funktionen-Menü (Umwandeln, DIP-Erstellung mit 7 Varianten, Import aus Ingest, Kumulieren, Vererben, Objekthistorie...), Grid-Bearbeitung, Suchschablonen. Benutzbarkeit wird nach der Schutzfrist-Regel BERECHNET. |
| ARCHIV | **Magazinverwaltung** | Standort-Hierarchie mit Belegung/Kapazität, Kürzel-Validierung (MOBJ101-105) |
| ARCHIV | **Akzessionen** | Vor-Erschliessung: Statuswechsel, "Aus Akzession VE erstellen" (echte Mutation) |
| ARCHIV | **Provenienzen** | ISAAR(CPF), Vorgänger/Nachfolger-Beziehungen, GND-Normdatenlink |
| INGEST UND REPOSITORY | **Datenübernahme** | Ablieferungen mit SIP-Validierung (eCH-0160/arelda, SHA-512, Versions-Transformation), Ablieferungsquittung als echtes PDF, Dateien in Verarbeitung |
| INGEST UND REPOSITORY | **Verarbeitung** | Workflowvorlagen (Prozessketten) + Aufgaben/Schritte-Katalog; Ausführungen mit Schritt-Logs und "Erneut starten" nach Korrektur |
| INGEST UND REPOSITORY | **Preservation Planing** | Dateiformat-Statistik (Kuchendiagramm, klickbar), Datei-Detail mit Original/Rendition/PREMIS und PREMIS-Ereignissen, Formatrisiken mit Erhaltungsstrategien (Migration/Emulation/Monitoring), Fixity-Läufe |

Dazu ein **Widget-Dashboard** (Begrüssung, App-Widgets, klickbare Zähler, Diagramme mit Absprung in die Apps, Widget-Galerie über den +-Button).

## Fachliche Grundlage

Struktur und Begriffe folgen den CMI-internen Konzepten (CATS-11-Wiki, DLZA-Wiki, Featurematrix DLZA, SBO-Folien): OAIS (SIP/AIP/DIP), eCH-0160/arelda, PREMIS/FIDO/PRONOM, PID, ISAD(G), ISAAR(CPF), EAD.

## Starten

```bash
npm install
npx ng serve
```

Öffne http://localhost:4200

## Beispieldateien neu generieren

```bash
python scripts/generate_sample_files.py   # public/files/ + src/app/data/file-manifest.ts (echte SHA-512)
python scripts/extract_assets.py          # Icons aus INPUTS-Mockups + Chart-Palette
```

## Tech Stack

- Angular 21, Standalone Components, Signals - kein Router (View-/Tab-Switch via Signals)
- Kein Backend, kein CSS-Framework - handgeschriebenes CMI-SCSS, eigene SVG-Charts
- Material Icons + Roboto via CDN

## Deploy (GitHub Pages)

In der PowerShell (nicht Git-Bash - MSYS verfälscht `--base-href`):

```powershell
npx ng build --base-href /cmi-ais-poc/
npx angular-cli-ghpages --dir=dist/cmi-ais-poc/browser
```
