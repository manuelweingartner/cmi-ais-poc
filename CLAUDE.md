# CMI AIS - Prototyp

## Projekt

Angular-Prototyp für "CMI AIS" (Archivinformationssystem nach OAIS). Zweiter POC, aufgesetzt analog `workflow-app`. Klickbarer Prototyp mit 7 voll ausgebauten Anwendungen und Widget-Dashboard, fiktive Daten des **Staatsarchivs des Kantons Dossikon** (fiktiver Kanton), echte generierte Beispieldateien.

- **Sprache mit User**: Deutsch. Code-Kommentare: Englisch.
- **Prototyp-URL lokal**: http://localhost:4200/ (`npx ng serve`)
- **Live**: https://manuelweingartner.github.io/cmi-ais-poc/
- **User-facing Deutsch**: echte Umlaute (ä/ö/ü/ß), nie ae/oe/ue. Keine Geviert-/Halbgeviertstriche; stattdessen normaler Bindestrich, Punkt oder Komma.

## Fachliche Quellen (NICHT erfinden, dort nachschlagen)

- Confluence CATS-11 "CMI AIS im WebClient" (pageId 5948506114) + Subseiten: Feature Roadmap, D1-D12 Domänen-Features, Use Cases
- Confluence "CMI DLZA" (5379620866) + Subseiten: DLZA-AIS (5510660186, Tektonik-Funktionen!), DLZA-Administration (Verarbeitung=Workflowvorlagen), DLZA-Repository (Preservation), Featurematrix DLZA (5518229610)
- `INPUTS/Folien SBO.pdf`: Folie 1-2 OAIS, **Folie 11 Anwendungen, Folie 12 Verarbeitung-Mockup, Folie 13 Preservation-Mockup**, Folie 63 PREMIS-File (Original/Rendition/PREMIS)
- `INPUTS/AnwendungenMockupIcons.png` (Icon-Quelle), `INPUTS/Diagramme.png` (Chart-Stil), `INPUTS/Dashboard1-3.png` (Dashboard-Widgets)
- Fachbegriffe: ISAD(G), ISAAR(CPF), eCH-0160/arelda, SIP/AIP/DIP, PREMIS, FIDO/PRONOM, PID, Fixity/SHA-512, EAD. Verarbeitung: Workflowvorlage (Ablauf/Prozesskette) -> Ausführung/Instanz (wartend/laufend/fertig/fehlgeschlagen/abgebrochen), Vorlagenpflege in Verarbeitung, Ausführung fachlich in Ingest/Repository.

## Tech Stack

- Angular 21 (standalone components, Signals), TypeScript 5.9, SCSS
- **Kein Angular Router** - View-Switch + App-Tabs via Signals in `AisService`
- Kein Backend - Daten in `archiv-data.service.ts` + generiertes `data/file-manifest.ts`
- Google Fonts: Roboto + Material Icons (CDN in `styles.scss`); nur klassische Icon-Namen (z.B. `view_in_ar`, nicht `deployed_code`)

## Architektur

