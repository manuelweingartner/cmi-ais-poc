import { Component, computed, inject, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { AisService } from '../../services/ais.service';
import { PieChart } from '../charts/pie-chart';
import { KpiTile } from '../charts/kpi-tile';
import { ArchivDatei } from '../../models/ais.model';
import { CHART_COLORS } from '../charts/chart-colors';

@Component({
  selector: 'app-preservation',
  standalone: true,
  imports: [AppShell, PieChart, KpiTile],
  template: `
    <app-shell appName="Preservation Planing" iconWhite="icons/preservation-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Übersicht (Folie 13) -->
        @case ('uebersicht') {
          @if (selectedFile(); as f) {
            <!-- ------------------------------ Datei-Detail (Original/Rendition/PREMIS) -->
            <div class="panel">
              <button class="back" type="button" (click)="selectedFile.set(null)">
                <i class="material-icons">arrow_back</i> Zurück zur Dateiliste
              </button>
              <div class="detail-head">
                <h2>{{ f.titel }}</h2>
                <span class="pill neutral">{{ f.extension }}</span>
              </div>
              <div class="meta-grid">
                <div class="field"><span class="fl">Dateiname</span><span class="fv">{{ f.fileName }}</span></div>
                <div class="field"><span class="fl">PID</span><span class="fv">{{ f.pid }}</span></div>
                <div class="field"><span class="fl">Format (FIDO)</span><span class="fv">{{ f.formatName }} {{ f.formatVersion }}</span></div>
                @if (f.puid) {
                  <div class="field"><span class="fl">PRONOM PUID</span><span class="fv">{{ f.puid }}</span></div>
                }
                <div class="field"><span class="fl">Grösse</span><span class="fv">{{ formatBytes(f.sizeBytes) }}</span></div>
                <div class="field"><span class="fl">Fixity (SHA-512)</span><span class="fv mono" [title]="f.sha512">{{ f.sha512.slice(0, 24) }}...</span></div>
                <div class="field"><span class="fl">Verzeichnungseinheit</span><span class="fv">{{ f.veSignatur }} {{ f.veTitel }}</span></div>
              </div>

              <!-- Original / Rendition / PREMIS (SBO Folie 63) -->
              <h3>Repräsentationen</h3>
              <div class="repr-grid">
                <div class="repr-col">
                  <div class="repr-title">Original</div>
                  @if (originalOf(f); as orig) {
                    <a class="repr-file" [href]="orig.path" target="_blank">
                      <i class="material-icons">description</i>{{ orig.fileName }}
                    </a>
                  } @else {
                    <a class="repr-file" [href]="f.path" target="_blank">
                      <i class="material-icons">description</i>{{ f.fileName }}
                    </a>
                  }
                </div>
                <div class="repr-col">
                  <div class="repr-title">Rendition</div>
                  @for (r of renditionsOf(f); track r.id) {
                    <a class="repr-file" [href]="r.path" target="_blank">
                      <i class="material-icons">picture_as_pdf</i>{{ r.fileName }}
                    </a>
                  } @empty {
                    <span class="dim">Keine Rendition</span>
                  }
                </div>
                <div class="repr-col">
                  <div class="repr-title">PREMIS</div>
                  @for (e of f.premisEvents; track $index) {
                    <div class="premis-chip"><i class="material-icons">data_object</i>{{ e.typ }}</div>
                  }
                </div>
              </div>

              <h3>PREMIS-Ereignisse</h3>
              @for (e of f.premisEvents; track $index) {
                <div class="event">
                  <i class="material-icons ev-icon">check_circle</i>
                  <div class="ev-body">
                    <div class="ev-head"><span class="ev-typ">{{ e.typ }}</span><span class="ev-date">{{ e.datum }}</span><span class="pill ok small">{{ e.resultat }}</span></div>
                    <div class="ev-detail">{{ e.detail }}</div>
                  </div>
                </div>
              }

              <div class="detail-actions">
                <a class="btn primary" [href]="f.path" target="_blank">
                  <i class="material-icons">open_in_new</i> Datei öffnen
                </a>
                <button class="btn" type="button" (click)="toast.show('Fixity-Prüfung für diese Datei eingeplant (Workflow R-110).')">
                  <i class="material-icons">verified</i> Fixity prüfen
                </button>
              </div>
            </div>
          } @else if (extFilter(); as ext) {
            <!-- ------------------------------ Dateiliste je Erweiterung -->
            <div class="panel">
              <button class="back" type="button" (click)="extFilter.set(null)">
                <i class="material-icons">arrow_back</i> Zurück zur Übersicht
              </button>
              <div class="panel-head">
                <h2>Dateien mit Erweiterung "{{ ext }}" ({{ filteredFiles().length }})</h2>
              </div>
              <table class="tbl">
                <thead>
                  <tr><th>Titel</th><th>Dateiname</th><th>Format (FIDO)</th><th>Grösse</th><th>PID</th><th>VE</th><th></th></tr>
                </thead>
                <tbody>
                  @for (f of filteredFiles(); track f.id) {
                    <tr (click)="selectedFile.set(f)">
                      <td class="link">{{ f.titel }}</td>
                      <td class="mono small-text">{{ f.fileName }}</td>
                      <td>{{ f.formatName }}</td>
                      <td>{{ formatBytes(f.sizeBytes) }}</td>
                      <td class="mono small-text">{{ f.pid }}</td>
                      <td>{{ f.veSignatur }}</td>
                      <td><a class="open-link" [href]="f.path" target="_blank" (click)="$event.stopPropagation()" title="Datei öffnen"><i class="material-icons">open_in_new</i></a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <!-- ------------------------------ Übersicht -->
            <div class="over-head"><h2>Übersicht</h2></div>
            <div class="kpi-row">
              <app-kpi-tile title="Speicher belegt" [value]="formatBytes(data.totalBytes())" sub="Repository (Primärdaten)" [spark]="[42, 48, 55, 61, 64, 71, 78, 84]" />
              <app-kpi-tile title="Dateien im AIS" [value]="data.dateien.length" sub="mit PREMIS-Metadaten" />
              <app-kpi-tile title="AIPs im Repository" [value]="data.dateien.length" sub="mit PID referenziert" />
              <app-kpi-tile title="Fixity-Abweichungen" [value]="0" sub="Letzte Prüfung: 30.06.2026 (R-110)" />
            </div>

            <div class="two-col">
              <div class="panel">
                <div class="panel-head">
                  <h2>Dateierweiterungen im Repository</h2>
                </div>
                <app-pie-chart [data]="pieData()" [clickable]="true" (sliceClick)="extFilter.set($event)" />
              </div>

              <div class="panel">
                <div class="panel-head"><h2>Dateierweiterungen</h2></div>
                <table class="tbl">
                  <thead>
                    <tr>
                      <th class="sortable" (click)="toggleSort('extension')">Dateierweiterung @if (sortBy() === 'extension') {<i class="material-icons sort-ind">{{ sortAsc() ? 'arrow_drop_up' : 'arrow_drop_down' }}</i>}</th>
                      <th class="sortable" (click)="toggleSort('count')">Dokumente @if (sortBy() === 'count') {<i class="material-icons sort-ind">{{ sortAsc() ? 'arrow_drop_up' : 'arrow_drop_down' }}</i>}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of sortedStats(); track row.extension) {
                      <tr>
                        <td>{{ row.extension }}</td>
                        <td>{{ row.count }}</td>
                        <td><button class="btn small" type="button" (click)="extFilter.set(row.extension)">Anzeigen</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="panel risiko-panel">
              <div class="panel-head"><h2>Formatrisiken und Erhaltungsstrategien</h2></div>
              <p class="hint">Risiken werden je Format bewertet; Erhaltungsstrategien: Migration, Emulation, Monitoring. Massnahmen werden über Verarbeitungs-Workflows ausgelöst (z.B. A-725 PDF Konv).</p>
              <table class="tbl">
                <thead>
                  <tr><th>Format</th><th>Erweiterung</th><th>Risiko</th><th>Strategie</th><th>Begründung</th><th></th></tr>
                </thead>
                <tbody>
                  @for (r of data.formatRisiken; track r.extension) {
                    <tr>
                      <td>{{ r.formatName }}</td>
                      <td>{{ r.extension }}</td>
                      <td><span class="pill" [class]="riskClass(r.risiko)">{{ r.risiko }}</span></td>
                      <td>{{ r.strategie }}</td>
                      <td class="dim">{{ r.begruendung }}</td>
                      <td><button class="btn small" type="button" (click)="extFilter.set(r.extension)">Dateien</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        <!-- ================================================= Ausführungen -->
        @case ('ausfuehrungen') {
          <div class="panel">
            <div class="panel-head"><h2>Ausführungen (Preservation)</h2></div>
            <p class="hint">Erhaltungsmassnahmen laufen als Workflows im Repository (Typ Preservation): Fixity-Prüfungen, Formatmigrationen.</p>
            <table class="tbl">
              <thead>
                <tr><th>Nr</th><th>Objekt</th><th>Workflow</th><th>Ausführungszeitpunkt</th><th>Dauer</th><th>Status</th></tr>
              </thead>
              <tbody>
                @for (a of preservationRuns(); track a.id) {
                  <tr (click)="toggleRun(a.id)">
                    <td>{{ a.nr }}</td>
                    <td class="link">{{ a.objekt }}</td>
                    <td>{{ a.workflowCode }} {{ a.workflowName }}</td>
                    <td>{{ a.zeitpunkt }}</td>
                    <td>{{ a.dauer }}</td>
                    <td><span class="pill" [class]="statusClass(a.status)">{{ a.status }}</span></td>
                  </tr>
                  @if (openRun() === a.id) {
                    <tr class="run-detail">
                      <td colspan="6">
                        @for (s of a.schritte; track s.name) {
                          <div class="mini-step">
                            <span class="pill small" [class]="statusClass(s.status)">{{ s.status }}</span>
                            <span class="mini-step-name">{{ s.name }}</span>
                            @if (s.log.length > 0) {
                              <span class="mini-log mono">{{ s.log[s.log.length - 1] }}</span>
                            }
                          </div>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
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
    h3 { margin: 20px 0 10px; font-size: 0.9rem; font-weight: 500; color: #33485e; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 14px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .tbl th { text-align: left; font-size: 0.7rem; color: #9aa3ae; font-weight: 500; padding: 8px 10px; border-bottom: 1px solid #e4e7ea; white-space: nowrap; }
    .tbl th.sortable { cursor: pointer; user-select: none; }
    .sort-ind { font-size: 16px; vertical-align: middle; }
    .tbl td { padding: 8px 10px; border-bottom: 1px solid #edf0f2; color: #586475; }
    .tbl tbody tr { cursor: pointer; }
    .tbl tbody tr:hover { background: #f7fafc; }
    .link { color: #009fe3; }
    .dim { color: #9aa3ae; }
    .mono { font-family: 'Roboto Mono', monospace; }
    .small-text { font-size: 0.72rem; }
    .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd6dc; background: #fff; color: #586475; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; text-decoration: none; }
    .btn:hover { background: #f4f6f8; }
    .btn.small { padding: 3px 12px; font-size: 0.74rem; }
    .btn.primary { background: #009fe3; border-color: #009fe3; color: #fff; }
    .btn.primary:hover { background: #008fcc; }
    .btn .material-icons { font-size: 17px; }
    .back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #009fe3; cursor: pointer; font-size: 0.82rem; padding: 0 0 12px; }
    .back .material-icons { font-size: 17px; }
    .detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .detail-actions { display: flex; gap: 10px; margin-top: 16px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 24px; margin-bottom: 6px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .fl { font-size: 0.68rem; color: #9aa3ae; }
    .fv { font-size: 0.82rem; color: #586475; word-break: break-all; }
    .pill { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.72rem; white-space: nowrap; }
    .pill.small { padding: 1px 8px; font-size: 0.66rem; }
    .pill.neutral { background: #eef0f2; color: #586475; }
    .pill.ok { background: #e4f2dc; color: #3f971a; }
    .pill.err { background: #f7dede; color: #8c0909; }
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .pill.wait { background: #eef0f2; color: #586475; }
    .pill.abort { background: #f0e6d8; color: #8a6d1a; }
    .pill.r-tief { background: #e4f2dc; color: #3f971a; }
    .pill.r-mittel { background: #fdf1d8; color: #9a7318; }
    .pill.r-hoch { background: #f7dede; color: #8c0909; }
    /* Repraesentationen (Folie 63) */
    .repr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .repr-col { border: 1px solid #e4e7ea; border-radius: 3px; padding: 12px; min-height: 82px; }
    .repr-title { font-size: 0.72rem; color: #9aa3ae; font-weight: 500; margin-bottom: 8px; letter-spacing: 0.4px; }
    .repr-file { display: flex; align-items: center; gap: 6px; color: #009fe3; text-decoration: none; font-size: 0.8rem; padding: 3px 0; }
    .repr-file:hover { text-decoration: underline; }
    .repr-file .material-icons { font-size: 18px; color: #586475; }
    .premis-chip { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #586475; padding: 3px 0; }
    .premis-chip .material-icons { font-size: 17px; color: #0a6ea8; }
    /* PREMIS events */
    .event { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #edf0f2; }
    .ev-icon { font-size: 18px; color: #3f971a; margin-top: 2px; }
    .ev-head { display: flex; align-items: center; gap: 10px; }
    .ev-typ { font-size: 0.84rem; color: #33485e; font-weight: 500; }
    .ev-date { font-size: 0.74rem; color: #9aa3ae; }
    .ev-detail { font-size: 0.78rem; color: #586475; margin-top: 2px; }
    .open-link { color: #586475; }
    .open-link .material-icons { font-size: 17px; }
    .risiko-panel { margin-top: 0; }
    .run-detail td { background: #f7f9fa; }
    .mini-step { display: flex; align-items: center; gap: 10px; padding: 3px 0; }
    .mini-step-name { font-size: 0.78rem; color: #33485e; min-width: 260px; }
    .mini-log { font-size: 0.7rem; color: #7d8794; }
  `],
})
export class PreservationApp {
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  private readonly ais = inject(AisService);

