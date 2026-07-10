import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { AisService } from '../../services/ais.service';
import { BarChart } from '../charts/bar-chart';
import { PieChart } from '../charts/pie-chart';
import { KpiTile } from '../charts/kpi-tile';
import { Verzeichnungseinheit, VeStufe } from '../../models/ais.model';

const STUFE_ICON: Record<VeStufe, string> = {
  Klassifikationsknoten: 'folder_special',
  Bestand: 'inventory_2',
  Serie: 'folder_copy',
  Dossier: 'folder',
  'Einzelstück': 'description',
};

/** Recursive tree node for the Tektonik. */
@Component({
  selector: 'app-tektonik-node',
  standalone: true,
  template: `
    @for (ve of nodes(); track ve.id) {
      <div class="node">
        <div class="row" [class.selected]="selectedId() === ve.id" (click)="select.emit(ve)">
          @if (hasChildren(ve)) {
            <button class="expander" type="button" (click)="toggle($event, ve.id)">
              <i class="material-icons">{{ isOpen(ve.id) ? 'expand_more' : 'chevron_right' }}</i>
            </button>
          } @else {
            <span class="expander-spacer"></span>
          }
          <i class="material-icons stufe-icon">{{ stufeIcon[ve.stufe] }}</i>
          <span class="sig">{{ ve.signatur }}</span>
          <span class="titel">{{ ve.titel }}</span>
        </div>
        @if (isOpen(ve.id) && hasChildren(ve)) {
          <div class="children">
            <app-tektonik-node [nodes]="data.children(ve.id)" [selectedId]="selectedId()" [openIds]="openIds()" (select)="select.emit($event)" (toggled)="toggled.emit($event)" />
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .row { display: flex; align-items: center; gap: 5px; padding: 4px 6px; cursor: pointer; border-radius: 3px; }
    .row:hover { background: #f0f6fa; }
    .row.selected { background: #dff0fa; }
    .expander { background: none; border: none; padding: 0; cursor: pointer; color: #7d8794; display: flex; }
    .expander .material-icons { font-size: 18px; }
    .expander-spacer { width: 18px; display: inline-block; }
    .stufe-icon { font-size: 17px; color: #7d8794; }
    .sig { font-size: 0.78rem; color: #33485e; font-weight: 500; white-space: nowrap; }
    .titel { font-size: 0.82rem; color: #586475; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .children { margin-left: 20px; border-left: 1px solid #e8ecef; padding-left: 4px; }
  `],
})
export class TektonikNode {
  protected readonly data = inject(ArchivDataService);
  protected readonly stufeIcon = STUFE_ICON;
  readonly nodes = input.required<Verzeichnungseinheit[]>();
  readonly selectedId = input<string | null>(null);
  readonly openIds = input.required<Set<string>>();
  readonly select = output<Verzeichnungseinheit>();
  readonly toggled = output<string>();

  protected hasChildren(ve: Verzeichnungseinheit): boolean {
    return this.data.children(ve.id).length > 0;
  }

  protected isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  protected toggle(event: Event, id: string): void {
    event.stopPropagation();
    this.toggled.emit(id);
  }
}

interface Suchschablone {
  id: string;
  name: string;
  beschreibung: string;
  filter: (ve: Verzeichnungseinheit, svc: ArchivDataService) => boolean;
}

