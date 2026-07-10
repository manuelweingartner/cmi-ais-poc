import { Component, computed, inject } from '@angular/core';
import { AisService, APP_DEFINITIONS } from '../../services/ais.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  template: `
    <header class="top-bar">
      <div class="left">
        <button class="logo" type="button" (click)="ais.showDashboard()" title="Zum Dashboard">
          <img src="cmi-logo.png" alt="CMI" />
        </button>

        <!-- Open app tabs (grey tabs in the blue bar, like the SBO mockups) -->
        @for (appId of ais.openApps(); track appId) {
          <div
            class="app-tab"
            [class.active]="ais.activeAppId() === appId && ais.currentView() === 'app'"
            (click)="ais.switchApp(appId)"
          >
            <span class="tab-label">{{ defs[appId].name }}</span>
            <button class="tab-close" type="button" title="Schliessen" (click)="close($event, appId)">
              <i class="material-icons">close</i>
            </button>
          </div>
        }
      </div>

      <div class="actions">
        <!-- Decorative for now -->
        <button class="icon-btn" type="button" title="3D-Ansicht" disabled>
          <i class="material-icons">view_in_ar</i>
        </button>

        <!-- Only interactive nav: opens the Anwendungen grid -->
        <button
          class="icon-btn"
          type="button"
          title="Anwendungen"
          [class.active]="anwendungenActive()"
          (click)="ais.showAnwendungen()"
        >
          <i class="material-icons">apps</i>
        </button>

        <!-- Decorative for now -->
        <button class="icon-btn" type="button" title="Fenster" disabled>
          <i class="material-icons">filter_none</i>
        </button>
        <button class="icon-btn" type="button" title="Mehr" disabled>
          <i class="material-icons">more_vert</i>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .top-bar {
      height: 50px;
      background: #289fe1;
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      padding: 0;
      color: #fff;
    }
    .left { display: flex; align-items: stretch; min-width: 0; overflow: hidden; }
    /* Grey logo tab in the top-left of the blue bar (matches CMI mockup) */
    .logo {
      margin: 5px 0 0 6px;
      padding: 0 20px;
      background: #586475;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      flex: 0 0 auto;
    }
    .logo img {
      height: 22px;
      width: auto;
      display: block;
    }
    .app-tab {
      margin: 5px 0 0 6px;
      padding: 0 8px 0 16px;
      background: rgba(88, 100, 117, 0.55);
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      white-space: nowrap;
    }
    .app-tab.active { background: #586475; }
    .app-tab:hover:not(.active) { background: rgba(88, 100, 117, 0.75); }
    .tab-close {
      background: none; border: none; color: #d5dae0; cursor: pointer;
      display: flex; align-items: center; padding: 2px; border-radius: 50%;
    }
    .tab-close:hover { color: #fff; background: rgba(255, 255, 255, 0.15); }
    .tab-close .material-icons { font-size: 15px; }
    .actions {
      display: flex;
      align-items: stretch;
      height: 50px;
      flex: 0 0 auto;
    }
    .icon-btn {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
    }
    .icon-btn:hover:not([disabled]) {
      background: rgba(255, 255, 255, 0.12);
    }
    .icon-btn.active {
      background: rgba(0, 0, 0, 0.18);
    }
    .icon-btn[disabled] {
      cursor: default;
      opacity: 0.9;
    }
    .icon-btn .material-icons {
      font-size: 22px;
    }
  `],
})
export class TopBar {
  protected readonly ais = inject(AisService);
  protected readonly defs = APP_DEFINITIONS;
  protected readonly anwendungenActive = computed(() => this.ais.currentView() === 'anwendungen');

  protected close(event: Event, appId: keyof typeof APP_DEFINITIONS): void {
    event.stopPropagation();
    this.ais.closeApp(appId);
  }
}
