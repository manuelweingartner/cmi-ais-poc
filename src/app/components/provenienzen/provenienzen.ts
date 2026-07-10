import { Component, computed, inject, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { AisService } from '../../services/ais.service';
import { PieChart } from '../charts/pie-chart';
import { KpiTile } from '../charts/kpi-tile';
import { Provenienz } from '../../models/ais.model';

@Component({
  selector: 'app-provenienzen',
  standalone: true,
  imports: [AppShell, PieChart, KpiTile],
  template: `
    <app-shell appName="Provenienzen" iconWhite="icons/provenienzen-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Dashboard -->
        @case ('dashboard') {
          <div class="over-head"><h2>Dashboard</h2></div>
          <div class="kpi-row">
            <app-kpi-tile title="Provenienzen" [value]="data.provenienzen.length" sub="nach ISAAR(CPF)" />
            <app-kpi-tile title="Mit GND-Verknüpfung" [value]="mitGnd()" sub="Normdatenlinks" />
            <app-kpi-tile title="In Prüfung / Bearbeitung" [value]="offene()" sub="Provenienzstatus" />
            <app-kpi-tile title="Verknüpfte Bestände" [value]="verknuepfteBestaende()" sub="Provenienz an VE" />
          </div>
          <div class="two-col">
            <div class="panel">
              <div class="panel-head"><h2>Provenienzen nach Typ (ISAAR-CPF)</h2></div>
              <app-pie-chart [data]="typPie()" [innerRatio]="0.62" />
            </div>
            <div class="panel">
              <div class="panel-head"><h2>Ohne GND-Verknüpfung</h2></div>
              <p class="hint">Kandidaten für den GND-Abgleich (Normdatenpflege).</p>
              @for (p of ohneGnd(); track p.id) {
                <div class="row" (click)="openDetail(p)">
                  <i class="material-icons">{{ typIcon(p.typ) }}</i>
                  <div class="row-body">
                    <a class="row-title">{{ p.name }}</a>
                    <div class="row-sub">{{ p.identifikatorNormdatei }} | {{ p.typ }}</div>
                  </div>
                  <span class="pill" [class]="statusPill(p.status)">{{ p.status }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- ================================================= Liste -->
        @case ('liste') {
          @if (selected(); as sel) {
            <div class="panel">
              <button class="back" type="button" (click)="selected.set(null)">
                <i class="material-icons">arrow_back</i> Alle Provenienzen
              </button>
              <div class="detail-head">
                <i class="material-icons big-icon">{{ typIcon(sel.typ) }}</i>
                <h2>{{ sel.name }}</h2>
                <span class="pill" [class]="statusPill(sel.status)">{{ sel.status }}</span>
              </div>
              <div class="meta-grid">
                <div class="field"><span class="fl">Identifikator Normdatei</span><span class="fv">{{ sel.identifikatorNormdatei }}</span></div>
                <div class="field"><span class="fl">Typ (ISAAR-CPF)</span><span class="fv">{{ sel.typ }}</span></div>
                <div class="field full"><span class="fl">Geschichte</span><span class="fv">{{ sel.geschichte || '-' }}</span></div>
              </div>

              <h3>Beziehungen</h3>
              <div class="two-col-narrow">
                <div>
                  <div class="fl">Vorgänger</div>
                  @for (id of sel.vorgaengerIds; track id) {
                    @if (data.provenienzById(id); as p) {
                      <a class="rel-link" (click)="openDetail(p)"><i class="material-icons">arrow_back</i>{{ p.name }}</a>
                    }
                  } @empty {
                    <span class="dim">Keine</span>
                  }
                </div>
                <div>
                  <div class="fl">Nachfolger</div>
                  @for (id of sel.nachfolgerIds; track id) {
                    @if (data.provenienzById(id); as p) {
                      <a class="rel-link" (click)="openDetail(p)">{{ p.name }}<i class="material-icons">arrow_forward</i></a>
                    }
                  } @empty {
                    <span class="dim">Keine</span>
                  }
                </div>
              </div>

              <h3>Normdatenlink</h3>
              @if (sel.gndId) {
                <div class="meta-grid">
                  <div class="field"><span class="fl">Normdatenquelle</span><span class="fv">GND (Gemeinsame Normdatei)</span></div>
                  <div class="field"><span class="fl">Identifikator</span><span class="fv">{{ sel.gndId }}</span></div>
                  <div class="field"><span class="fl">Letzter Abgleich</span><span class="fv">{{ sel.letzterAbgleich || '-' }}</span></div>
                </div>
                <div class="detail-actions">
                  <button class="btn" type="button" (click)="gndExplorer(sel)">
                    <i class="material-icons">travel_explore</i> Im GND Explorer öffnen
                  </button>
                  <button class="btn" type="button" (click)="toast.show('GND-Sync ausgeführt: Felder mit der Normdatei abgeglichen (simuliert).')">
                    <i class="material-icons">sync</i> Mit GND abgleichen
                  </button>
                </div>
              } @else {
                <p class="dim">Keine GND-Verknüpfung erfasst.</p>
                <button class="btn" type="button" (click)="toast.show('Provenienz mit GND verknüpfen: im Prototyp nicht ausgeführt.')">
                  <i class="material-icons">add_link</i> Mit GND verknüpfen
                </button>
              }

              <h3>Verknüpfte Verzeichnungseinheiten</h3>
              @for (ve of vesZuProvenienz(sel.id); track ve.id) {
                <div class="ve-row" (click)="openVe(ve.id)">
                  <i class="material-icons">inventory_2</i>
                  <span class="sig">{{ ve.signatur }}</span>
                  <span class="titel-link">{{ ve.titel }}</span>
                </div>
              } @empty {
                <p class="dim">Keine VEs verknüpft.</p>
              }

              @if (gndOpen()) {
                <div class="dialog-backdrop" (click)="gndOpen.set(false)">
                  <div class="dialog" (click)="$event.stopPropagation()">
                    <h3>GND Explorer (Mock)</h3>
                    <div class="gnd-card">
                      <div class="gnd-name">{{ sel.name }}</div>
                      <div class="gnd-row"><span class="fl">GND-ID</span><span>{{ sel.gndId }}</span></div>
                      <div class="gnd-row"><span class="fl">Typ</span><span>{{ sel.typ }}</span></div>
                      <div class="gnd-row"><span class="fl">Letzter Abgleich</span><span>{{ sel.letzterAbgleich }}</span></div>
                      <p class="hint">Die Anbindung an die GND erfolgt produktiv über den GND-Explorer mit Sync auf Provenienz und Register.</p>
                    </div>
                    <button class="btn" type="button" (click)="gndOpen.set(false)">Schliessen</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="panel">
              <div class="panel-head">
                <h2>Provenienzen</h2>
                <button class="btn" type="button" (click)="toast.show('Provenienz erfassen: im Prototyp nicht ausgeführt.')">
                  <i class="material-icons">add</i> Provenienz erfassen
                </button>
              </div>
              <p class="hint">Provenienzen dokumentieren die Herkunft des Archivguts normiert nach ISAAR(CPF). Der Identifikator wird auf Pflicht und Eindeutigkeit geprüft (PVZ101/PVZ103).</p>
              <table class="tbl">
                <thead>
                  <tr><th>Identifikator</th><th>Name</th><th>Typ</th><th>GND</th><th>Status</th></tr>
                </thead>
                <tbody>
                  @for (p of data.provenienzen; track p.id) {
                    <tr (click)="openDetail(p)">
                      <td>{{ p.identifikatorNormdatei }}</td>
                      <td class="link">{{ p.name }}</td>
                      <td>{{ p.typ }}</td>
                      <td>{{ p.gndId || '-' }}</td>
                      <td><span class="pill" [class]="statusPill(p.status)">{{ p.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
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
    .two-col-narrow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 6px; }
    .panel { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 16px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1rem; font-weight: 500; color: #33485e; }
    h3 { margin: 18px 0 8px; font-size: 0.88rem; font-weight: 500; color: #33485e; border-bottom: 1px solid #edf0f2; padding-bottom: 6px; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 12px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 9px 2px; border-bottom: 1px solid #edf0f2; cursor: pointer; }
    .row:hover { background: #f7fafc; }
    .row .material-icons { color: #7d8794; font-size: 21px; }
    .row-body { flex: 1; min-width: 0; }
    .row-title { color: #009fe3; font-size: 0.85rem; }
    .row-sub { font-size: 0.72rem; color: #9aa3ae; margin-top: 2px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .tbl th { text-align: left; font-size: 0.7rem; color: #9aa3ae; font-weight: 500; padding: 8px 10px; border-bottom: 1px solid #e4e7ea; }
    .tbl td { padding: 9px 10px; border-bottom: 1px solid #edf0f2; color: #586475; }
    .tbl tbody tr { cursor: pointer; }
    .tbl tbody tr:hover { background: #f7fafc; }
    .link { color: #009fe3; }
    .dim { color: #9aa3ae; font-size: 0.8rem; }
    .pill { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.72rem; white-space: nowrap; }
    .pill.ok { background: #e4f2dc; color: #3f971a; }
    .pill.warn { background: #fdf1d8; color: #9a7318; }
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #009fe3; cursor: pointer; font-size: 0.82rem; padding: 0 0 12px; }
    .back .material-icons { font-size: 17px; }
    .detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .big-icon { font-size: 30px; color: #586475; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 24px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field.full { grid-column: 1 / -1; }
    .fl { font-size: 0.68rem; color: #9aa3ae; margin-bottom: 4px; }
    .fv { font-size: 0.82rem; color: #586475; }
    .rel-link { display: flex; align-items: center; gap: 6px; color: #009fe3; cursor: pointer; font-size: 0.83rem; padding: 3px 0; }
    .rel-link:hover { text-decoration: underline; }
    .rel-link .material-icons { font-size: 15px; }
    .ve-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #edf0f2; cursor: pointer; font-size: 0.82rem; }
    .ve-row .material-icons { font-size: 17px; color: #7d8794; }
    .ve-row .sig { color: #33485e; font-weight: 500; }
    .titel-link { color: #009fe3; }
    .detail-actions { display: flex; gap: 10px; margin-top: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd6dc; background: #fff; color: #586475; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; }
    .btn:hover { background: #f4f6f8; }
    .btn .material-icons { font-size: 17px; }
    .dialog-backdrop { position: fixed; inset: 0; background: rgba(30, 40, 54, 0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .dialog { background: #fff; border-radius: 3px; padding: 20px 24px; min-width: 380px; max-width: 520px; display: flex; flex-direction: column; gap: 8px; }
    .dialog h3 { margin: 0; border: none; padding: 0; }
    .dialog .btn { align-self: flex-end; }
    .gnd-card { border: 1px solid #e4e7ea; border-radius: 3px; padding: 14px; }
    .gnd-name { font-size: 0.95rem; color: #33485e; font-weight: 500; margin-bottom: 8px; }
    .gnd-row { display: flex; gap: 12px; font-size: 0.82rem; color: #586475; padding: 3px 0; }
    .gnd-row .fl { min-width: 120px; margin: 0; }
  `],
})
export class ProvenienzenApp {
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  private readonly ais = inject(AisService);

