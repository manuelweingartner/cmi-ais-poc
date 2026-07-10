import { Component, inject } from '@angular/core';
import { AisService } from '../../services/ais.service';
import { ToastService } from '../../services/toast.service';
import { AnwendungsKachel, AppId } from '../../models/ais.model';

interface TileGroup {
  title: string;
  tiles: AnwendungsKachel[];
}

@Component({
  selector: 'app-anwendungen',
  standalone: true,
  template: `
    <div class="page-head">
      <h1>Anwendungen</h1>
    </div>

    <div class="groups">
      @for (group of groups; track group.title) {
        <section class="group">
          <div class="group-title">{{ group.title }}</div>
          <div class="tiles">
            @for (tile of group.tiles; track tile.label) {
              <button class="tile" type="button" (click)="open(tile)">
                @if (tile.iconPng) {
                  <img class="png-icon" [src]="tile.iconPng" [alt]="tile.label" />
                } @else {
                  <i class="material-icons">{{ tile.materialIcon }}</i>
                }
                <span class="tile-label">{{ tile.label }}</span>
              </button>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: calc(100vh - 50px);
    }
    .page-head {
      background: #586475;
      padding: 22px 24px;
    }
    .page-head h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 400;
      color: #fff;
    }
    .groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(280px, 620px));
      gap: 40px 80px;
      padding: 32px 24px;
    }
    @media (max-width: 980px) {
      .groups { grid-template-columns: 1fr; }
    }
    .group {
      min-width: 260px;
    }
    .group-title {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      color: #9aa3ae;
      margin-bottom: 14px;
    }
    .tiles {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .tile {
      width: 120px;
      height: 120px;
      background: #fff;
      border: 1px solid #e4e7ea;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      color: #586475;
      transition: box-shadow 0.15s ease;
    }
    .tile:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    .tile .material-icons {
      font-size: 44px;
      color: #586475;
    }
    .png-icon {
      height: 40px;
      width: auto;
      max-width: 68px;
      object-fit: contain;
    }
    .tile-label {
      font-size: 0.8rem;
      text-align: center;
      padding: 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 110px;
    }
  `],
})
export class Anwendungen {
  private readonly ais = inject(AisService);
  private readonly toast = inject(ToastService);

  // Tile structure and icons per INPUTS/AnwendungenMockupIcons.png
  protected readonly groups: TileGroup[] = [
    {
      title: 'START',
      tiles: [
        { label: 'Favoriten', materialIcon: 'star' },
        { label: 'Suchcenter', materialIcon: 'search' },
      ],
    },
    {
      title: 'ARCHIV',
      tiles: [
        { label: 'Tektonik', iconPng: 'icons/tektonik.png', appId: 'tektonik' },
        { label: 'Magazinverwaltung', iconPng: 'icons/magazinverwaltung.png', appId: 'magazinverwaltung' },
        { label: 'Akzessionen', iconPng: 'icons/akzessionen.png', appId: 'akzessionen' },
        { label: 'Provenienzen', iconPng: 'icons/provenienzen.png', appId: 'provenienzen' },
      ],
    },
    {
      title: 'INGEST UND REPOSITORY',
      tiles: [
        { label: 'Datenübernahme', iconPng: 'icons/datenuebernahme.png', appId: 'datenuebernahme' },
        { label: 'Verarbeitung', iconPng: 'icons/verarbeitung.png', appId: 'verarbeitung' },
        { label: 'Preservation', iconPng: 'icons/preservation.png', appId: 'preservation' },
      ],
    },
    {
      title: 'ADMINISTRATION',
      tiles: [
        { label: 'Systemeinstellungen', iconPng: 'icons/systemeinstellungen.png' },
        { label: 'Benutzereinstellungen', iconPng: 'icons/benutzereinstellungen.png' },
      ],
    },
  ];

  protected open(tile: AnwendungsKachel): void {
    if (tile.appId) {
      this.ais.openApp(tile.appId as AppId);
    } else {
      this.toast.show(`"${tile.label}" ist in diesem Prototyp noch nicht ausgebaut.`);
    }
  }
}
