import { Component, computed, inject, signal } from '@angular/core';
import { AisService, APP_DEFINITIONS } from '../../services/ais.service';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { PieChart } from '../charts/pie-chart';
import { BarChart } from '../charts/bar-chart';
import { AppId } from '../../models/ais.model';
import { CHART_COLORS } from '../charts/chart-colors';

const TYP_ICON: Record<string, string> = {
  Ingest: 'move_to_inbox',
  Passivierung: 'archive',
  Preservation: 'data_usage',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PieChart, BarChart],
  template: `
    <!-- Grey search sub-bar -->
    <div class="sub-bar">
      <div class="geschaeft-select">
        <span class="label">Verzeichnungseinheit</span>
        <i class="material-icons">expand_more</i>
      </div>
      <div class="search">
        <input type="text" placeholder="Suche nach" />
      </div>
    </div>

    <!-- Dashboard title row -->
    <div class="dashboard-head">
      <div class="title">
        <span>Mein Dashboard</span>
        <i class="material-icons more">more_horiz</i>
      </div>
      <div class="head-actions">
        <button class="icon-btn" type="button" title="Aktualisieren" (click)="toast.show('Dashboard aktualisiert.')">
          <i class="material-icons">refresh</i>
        </button>
        <button class="icon-btn" type="button" title="Optionen" disabled>
          <i class="material-icons">more_vert</i>
        </button>
      </div>
    </div>

    <div class="widgets">
      <!-- ============================ Kopfzeile: Begrüssung + Anwendungen-Schnellzugriff -->
      <div class="widget greet span4">
        <div class="greet-title">Guten Morgen Manuel</div>
        <div class="greet-sub">Ich wünsche dir einen tollen Start in den Tag!</div>
        <div class="greet-info">Staatsarchiv des Kantons Dossikon | {{ data.ves().length }} Verzeichnungseinheiten | {{ data.dateien.length }} Dateien im Repository</div>
      </div>

      <div class="widget span8 apps-widget">
        <div class="widget-head">
          <span>Anwendungen</span>
          <button class="mini-link" type="button" (click)="ais.showAnwendungen()">Alle Anwendungen</button>
        </div>
        <div class="apps-row">
          @for (appId of appWidgets(); track appId) {
            <button class="app-shortcut" type="button" [title]="defs[appId].name" (click)="ais.openApp(appId)">
              <img [src]="defs[appId].icon" [alt]="defs[appId].name" />
              <span>{{ defs[appId].name }}</span>
            </button>
          }
        </div>
      </div>

      <!-- ============================ Kennzahlen -->
      <div class="section-title">Kennzahlen</div>
      <button class="widget counter span3" type="button" (click)="ais.openApp('datenuebernahme')">
        <div class="counter-title">Ablieferungen in Verarbeitung</div>
        <div class="counter-value">{{ ablieferungenInVerarbeitung() }}</div>
        <div class="counter-sub">Datenübernahme</div>
      </button>
      <button class="widget counter span3" type="button" (click)="openFehlgeschlagene()">
        <div class="counter-title">Fehlgeschlagene Ausführungen</div>
        <div class="counter-value" [class.alert]="fehlgeschlagene() > 0">{{ fehlgeschlagene() }}</div>
        <div class="counter-sub">Verarbeitung</div>
      </button>
      <button class="widget counter span3" type="button" (click)="ais.openApp('akzessionen')">
        <div class="counter-title">Akzessionen in Bearbeitung</div>
        <div class="counter-value">{{ akzessionenOffen() }}</div>
        <div class="counter-sub">Akzessionen</div>
      </button>
      <button class="widget counter span3" type="button" (click)="ais.openApp('preservation')">
        <div class="counter-title">Fixity-Abweichungen (Bitrot)</div>
        <div class="counter-value">0</div>
        <div class="counter-sub">Letzte Prüfung: 30.06.2026 (R-110)</div>
      </button>

      <!-- ============================ Ingest und Repository -->
      <div class="section-title">Ingest und Repository</div>

      <div class="widget chart span8 row-a">
        <div class="widget-head">
          <span>Dateiformate im Repository</span>
          <button class="mini-link" type="button" (click)="ais.openApp('preservation')">Preservation Planing</button>
        </div>
        <app-pie-chart [data]="formatPie()" [clickable]="true" [big]="true" (sliceClick)="openExtension($event)" />
        <div class="chart-hint">Klick auf ein Segment öffnet die Dateien in Preservation Planing.</div>
      </div>

      <div class="widget list span4 row-a">
        <div class="widget-head"><span>Formatrisiken</span>
          <button class="mini-link" type="button" (click)="ais.openApp('preservation')">Alle</button>
        </div>
        @for (r of topRisiken(); track r.extension) {
          <div class="list-item" (click)="openExtension(r.extension)">
            <div class="li-body">
              <a class="li-title">{{ r.formatName }}</a>
              <div class="li-fields"><span><span class="fl">Strategie:</span> {{ r.strategie }}</span></div>
            </div>
            <span class="pill" [class]="'pill r-' + r.risiko">{{ r.risiko }}</span>
          </div>
        }
        <div class="list-foot">Erhaltungsstrategien: Migration, Emulation, Monitoring</div>
      </div>

      <div class="widget list span8 row-b">
        <div class="widget-head">
          <span>Letzte Ausführungen ({{ letzteAusfuehrungen().length }} / {{ data.ausfuehrungen().length }})</span>
          <div class="list-actions">
            <button class="icon-btn" type="button" title="Aktualisieren" (click)="toast.show('Widget aktualisiert.')"><i class="material-icons">refresh</i></button>
            <button class="icon-btn" type="button" title="Mehr" disabled><i class="material-icons">more_vert</i></button>
          </div>
        </div>
        @for (a of letzteAusfuehrungen(); track a.id) {
          <div class="list-item" (click)="openAusfuehrung(a.id)">
            <i class="material-icons li-icon">{{ typIcon[a.typ] }}</i>
            <div class="li-body">
              <a class="li-title">{{ a.nr }} - {{ a.objekt }}</a>
              <div class="li-fields">
                <span><span class="fl">Workflow:</span> {{ a.workflowName }}</span>
                <span><span class="fl">Typ:</span> {{ a.typ }}</span>
                <span><span class="fl">Zeitpunkt:</span> {{ a.zeitpunkt }}</span>
              </div>
            </div>
            <span class="pill" [class]="pillClass(a.status)">{{ a.status }}</span>
          </div>
        }
      </div>

      <div class="widget chart span4 row-b">
        <div class="widget-head">
          <span>Ablieferungen nach Status</span>
          <button class="mini-link" type="button" (click)="ais.openApp('datenuebernahme')">Datenübernahme</button>
        </div>
        <app-pie-chart [data]="ablieferungPie()" [innerRatio]="0.62" [clickable]="true" (sliceClick)="ais.openApp('datenuebernahme')" />
      </div>

      <!-- ============================ Archiv -->
      <div class="section-title">Archiv</div>

      <div class="widget chart span4 row-c">
        <div class="widget-head">
          <span>Benutzbarkeit der VEs</span>
          <button class="mini-link" type="button" (click)="ais.openApp('tektonik')">Tektonik</button>
        </div>
        <app-pie-chart [data]="benutzbarkeitPie()" [innerRatio]="0.62" [clickable]="true" (sliceClick)="ais.openApp('tektonik')" />
      </div>

      <div class="widget chart span4 row-c">
        <div class="widget-head">
          <span>Magazin-Belegung (Laufmeter)</span>
          <button class="mini-link" type="button" (click)="ais.openApp('magazinverwaltung')">Magazinverwaltung</button>
        </div>
        <app-bar-chart [data]="magazinBars()" [tall]="true" />
        <div class="chart-hint">Auslastung gesamt: {{ magazinAuslastung() }}%</div>
      </div>

      <div class="widget list span4 row-c">
        <div class="widget-head"><span>Jüngste Akzessionen</span>
          <button class="mini-link" type="button" (click)="ais.openApp('akzessionen')">Alle</button>
        </div>
        @for (a of juengsteAkzessionen(); track a.id) {
          <div class="list-item" (click)="ais.openApp('akzessionen', a.id)">
            <i class="material-icons li-icon">move_to_inbox</i>
            <div class="li-body">
              <a class="li-title">{{ a.akzessionsnummer }}: {{ a.titel }}</a>
              <div class="li-fields"><span><span class="fl">Übernahme:</span> {{ a.uebernahmedatum }}</span></div>
            </div>
            <span class="pill" [class]="a.status === 'Abgeschlossen' ? 'pill ok' : 'pill run'">{{ a.status }}</span>
          </div>
        }
      </div>
    </div>

    <!-- FAB: Neues Objekt anlegen (im Prototyp noch nicht klickbar) -->
    <button class="fab" type="button" title="Neues Objekt anlegen" disabled>
      <i class="material-icons">add</i>
    </button>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      min-height: calc(100vh - 50px);
    }
    .sub-bar {
      background: #586475;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
    }
    .geschaeft-select {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; width: 240px; background: #fff; border-radius: 3px;
      padding: 10px 12px; color: #586475;
    }
    .geschaeft-select .label { color: #9aa3ae; }
    .geschaeft-select .material-icons { font-size: 22px; color: #586475; }
    .search { flex: 1; }
    .search input {
      width: 100%; border: none; border-radius: 3px; padding: 11px 14px;
      font-size: 0.875rem; color: #586475; outline: none;
    }
    .search input::placeholder { color: #9aa3ae; }
    .dashboard-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px 8px;
    }
    .title { display: flex; align-items: center; gap: 8px; font-size: 1.05rem; color: #586475; }
    .title .more { font-size: 20px; color: #9aa3ae; }
    .head-actions { display: flex; gap: 4px; }
    .icon-btn {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; color: #586475; cursor: pointer; border-radius: 50%;
    }
    .icon-btn:hover:not([disabled]) { background: rgba(0, 0, 0, 0.05); }
    .icon-btn[disabled] { opacity: 0.5; cursor: default; }
    /* Widgets */
    .widgets {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 14px;
      padding: 8px 24px 90px;
    }
    .widget {
      background: #fff; border: 1px solid #e4e7ea; border-radius: 3px;
      padding: 14px 16px; text-align: left; min-width: 0;
    }
    .span3 { grid-column: span 3; }
    .span4 { grid-column: span 4; }
    .span8 { grid-column: span 8; }
    .section-title {
      grid-column: 1 / -1;
      font-size: 0.72rem; font-weight: 500; letter-spacing: 0.6px;
      text-transform: uppercase; color: #9aa3ae;
      margin: 10px 2px -4px;
    }
    /* Begruessung */
    .greet-title { color: #009fe3; font-weight: 500; margin-bottom: 6px; }
    .greet-sub { font-size: 0.85rem; color: #586475; }
    .greet-info { font-size: 0.72rem; color: #9aa3ae; margin-top: 14px; }
    /* Anwendungen-Schnellzugriff */
    .apps-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .app-shortcut {
      width: 104px; height: 96px; background: #fff; border: 1px solid #e4e7ea; border-radius: 3px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
      cursor: pointer; font-size: 0.72rem; color: #586475; font-family: inherit;
      transition: box-shadow 0.15s ease;
    }
    .app-shortcut:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .app-shortcut img { height: 30px; width: auto; max-width: 56px; object-fit: contain; }
    .app-shortcut span { max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .app-shortcut.add { border-style: dashed; color: #9aa3ae; }
    .app-shortcut.add .material-icons { font-size: 28px; color: #009fe3; }
    /* Zaehler */
    .counter { cursor: pointer; font-family: inherit; transition: box-shadow 0.15s ease; display: flex; flex-direction: column; }
    .counter:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .counter-title { font-size: 0.78rem; color: #586475; margin-bottom: 6px; }
    .counter-value { font-size: 2.6rem; font-weight: 300; color: #586475; text-align: center; flex: 1; }
    .counter-value.alert { color: #8c0909; }
    .counter-sub { font-size: 0.68rem; color: #9aa3ae; text-align: center; }
    /* Gleiche Hoehen pro Band */
    .row-a, .row-b, .row-c { display: flex; flex-direction: column; }
    .row-a app-pie-chart, .row-b app-pie-chart, .row-c app-pie-chart,
    .row-c app-bar-chart { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    @media (max-width: 1280px) {
      .span3 { grid-column: span 6; }
      .span4, .span8 { grid-column: span 12; }
    }
    @media (max-width: 860px) {
      .span3, .span4, .span8 { grid-column: span 12; }
    }
    .widget-head {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 0.9rem; color: #33485e; margin-bottom: 10px;
    }
    .mini-link { background: none; border: none; color: #009fe3; font-size: 0.74rem; cursor: pointer; padding: 0; }
    .mini-link:hover { text-decoration: underline; }
    .chart-hint { font-size: 0.7rem; color: #9aa3ae; margin-top: 8px; text-align: center; }
    .list-actions { display: flex; }
    .list-item {
      display: flex; align-items: center; gap: 10px; padding: 9px 2px;
      border-bottom: 1px solid #edf0f2; cursor: pointer;
    }
    .list-item:hover { background: #f7fafc; }
    .li-icon { font-size: 20px; color: #7d8794; }
    .li-body { flex: 1; min-width: 0; }
    .li-title { color: #009fe3; font-size: 0.84rem; }
    .li-fields { display: flex; flex-wrap: wrap; gap: 2px 16px; font-size: 0.72rem; color: #586475; margin-top: 3px; }
    .fl { color: #9aa3ae; }
    .pill { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.7rem; white-space: nowrap; }
    .pill.ok { background: #e4f2dc; color: #3f971a; }
    .pill.err { background: #f7dede; color: #8c0909; }
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .pill.wait { background: #eef0f2; color: #586475; }
    .pill.abort { background: #f0e6d8; color: #8a6d1a; }
    .pill.r-tief { background: #e4f2dc; color: #3f971a; }
    .pill.r-mittel { background: #fdf1d8; color: #9a7318; }
    .pill.r-hoch { background: #f7dede; color: #8c0909; }
    .fab {
      position: fixed; right: 28px; bottom: 48px; width: 56px; height: 56px;
      border-radius: 50%; background: #009fe3; color: #fff; border: none; cursor: pointer;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25); display: flex; align-items: center; justify-content: center;
      z-index: 30;
    }
    .fab:hover:not([disabled]) { background: #008fcc; }
    .fab[disabled] { cursor: default; }
    .fab .material-icons { font-size: 28px; }
  `],
})
export class Dashboard {
  protected readonly ais = inject(AisService);
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  protected readonly defs = APP_DEFINITIONS;
  protected readonly typIcon = TYP_ICON;

