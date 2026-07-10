import { Component, computed, inject, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { AisService } from '../../services/ais.service';
import { BarChart } from '../charts/bar-chart';
import { KpiTile } from '../charts/kpi-tile';
import { MagazinObjekt } from '../../models/ais.model';

@Component({
  selector: 'app-magazin',
  standalone: true,
  imports: [AppShell, BarChart, KpiTile],
  template: `
    <app-shell appName="Magazinverwaltung" iconWhite="icons/magazinverwaltung-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Dashboard -->
        @case ('dashboard') {
          <div class="over-head"><h2>Dashboard</h2></div>
          <div class="kpi-row">
            <app-kpi-tile title="Standorte" [value]="data.magazinObjekte.length" sub="Magazinobjekte gesamt" />
            <app-kpi-tile title="Kapazität" [value]="totalKapazitaet() + ' Lfm'" sub="Laufmeter über alle Magazine" />
            <app-kpi-tile title="Belegt" [value]="totalBelegt() + ' Lfm'" sub="Laufmeter belegt" />
            <app-kpi-tile title="Auslastung" [value]="auslastung() + '%'" sub="belegt / Kapazität" />
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Belegung je Magazin (Laufmeter)</h2></div>
            <app-bar-chart [data]="belegungBars()" />
          </div>
        }

        <!-- ================================================= Standort-Baum -->
        @case ('standorte') {
          <div class="tree-layout">
            <div class="panel tree-panel">
              <div class="panel-head"><h2>Standort-Hierarchie</h2></div>
              <p class="hint">Kürzel-Regeln: Pflicht (MOBJ104), beginnt mit dem Parent-Kürzel (MOBJ103), länger als das Parent-Kürzel (MOBJ101), eindeutig unter Geschwistern (MOBJ105).</p>
              @for (row of flatStandorte(); track row.m.id) {
                <div class="m-row" [style.padding-left.px]="row.depth * 22" [class.selected]="selected()?.id === row.m.id" (click)="selected.set(row.m)">
                  <i class="material-icons">{{ data.magazinChildren(row.m.id).length > 0 ? 'warehouse' : 'shelves' }}</i>
                  <span class="kuerzel">{{ row.m.kuerzel }}</span>
                  <span class="bez">{{ row.m.bezeichnung }}</span>
                  @if (row.m.kapazitaetLaufmeter) {
                    <span class="cap">
                      <span class="cap-bar"><span class="cap-fill" [style.width.%]="((row.m.belegtLaufmeter ?? 0) / row.m.kapazitaetLaufmeter) * 100" [class.warn]="(row.m.belegtLaufmeter ?? 0) / row.m.kapazitaetLaufmeter > 0.85"></span></span>
                      {{ row.m.belegtLaufmeter }}/{{ row.m.kapazitaetLaufmeter }} Lfm
                    </span>
                  }
                </div>
              }
            </div>

            @if (selected(); as m) {
              <aside class="panel sideview">
                <div class="sv-head">
                  <i class="material-icons">shelves</i>
                  <div>
                    <div class="sv-sig">{{ m.kuerzel }}</div>
                    <div class="sv-titel">{{ m.bezeichnung }}</div>
                  </div>
                </div>
                <div class="sv-fields">
                  <div class="field"><span class="fl">Kapazität</span><span class="fv">{{ m.kapazitaetLaufmeter }} Laufmeter</span></div>
                  <div class="field"><span class="fl">Belegt</span><span class="fv">{{ m.belegtLaufmeter }} Laufmeter</span></div>
                  <div class="field"><span class="fl">Kürzel-Validierung</span><span class="fv ok-text"><i class="material-icons">check_circle</i> MOBJ101-105 erfüllt</span></div>
                </div>
                <h3>Eingelagerte VEs an {{ m.kuerzel }}</h3>
                @for (ve of data.vesAmStandort(m.kuerzel); track ve.id) {
                  <div class="ve-row" (click)="openVe(ve.id)">
                    <span class="sig">{{ ve.signatur }}</span>
                    <span class="titel-link">{{ ve.titel }}</span>
                  </div>
                } @empty {
                  <p class="dim">Keine VEs direkt an diesem Standort.</p>
                }
              </aside>
            }
          </div>
        }

        <!-- ================================================= Kürzel-Validierung Demo -->
        @case ('validierung') {
          <div class="panel">
            <div class="panel-head"><h2>Standort-Kürzel validieren</h2></div>
            <p class="hint">Demonstration der Validierungsregeln MOBJ101-105 beim Erfassen eines neuen Magazinobjekts unter "A.01 Untergeschoss 1".</p>
            <label class="input-label">Neues Kürzel unter A.01:</label>
            <input class="txt-input" [value]="testKuerzel()" (input)="testKuerzel.set($any($event.target).value)" placeholder="z.B. A.01.004" />
            @if (kuerzelErrors().length === 0) {
              <p class="ok-text big"><i class="material-icons">check_circle</i> Kürzel "{{ testKuerzel() }}" ist gültig.</p>
            } @else {
              @for (e of kuerzelErrors(); track e) {
                <p class="err-text"><i class="material-icons">error</i> {{ e }}</p>
              }
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
    .panel { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 16px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1rem; font-weight: 500; color: #33485e; }
    h3 { margin: 16px 0 8px; font-size: 0.85rem; font-weight: 500; color: #33485e; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 14px; }
    .tree-layout { display: flex; gap: 16px; align-items: flex-start; }
    .tree-panel { flex: 1; min-width: 0; }
    .sideview { width: 320px; flex: 0 0 auto; position: sticky; top: 16px; }
    .m-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 3px; }
    .m-row:hover { background: #f0f6fa; }
    .m-row.selected { background: #dff0fa; }
    .m-row .material-icons { font-size: 19px; color: #7d8794; }
    .kuerzel { font-size: 0.8rem; font-weight: 500; color: #33485e; min-width: 74px; }
    .bez { font-size: 0.83rem; color: #586475; flex: 1; }
    .cap { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: #9aa3ae; }
    .cap-bar { width: 90px; height: 7px; background: #eef0f2; border-radius: 4px; overflow: hidden; display: inline-block; }
    .cap-fill { display: block; height: 100%; background: #009fe3; }
    .cap-fill.warn { background: #d9a114; }
    .sv-head { display: flex; gap: 10px; margin-bottom: 10px; }
    .sv-head .material-icons { font-size: 26px; color: #586475; }
    .sv-sig { font-size: 0.78rem; color: #9aa3ae; }
    .sv-titel { font-size: 0.95rem; color: #33485e; font-weight: 500; }
    .sv-fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .fl { font-size: 0.68rem; color: #9aa3ae; }
    .fv { font-size: 0.82rem; color: #586475; }
    .ok-text { color: #3f971a; display: flex; align-items: center; gap: 5px; }
    .ok-text .material-icons { font-size: 17px; }
    .ok-text.big { font-size: 0.9rem; margin-top: 12px; }
    .err-text { color: #8c0909; display: flex; align-items: center; gap: 5px; font-size: 0.84rem; margin: 8px 0 0; }
    .err-text .material-icons { font-size: 17px; }
    .ve-row { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid #edf0f2; cursor: pointer; font-size: 0.8rem; }
    .ve-row .sig { color: #33485e; font-weight: 500; white-space: nowrap; }
    .titel-link { color: #009fe3; }
    .dim { color: #9aa3ae; font-size: 0.8rem; }
    .input-label { display: block; font-size: 0.78rem; color: #586475; margin-bottom: 6px; }
    .txt-input { border: 1px solid #cfd6dc; border-radius: 3px; padding: 8px 12px; font-size: 0.88rem; color: #33485e; width: 280px; outline: none; }
    .txt-input:focus { border-color: #009fe3; }
  `],
})
export class MagazinApp {
  protected readonly data = inject(ArchivDataService);
  private readonly ais = inject(AisService);