  protected readonly menu: AppMenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'liste', label: 'Provenienzen', icon: 'groups' },
  ];
  protected readonly activeMenu = signal('dashboard');
  protected readonly selected = signal<Provenienz | null>(null);
  protected readonly gndOpen = signal(false);

  constructor() {
    const target = this.ais.consumeNavTarget('provenienzen');
    if (target) {
      const p = this.data.provenienzen.find((x) => x.id === target);
      if (p) {
        this.selected.set(p);
        this.activeMenu.set('liste');
      }
    }
  }

  protected mitGnd(): number {
    return this.data.provenienzen.filter((p) => !!p.gndId).length;
  }

  protected offene(): number {
    return this.data.provenienzen.filter((p) => p.status !== 'Abgeschlossen').length;
  }

  protected verknuepfteBestaende(): number {
    return this.data.ves().filter((v) => !!v.provenienzId).length;
  }

  protected readonly typPie = computed(() => {
    const count = (t: string) => this.data.provenienzen.filter((p) => p.typ === t).length;
    return [
      { label: 'Körperschaft', value: count('Körperschaft'), color: '#009FE3' },
      { label: 'Person', value: count('Person'), color: '#5BC4F0' },
      { label: 'Familie', value: count('Familie'), color: '#0066A1' },
    ];
  });

  protected ohneGnd(): Provenienz[] {
    return this.data.provenienzen.filter((p) => !p.gndId);
  }

  protected vesZuProvenienz(provId: string) {
    return this.data.ves().filter((v) => v.provenienzId === provId);
  }

  protected openDetail(p: Provenienz): void {
    this.selected.set(p);
    this.activeMenu.set('liste');
  }

  protected gndExplorer(p: Provenienz): void {
    this.gndOpen.set(true);
  }

  protected openVe(id: string): void {
    this.ais.openApp('tektonik', id);
  }

  protected typIcon(typ: Provenienz['typ']): string {
    return typ === 'Körperschaft' ? 'account_balance' : typ === 'Person' ? 'person' : 'groups';
  }

  protected statusPill(status: Provenienz['status']): string {
    return status === 'Abgeschlossen' ? 'pill ok' : status === 'InPruefung' ? 'pill warn' : 'pill run';
  }
}