  /** All apps as dashboard shortcuts (user decision: no add button, show all). */
  protected readonly appWidgets = signal<AppId[]>(Object.keys(this.defs) as AppId[]);

  // ------------------------------------------------------------ counters
  protected ablieferungenInVerarbeitung(): number {
    return this.data.ablieferungen.filter((a) => a.status === 'in Verarbeitung').length;
  }

  protected fehlgeschlagene(): number {
    return this.data.ausfuehrungen().filter((a) => a.status === 'fehlgeschlagen').length;
  }

  protected akzessionenOffen(): number {
    return this.data.akzessionen().filter((a) => a.status === 'InBearbeitung').length;
  }

  // ------------------------------------------------------------ charts
  protected readonly formatPie = computed(() =>
    this.data.extensionStats().map((s, i) => ({ label: s.extension, value: s.count, color: CHART_COLORS[i % CHART_COLORS.length] })),
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

  protected readonly ablieferungPie = computed(() => {
    const count = (s: string) => this.data.ablieferungen.filter((a) => a.status === s).length;
    return [
      { label: 'bestätigt', value: count('bestätigt'), color: '#009FE3' },
      { label: 'in Verarbeitung', value: count('in Verarbeitung'), color: '#5BC4F0' },
      { label: 'ausgesondert', value: count('ausgesondert'), color: '#586475' },
    ];
  });

  protected readonly magazinBars = computed(() =>
    this.data.magazinChildren(null).map((m) => ({ label: m.kuerzel, value: m.belegtLaufmeter ?? 0 })),
  );

  protected magazinAuslastung(): number {
    const roots = this.data.magazinChildren(null);
    const kap = roots.reduce((s, m) => s + (m.kapazitaetLaufmeter ?? 0), 0);
    const bel = roots.reduce((s, m) => s + (m.belegtLaufmeter ?? 0), 0);
    return kap > 0 ? Math.round((bel / kap) * 100) : 0;
  }

  // ------------------------------------------------------------ lists
  protected readonly letzteAusfuehrungen = computed(() =>
    [...this.data.ausfuehrungen()].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt)).slice(0, 4),
  );

  protected topRisiken() {
    const order = { hoch: 0, mittel: 1, tief: 2 };
    return [...this.data.formatRisiken].sort((a, b) => order[a.risiko] - order[b.risiko]).slice(0, 6);
  }

  protected juengsteAkzessionen() {
    return [...this.data.akzessionen()].sort((a, b) => b.uebernahmedatum.localeCompare(a.uebernahmedatum)).slice(0, 4);
  }

  // ------------------------------------------------------------ navigation
  protected openExtension(ext: string): void {
    this.ais.openApp('preservation', 'ext:' + ext);
  }

  protected openAusfuehrung(id: string): void {
    this.ais.openApp('verarbeitung', id);
  }

  protected openFehlgeschlagene(): void {
    const first = this.data.ausfuehrungen().find((a) => a.status === 'fehlgeschlagen');
    this.ais.openApp('verarbeitung', first?.id ?? '');
  }

  protected pillClass(status: string): string {
    switch (status) {
      case 'fertig': return 'pill ok';
      case 'fehlgeschlagen': return 'pill err';
      case 'laufend': return 'pill run';
      case 'wartend': return 'pill wait';
      default: return 'pill abort';
    }
  }
}