  constructor() {
    // Cross-app target: "ext:pdf" opens the file list for that extension.
    const target = this.ais.consumeNavTarget('preservation');
    if (target?.startsWith('ext:')) this.extFilter.set(target.slice(4));
  }

  protected readonly menu: AppMenuItem[] = [
    { id: 'uebersicht', label: 'Übersicht', icon: 'dashboard' },
    { id: 'ausfuehrungen', label: 'Ausführungen', icon: 'list_alt' },
  ];
  protected readonly activeMenu = signal('uebersicht');

  protected readonly extFilter = signal<string | null>(null);
  protected readonly selectedFile = signal<ArchivDatei | null>(null);
  protected readonly sortBy = signal<'extension' | 'count'>('extension');
  protected readonly sortAsc = signal(true);
  protected readonly openRun = signal<string | null>(null);

  protected readonly pieData = computed(() =>
    this.data.extensionStats().map((s, i) => ({ label: s.extension, value: s.count, color: CHART_COLORS[i % CHART_COLORS.length] })),
  );

  protected readonly sortedStats = computed(() => {
    const list = [...this.data.extensionStats()];
    const key = this.sortBy();
    const dir = this.sortAsc() ? 1 : -1;
    list.sort((a, b) => (key === 'extension' ? a.extension.localeCompare(b.extension) * dir : (a.count - b.count) * dir));
    return list;
  });