@Component({
  selector: 'app-tektonik',
  standalone: true,
  imports: [AppShell, TektonikNode, BarChart, PieChart, KpiTile],
  template: `
    <app-shell appName="Tektonik" iconWhite="icons/tektonik-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Dashboard -->
        @case ('dashboard') {
          <div class="over-head"><h2>Dashboard</h2></div>
          <div class="kpi-row">
            <app-kpi-tile title="Verzeichnungseinheiten" [value]="data.ves().length" sub="über alle Stufen" />
            <app-kpi-tile title="Bestände" [value]="countStufe('Bestand')" sub="ISAD(G)" />
            <app-kpi-tile title="In Bearbeitung" [value]="countStatus('In Bearbeitung')" sub="Verzeichnungsstatus" />
            <app-kpi-tile title="Mit Dateien" [value]="veMitDateien()" sub="digitale Repräsentationen" />
          </div>
          <div class="two-col">
            <div class="panel">
              <div class="panel-head"><h2>VEs nach Stufe</h2></div>
              <app-bar-chart [data]="stufenBars()" />
            </div>
            <div class="panel">
              <div class="panel-head"><h2>Benutzbarkeit</h2></div>
              <app-pie-chart [data]="benutzbarkeitPie()" [innerRatio]="0.62" />
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Zuletzt bearbeitet</h2></div>
            @for (ve of zuletztBearbeitet(); track ve.id) {
              <div class="recent-row" (click)="openInTree(ve)">
                <i class="material-icons">{{ stufeIcon[ve.stufe] }}</i>
                <span class="sig">{{ ve.signatur }}</span>
                <span class="titel-link">{{ ve.titel }}</span>
                <span class="dim">{{ ve.historie[ve.historie.length - 1].aktion }}</span>
              </div>
            }
          </div>
        }

        <!-- ================================================= Tektonik (Baum + Sideview) -->
        @case ('tektonik') {
          @if (detailVe(); as ve) {
            <!-- ------------------------------ VE-Detail (Vollansicht) -->
            <div class="panel">
              <button class="back" type="button" (click)="detailVe.set(null)">
                <i class="material-icons">arrow_back</i> Zurück zum Baum
              </button>
              <div class="detail-head">
                <i class="material-icons big-icon">{{ stufeIcon[ve.stufe] }}</i>
                <div>
                  <h2>{{ ve.signatur }} {{ ve.titel }}</h2>
                  <div class="pfad">{{ data.tektonikpfad(ve) }}</div>
                </div>
                <div class="spacer"></div>
                <div class="fn-wrap">
                  <button class="btn primary" type="button" (click)="fnOpen.set(!fnOpen())">
                    <i class="material-icons">bolt</i> Funktionen <i class="material-icons">expand_more</i>
                  </button>
                  @if (fnOpen()) {
                    <div class="fn-menu">
                      <div class="fn-section">Global</div>
                      <button type="button" (click)="fn('Neue Objekte')">Neue Objekte</button>
                      <div class="fn-section">Verzeichnungseinheit</div>
                      <button type="button" (click)="fn('Umwandeln')">Umwandeln</button>
                      <button type="button" (click)="dipOpen.set(true); fnOpen.set(false)">DIP-Erstellung ...</button>
                      <button type="button" (click)="fn('Import aus Ingest')">Import aus Ingest</button>
                      <button type="button" (click)="imBaumAnzeigen(ve)">Im Baum anzeigen</button>
                      <button type="button" (click)="fn('Kumulieren')">Kumulieren</button>
                      <button type="button" (click)="fn('Vererben')">Vererben</button>
                      <button type="button" (click)="histOpen.set(true); fnOpen.set(false)">Objekthistorie</button>
                      <button type="button" (click)="fn('Drucken')">Drucken</button>
                    </div>
                  }
                </div>
              </div>

              <div class="pill-row">
                <span class="pill neutral">{{ ve.stufe }}</span>
                <span class="pill" [class]="statusPill(ve.verzeichnungsstatus)">{{ ve.verzeichnungsstatus }}</span>
                <span class="pill" [class]="benutzPill(data.benutzbarkeit(ve))">{{ data.benutzbarkeit(ve) }}</span>
                @if (ve.verwertungsrecht) {
                  <span class="pill neutral">{{ ve.verwertungsrecht }}</span>
                }
              </div>

              <h3>Identifikation</h3>
              <div class="meta-grid">
                <div class="field"><span class="fl">Signatur</span><span class="fv">{{ ve.signatur }}</span></div>
                <div class="field"><span class="fl">Titel</span><span class="fv">{{ ve.titel }}</span></div>
                <div class="field"><span class="fl">Stufe</span><span class="fv">{{ ve.stufe }}</span></div>
                <div class="field"><span class="fl">Entstehungszeitraum</span><span class="fv">{{ ve.entstehungszeitraum || '-' }}</span></div>
                <div class="field"><span class="fl">Umfang</span><span class="fv">{{ ve.umfang || '-' }}</span></div>
              </div>

              <h3>Kontext</h3>
              <div class="meta-grid">
                <div class="field"><span class="fl">Abgebende Stelle</span><span class="fv">{{ ve.abgebendeStelle || '-' }}</span></div>
                <div class="field">
                  <span class="fl">Provenienz</span>
                  @if (data.provenienzById(ve.provenienzId); as prov) {
                    <a class="fv link" (click)="openProvenienz(prov.id)">{{ prov.name }}</a>
                  } @else {
                    <span class="fv">-</span>
                  }
                </div>
                <div class="field">
                  <span class="fl">Standort (Magazin)</span>
                  @if (ve.standortKuerzel) {
                    <a class="fv link" (click)="openMagazin(ve.standortKuerzel!)">{{ ve.standortKuerzel }}</a>
                  } @else {
                    <span class="fv">-</span>
                  }
                </div>
                <div class="field">
                  <span class="fl">Akzession</span>
                  @if (akzessionOf(ve); as akz) {
                    <a class="fv link" (click)="openAkzession(akz.id)">{{ akz.akzessionsnummer }}</a>
                  } @else {
                    <span class="fv">-</span>
                  }
                </div>
                <div class="field full"><span class="fl">Verwaltungsgeschichte</span><span class="fv">{{ ve.verwaltungsgeschichte || '-' }}</span></div>
              </div>

              <h3>Inhalt und innere Ordnung</h3>
              <div class="meta-grid">
                <div class="field full"><span class="fl">Form und Inhalt</span><span class="fv">{{ ve.formInhalt || '-' }}</span></div>
                <div class="field"><span class="fl">Sprachen</span><span class="fv">{{ ve.sprachen || '-' }}</span></div>
                <div class="field"><span class="fl">Archivalienart</span><span class="fv">{{ ve.archivalienart || '-' }}</span></div>
              </div>

              <h3>Zugangs- und Benutzungsbestimmungen</h3>
              <div class="meta-grid">
                <div class="field"><span class="fl">Ablauf Schutzfrist</span><span class="fv">{{ ve.ablaufSchutzfrist || '-' }}</span></div>
                <div class="field"><span class="fl">Schutzfrist</span><span class="fv">{{ ve.schutzfristJahre ? ve.schutzfristJahre + ' Jahre' : '-' }}</span></div>
                <div class="field"><span class="fl">Benutzbarkeit (berechnet)</span><span class="fv">{{ data.benutzbarkeit(ve) }}</span></div>
                <div class="field full"><span class="fl">Zugangsbestimmungen</span><span class="fv">{{ ve.zugangsbestimmungen || '-' }}</span></div>
              </div>

              @if (data.filesForVe(ve.signatur).length > 0) {
                <h3>Dateien und Repräsentationen</h3>
                <table class="tbl">
                  <thead><tr><th>Titel</th><th>Dateiname</th><th>Format</th><th>PID</th><th></th></tr></thead>
                  <tbody>
                    @for (f of data.filesForVe(ve.signatur); track f.id) {
                      <tr>
                        <td>{{ f.titel }}</td>
                        <td class="mono small-text">{{ f.fileName }}</td>
                        <td>{{ f.formatName }}</td>
                        <td class="mono small-text">{{ f.pid }}</td>
                        <td><a class="open-link" [href]="f.path" target="_blank" title="Datei öffnen"><i class="material-icons">open_in_new</i></a></td>
                      </tr>
                    }
                  </tbody>
                </table>
              }

              <!-- DIP dialog -->
              @if (dipOpen()) {
                <div class="dialog-backdrop" (click)="dipOpen.set(false)">
                  <div class="dialog" (click)="$event.stopPropagation()">
                    <h3>DIP-Erstellung</h3>
                    <p class="hint">Dissemination Information Package erzeugen für {{ ve.signatur }}:</p>
                    @for (v of dipVarianten; track v) {
                      <button class="dialog-item" type="button" (click)="dip(v)">{{ v }}</button>
                    }
                    <button class="btn" type="button" (click)="dipOpen.set(false)">Abbrechen</button>
                  </div>
                </div>
              }

              <!-- Objekthistorie dialog -->
              @if (histOpen()) {
                <div class="dialog-backdrop" (click)="histOpen.set(false)">
                  <div class="dialog" (click)="$event.stopPropagation()">
                    <h3>Objekthistorie {{ ve.signatur }}</h3>
                    @for (h of ve.historie; track $index) {
                      <div class="hist-row">
                        <span class="dim">{{ h.datum }}</span>
                        <span class="hist-user">{{ h.benutzer }}</span>
                        <span>{{ h.aktion }}</span>
                      </div>
                    }
                    <button class="btn" type="button" (click)="histOpen.set(false)">Schliessen</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- ------------------------------ Baum + Sideview -->
            <div class="tree-layout">
              <div class="panel tree-panel">
                <div class="panel-head">
                  <h2>Tektonik</h2>
                  <div class="head-actions">
                    <button class="icon-btn" type="button" title="Alle einklappen" (click)="collapseAll()">
                      <i class="material-icons">unfold_less</i>
                    </button>
                    <button class="icon-btn" type="button" title="Neue Objekte" (click)="fn('Neue Objekte')">
                      <i class="material-icons">add</i>
                    </button>
                  </div>
                </div>
                <app-tektonik-node [nodes]="data.children(null)" [selectedId]="selected()?.id ?? null" [openIds]="openIds()" (select)="selected.set($event)" (toggled)="toggleNode($event)" />
              </div>
              @if (selected(); as ve) {
                <aside class="panel sideview">
                  <div class="sv-head">
                    <i class="material-icons">{{ stufeIcon[ve.stufe] }}</i>
                    <div>
                      <div class="sv-sig">{{ ve.signatur }}</div>
                      <div class="sv-titel">{{ ve.titel }}</div>
                    </div>
                  </div>
                  <div class="pill-row">
                    <span class="pill neutral">{{ ve.stufe }}</span>
                    <span class="pill" [class]="benutzPill(data.benutzbarkeit(ve))">{{ data.benutzbarkeit(ve) }}</span>
                  </div>
                  <div class="sv-fields">
                    <div class="field"><span class="fl">Entstehungszeitraum</span><span class="fv">{{ ve.entstehungszeitraum || '-' }}</span></div>
                    <div class="field"><span class="fl">Verzeichnungsstatus</span><span class="fv">{{ ve.verzeichnungsstatus }}</span></div>
                    <div class="field"><span class="fl">Ablauf Schutzfrist</span><span class="fv">{{ ve.ablaufSchutzfrist || '-' }}</span></div>
                    <div class="field"><span class="fl">Standort</span><span class="fv">{{ ve.standortKuerzel || '-' }}</span></div>
                    <div class="field"><span class="fl">Dateien</span><span class="fv">{{ data.filesForVe(ve.signatur).length }}</span></div>
                  </div>
                  <button class="btn primary" type="button" (click)="detailVe.set(ve)">
                    <i class="material-icons">open_in_full</i> Übersicht öffnen
                  </button>
                </aside>
              }
            </div>
          }
        }

        <!-- ================================================= Trefferliste (Grid) -->
        @case ('trefferliste') {
          <div class="panel">
            <div class="panel-head">
              <h2>Trefferliste (Grid-Bearbeitung)</h2>
              <div class="head-actions">
                @if (aktiveSchablone(); as s) {
                  <span class="pill run schablone-pill">Suchschablone: {{ s.name }}
                    <button class="pill-x" type="button" (click)="aktiveSchablone.set(null)"><i class="material-icons">close</i></button>
                  </span>
                }
                <button class="btn" type="button" (click)="neueVe()">
                  <i class="material-icons">add</i> Neue VE erfassen
                </button>
              </div>
            </div>
            <p class="hint">Klick in eine Zelle (Signatur, Titel, Entstehungszeitraum) zum Bearbeiten. Änderungen werden in der Objekthistorie protokolliert.</p>
            <div class="grid-scroll">
              <table class="tbl grid">
                <thead>
                  <tr><th>Signatur</th><th>Titel</th><th>Stufe</th><th>Entstehungszeitraum</th><th>Verzeichnungsstatus</th><th>Benutzbarkeit</th><th>Ablauf Schutzfrist</th><th>Standort</th><th>Abgebende Stelle</th><th>Provenienz</th><th>Dateien</th></tr>
                </thead>
                <tbody>
                  @for (ve of gridVes(); track ve.id) {
                    <tr>
                      <td class="editable" (click)="edit(ve.id, 'signatur')">
                        @if (isEditing(ve.id, 'signatur')) {
                          <input class="cell-input" [value]="ve.signatur" (blur)="save(ve.id, 'signatur', $event)" (keyup.enter)="save(ve.id, 'signatur', $event)" autofocus />
                        } @else {
                          {{ ve.signatur }}
                        }
                      </td>
                      <td class="editable" (click)="edit(ve.id, 'titel')">
                        @if (isEditing(ve.id, 'titel')) {
                          <input class="cell-input" [value]="ve.titel" (blur)="save(ve.id, 'titel', $event)" (keyup.enter)="save(ve.id, 'titel', $event)" autofocus />
                        } @else {
                          {{ ve.titel }}
                        }
                      </td>
                      <td>{{ ve.stufe }}</td>
                      <td class="editable" (click)="edit(ve.id, 'entstehungszeitraum')">
                        @if (isEditing(ve.id, 'entstehungszeitraum')) {
                          <input class="cell-input" [value]="ve.entstehungszeitraum || ''" (blur)="save(ve.id, 'entstehungszeitraum', $event)" (keyup.enter)="save(ve.id, 'entstehungszeitraum', $event)" autofocus />
                        } @else {
                          {{ ve.entstehungszeitraum || '-' }}
                        }
                      </td>
                      <td>{{ ve.verzeichnungsstatus }}</td>
                      <td><span class="pill" [class]="benutzPill(data.benutzbarkeit(ve))">{{ data.benutzbarkeit(ve) }}</span></td>
                      <td>{{ ve.ablaufSchutzfrist || '-' }}</td>
                      <td>{{ ve.standortKuerzel || '-' }}</td>
                      <td>{{ ve.abgebendeStelle || '-' }}</td>
                      <td>{{ data.provenienzById(ve.provenienzId)?.name || '-' }}</td>
                      <td>{{ data.filesForVe(ve.signatur).length }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ================================================= Suchschablonen -->
        @case ('suchschablonen') {
          <div class="panel">
            <div class="panel-head">
              <h2>Suchschablonen</h2>
              <button class="btn" type="button" (click)="toast.show('Suche in Tektonik unter: Absprung ins Suchcenter (im Prototyp nicht ausgebaut).')">
                <i class="material-icons">search</i> Suche in Tektonik unter ...
              </button>
            </div>
            <p class="hint">Gespeicherte Suchen (analog Vertragsverwaltung / CMI Schule). Anwenden öffnet die Trefferliste mit gesetztem Filter.</p>
            @for (s of schablonen; track s.id) {
              <div class="schablone-row">
                <i class="material-icons">saved_search</i>
                <div class="schablone-body">
                  <div class="schablone-name">{{ s.name }}</div>
                  <div class="dim">{{ s.beschreibung }}</div>
                </div>
                <span class="dim count">{{ countSchablone(s) }} Treffer</span>
                <button class="btn small" type="button" (click)="applySchablone(s)">Anwenden</button>
              </div>
            }
          </div>
        }
      }
    </app-shell>
  `,
  styles: [`
    .over-head h2 { margin: 0 0 12px; font-size: 1.05rem; font-weight: 500; color: #33485e; }
    .kpi-row { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 16px; }
    .kpi-row > * { flex: 1; min-width: 170px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 1100px) { .two-col { grid-template-columns: 1fr; } }
    .panel { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 16px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1rem; font-weight: 500; color: #33485e; }
    h3 { margin: 20px 0 10px; font-size: 0.9rem; font-weight: 500; color: #33485e; border-bottom: 1px solid #edf0f2; padding-bottom: 6px; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 14px; }
    .head-actions { display: flex; align-items: center; gap: 8px; }
    .icon-btn { width: 32px; height: 32px; border: none; background: none; color: #586475; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .icon-btn:hover { background: rgba(0,0,0,0.05); }
    .icon-btn .material-icons { font-size: 20px; }
    /* Tree */
    .tree-layout { display: flex; gap: 16px; align-items: flex-start; }
    .tree-panel { flex: 1; min-width: 0; overflow-x: auto; }
    .sideview { width: 300px; flex: 0 0 auto; position: sticky; top: 16px; }
    .sv-head { display: flex; gap: 10px; margin-bottom: 10px; }
    .sv-head .material-icons { font-size: 26px; color: #586475; }
    .sv-sig { font-size: 0.78rem; color: #9aa3ae; }
    .sv-titel { font-size: 0.95rem; color: #33485e; font-weight: 500; }
    .sv-fields { margin: 12px 0 14px; display: flex; flex-direction: column; gap: 8px; }
    /* Detail */
    .back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #009fe3; cursor: pointer; font-size: 0.82rem; padding: 0 0 12px; }
    .back .material-icons { font-size: 17px; }
    .detail-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .big-icon { font-size: 34px; color: #586475; }
    .pfad { font-size: 0.72rem; color: #9aa3ae; margin-top: 4px; }
    .spacer { flex: 1; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 10px; }
    .pill { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.72rem; white-space: nowrap; }
    .pill.neutral { background: #eef0f2; color: #586475; }
    .pill.ok { background: #e4f2dc; color: #3f971a; }
    .pill.warn { background: #fdf1d8; color: #9a7318; }
    .pill.err { background: #f7dede; color: #8c0909; }
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 24px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field.full { grid-column: 1 / -1; }
    .fl { font-size: 0.68rem; color: #9aa3ae; }
    .fv { font-size: 0.82rem; color: #586475; }
    .link { color: #009fe3; cursor: pointer; }
    .link:hover { text-decoration: underline; }
    /* Funktionen menu */
    .fn-wrap { position: relative; }
    .fn-menu { position: absolute; right: 0; top: 40px; background: #fff; border: 1px solid #dfe4e8; border-radius: 3px; box-shadow: 0 4px 14px rgba(0,0,0,0.14); min-width: 220px; z-index: 20; display: flex; flex-direction: column; padding: 6px 0; }
    .fn-section { font-size: 0.66rem; color: #9aa3ae; letter-spacing: 0.4px; text-transform: uppercase; padding: 8px 14px 4px; }
    .fn-menu button { background: none; border: none; text-align: left; padding: 7px 14px; font-size: 0.83rem; color: #33485e; cursor: pointer; }
    .fn-menu button:hover { background: #f0f6fa; }
    /* Dialogs */
    .dialog-backdrop { position: fixed; inset: 0; background: rgba(30, 40, 54, 0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .dialog { background: #fff; border-radius: 3px; padding: 20px 24px; min-width: 380px; max-width: 560px; max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .dialog h3 { margin: 0 0 6px; border: none; padding: 0; }
    .dialog-item { background: #f7f9fa; border: 1px solid #e4e7ea; border-radius: 3px; text-align: left; padding: 9px 12px; font-size: 0.82rem; color: #33485e; cursor: pointer; }
    .dialog-item:hover { background: #eef6fb; border-color: #b8dff2; }
    .dialog .btn { margin-top: 10px; align-self: flex-end; }
    .hist-row { display: flex; gap: 12px; font-size: 0.8rem; color: #586475; padding: 6px 0; border-bottom: 1px solid #edf0f2; }
    .hist-user { color: #0a6ea8; }
    /* Table + grid */
    .tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .tbl th { text-align: left; font-size: 0.7rem; color: #9aa3ae; font-weight: 500; padding: 8px 10px; border-bottom: 1px solid #e4e7ea; white-space: nowrap; }
    .tbl td { padding: 8px 10px; border-bottom: 1px solid #edf0f2; color: #586475; white-space: nowrap; }
    .grid-scroll { overflow-x: auto; }
    .tbl.grid { min-width: 1400px; }
    .editable { cursor: text; }
    .editable:hover { background: #f4f9fc; outline: 1px dashed #b8dff2; }
    .cell-input { border: 1px solid #009fe3; border-radius: 2px; padding: 3px 6px; font-size: 0.8rem; color: #33485e; width: 100%; min-width: 130px; outline: none; }
    .mono { font-family: 'Roboto Mono', monospace; }
    .small-text { font-size: 0.72rem; }
    .dim { color: #9aa3ae; }
    .open-link { color: #586475; }
    .open-link .material-icons { font-size: 17px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd6dc; background: #fff; color: #586475; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; text-decoration: none; }
    .btn:hover { background: #f4f6f8; }
    .btn.small { padding: 3px 12px; font-size: 0.74rem; }
    .btn.primary { background: #009fe3; border-color: #009fe3; color: #fff; }
    .btn.primary:hover { background: #008fcc; }
    .btn .material-icons { font-size: 17px; }
    .recent-row { display: flex; align-items: center; gap: 10px; padding: 8px 2px; border-bottom: 1px solid #edf0f2; cursor: pointer; font-size: 0.83rem; }
    .recent-row:hover { background: #f7fafc; }
    .recent-row .material-icons { font-size: 18px; color: #7d8794; }
    .recent-row .sig { color: #33485e; font-weight: 500; }
    .titel-link { color: #009fe3; }
    .schablone-row { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid #edf0f2; }
    .schablone-row .material-icons { color: #7d8794; }
    .schablone-body { flex: 1; }
    .schablone-name { font-size: 0.88rem; color: #33485e; }
    .count { font-size: 0.76rem; }
    .schablone-pill { display: inline-flex; align-items: center; gap: 4px; }
    .pill-x { background: none; border: none; cursor: pointer; color: inherit; display: flex; padding: 0; }
    .pill-x .material-icons { font-size: 13px; }
  `],
})
export class TektonikApp {
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  private readonly ais = inject(AisService);

