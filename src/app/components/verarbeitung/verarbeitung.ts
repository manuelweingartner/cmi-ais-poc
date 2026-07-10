import { Component, computed, inject, signal } from '@angular/core';
import { AppShell, AppMenuItem } from '../app-shell/app-shell';
import { ArchivDataService } from '../../services/archiv-data.service';
import { ToastService } from '../../services/toast.service';
import { AisService } from '../../services/ais.service';
import { Ausfuehrung, AusfuehrungsStatus, AusfuehrungsTyp } from '../../models/ais.model';

const TYP_ICON: Record<AusfuehrungsTyp, string> = {
  Ingest: 'move_to_inbox',
  Passivierung: 'archive',
  Preservation: 'data_usage',
};

@Component({
  selector: 'app-verarbeitung',
  standalone: true,
  imports: [AppShell],
  template: `
    <app-shell appName="Verarbeitung" iconWhite="icons/verarbeitung-white.png" [menu]="menu" [(activeMenu)]="activeMenu">
      @switch (activeMenu()) {
        <!-- ================================================= Übersicht (Folie 12) -->
        @case ('uebersicht') {
          <div class="panel with-filter">
            <div class="panel-main">
              <div class="panel-head">
                <h2>Letzte Ausführungen</h2>
                <div class="head-actions">
                  <button class="icon-btn" type="button" title="Aktualisieren" (click)="toast.show('Ansicht aktualisiert.')">
                    <i class="material-icons">refresh</i>
                  </button>
                  <button class="icon-btn" type="button" title="Sortierung" (click)="sortDesc.set(!sortDesc())">
                    <i class="material-icons">sort</i>
                  </button>
                  <button class="icon-btn" type="button" title="Mehr" disabled>
                    <i class="material-icons">more_vert</i>
                  </button>
                </div>
              </div>

              @for (a of letzteAusfuehrungen(); track a.id) {
                <div class="card">
                  <i class="material-icons card-typ" [title]="a.typ">{{ typIcon[a.typ] }}</i>
                  <div class="card-body">
                    <div class="card-title-row">
                      <a class="card-title" (click)="openDetail(a)">{{ a.nr }} - {{ a.objekt }}</a>
                      <button class="icon-btn" type="button" title="Mehr" disabled>
                        <i class="material-icons">more_vert</i>
                      </button>
                    </div>
                    <div class="card-fields">
                      <div class="field"><span class="fl">Workflow</span><span class="fv">{{ a.workflowCode }} {{ workflowName(a) }}</span></div>
                      <div class="field"><span class="fl">Typ</span><span class="fv">{{ a.typ }}</span></div>
                      <div class="field"><span class="fl">Ausführungszeitpunkt</span><span class="fv">{{ a.zeitpunkt }}</span></div>
                      <div class="field"><span class="fl">Dauer</span><span class="fv">{{ a.dauer }}</span></div>
                      <div class="field"><span class="fl">Status</span><span class="pill" [class]="pillClass(a.status)">{{ a.status }}</span></div>
                    </div>
                  </div>
                </div>
              } @empty {
                <p class="empty">Keine Ausführungen für die gewählten Filter.</p>
              }
            </div>

            <!-- Filter panel right (Folie 12) -->
            <aside class="filter">
              <div class="filter-head">
                <span>Filter</span>
                <button class="icon-btn" type="button" title="Filter zurücksetzen" (click)="resetFilter()">
                  <i class="material-icons">filter_list_off</i>
                </button>
              </div>
              <div class="filter-group">
                <div class="filter-group-title">
                  <i class="material-icons">expand_less</i><span>Typ</span>
                </div>
                @for (t of typen; track t) {
                  <label class="filter-item">
                    <input type="checkbox" [checked]="typFilter().has(t)" (change)="toggleTyp(t)" />
                    <i class="material-icons">{{ typIcon[t] }}</i>
                    <span>{{ t }}</span>
                  </label>
                }
              </div>
            </aside>
          </div>
        }

        <!-- ================================================= Ausführungen -->
        @case ('ausfuehrungen') {
          @if (selected(); as sel) {
            <div class="panel">
              <button class="back" type="button" (click)="selected.set(null)">
                <i class="material-icons">arrow_back</i> Alle Ausführungen
              </button>
              <div class="detail-head">
                <h2>{{ sel.nr }} - {{ sel.objekt }}</h2>
                <span class="pill" [class]="pillClass(sel.status)">{{ sel.status }}</span>
              </div>
              <div class="card-fields detail-meta">
                <div class="field"><span class="fl">Workflow</span><span class="fv">{{ sel.workflowCode }} {{ workflowName(sel) }} (Version {{ workflowVersion(sel) }})</span></div>
                <div class="field"><span class="fl">Typ</span><span class="fv">{{ sel.typ }}</span></div>
                <div class="field"><span class="fl">Ausführungszeitpunkt</span><span class="fv">{{ sel.zeitpunkt }}</span></div>
                <div class="field"><span class="fl">Dauer</span><span class="fv">{{ sel.dauer }}</span></div>
              </div>
              <div class="detail-actions">
                <button class="btn" type="button" (click)="allLogsOpen.set(!allLogsOpen())">
                  <i class="material-icons">subject</i> Log des Ablaufs einsehen
                </button>
                <button class="btn primary" type="button" [disabled]="sel.status !== 'fehlgeschlagen'"
                        (click)="erneutStarten(sel)" title="Nur fehlgeschlagene Abläufe können nach Korrektur wiederaufgenommen werden">
                  <i class="material-icons">replay</i> Erneut starten
                </button>
              </div>

              <h3>Ablaufschritte</h3>
              @for (s of sel.schritte; track s.name; let i = $index) {
                <div class="step">
                  <div class="step-row" (click)="toggleStep(i)">
                    <i class="material-icons step-status" [class]="stepClass(s.status)">{{ stepIcon(s.status) }}</i>
                    <span class="step-nr">{{ i + 1 }}</span>
                    <span class="step-name">{{ s.name }}</span>
                    <span class="pill small" [class]="pillClass(s.status)">{{ s.status }}</span>
                    @if (s.log.length > 0) {
                      <i class="material-icons expander">{{ isStepOpen(i) ? 'expand_less' : 'expand_more' }}</i>
                    }
                  </div>
                  @if (s.log.length > 0 && (isStepOpen(i) || allLogsOpen())) {
                    <div class="step-log">
                      @for (line of s.log; track line) {
                        <div class="log-line">{{ line }}</div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="panel">
              <div class="panel-head">
                <h2>Ausführungen</h2>
              </div>
              <p class="hint">Ausführungen sind Instanzen der Workflows und laufen fachlich im Ingest bzw. Repository. Hier werden sie überwacht.</p>
              <table class="tbl">
                <thead>
                  <tr><th></th><th>Nr</th><th>Objekt</th><th>Workflow</th><th>Typ</th><th>Ausführungszeitpunkt</th><th>Dauer</th><th>Status</th></tr>
                </thead>
                <tbody>
                  @for (a of alleAusfuehrungen(); track a.id) {
                    <tr (click)="openDetail(a)">
                      <td><i class="material-icons row-icon">{{ typIcon[a.typ] }}</i></td>
                      <td>{{ a.nr }}</td>
                      <td class="link">{{ a.objekt }}</td>
                      <td>{{ a.workflowCode }}</td>
                      <td>{{ a.typ }}</td>
                      <td>{{ a.zeitpunkt }}</td>
                      <td>{{ a.dauer }}</td>
                      <td><span class="pill" [class]="pillClass(a.status)">{{ a.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        <!-- ================================================= Workflows (Vorlagen) -->
        @case ('workflows') {
          @if (selectedWorkflow(); as wf) {
            <div class="panel">
              <button class="back" type="button" (click)="selectedWorkflow.set(null)">
                <i class="material-icons">arrow_back</i> Alle Workflows
              </button>
              <div class="detail-head">
                <h2>{{ wf.code }} {{ wf.name }}</h2>
                <span class="pill neutral">Version {{ wf.version }}</span>
                <span class="pill neutral">{{ wf.typ }}</span>
              </div>
              <p class="hint">{{ wf.beschreibung }}</p>
              <p class="hint note"><i class="material-icons">info</i> In der Verarbeitung werden Workflowvorlagen gepflegt. Die Ausführung erfolgt im Ingest bzw. Repository.</p>
              <h3>Schrittfolge</h3>
              @for (s of wf.schritte; track $index; let i = $index) {
                <div class="wf-step">
                  <span class="step-nr">{{ i + 1 }}</span>
                  <div class="wf-step-body">
                    <div class="wf-step-name">{{ taskName(s.taskId) }}</div>
                    <div class="wf-step-desc">{{ taskDesc(s.taskId) }}</div>
                    @if (s.parameter) {
                      <div class="wf-step-param"><i class="material-icons">tune</i>{{ s.parameter }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="panel">
              <div class="panel-head">
                <h2>Workflows</h2>
                <div class="head-actions">
                  <button class="btn" type="button" (click)="toast.show('Ablauf erstellen: im Prototyp nicht ausgeführt.')">
                    <i class="material-icons">add</i> Ablauf erstellen
                  </button>
                </div>
              </div>
              <p class="hint">Workflowvorlagen (Prozessketten): komponierte, versionierte Task-Folgen, analog zu Objektvorlagen.</p>
              <table class="tbl">
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Typ</th><th>Version</th><th>Schritte</th><th>Beschreibung</th></tr>
                </thead>
                <tbody>
                  @for (wf of data.workflows; track wf.id) {
                    <tr (click)="selectedWorkflow.set(wf)">
                      <td class="link">{{ wf.code }}</td>
                      <td>{{ wf.name }}</td>
                      <td>{{ wf.typ }}</td>
                      <td>{{ wf.version }}</td>
                      <td>{{ wf.schritte.length }}</td>
                      <td class="dim">{{ wf.beschreibung }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        <!-- ================================================= Aufgaben / Schritte -->
        @case ('aufgaben') {
          <div class="panel">
            <div class="panel-head">
              <h2>Aufgaben / Schritte</h2>
              <div class="head-actions">
                <button class="btn" type="button" (click)="toast.show('Ablaufschritt erstellen: im Prototyp nicht ausgeführt.')">
                  <i class="material-icons">add</i> Ablaufschritt erstellen
                </button>
              </div>
            </div>
            <p class="hint">Ein Task ist ein gekapselter, parametrisierbarer Verarbeitungsschritt (je ein Modul- bzw. API-Aufruf), wiederverwendbar in mehreren Workflows.</p>
            <div class="task-grid">
              @for (t of data.tasks; track t.id) {
                <div class="task-card">
                  <div class="task-name">{{ t.name }}</div>
                  <div class="task-desc">{{ t.beschreibung }}</div>
                  @if (t.parameter.length > 0) {
                    <div class="task-params">
                      @for (p of t.parameter; track p) {
                        <span class="param-chip">{{ p }}</span>
                      }
                    </div>
                  }
                  <div class="task-usage dim">Verwendet in: {{ usedIn(t.id) || 'keinem Workflow' }}</div>
                </div>
              }
            </div>
          </div>
        }
      }
    </app-shell>
  `,
  styles: [`
    .panel { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 16px 20px; }
    .with-filter { display: flex; gap: 0; padding: 0; }
    .panel-main { flex: 1; min-width: 0; padding: 16px 20px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1.05rem; font-weight: 500; color: #33485e; }
    h3 { margin: 20px 0 10px; font-size: 0.9rem; font-weight: 500; color: #33485e; }
    .head-actions { display: flex; gap: 4px; }
    .icon-btn { width: 32px; height: 32px; border: none; background: none; color: #586475; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .icon-btn:hover:not([disabled]) { background: rgba(0,0,0,0.05); }
    .icon-btn[disabled] { opacity: 0.4; cursor: default; }
    .icon-btn .material-icons { font-size: 20px; }
    .hint { font-size: 0.8rem; color: #7d8794; margin: 0 0 14px; }
    .hint.note { display: flex; align-items: center; gap: 6px; background: #eef7fc; border: 1px solid #cfe9f7; padding: 8px 10px; border-radius: 3px; color: #33607e; }
    .hint.note .material-icons { font-size: 17px; color: #009fe3; }
    .empty { color: #9aa3ae; font-size: 0.85rem; }
    /* Cards (Übersicht) */
    .card { display: flex; gap: 14px; padding: 14px 4px; border-bottom: 1px solid #edf0f2; }
    .card-typ { font-size: 26px; color: #586475; margin-top: 2px; }
    .card-body { flex: 1; min-width: 0; }
    .card-title-row { display: flex; align-items: center; justify-content: space-between; }
    .card-title { color: #009fe3; cursor: pointer; font-size: 0.92rem; }
    .card-title:hover { text-decoration: underline; }
    .card-fields { display: flex; flex-wrap: wrap; gap: 6px 36px; margin-top: 8px; }
    .field { display: flex; flex-direction: column; gap: 2px; min-width: 120px; }
    .fl { font-size: 0.68rem; color: #9aa3ae; }
    .fv { font-size: 0.82rem; color: #586475; }
    /* Filter panel */
    .filter { width: 230px; flex: 0 0 auto; border-left: 1px solid #e4e7ea; padding: 16px; }
    .filter-head { display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; color: #33485e; margin-bottom: 10px; }
    .filter-group-title { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: #586475; font-weight: 500; margin-bottom: 8px; }
    .filter-group-title .material-icons { font-size: 18px; }
    .filter-item { display: flex; align-items: center; gap: 8px; padding: 5px 2px; font-size: 0.83rem; color: #586475; cursor: pointer; }
    .filter-item .material-icons { font-size: 18px; color: #7d8794; }
    /* Pills */
    .pill { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.72rem; white-space: nowrap; width: fit-content; }
    .pill.small { padding: 1px 8px; font-size: 0.68rem; }
    .pill.ok { background: #e4f2dc; color: #3f971a; }
    .pill.err { background: #f7dede; color: #8c0909; }
    .pill.run { background: #dff0fa; color: #0a6ea8; }
    .pill.wait { background: #eef0f2; color: #586475; }
    .pill.abort { background: #f0e6d8; color: #8a6d1a; }
    .pill.neutral { background: #eef0f2; color: #586475; }
    /* Detail */
    .back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #009fe3; cursor: pointer; font-size: 0.82rem; padding: 0 0 12px; }
    .back .material-icons { font-size: 17px; }
    .detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .detail-meta { margin-bottom: 14px; }
    .detail-actions { display: flex; gap: 10px; margin: 6px 0 4px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #cfd6dc; background: #fff; color: #586475; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; }
    .btn:hover:not([disabled]) { background: #f4f6f8; }
    .btn[disabled] { opacity: 0.45; cursor: default; }
    .btn.primary { background: #009fe3; border-color: #009fe3; color: #fff; }
    .btn.primary:hover:not([disabled]) { background: #008fcc; }
    .btn .material-icons { font-size: 17px; }
    /* Steps */
    .step { border-bottom: 1px solid #edf0f2; }
    .step-row { display: flex; align-items: center; gap: 10px; padding: 9px 2px; cursor: pointer; }
    .step-status { font-size: 19px; }
    .step-status.ok { color: #3f971a; }
    .step-status.err { color: #8c0909; }
    .step-status.run { color: #009fe3; }
    .step-status.wait { color: #9aa3ae; }
    .step-status.abort { color: #b08a2e; }
    .step-nr { width: 20px; text-align: right; color: #9aa3ae; font-size: 0.78rem; }
    .step-name { flex: 1; font-size: 0.85rem; color: #33485e; }
    .expander { font-size: 19px; color: #9aa3ae; }
    .step-log { background: #f7f9fa; border-radius: 3px; margin: 0 0 10px 48px; padding: 8px 12px; }
    .log-line { font-family: 'Roboto Mono', monospace; font-size: 0.72rem; color: #586475; padding: 1px 0; }
    /* Table */
    .tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .tbl th { text-align: left; font-size: 0.7rem; color: #9aa3ae; font-weight: 500; padding: 8px 10px; border-bottom: 1px solid #e4e7ea; white-space: nowrap; }
    .tbl td { padding: 9px 10px; border-bottom: 1px solid #edf0f2; color: #586475; }
    .tbl tbody tr { cursor: pointer; }
    .tbl tbody tr:hover { background: #f7fafc; }
    .row-icon { font-size: 19px; color: #7d8794; }
    .link { color: #009fe3; }
    .dim { color: #9aa3ae; }
    /* Tasks */
    .task-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .task-card { border: 1px solid #e4e7ea; border-radius: 3px; padding: 12px 14px; }
    .task-name { font-size: 0.88rem; color: #33485e; font-weight: 500; margin-bottom: 6px; }
    .task-desc { font-size: 0.78rem; color: #586475; margin-bottom: 8px; }
    .task-params { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .param-chip { background: #eef0f2; color: #586475; font-size: 0.68rem; padding: 2px 8px; border-radius: 10px; }
    .task-usage { font-size: 0.7rem; }
    /* Workflow detail */
    .wf-step { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #edf0f2; }
    .wf-step-name { font-size: 0.86rem; color: #33485e; }
    .wf-step-desc { font-size: 0.76rem; color: #7d8794; margin-top: 2px; }
    .wf-step-param { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #0a6ea8; margin-top: 4px; }
    .wf-step-param .material-icons { font-size: 14px; }
  `],
})
export class VerarbeitungApp {
  protected readonly data = inject(ArchivDataService);
  protected readonly toast = inject(ToastService);
  private readonly ais = inject(AisService);