  protected readonly menu: AppMenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'standorte', label: 'Standorte', icon: 'warehouse' },
    { id: 'validierung', label: 'Kürzel-Validierung', icon: 'rule' },
  ];
  protected readonly activeMenu = signal('dashboard');
  protected readonly selected = signal<MagazinObjekt | null>(null);
  protected readonly testKuerzel = signal('A.01.004');

  constructor() {
    const target = this.ais.consumeNavTarget('magazinverwaltung');
    if (target) {
      const m = this.data.magazinObjekte.find((x) => x.kuerzel === target);
      if (m) {
        this.selected.set(m);
        this.activeMenu.set('standorte');
      }
    }
  }

  protected totalKapazitaet(): number {
    return this.data.magazinChildren(null).reduce((s, m) => s + (m.kapazitaetLaufmeter ?? 0), 0);
  }

  protected totalBelegt(): number {
    return this.data.magazinChildren(null).reduce((s, m) => s + (m.belegtLaufmeter ?? 0), 0);
  }

  protected auslastung(): number {
    return Math.round((this.totalBelegt() / this.totalKapazitaet()) * 100);
  }

  protected readonly belegungBars = computed(() =>
    this.data.magazinChildren(null).map((m) => ({ label: m.kuerzel + ' ' + m.bezeichnung.slice(0, 14), value: m.belegtLaufmeter ?? 0 })),
  );

  protected readonly kuerzelErrors = computed(() => {
    const parent = this.data.magazinObjekte.find((m) => m.kuerzel === 'A.01') ?? null;
    return this.data.validateKuerzel(this.testKuerzel().trim(), parent);
  });

  /** Flattened Standort tree (depth-first) for simple rendering. */
  protected readonly flatStandorte = computed(() => {
    const out: { m: MagazinObjekt; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const m of this.data.magazinChildren(parentId)) {
        out.push({ m, depth });
        walk(m.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  });

  protected openVe(id: string): void {
    this.ais.openApp('tektonik', id);
  }
}
