import { Injectable, computed, signal } from '@angular/core';
import { AppDefinition, AppId } from '../models/ais.model';

/** The top-level views the app can switch between (no router - signal-driven). */
export type AisView = 'dashboard' | 'anwendungen' | 'app';

/** All openable apps (tiles with an app behind them). */
export const APP_DEFINITIONS: Record<AppId, AppDefinition> = {
  tektonik: { id: 'tektonik', name: 'Tektonik', icon: 'icons/tektonik.png', gruppe: 'ARCHIV' },
  magazinverwaltung: { id: 'magazinverwaltung', name: 'Magazinverwaltung', icon: 'icons/magazinverwaltung.png', gruppe: 'ARCHIV' },
  akzessionen: { id: 'akzessionen', name: 'Akzessionen', icon: 'icons/akzessionen.png', gruppe: 'ARCHIV' },
  provenienzen: { id: 'provenienzen', name: 'Provenienzen', icon: 'icons/provenienzen.png', gruppe: 'ARCHIV' },
  datenuebernahme: { id: 'datenuebernahme', name: 'Datenübernahme', icon: 'icons/datenuebernahme.png', gruppe: 'INGEST UND REPOSITORY' },
  verarbeitung: { id: 'verarbeitung', name: 'Verarbeitung', icon: 'icons/verarbeitung.png', gruppe: 'INGEST UND REPOSITORY' },
  preservation: { id: 'preservation', name: 'Preservation Planing', icon: 'icons/preservation.png', gruppe: 'INGEST UND REPOSITORY' },
};

@Injectable({ providedIn: 'root' })
export class AisService {
  private readonly _currentView = signal<AisView>('dashboard');
  private readonly _openApps = signal<AppId[]>([]);
  private readonly _activeAppId = signal<AppId | null>(null);

  /** The currently displayed top-level view. */
  readonly currentView = this._currentView.asReadonly();
  /** Open app tabs in opening order. */
  readonly openApps = this._openApps.asReadonly();
  readonly activeAppId = this._activeAppId.asReadonly();
  readonly activeApp = computed(() => {
    const id = this._activeAppId();
    return id ? APP_DEFINITIONS[id] : null;
  });

  /** Cross-app navigation payload (e.g. "Im Baum anzeigen" targets). */
  private readonly _navTarget = signal<{ appId: AppId; objectId: string } | null>(null);
  readonly navTarget = this._navTarget.asReadonly();

  goTo(view: AisView): void {
    this._currentView.set(view);
  }

  showDashboard(): void {
    this._currentView.set('dashboard');
  }

  showAnwendungen(): void {
    this._currentView.set('anwendungen');
  }

  openApp(appId: AppId, objectId?: string): void {
    if (!this._openApps().includes(appId)) {
      this._openApps.update((list) => [...list, appId]);
    }
    this._activeAppId.set(appId);
    this._currentView.set('app');
    if (objectId) this._navTarget.set({ appId, objectId });
  }

  consumeNavTarget(appId: AppId): string | null {
    const t = this._navTarget();
    if (t && t.appId === appId) {
      this._navTarget.set(null);
      return t.objectId;
    }
    return null;
  }

  switchApp(appId: AppId): void {
    if (this._openApps().includes(appId)) {
      this._activeAppId.set(appId);
      this._currentView.set('app');
    }
  }

  closeApp(appId: AppId): void {
    this._openApps.update((list) => list.filter((a) => a !== appId));
    if (this._activeAppId() === appId) {
      const rest = this._openApps();
      if (rest.length > 0) {
        this._activeAppId.set(rest[rest.length - 1]);
      } else {
        this._activeAppId.set(null);
        this._currentView.set('dashboard');
      }
    }
  }
}