  constructor() {
    const target = this.ais.consumeNavTarget('verarbeitung');
    if (target) {
      const a = this.data.ausfuehrungen().find((x) => x.id === target);
      if (a) this.openDetail(a);
    }
  }

  protected readonly menu: AppMenuItem[] = [
    { id: 'uebersicht', label: 'Übersicht', icon: 'dashboard' },
    { id: 'ausfuehrungen', label: 'Ausführungen', icon: 'list_alt' },
    { id: 'workflows', label: 'Workflows', icon: 'timeline' },
    { id: 'aufgaben', label: 'Aufgaben / Schritte', icon: 'playlist_add_check' },
  ];
  protected readonly activeMenu = signal('uebersicht');

  protected readonly typIcon = TYP_ICON;
  protected readonly typen: AusfuehrungsTyp[] = ['Ingest', 'Passivierung', 'Preservation'];
  protected readonly typFilter = signal(new Set<AusfuehrungsTyp>(this.typen));
  protected readonly sortDesc = signal(true);

  protected readonly selected = signal<Ausfuehrung | null>(null);
  protected readonly selectedWorkflow = signal<(typeof this.data.workflows)[number] | null>(null);
  protected readonly allLogsOpen = signal(false);
  private readonly openSteps = signal(new Set<number>());

