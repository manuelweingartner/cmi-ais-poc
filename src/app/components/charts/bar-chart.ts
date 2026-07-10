import { Component, computed, input } from '@angular/core';
import { CHART_COLORS } from './chart-colors';

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

/** Simple vertical bar chart in the CMI widget style (light blue bars, grey grid). */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" style="width: 100%; height: auto;">
      @for (g of grid(); track g.y) {
        <line [attr.x1]="pad" [attr.x2]="W - 8" [attr.y1]="g.y" [attr.y2]="g.y" stroke="#E2E3E4" stroke-width="1" />
        <text [attr.x]="pad - 6" [attr.y]="g.y + 3" text-anchor="end" class="tick">{{ g.label }}</text>
      }
      @for (b of bars(); track b.label) {
        <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.fill]="b.color">
          <title>{{ b.label }}: {{ b.value }}</title>
        </rect>
        <text [attr.x]="b.x + b.w / 2" [attr.y]="H - 6" text-anchor="middle" class="cat">{{ b.label }}</text>
      }
    </svg>
  `,
  styles: [`
    :host { display: block; max-width: 620px; margin: 0 auto; }
    .tick { font-size: 9px; fill: #9aa3ae; }
    .cat { font-size: 10px; fill: #586475; }
  `],
})
export class BarChart {
  readonly data = input.required<BarItem[]>();
  /** Taller rendering, e.g. next to donut charts on the dashboard. */
  readonly tall = input(false);
  readonly W = 460;
  get H(): number {
    return this.tall() ? 330 : 220;
  }
  readonly pad = 38;

  private niceMax(): number {
    const m = Math.max(1, ...this.data().map((d) => d.value));
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const candidates = [1, 2, 2.5, 5, 10].map((c) => c * pow);
    return candidates.find((c) => c >= m) ?? m;
  }

  readonly grid = computed(() => {
    const max = this.niceMax();
    const steps = 4;
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const v = (max / steps) * i;
      const y = this.H - 22 - ((this.H - 40) * v) / max;
      out.push({ y, label: String(Math.round(v)) });
    }
    return out;
  });

  readonly bars = computed(() => {
    const data = this.data();
    const max = this.niceMax();
    const innerW = this.W - this.pad - 12;
    const bw = Math.min(64, (innerW / Math.max(1, data.length)) * 0.6);
    const gap = innerW / Math.max(1, data.length);
    return data.map((d, i) => {
      const h = ((this.H - 40) * d.value) / max;
      return {
        label: d.label,
        value: d.value,
        x: this.pad + gap * i + (gap - bw) / 2,
        y: this.H - 22 - h,
        w: bw,
        h,
        color: d.color ?? CHART_COLORS[0],
      };
    });
  });
}