  protected readonly filteredFiles = computed(() => {
    const ext = this.extFilter();
    return ext ? this.data.dateien.filter((d) => d.extension === ext) : [];
  });

  protected readonly preservationRuns = computed(() =>
    this.data.ausfuehrungen().filter((a) => a.typ === 'Preservation'),
  );

  protected toggleSort(key: 'extension' | 'count'): void {
    if (this.sortBy() === key) this.sortAsc.set(!this.sortAsc());
    else {
      this.sortBy.set(key);
      this.sortAsc.set(true);
    }
  }

  protected toggleRun(id: string): void {
    this.openRun.update((cur) => (cur === id ? null : id));
  }

  protected renditionsOf(f: ArchivDatei): ArchivDatei[] {
    return this.data.dateien.filter((d) => d.renditionOf === f.id);
  }

  protected originalOf(f: ArchivDatei): ArchivDatei | undefined {
    return f.renditionOf ? this.data.dateien.find((d) => d.id === f.renditionOf) : undefined;
  }

  protected statusClass(status: string): string {
    switch (status) {
      case 'fertig': return 'pill ok';
      case 'fehlgeschlagen': return 'pill err';
      case 'laufend': return 'pill run';
      case 'wartend': return 'pill wait';
      default: return 'pill abort';
    }
  }

  protected riskClass(r: string): string {
    return `pill r-${r}`;
  }

  protected formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }
}