  protected readonly alleAusfuehrungen = computed(() => {
    const list = [...this.data.ausfuehrungen()];
    list.sort((a, b) => (this.sortDesc() ? b.zeitpunkt.localeCompare(a.zeitpunkt) : a.zeitpunkt.localeCompare(b.zeitpunkt)));
    return list;
  });

  protected readonly letzteAusfuehrungen = computed(() =>
    this.alleAusfuehrungen().filter((a) => this.typFilter().has(a.typ)),
  );

  protected toggleTyp(t: AusfuehrungsTyp): void {
    this.typFilter.update((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  protected resetFilter(): void {
    this.typFilter.set(new Set(this.typen));
  }

  protected openDetail(a: Ausfuehrung): void {
    this.selected.set(a);
    this.allLogsOpen.set(false);
    this.openSteps.set(new Set());
    this.activeMenu.set('ausfuehrungen');
  }

  protected toggleStep(i: number): void {
    this.openSteps.update((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  protected isStepOpen(i: number): boolean {
    return this.openSteps().has(i);
  }

  protected erneutStarten(a: Ausfuehrung): void {
    this.data.ausfuehrungErneutStarten(a.id);
    const updated = this.data.ausfuehrungen().find((x) => x.id === a.id) ?? null;
    this.selected.set(updated);
    this.toast.show('Ablauf wird nach Korrektur wiederaufgenommen (erneut gestartet).');
  }

  protected pillClass(status: AusfuehrungsStatus): string {
    switch (status) {
      case 'fertig': return 'pill ok';
      case 'fehlgeschlagen': return 'pill err';
      case 'laufend': return 'pill run';
      case 'wartend': return 'pill wait';
      case 'abgebrochen': return 'pill abort';
    }
  }

  protected stepIcon(status: AusfuehrungsStatus): string {
    switch (status) {
      case 'fertig': return 'check_circle';
      case 'fehlgeschlagen': return 'error';
      case 'laufend': return 'autorenew';
      case 'wartend': return 'schedule';
      case 'abgebrochen': return 'cancel';
    }
  }

  protected stepClass(status: AusfuehrungsStatus): string {
    switch (status) {
      case 'fertig': return 'step-status ok';
      case 'fehlgeschlagen': return 'step-status err';
      case 'laufend': return 'step-status run';
      case 'wartend': return 'step-status wait';
      case 'abgebrochen': return 'step-status abort';
    }
  }

  protected workflowName(a: Ausfuehrung): string {
    return this.data.workflows.find((w) => w.code === a.workflowCode)?.name ?? '';
  }

  protected workflowVersion(a: Ausfuehrung): number {
    return this.data.workflows.find((w) => w.code === a.workflowCode)?.version ?? 1;
  }

  protected taskName(taskId: string): string {
    return this.data.tasks.find((t) => t.id === taskId)?.name ?? taskId;
  }

  protected taskDesc(taskId: string): string {
    return this.data.tasks.find((t) => t.id === taskId)?.beschreibung ?? '';
  }

  protected usedIn(taskId: string): string {
    return this.data.workflows
      .filter((w) => w.schritte.some((s) => s.taskId === taskId))
      .map((w) => w.code)
      .join(', ');
  }
}
