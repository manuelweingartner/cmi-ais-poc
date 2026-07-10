import { Component, computed, inject, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { AisService } from '../../services/ais.service';
import { PieChart } from '../charts/pie-chart';
import { KpiTile } from '../charts/kpi-tile';
import { Akzession } from '../../models/ais.model';

@Component({
  selector: 'app-akzessionen',
  standalone: true,
  imports: [AppShell, PieChart, KpiTile],
  template: `
    <app-shell appName="Akzessionen" iconWhite="icons/akzessionen-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Dashboard -->
        @case ('dashboard') {
          <div class="over-head"><h2>Dashboard</h2></div>
          <div class="kpi-row">
            <app-kpi-tile title="Akzessionen" [value]="data.akzessionen().length" sub="Vor-Erschliessung von Übernahmen" />
            <app-kpi-tile title="In Bearbeitung" [value]="countStatus('InBearbeitung')" sub="offene Akzessionen" />
            <app-kpi-tile title="Abgeschlossen" [value]="countStatus('Abgeschlossen')" sub="inkl. VE-Erstellung" />
            <app-kpi-tile title="Umfang 2025/26" [value]="totalLaufmeter() + ' Lfm'" sub="übernommene Laufmeter" />
          </div>
          <div class="two-col">
            <div class="panel">
              <div class="panel-head"><h2>Akzessionen nach Status</h2></div>
              <app-pie-chart [data]="statusPie()" [innerRatio]="0.62" />
            </div>
            <div class="panel">
              <div class="panel-head"><h2>Jüngste Akzessionen</h2></div>
              @for (a of juengste(); track a.id) {
                <div class="row" (click)="openDetail(a)">
                  <i class="material-icons">move_to_inbox</i>
                  <div class="row-body">
                    <a class="row-title">{{ a.akzessionsnummer }}: {{ a.titel }}</a>
                    <div class="row-sub">{{ a.abgebendeStelle }} | Übernahme {{ a.uebernahmedatum }}</div>
                  </div>
                  <span class="pill" [class]="statusPill(a.status)">{{ a.status }}</span>
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
                <i class="material-icons">arrow_back</i> Alle Akzessionen
              </button>
              <div class="detail-head">
                <h2>{{ sel.akzessionsnummer }}: {{ sel.titel }}</h2>
                <span class="pill" [class]="statusPill(sel.status)">{{ sel.status }}</span>
              </div>
              <div class="meta-grid">
                <div class="field"><span class="fl">Akzessionsnummer</span><span class="fv">{{ sel.akzessionsnummer }}</span></div>
                <div class="field"><span class="fl">Abgebende Stelle</span><span class="fv">{{ sel.abgebendeStelle }}</span></div>
                <div class="field"><span class="fl">Erwerbsart</span><span class="fv">{{ sel.erwerbsart }}</span></div>
                <div class="field"><span class="fl">Zustandskategorie</span><span class="fv">{{ sel.zustandskategorie || '-' }}</span></div>
                <div class="field"><span class="fl">Entstehungszeitraum</span><span class="fv">{{ sel.entstehungszeitraum || '-' }}</span></div>
                <div class="field"><span class="fl">Umfang</span><span class="fv">{{ sel.umfangLaufmeter ? sel.umfangLaufmeter + ' Laufmeter' : '-' }}</span></div>
                <div class="field"><span class="fl">Übernahmedatum</span><span class="fv">{{ sel.uebernahmedatum }}</span></div>
                @if (sel.bemerkungen) {
                  <div class="field full"><span class="fl">Bemerkungen</span><span class="fv">{{ sel.bemerkungen }}</span></div>
                }
              </div>

              <h3>Erstellte Verzeichnungseinheiten (Cross-Link)</h3>
              @for (veId of sel.erstellteVeIds; track veId) {
                @if (data.veById(veId); as ve) {
                  <div class="ve-row" (click)="openVe(ve.id)">
                    <i class="material-icons">folder</i>
                    <span class="sig">{{ ve.signatur }}</span>
                    <span class="titel-link">{{ ve.titel }}</span>
                  </div>
                }
              } @empty {
                <p class="dim">Noch keine VEs aus dieser Akzession erstellt.</p>
              }

              <div class="detail-actions">
                <button class="btn" type="button" (click)="statuswechsel(sel)">
                  <i class="material-icons">{{ sel.status === 'Abgeschlossen' ? 'lock_open' : 'lock' }}</i>
                  {{ sel.status === 'Abgeschlossen' ? 'Wiedereröffnen' : 'Abschliessen' }}
                </button>
                <button class="btn primary" type="button" (click)="veErstellen(sel)">
                  <i class="material-icons">create_new_folder</i> Aus Akzession VE erstellen
                </button>
              </div>
              @if (sel.status === 'Abgeschlossen') {
                <p class="hint note"><i class="material-icons">info</i> Wiedereröffnen setzt das Recht "AkzessionenWiedereroeffnen" voraus (im Prototyp vorhanden).</p>
              }
            </div>
          } @else {
            <div class="panel">
              <div class="panel-head">
                <h2>Akzessionen</h2>
                <button class="btn" type="button" (click)="toast.show('Akzession erfassen: im Prototyp nicht ausgeführt.')">
                  <i class="material-icons">add</i> Akzession erfassen
                </button>
              </div>
              <p class="hint">Akzessionen dokumentieren Übernahmen vor der Tiefen-Erschliessung. Die Akzessionsnummer wird auf Pflicht und Eindeutigkeit geprüft (AKZ101/AKZ103, Mandant-Einstellung).</p>
              <table class="tbl">
                <thead>
                  <tr><th>Nummer</th><th>Titel</th><th>Abgebende Stelle</th><th>Erwerbsart</th><th>Umfang</th><th>Übernahme</th><th>Status</th></tr>
                </thead>
                <tbody>
                  @for (a of data.akzessionen(); track a.id) {
                    <tr (click)="openDetail(a)">
                      <td class="link">{{ a.akzessionsnummer }}</td>
                      <td>{{ a.titel }}</td>
                      <td>{{ a.abgebendeStelle }}</td>
                      <td>{{ a.erwerbsart }}</td>
                      <td>{{ a.umfangLaufmeter ? a.umfangLaufmeter + ' Lfm' : '-' }}</td>
                      <td>{{ a.uebernahmedatum }}</td>
                      <td><span class="pill" [class]="statusPill(a.status)">{{ a.status }}</span></td>
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
    .panel { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 16px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1rem; font-weight: 500; color: #33485e; }
    h3 { margin: 18px 0 8px; font-size: 0.88rem; font-weight: 500; color: #33485e; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 14px; }
    .hint.note { display: flex; align-items: center; gap: 6px; background: #eef7fc; border: 1px solid #cfe9f7; padding: 8px 10px; border-radius: 3px; color: #33607e; margin-top: 12px; }
    .hint.note .material-icons { font-size: 17px; color: #009fe3; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid #edf0f2; cursor: pointer; }
    .row:hover { background: #f7fafc; }
    .row .material-icons { color: #7d8794; font-size: 22px; }
    .row-body { flex: 1; min-width: 0; }
    .row-title { color: #009fe3; font-size: 0.86rem; }
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
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #009fe3; cursor: pointer; font-size: 0.82rem; padding: 0 0 12px; }
    .back .material-icons { font-size: 17px; }
    .detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 24px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field.full { grid-column: 1 / -1; }
    .fl { font-size: 0.68rem; color: #9aa3ae; }
    .fv { font-size: 0.82rem; color: #586475; }
    .ve-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #edf0f2; cursor: pointer; font-size: 0.82rem; }
    .ve-row .material-icons { font-size: 17px; color: #7d8794; }
    .ve-row .sig { color: #33485e; font-weight: 500; }
    .titel-link { color: #009fe3; }
    .detail-actions { display: flex; gap: 10px; margin-top: 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd6dc; background: #fff; color: #586475; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; }
    .btn:hover { background: #f4f6f8; }
    .btn.primary { background: #009fe3; border-color: #009fe3; color: #fff; }
    .btn.primary:hover { background: #008fcc; }
    .btn .material-icons { font-size: 17px; }
  `],
})
export class AkzessionenApp {
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  private readonly ais = inject(AisService);