  protected readonly stufeIcon = STUFE_ICON;
  protected readonly menu: AppMenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'tektonik', label: 'Tektonik', icon: 'account_tree' },
    { id: 'trefferliste', label: 'Trefferliste', icon: 'table_rows' },
    { id: 'suchschablonen', label: 'Suchschablonen', icon: 'saved_search' },
  ];
  protected readonly activeMenu = signal('dashboard');

  protected readonly openIds = signal(new Set<string>(['A', 'A1']));
  protected readonly selected = signal<Verzeichnungseinheit | null>(null);
  protected readonly detailVe = signal<Verzeichnungseinheit | null>(null);
  protected readonly fnOpen = signal(false);
  protected readonly dipOpen = signal(false);
  protected readonly histOpen = signal(false);
  private editing = signal<{ id: string; field: string } | null>(null);
  protected readonly aktiveSchablone = signal<Suchschablone | null>(null);

  // DIP-Varianten gemaess Featurematrix DLZA
  protected readonly dipVarianten = [
    'DIP Erstellung Ablieferung - aktuelle Ebene',
    'DIP Erstellung - aktuelle Ebene',
    'DIP Erstellung - aktuelle Ebene inkl. Kinder',
    'DIP Erstellung - aktuelle Ebene nur Originaldatei',
    'DIP Erstellung - aktuelle Ebene inkl. Kinder nur Originaldatei',
    'DIP Erstellung - aktuelle Ebene ohne Originaldatei',
    'DIP Erstellung - aktuelle Ebene inkl. Kinder ohne Originaldatei',
  ];

  protected readonly schablonen: Suchschablone[] = [
    { id: 's1', name: 'Gesuchspflichtige VEs', beschreibung: 'Alle VEs mit Benutzbarkeit "Gesuchspflichtig" (Schutzfrist läuft).', filter: (ve, svc) => svc.benutzbarkeit(ve) === 'Gesuchspflichtig' },
    { id: 's2', name: 'In Bearbeitung', beschreibung: 'VEs mit Verzeichnungsstatus "In Bearbeitung".', filter: (ve) => ve.verzeichnungsstatus === 'In Bearbeitung' },
    { id: 's3', name: 'Ohne Entstehungszeitraum', beschreibung: 'Erschliessungslücken: VEs ohne erfassten Entstehungszeitraum.', filter: (ve) => !ve.entstehungszeitraum && ve.stufe !== 'Klassifikationsknoten' },
    { id: 's4', name: 'Bestände ohne Provenienz', beschreibung: 'Qualitätssicherung: Bestände ohne verknüpfte Provenienz.', filter: (ve) => ve.stufe === 'Bestand' && !ve.provenienzId },
  ];

  constructor() {
    const target = this.ais.consumeNavTarget('tektonik');
    if (target) this.selectById(target);
  }

  // ------------------------------------------------------------ Dashboard
  protected countStufe(stufe: VeStufe): number {
    return this.data.ves().filter((v) => v.stufe === stufe).length;
  }

  protected countStatus(status: string): number {
    return this.data.ves().filter((v) => v.verzeichnungsstatus === status).length;
  }

  protected veMitDateien(): number {
    return this.data.ves().filter((v) => this.data.filesForVe(v.signatur).length > 0).length;
  }

  protected readonly stufenBars = computed(() => (
    ['Bestand', 'Serie', 'Dossier', 'Einzelstück'] as VeStufe[]).map((s) => ({ label: s, value: this.countStufe(s) })),
  );

  protected readonly benutzbarkeitPie = computed(() => {
    const leaves = this.data.ves().filter((v) => v.stufe === 'Dossier' || v.stufe === 'Einzelstück');
    const count = (b: string) => leaves.filter((v) => this.data.benutzbarkeit(v) === b).length;
    return [
      { label: 'Frei einsehbar', value: count('Frei einsehbar'), color: '#009FE3' },
      { label: 'Gesuchspflichtig', value: count('Gesuchspflichtig'), color: '#0066A1' },
      { label: 'Teilweise gesuchspflichtig', value: count('Teilweise gesuchspflichtig'), color: '#5BC4F0' },
    ];
  });

  protected zuletztBearbeitet(): Verzeichnungseinheit[] {
    return this.data.ves().filter((v) => v.stufe !== 'Klassifikationsknoten').slice(-5).reverse();
  }

  // ------------------------------------------------------------ Baum
  protected toggleNode(id: string): void {
    this.openIds.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected collapseAll(): void {
    this.openIds.set(new Set());
  }

  protected openInTree(ve: Verzeichnungseinheit): void {
    this.selectById(ve.id);
  }

  private selectById(id: string): void {
    const ve = this.data.veById(id);
    if (!ve) return;
    // expand all ancestors
    this.openIds.update((s) => {
      const next = new Set(s);
      let cur = ve.parentId ? this.data.veById(ve.parentId) : undefined;
      while (cur) {
        next.add(cur.id);
        cur = cur.parentId ? this.data.veById(cur.parentId) : undefined;
      }
      return next;
    });
    this.selected.set(ve);
    this.detailVe.set(null);
    this.activeMenu.set('tektonik');
  }

  // ------------------------------------------------------------ Funktionen
  protected fn(name: string): void {
    this.fnOpen.set(false);
    this.toast.show(`Funktion "${name}": im Prototyp nicht ausgeführt.`);
  }

  protected dip(variante: string): void {
    this.dipOpen.set(false);
    this.toast.show(`${variante}: DIP wird asynchron erstellt (im Prototyp simuliert).`);
  }

  protected imBaumAnzeigen(ve: Verzeichnungseinheit): void {
    this.fnOpen.set(false);
    this.detailVe.set(null);
    this.selectById(ve.id);
  }

  protected akzessionOf(ve: Verzeichnungseinheit) {
    return this.data.akzessionen().find((a) => a.id === ve.akzessionId);
  }

  protected openProvenienz(id: string): void {
    this.ais.openApp('provenienzen', id);
  }

  protected openMagazin(kuerzel: string): void {
    this.ais.openApp('magazinverwaltung', kuerzel);
  }

  protected openAkzession(id: string): void {
    this.ais.openApp('akzessionen', id);
  }

  // ------------------------------------------------------------ Grid
  protected readonly gridVes = computed(() => {
    const schablone = this.aktiveSchablone();
    const list = this.data.ves().filter((v) => v.stufe !== 'Klassifikationsknoten');
    return schablone ? list.filter((v) => schablone.filter(v, this.data)) : list;
  });

  protected edit(id: string, field: string): void {
    this.editing.set({ id, field });
  }

  protected isEditing(id: string, field: string): boolean {
    const e = this.editing();
    return e !== null && e.id === id && e.field === field;
  }

  protected save(id: string, field: 'titel' | 'signatur' | 'entstehungszeitraum', event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value) this.data.updateVeField(id, field, value);
    this.editing.set(null);
  }

  protected neueVe(): void {
    const nr = String(this.data.ves().length).padStart(3, '0');
    this.data.addVe({
      id: `ve-neu-${nr}`,
      parentId: 'A9',
      stufe: 'Dossier',
      signatur: `A 9.2-${nr}`,
      titel: 'Neue Verzeichnungseinheit',
      verzeichnungsstatus: 'In Bearbeitung',
      historie: [{ datum: '2026-07-10 (heute)', benutzer: 'm.weingartner', aktion: 'Objekt im Grid erstellt' }],
    });
    this.toast.show('Neue VE unter A 9 Bewertung und Kassation erfasst (Signatur anpassen).');
  }

  // ------------------------------------------------------------ Suchschablonen
  protected countSchablone(s: Suchschablone): number {
    return this.data.ves().filter((v) => v.stufe !== 'Klassifikationsknoten' && s.filter(v, this.data)).length;
  }

  protected applySchablone(s: Suchschablone): void {
    this.aktiveSchablone.set(s);
    this.activeMenu.set('trefferliste');
  }

  protected statusPill(status: string): string {
    switch (status) {
      case 'Freigegeben': return 'pill ok';
      case 'In Prüfung': return 'pill warn';
      default: return 'pill run';
    }
  }

  protected benutzPill(b: string): string {
    switch (b) {
      case 'Frei einsehbar': return 'pill ok';
      case 'Gesuchspflichtig': return 'pill err';
      default: return 'pill warn';
    }
  }
}
