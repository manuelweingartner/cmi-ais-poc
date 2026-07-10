import { Component, computed, input, output } from '@angular/core';
import { CHART_COLORS, CHART_TEXT } from './chart-colors';

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

interface RenderedSlice {
  path: string;
  color: string;
  label: string;
  value: number;
  labelLine: string;
  labelX: number;
  labelY: number;
  anchor: 'start' | 'end';
}

/**
 * Pie/Donut chart in the style of the CMI chart widget (Diagramme.png):
 * leader-line labels outside, legend at the bottom.
 */
@Component({
  selector: 'app-pie-chart',
  standalone: true,
  template: `
    <div class="pie-wrap">
      <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" [style.max-width.px]="width()">
        @for (s of slices(); track s.label) {
          <path
            [attr.d]="s.path"
            [attr.fill]="s.color"
            class="slice"
            [class.clickable]="clickable()"
            (click)="sliceClick.emit(s.label)"
          >
            <title>{{ s.label }}: {{ s.value }}</title>
          </path>
          <polyline [attr.points]="s.labelLine" fill="none" stroke="#B9BFC7" stroke-width="1" />
          <text [attr.x]="s.labelX" [attr.y]="s.labelY" [attr.text-anchor]="s.anchor" class="lbl"
                [class.clickable]="clickable()" (click)="sliceClick.emit(s.label)">
            {{ s.label }} ({{ s.value }})
          </text>
        }
      </svg>
      <div class="legend">
        @for (s of slices(); track s.label) {
          <span class="item" [class.clickable]="clickable()" (click)="sliceClick.emit(s.label)">
            <span class="dot" [style.background]="s.color"></span>{{ s.label }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .pie-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0 10px; }
    svg { width: 100%; height: auto; overflow: visible; }
    .slice { stroke: #fff; stroke-width: 1; }
    .clickable { cursor: pointer; }
    .slice.clickable:hover { opacity: 0.85; }
    .lbl { font-size: 11px; fill: ${'#586475'}; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px 14px; justify-content: center; }
    .item { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #586475; }
    .dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  `],
})
export class PieChart {
  readonly data = input.required<PieSlice[]>();
  /** 0 = pie, >0 = donut inner radius as fraction of r (e.g. 0.6). */
  readonly innerRatio = input(0);
  readonly clickable = input(false);
  /** Larger rendering for prominent widgets. */
  readonly big = input(false);
  readonly sliceClick = output<string>();

  readonly width = () => (this.big() ? 560 : 420);
  readonly height = () => (this.big() ? 320 : 260);

  readonly slices = computed<RenderedSlice[]>(() => {
    const data = this.data().filter((d) => d.value > 0);
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return [];
    const cx = this.width() / 2;
    const cy = this.height() / 2;
    const r = Math.min(cx, cy) - 48;
    const ir = r * this.innerRatio();
    let angle = -Math.PI / 2;
    interface Pre extends RenderedSlice {
      mid: number;
      right: boolean;
    }
    const pre: Pre[] = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const frac = d.value / total;
      const a0 = angle;
      const a1 = angle + frac * Math.PI * 2;
      angle = a1;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      let path: string;
      if (ir > 0) {
        const xi0 = cx + ir * Math.cos(a1), yi0 = cy + ir * Math.sin(a1);
        const xi1 = cx + ir * Math.cos(a0), yi1 = cy + ir * Math.sin(a0);
        path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi0} ${yi0} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
      } else {
        path = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      }
      const mid = (a0 + a1) / 2;
      pre.push({
        path,
        color: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
        label: d.label,
        value: d.value,
        mid,
        right: Math.cos(mid) >= 0,
        labelLine: '',
        labelX: 0,
        labelY: 0,
        anchor: 'start',
      });
    }

    // Label layout with collision avoidance: per side, sort by natural y and
    // push labels apart vertically (leader lines follow the adjusted y).
    const MIN_GAP = 14; // > font-size, keeps labels readable
    const labelRadius = r + 16;
    for (const side of [true, false]) {
      const group = pre
        .filter((p) => p.right === side)
        .map((p) => ({ p, y: cy + labelRadius * Math.sin(p.mid) }))
        .sort((a, b) => a.y - b.y);
      // downward pass: enforce min gap
      for (let i = 1; i < group.length; i++) {
        if (group[i].y < group[i - 1].y + MIN_GAP) group[i].y = group[i - 1].y + MIN_GAP;
      }
      // upward pass: keep within chart bottom
      const maxY = this.height() - 6;
      for (let i = group.length - 1; i >= 0; i--) {
        const limit = i === group.length - 1 ? maxY : group[i + 1].y - MIN_GAP;
        if (group[i].y > limit) group[i].y = limit;
      }
      for (const g of group) {
        const p = g.p;
        const p1x = cx + (r + 2) * Math.cos(p.mid);
        const p1y = cy + (r + 2) * Math.sin(p.mid);
        const elbowX = cx + (side ? 1 : -1) * Math.sqrt(Math.max(labelRadius * labelRadius - Math.pow(g.y - cy, 2), (r + 10) * (r + 10)) );
        const p3x = elbowX + (side ? 12 : -12);
        p.labelLine = `${p1x},${p1y} ${elbowX},${g.y} ${p3x},${g.y}`;
        p.labelX = p3x + (side ? 4 : -4);
        p.labelY = g.y + 3.5;
        p.anchor = side ? 'start' : 'end';
      }
    }
    return pre;
  });

  protected readonly textColor = CHART_TEXT;
}
