import { Component, inject } from '@angular/core';
import { AisService } from './services/ais.service';
import { ToastService } from './services/toast.service';
import { TopBar } from './components/top-bar/top-bar';
import { Dashboard } from './components/dashboard/dashboard';
import { Anwendungen } from './components/anwendungen/anwendungen';
import { VerarbeitungApp } from './components/verarbeitung/verarbeitung';
import { PreservationApp } from './components/preservation/preservation';
import { DatenuebernahmeApp } from './components/datenuebernahme/datenuebernahme';
import { TektonikApp } from './components/tektonik/tektonik';
import { MagazinApp } from './components/magazin/magazin';
import { AkzessionenApp } from './components/akzessionen/akzessionen';
import { ProvenienzenApp } from './components/provenienzen/provenienzen';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TopBar,
    Dashboard,
    Anwendungen,
    VerarbeitungApp,
    PreservationApp,
    DatenuebernahmeApp,
    TektonikApp,
    MagazinApp,
    AkzessionenApp,
    ProvenienzenApp,
  ],
  template: `
    <app-top-bar></app-top-bar>
    <main class="app-body">
      @switch (ais.currentView()) {
        @case ('dashboard') {
          <app-dashboard></app-dashboard>
        }
        @case ('anwendungen') {
          <app-anwendungen></app-anwendungen>
        }
        @case ('app') {
          @switch (ais.activeAppId()) {
            @case ('verarbeitung') { <app-verarbeitung></app-verarbeitung> }
            @case ('preservation') { <app-preservation></app-preservation> }
            @case ('datenuebernahme') { <app-datenuebernahme></app-datenuebernahme> }
            @case ('tektonik') { <app-tektonik></app-tektonik> }
            @case ('magazinverwaltung') { <app-magazin></app-magazin> }
            @case ('akzessionen') { <app-akzessionen></app-akzessionen> }
            @case ('provenienzen') { <app-provenienzen></app-provenienzen> }
          }
        }
      }
    </main>
    @if (toast.message(); as msg) {
      <div class="toast">{{ msg }}</div>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
    .app-body {
      display: block;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #33485e;
      color: #fff;
      padding: 10px 18px;
      border-radius: 3px;
      font-size: 0.85rem;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
      z-index: 100;
    }
  `],
})
export class App {
  protected readonly ais = inject(AisService);
  protected readonly toast = inject(ToastService);
}
