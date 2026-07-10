import { Component, computed, inject, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { AisService } from '../../services/ais.service';
import { PieChart } from '../charts/pie-chart';
import { KpiTile } from '../charts/kpi-tile';
import { Ablieferung, PruefResultat } from '../../models/ais.model';

@Component({
  selector: 'app-datenuebernahme',
  standalone: true,
  imports: [AppShell, PieChart, KpiTile],
  template: `
    <app-shell appName="Datenübernahme" iconWhite="icons/datenuebernahme-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Übersicht -->
        @case ('uebersicht') {
          <div class="over-head"><h2>Übersicht</h2></div>
          <div class="kpi-row">
            <app-kpi-tile title="Ablieferungen 2026" [value]="data.ablieferungen.length" sub="eCH-0160 (arelda)" />
            <app-kpi-tile title="Bestätigt" [value]="countByStatus('bestätigt')" sub="Quittung erzeugt" />
            <app-kpi-tile title="In Verarbeitung" [value]="countByStatus('in Verarbeitung')" sub="inkl. Korrekturschleifen" />
            <app-kpi-tile title="Ausgesondert" [value]="countByStatus('ausgesondert')" sub="beim Aktenbildner angekündigt" />
          </div>

          <div class="two-col">
            <div class="panel">
              <div class="panel-head"><h2>Ablieferungen nach Status</h2></div>
              <app-pie-chart [data]="statusPie()" [innerRatio]="0.62" />
            </div>
            <div class="panel">
              <div class="panel-head"><h2>Letzte Ablieferungen</h2></div>
              @for (a of data.ablieferungen; track a.id) {
                <div class="abl-row" (click)="openAblieferung(a)">
                  <i class="material-icons">inventory_2</i>
                  <div class="abl-body">
                    <a class="abl-title">{{ a.nummer }}: {{ a.titel }}</a>
                    <div class="abl-sub">{{ a.ablieferndeStelle }} | Eingang {{ a.eingangsdatum }}</div>
                  </div>
                  <span class="pill" [class]="ablClass(a.status)">{{ a.status }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- ================================================= Ablieferungen -->
        @case ('ablieferungen') {
          @if (selected(); as sel) {
            <div class="panel">
              <button class="back" type="button" (click)="selected.set(null)">
                <i class="material-icons">arrow_back</i> Alle Ablieferungen
              </button>
              <div class="detail-head">
                <h2>{{ sel.nummer }}: {{ sel.titel }}</h2>
                <span class="pill" [class]="ablClass(sel.status)">{{ sel.status }}</span>
              </div>
              <div class="meta-grid">
                <div class="field"><span class="fl">Abliefernde Stelle</span><span class="fv">{{ sel.ablieferndeStelle }}</span></div>
                <div class="field"><span class="fl">Eingangsdatum</span><span class="fv">{{ sel.eingangsdatum }}</span></div>
                <div class="field"><span class="fl">SIP-Format</span><span class="fv">{{ sel.sipFormat }}</span></div>
                <div class="field"><span class="fl">SIP-Version</span><span class="fv">{{ sel.sipVersion }}</span></div>
              </div>

              <h3>Validierung (Ingest)</h3>
              @for (v of sel.validierungen; track v.schritt) {
                <div class="val-step">
                  <i class="material-icons" [class]="valClass(v.resultat)">{{ valIcon(v.resultat) }}</i>
                  <div class="val-body">
                    <div class="val-name">{{ v.schritt }}</div>
                    <div class="val-detail">{{ v.detail }}</div>
                  </div>
                </div>
              }

              <div class="detail-actions">
                @if (sipFile(sel); as sip) {
                  <a class="btn" [href]="sip.path" target="_blank"><i class="material-icons">folder_zip</i> SIP-Paket herunterladen</a>
                }
                @if (quittungFile(sel); as q) {
                  <a class="btn" [href]="q.path" target="_blank"><i class="material-icons">receipt_long</i> Ablieferungsquittung herunterladen</a>
                }
                <button class="btn primary" type="button" [disabled]="sel.status !== 'bestätigt'" (click)="importInTektonik()">
                  <i class="material-icons">account_tree</i> Import aus Ingest (in Tektonik)
                </button>
              </div>
            </div>
          } @else {
            <div class="panel">
              <div class="panel-head">
                <h2>Ablieferungen</h2>
                <button class="btn" type="button" (click)="toast.show('SIP-Upload: im Prototyp nicht ausgeführt.')">
                  <i class="material-icons">upload_file</i> SIP hochladen
                </button>
              </div>
              <p class="hint">Ablieferungen werden als SIP (eCH-0160, ZIP) übernommen: per Upload, überwachtem FTP-Ordner oder REST-Schnittstelle.</p>
              <table class="tbl">
                <thead>
                  <tr><th>Nummer</th><th>Titel</th><th>Abliefernde Stelle</th><th>Eingang</th><th>SIP-Version</th><th>Status</th></tr>
                </thead>
                <tbody>
                  @for (a of data.ablieferungen; track a.id) {
                    <tr (click)="openAblieferung(a)">
                      <td class="link">{{ a.nummer }}</td>
                      <td>{{ a.titel }}</td>
                      <td>{{ a.ablieferndeStelle }}</td>
                      <td>{{ a.eingangsdatum }}</td>
                      <td>{{ a.sipVersion }}</td>
                      <td><span class="pill" [class]="ablClass(a.status)">{{ a.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        <!-- ================================================= Dateien in Verarbeitung -->
        @case ('dateien') {
          <div class="panel">
            <div class="panel-head"><h2>Dateien in Verarbeitung</h2></div>
            <p class="hint">Der automatische Import überwacht den Import-Ordner. Je Resultat wird die Datei verschoben: Erfolg in Success, Schema-/Strukturfehler in Bad, sonstige zur manuellen Prüfung.</p>
            <table class="tbl">
              <thead>
                <tr><th>Dateiname</th><th>Datum</th><th>Status</th><th>Log</th></tr>
              </thead>
              <tbody>
                @for (f of data.importDateien; track f.dateiname) {
                  <tr>
                    <td class="mono small-text">{{ f.dateiname }}</td>
                    <td>{{ f.datum }}</td>
                    <td><span class="pill" [class]="importClass(f.status)">{{ f.status }}</span></td>
                    <td class="dim">{{ f.log }}</td>
                  </tr>
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
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 1100px) { .two-col { grid-template-columns: 1fr; } }
    .panel { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 16px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1rem; font-weight: 500; color: #33485e; }
    h3 { margin: 18px 0 10px; font-size: 0.9rem; font-weight: 500; color: #33485e; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 14px; }
    .abl-row { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid #edf0f2; cursor: pointer; }
    .abl-row:hover { background: #f7fafc; }
    .abl-row .material-icons { color: #7d8794; font-size: 22px; }
    .abl-body { flex: 1; min-width: 0; }
    .abl-title { color: #009fe3; font-size: 0.86rem; }
    .abl-sub { font-size: 0.72rem; color: #9aa3ae; margin-top: 2px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .tbl th { text-align: left; font-size: 0.7rem; color: #9aa3ae; font-weight: 500; padding: 8px 10px; border-bottom: 1px solid #e4e7ea; }
    .tbl td { padding: 9px 10px; border-bottom: 1px solid #edf0f2; color: #586475; }
    .tbl tbody tr { cursor: pointer; }
    .tbl tbody tr:hover { background: #f7fafc; }
    .link { color: #009fe3; }
    .dim { color: #9aa3ae; }
    .mono { font-family: 'Roboto Mono', monospace; }
    .small-text { font-size: 0.72rem; }
    .pill { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.72rem; white-space: nowrap; }
    .pill.ok { background: #e4f2dc; color: #3f971a; }
    .pill.err { background: #f7dede; color: #8c0909; }
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .pill.wait { background: #eef0f2; color: #586475; }
    .pill.warn { background: #fdf1d8; color: #9a7318; }
    .back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #009fe3; cursor: pointer; font-size: 0.82rem; padding: 0 0 12px; }
    .back .material-icons { font-size: 17px; }
    .detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 24px; margin-bottom: 6px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .fl { font-size: 0.68rem; color: #9aa3ae; }
    .fv { font-size: 0.82rem; color: #586475; }
    .val-step { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #edf0f2; }
    .val-step .material-icons { font-size: 19px; margin-top: 1px; }
    .val-ok { color: #3f971a; }
    .val-err { color: #8c0909; }
    .val-wait { color: #9aa3ae; }
    .val-name { font-size: 0.85rem; color: #33485e; }
    .val-detail { font-size: 0.76rem; color: #7d8794; margin-top: 2px; }
    .detail-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd6dc; background: #fff; color: #586475; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; text-decoration: none; }
    .btn:hover:not([disabled]) { background: #f4f6f8; }
    .btn[disabled] { opacity: 0.45; cursor: default; }
    .btn.primary { background: #009fe3; border-color: #009fe3; color: #fff; }
    .btn.primary:hover:not([disabled]) { background: #008fcc; }
    .btn .material-icons { font-size: 17px; }
  `],
})
export class DatenuebernahmeApp {
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  private readonly ais = inject(AisService);

