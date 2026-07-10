import { Component, inject, signal } from '@angular/core';
import { AisService } from '../../services/ais.service';
import { ToastService } from '../../services/toast.service';

const FEEDBACK_EMAIL = 'manuel.weingartner@cmi.ch';

/**
 * Collapsible feedback widget (bottom right, above the dashboard FAB).
 * Collects a 1-5 star rating plus free text and opens the user's mail
 * client via mailto: with everything prefilled (static site, no backend).
 */
@Component({
  selector: 'app-feedback-widget',
  standalone: true,
  template: `
    @if (open()) {
      <div class="fb-panel">
        <div class="fb-head">
          <i class="material-icons">rate_review</i>
          <span>Feedback zum Prototyp</span>
          <button class="fb-close" type="button" title="Schliessen" (click)="open.set(false)">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="fb-stars">
          @for (star of stars; track star) {
            <button
              type="button"
              class="fb-star"
              [title]="star + ' von 5 Sternen'"
              (mouseenter)="hoverRating.set(star)"
              (mouseleave)="hoverRating.set(0)"
              (click)="rating.set(star)"
            >
              <i class="material-icons" [class.on]="star <= (hoverRating() || rating())">
                {{ star <= (hoverRating() || rating()) ? 'star' : 'star_border' }}
              </i>
            </button>
          }
          @if (rating() > 0) {
            <span class="fb-rating-label">{{ rating() }}/5</span>
          }
        </div>
        <textarea
          class="fb-text"
          rows="4"
          placeholder="Was gefällt? Was fehlt? Was funktioniert nicht? Was gehört noch in den POC?"
          [value]="text()"
          (input)="text.set($any($event.target).value)"
        ></textarea>
        <button class="fb-send" type="button" [disabled]="!canSend()" (click)="send()">
          <i class="material-icons">send</i>
          Feedback senden
        </button>
        <div class="fb-hint">Öffnet dein Mailprogramm (an {{ email }}).</div>
      </div>
    } @else {
      <button class="fb-pill" type="button" title="Feedback zum Prototyp geben" (click)="open.set(true)">
        <i class="material-icons">rate_review</i>
        Feedback
      </button>
    }
  `,
  styles: [`
    .fb-pill {
      position: fixed; right: 28px; bottom: 116px; z-index: 50;
      display: flex; align-items: center; gap: 7px;
      background: #009fe3; color: #fff; border: none; cursor: pointer;
      border-radius: 22px; padding: 10px 18px 10px 14px;
      font-family: inherit; font-size: 0.85rem; font-weight: 500;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
    }
    .fb-pill:hover { background: #008fcc; }
    .fb-pill .material-icons { font-size: 19px; }
    .fb-panel {
      position: fixed; right: 28px; bottom: 116px; z-index: 50;
      width: 320px; background: #fff; border-radius: 6px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .fb-head {
      display: flex; align-items: center; gap: 8px;
      background: #009fe3; color: #fff; padding: 10px 12px;
      font-size: 0.9rem; font-weight: 500;
    }
    .fb-head .material-icons { font-size: 19px; }
    .fb-close {
      margin-left: auto; background: none; border: none; color: #fff;
      cursor: pointer; padding: 2px; display: flex;
    }
    .fb-close .material-icons { font-size: 18px; }
    .fb-stars { display: flex; align-items: center; padding: 12px 12px 4px; }
    .fb-star { background: none; border: none; cursor: pointer; padding: 2px; display: flex; }
    .fb-star .material-icons { font-size: 27px; color: #c3cad3; }
    .fb-star .material-icons.on { color: #f5b301; }
    .fb-rating-label { margin-left: 8px; font-size: 0.8rem; color: #9aa3ae; }
    .fb-text {
      margin: 8px 12px 0; resize: vertical; min-height: 84px;
      border: 1px solid #d5dae0; border-radius: 4px; padding: 8px 10px;
      font-family: inherit; font-size: 0.83rem; color: #33485e;
    }
    .fb-text:focus { outline: none; border-color: #009fe3; }
    .fb-send {
      margin: 10px 12px 4px; display: flex; align-items: center; justify-content: center; gap: 7px;
      background: #009fe3; color: #fff; border: none; border-radius: 4px;
      padding: 9px 0; cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 500;
    }
    .fb-send:hover:not([disabled]) { background: #008fcc; }
    .fb-send[disabled] { background: #c3cad3; cursor: default; }
    .fb-send .material-icons { font-size: 17px; }
    .fb-hint { padding: 0 12px 10px; font-size: 0.72rem; color: #9aa3ae; text-align: center; }
  `],
})
export class FeedbackWidget {
  private readonly ais = inject(AisService);
  private readonly toast = inject(ToastService);

  protected readonly email = FEEDBACK_EMAIL;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly open = signal(false);
  protected readonly rating = signal(0);
  protected readonly hoverRating = signal(0);
  protected readonly text = signal('');

  protected canSend(): boolean {
    return this.rating() > 0 || this.text().trim().length > 0;
  }

  protected send(): void {
    const rating = this.rating();
    const subject = rating > 0 ? `Feedback CMI AIS Prototyp (${rating}/5 Sterne)` : 'Feedback CMI AIS Prototyp';
    const lines: string[] = [];
    if (rating > 0) {
      lines.push(`Bewertung: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`);
    }
    lines.push(`Ort im Prototyp: ${this.currentLocation()}`);
    const message = this.text().trim();
    if (message) {
      lines.push('', message);
    }
    const mailto = `mailto:${FEEDBACK_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(lines.join('\r\n'))}`;
    window.location.href = mailto;
    this.toast.show('Danke! Dein Mailprogramm ist geöffnet, bitte das Mail noch absenden.');
    this.open.set(false);
    this.rating.set(0);
    this.hoverRating.set(0);
    this.text.set('');
  }

  /** Human-readable spot in the prototype, so feedback can be matched to a screen. */
  private currentLocation(): string {
    switch (this.ais.currentView()) {
      case 'dashboard': return 'Dashboard';
      case 'anwendungen': return 'Anwendungen';
      case 'app': return `App «${this.ais.activeApp()?.name ?? 'unbekannt'}»`;
    }
  }
}
