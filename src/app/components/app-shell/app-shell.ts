import { Component, input, model, signal } from '@angular/core';

export interface AppMenuItem {
  id: string;
  label: string;
  icon: string; // material icon name
}

/**
 * Generic app layout per the SBO mockups (slides 12/13): dark left sidebar
 * with app icon + name and a MENU list; light content area; optional filter
 * panel projected via [slot=filter].
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  template: `
    <div class="shell">
      <aside class="sidebar" [class.collapsed]="collapsed()">
        <div class="app-head">
          <img class="app-icon" [src]="iconWhite()" [alt]="appName()" />
          @if (!collapsed()) {
            <span class="app-name">{{ appName() }}</span>
          }
        </div>
        <div class="menu-head">
          @if (!collapsed()) {
            <span>MENÜ</span>
          }
          <button class="collapse" type="button" (click)="collapsed.set(!collapsed())" title="Menü ein-/ausklappen">
            <i class="material-icons">menu</i>
          </button>
        </div>
        <nav>
          @for (item of menu(); track item.id) {
            <button
              class="menu-item"
              type="button"
              [class.active]="activeMenu() === item.id"
              (click)="activeMenu.set(item.id)"
              [title]="item.label"
            >
              <i class="material-icons">{{ item.icon }}</i>
              @if (!collapsed()) {
                <span>{{ item.label }}</span>
              }
            </button>
          }
        </nav>
      </aside>
      <section class="content">
        <ng-content></ng-content>
      </section>
      <ng-content select="[slot=filter]"></ng-content>
    </div>
  `,
  styles: [`
    .shell { display: flex; align-items: stretch; min-height: calc(100vh - 50px); }
    .sidebar {
      width: 216px; flex: 0 0 auto; background: #586475; color: #fff;
      display: flex; flex-direction: column; transition: width 0.15s ease;
    }
    .sidebar.collapsed { width: 56px; }
    .app-head { display: flex; align-items: center; gap: 12px; padding: 18px 14px 12px; }
    .app-icon { height: 26px; width: auto; }
    .app-name { font-size: 1.05rem; font-weight: 400; white-space: nowrap; }
    .menu-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 6px; font-size: 0.68rem; letter-spacing: 0.5px; color: #c3c9d1;
    }
    .collapse { background: none; border: none; color: #c3c9d1; cursor: pointer; padding: 2px; }
    .collapse .material-icons { font-size: 18px; }
    nav { display: flex; flex-direction: column; }
    .menu-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      background: none; border: none; border-left: 3px solid transparent;
      color: #e8ebee; font-size: 0.85rem; cursor: pointer; text-align: left;
    }
    .menu-item .material-icons { font-size: 20px; color: #c3c9d1; }
    .menu-item:hover { background: rgba(255, 255, 255, 0.06); }
    .menu-item.active { background: #fff; color: #009fe3; border-left-color: #009fe3; }
    .menu-item.active .material-icons { color: #009fe3; }
    .content { flex: 1; min-width: 0; padding: 18px 20px; }
  `],
})
export class AppShell {
  readonly appName = input.required<string>();
  readonly iconWhite = input.required<string>();
  readonly menu = input.required<AppMenuItem[]>();
  readonly activeMenu = model.required<string>();
  readonly collapsed = signal(false);
}