  protected readonly menu: AppMenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'liste', label: 'Akzessionen', icon: 'move_to_inbox' },
  ];
  protected readonly activeMenu = signal('dashboard');
  protected readonly selected = signal<Akzession | null>(null);

  constructor() {
    const target = this.ais.consumeNavTarget('akzessionen');
    if (target) {
      const a = this.data.akzessionen().find((x) => x.id === target);
      if (a) {
        this.selected.set(a);
        this.activeMenu.set('liste');
      }
    }
  }

  protected countStatus(status: Akzession['status']): number {
    return this.data.akzessionen().filter((a) => a.status === status).length;
  }

  protected totalLaufmeter(): number {
    return this.data.akzessionen().reduce((s, a) => s + (a.umfangLaufmeter ?? 0), 0);
  }

  protected readonly statusPie = computed(() => [
    { label: 'Abgeschlossen', value: this.countStatus('Abgeschlossen'), color: '#009FE3' },
    { label: 'InBearbeitung', value: this.countStatus('InBearbeitung'), color: '#5BC4F0' },
  ]);

  protected juengste(): Akzession[] {
    return [...this.data.akzessionen()].sort((a, b) => b.uebernahmedatum.localeCompare(a.uebernahmedatum)).slice(0, 5);
  }

  protected openDetail(a: Akzession): void {
    this.selected.set(a);
    this.activeMenu.set('liste');
  }

  protected statuswechsel(a: Akzession): void {
    this.data.toggleAkzessionStatus(a.id);
    const updated = this.data.akzessionen().find((x) => x.id === a.id) ?? null;
    this.selected.set(updated);
    this.toast.show(updated?.status === 'Abgeschlossen' ? 'Akzession abgeschlossen.' : 'Akzession wiedereröffnet (Recht AkzessionenWiedereroeffnen).');
  }

  protected veErstellen(a: Akzession): void {
    const ve = this.data.veAusAkzession(a.id);
    if (ve) {
      const updated = this.data.akzessionen().find((x) => x.id === a.id) ?? null;
      this.selected.set(updated);
      this.toast.show(`VE ${ve.signatur} erstellt: Felder und Assoziationen aus der Akzession übernommen, Cross-Link gesetzt.`);
    }
  }

  protected openVe(id: string): void {
    this.ais.openApp('tektonik', id);
  }

  protected statusPill(status: Akzession['status']): string {
    return status === 'Abgeschlossen' ? 'pill ok' : 'pill run';
  }
}