```
src/app/
├── app.ts                        # Root: dashboard | anwendungen | app (+Toast)
├── models/ais.model.ts           # VE, Akzession, MagazinObjekt, Provenienz, Ablieferung,
│                                 #   WorkflowVorlage, Ausfuehrung, ArchivDatei, PremisEvent...
├── data/file-manifest.ts         # GENERIERT von scripts/generate_sample_files.py (echte SHA-512!)
├── services/
│   ├── ais.service.ts            # View + App-Tab-System (openApp/closeApp/switchApp) + navTarget
│   ├── archiv-data.service.ts    # Fiktivdaten Staatsarchiv Dossikon + Fachlogik
│   │                             #   (Benutzbarkeits-Regel, Kürzel-Validierung MOBJ101-105,
│   │                             #    Statuswechsel, VE-aus-Akzession, Erneut-starten)
│   └── toast.service.ts
└── components/
    ├── top-bar/                  # blaue Leiste, CMI-Logo-Kasten, App-Tabs mit X
    ├── dashboard/                # Widget-Dashboard (Begrüssung, App-Widgets, Zähler, Charts, Listen, FAB=Widget-Galerie)
    ├── anwendungen/              # 4 Gruppen, Icons aus public/icons/ (extrahiert)
    ├── app-shell/                # generisches App-Layout (dunkle Sidebar + MENÜ + Content + Filter-Slot)
    ├── charts/                   # pie-chart (Führungslinien-Labels), bar-chart, kpi-tile, chart-colors
    ├── verarbeitung/             # Übersicht (Folie 12) | Ausführungen+Detail | Workflows | Aufgaben/Schritte
    ├── preservation/             # Übersicht (Folie 13): KPIs, Kuchen, Ext-Tabelle, Dateiliste,
    │                             #   Datei-Detail (Original/Rendition/PREMIS) | Ausführungen
    ├── datenuebernahme/          # Übersicht | Ablieferungen (SIP-Validierung, Quittung) | Dateien in Verarbeitung
    ├── tektonik/                 # Dashboard | Baum+Sideview | VE-Detail (Funktionen-Menü!) | Grid | Suchschablonen
    ├── magazin/                  # Dashboard | Standort-Baum (Belegungsbalken) | Kürzel-Validierung
    ├── akzessionen/              # Dashboard | Liste+Detail (Statuswechsel, VE erstellen)
    └── provenienzen/             # Dashboard | Liste+Detail (ISAAR-CPF, Beziehungen, GND-Explorer-Mock)
```

## Navigation / Cross-App

- `AisService.openApp(appId, objectId?)`: öffnet App-Tab; `objectId` als navTarget (App konsumiert via `consumeNavTarget` im Konstruktor). Preservation-Sonderfall: `'ext:pdf'` filtert Dateiliste.
- Favoriten/Suchcenter/Systemeinstellungen/Benutzereinstellungen: Kacheln ohne App (Toast). User-Entscheid: statt dieser Apps kam das Widget-Dashboard.

## Konventionen

- Alle Komponenten `standalone: true`, inline template + styles; keine UI-Library.
- Farben: `#289fe1` (Top-Leiste), `#009fe3` (Primär/Links/FAB), `#586475` (Grau: Sub-Header, Sidebar, Logo-Kasten), `#f4f5f6` (BG), `#9aa3ae` (Labels). Chart-Palette in `charts/chart-colors.ts` (aus Diagramme.png gesampelt).
- CMI-Logo (`public/cmi-logo.png`) + App-Icons (`public/icons/*.png`, je auch `-white`-Variante) sind aus Mockups extrahiert - nie durch Text/Material-Icons ersetzen. Extraktion: `python scripts/extract_assets.py`.

## Beispieldateien

- `python scripts/generate_sample_files.py` erzeugt 60 echte Dateien (PDF, DOCX, EML, CSV, XML, JSON, PNG, TIF, TXT, XLSX, SIP-ZIP) in `public/files/` UND `src/app/data/file-manifest.ts` mit echten Grössen/SHA-512. Nach Änderungen an den Dateien IMMER neu generieren (sonst stimmen Hashes nicht mehr - fachliche Korrektheit!).
- Inhalte fiktiv (Kanton Dossikon); PRONOM-PUIDs nur wo sicher, sonst `undefined`.

## Build & Deploy

- Build/Analyse: `npx ng build`.
- Deploy GitHub Pages: **PowerShell** (nicht Git-Bash, MSYS mangled `--base-href`!): `npx ng build --base-href /cmi-ais-poc/` dann `npx angular-cli-ghpages --dir=dist/cmi-ais-poc/browser`.
- Öffentliches Repo `manuelweingartner/cmi-ais-poc`, Branch `gh-pages`.
- Git-Identität: `Manuel Weingartner <manuel.weingartner@gmx.ch>` (nie cmi.ch). Kein Co-Authored-By-Trailer.
