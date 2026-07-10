import { Component, computed, input } from '@angular/core';

/**
 * KPI tile in the CMI widget style (Diagramme.png): title, big number,
 * optional sparkline and sub-caption.
 */
@Component({
  selector: 'app-kpi-tile',
  standalone: true,
  template: `
    <div class="kpi">
      <div class="title">{{ title() }}</div>
      <div class="value-row">
        <span class="value">{{ value() }}</span>
        @if (delta()) {
          <span class="delta" [class.neg]="deltaNegative()">{{ delta() }}</span>
        }
      </div>
      @if (spark().length > 1) {
        <svg viewBox="0 0 120 30" class="spark">
          <polyline [attr.points]="sparkPoints()" fill="none" stroke="#586475" stroke-width="1.4" />
        </svg>
      }
      @if (sub()) {
        <div class="sub">{{ sub() }}</div>
      }
    </div>
  `,
  styles: [`
    .kpi { background: #fff; border: 1px solid #e4e7ea; border-radius: 3px; padding: 14px 16px; min-width: 150px; }
    .title { font-size: 0.8rem; color: #586475; margin-bottom: 8px; }
    .value-row { display: flex; align-items: baseline; gap: 8px; }
    .value { font-size: 1.6rem; font-weight: 500; color: #33485E; }
    .delta { font-size: 0.7rem; color: #3f971a; }
    .delta.neg { color: #8c0909; }
    .spark { width: 120px; height: 30px; margin-top: 6px; }
    .sub { font-size: 0.7rem; color: #9aa3ae; margin-top: 4px; }
  `],
})
export class KpiTile {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly sub = input('');
  readonly delta = input('');
  readonly deltaNegative = input(false);
  readonly spark = input<number[]>([]);

  readonly sparkPoints = computed(() => {
    const values = this.spark();
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    return values
      .map((v, i) => `${(120 / (values.length - 1)) * i},${28 - ((v - min) / range) * 26}`)
      .join(' ');
  });
}