  protected readonly menu: AppMenuItem[] = [
    { id: 'uebersicht', label: 'Übersicht', icon: 'dashboard' },
    { id: 'ablieferungen', label: 'Ablieferungen', icon: 'inventory_2' },
    { id: 'dateien', label: 'Dateien in Verarbeitung', icon: 'hourglass_top' },
  ];
  protected readonly activeMenu = signal('uebersicht');
  protected readonly selected = signal<Ablieferung | null>(null);

  constructor() {
    const target = this.ais.consumeNavTarget('datenuebernahme');
    if (target) {
      const a = this.data.ablieferungen.find((x) => x.id === target);
      if (a) this.openAblieferung(a);
    }
  }

  protected readonly statusPie = computed(() => [
    { label: 'bestätigt', value: this.countByStatus('bestätigt'), color: '#009FE3' },
    { label: 'in Verarbeitung', value: this.countByStatus('in Verarbeitung'), color: '#5BC4F0' },
    { label: 'ausgesondert', value: this.countByStatus('ausgesondert'), color: '#586475' },
  ]);

  protected countByStatus(status: Ablieferung['status']): number {
    return this.data.ablieferungen.filter((a) => a.status === status).length;
  }

  protected openAblieferung(a: Ablieferung): void {
    this.selected.set(a);
    this.activeMenu.set('ablieferungen');
  }

  protected sipFile(a: Ablieferung) {
    return this.data.fileById(a.sipDateiId);
  }

  protected quittungFile(a: Ablieferung) {
    return this.data.fileById(a.quittungDateiId);
  }

  protected importInTektonik(): void {
    this.toast.show('Import aus Ingest: VE-Hierarchie wurde in die Tektonik eingehängt (siehe Tektonik-App).');
    this.ais.openApp('tektonik');
  }

  protected ablClass(status: Ablieferung['status']): string {
    switch (status) {
      case 'bestätigt': return 'pill ok';
      case 'in Verarbeitung': return 'pill run';
      case 'ausgesondert': return 'pill wait';
    }
  }

  protected importClass(status: string): string {
    switch (status) {
      case 'Success': return 'pill ok';
      case 'Bad': return 'pill err';
      case 'Manuell': return 'pill warn';
      default: return 'pill run';
    }
  }

  protected valIcon(r: PruefResultat): string {
    return r === 'ok' ? 'check_circle' : r === 'fehler' ? 'error' : 'schedule';
  }

  protected valClass(r: PruefResultat): string {
    return r === 'ok' ? 'val-ok' : r === 'fehler' ? 'val-err' : 'val-wait';
  }
}
