# CMI AIS POC - Gerüst

**Datum:** 2026-07-10
**Status:** genehmigt

## Ziel

Zweiter Prototyp (analog `workflow-app`) für "CMI AIS". Vorerst nur das **Gerüst** und
die **Infrastruktur** - kein fachlicher Inhalt. Fachliche Details (Dashboard-Widgets,
Geschäfte, weitere Anwendungen) kommen später vom Product Owner.

## Scope

Zwei Views, umschaltbar über die oberste Leiste:

1. **Dashboard** (Startansicht) - nur der Rahmen:
   - Graue Sub-Leiste mit "Geschäft"-Dropdown und "Suche nach"-Feld
   - Zeile "Mein Dashboard" mit `...`-Menü und Refresh/Kebab rechts
   - Leere Arbeitsfläche (keine Widgets)
   - Blauer runder `+`-Button (FAB) unten rechts
2. **Anwendungen** - erreichbar über das 9-Kacheln-Icon oben rechts:
   - Titel "Anwendungen"
   - Gruppe **START**: Kacheln *Favoriten* (Stern), *Suchcenter* (Lupe)
   - Gruppe **ADMINISTRATION**: eine Platzhalter-Kachel *Administration*
   - Kacheln sind Platzhalter ohne Zielansicht

## Bewusst nicht enthalten (YAGNI)

Dashboard-Widgets/Inhalte, Behördenadministration- und Querschnittsfunktionen-Kacheln,
Geschäfte, echte Suche, Routing, Backend.

## Tech Stack (1:1 wie workflow-app)

- Angular 21, standalone components, Signals, **kein Router**, kein Backend
- Handgeschriebenes CMI-SCSS, keine UI-Library
- Material Icons + Roboto via CDN (in `styles.scss`)

## Architektur

```
src/app/
├── app.ts                     # Root: rendert top-bar + aktuelle View (Signal)
├── app.config.ts              # minimal (Global Error Listeners)
├── services/ais.service.ts    # currentView-Signal ('dashboard' | 'anwendungen') + Navigation
└── components/
    ├── top-bar/               # blaue CMI-Leiste, 4 Icons - nur 9-Kacheln aktiv
    ├── dashboard/             # graue Sub-Leiste + "Mein Dashboard" + leere Fläche + FAB
    └── anwendungen/           # START- und ADMINISTRATION-Kachelgruppen
```

## Navigation

- View-Switch via Signal `currentView` im `AisService` (wie workflow-app, kein Router).
- 9-Kacheln-Icon → `anwendungen`. CMI-Logo → `dashboard`.
- Übrige Top-Bar-Icons (Würfel, Fenster, Kebab) vorerst dekorativ.

## Farben (CMI)

- `#00aeef` oberste Leiste (helles CMI-Blau)
- `#009fe3` Primär/Links
- `#586475` Sub-Header-Grau + Text
- `#f4f5f6` Body-Hintergrund

## Infrastruktur

- Öffentliches Repo `manuelweingartner/cmi-ais-poc`
- Commit-Identität: `Manuel Weingartner <manuel.weingartner@gmx.ch>`
- Deploy auf `gh-pages` via `npx angular-cli-ghpages`, `baseHref=/cmi-ais-poc/`
