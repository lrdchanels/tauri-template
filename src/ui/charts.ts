// Charts with ECharts, tree-shaken (register more chart types in echarts.use below) and rendered
// as SVG. Colours come from the CSS variables of the current theme, so a chart follows light/dark;
// the app repaints the view on theme change. Money on axes and tooltips uses ui/format.ts, so it
// hides in privacy mode. Call clearCharts() before repainting a view (app.ts does it for you).
//
//   chart(el('<div class="chart"></div>'), { xAxis: …, yAxis: valueAxis(moneyCompact), series: […] }, 260);

import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import EN from 'echarts/lib/i18n/langEN.js';
import ES from 'echarts/lib/i18n/langES.js';
import { SVGRenderer } from 'echarts/renderers';
import { getLocale } from '../i18n';
import { esc } from './html';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomInsideComponent,
  SVGRenderer,
]);
type LocaleOption = Parameters<typeof echarts.registerLocale>[1];
echarts.registerLocale('ES', ES as LocaleOption);
echarts.registerLocale('EN', EN as LocaleOption);

// biome-ignore lint/suspicious/noExplicitAny: ECharts options are deeply dynamic.
export type ChartOption = Record<string, any>;
export type Chart = echarts.ECharts;

/** Colours of the current theme (CSS variables in styles/tokens.css). */
export function colors() {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string) => css.getPropertyValue(n).trim();
  return {
    text: v('--text'),
    text2: v('--text-2'),
    text3: v('--text-3'),
    grid: v('--grid'),
    surface: v('--surface'),
    border: v('--border'),
    accent: v('--accent'),
    accentSoft: v('--accent-soft'),
    neutral: v('--neutral'),
    up: v('--up'),
    down: v('--down'),
  };
}

const live = new Set<{ chart: Chart; ro: ResizeObserver }>();

// Charts animate when a view opens; not when a control repaints it (or all of them would flicker).
let animate = true;
export const animateCharts = (v: boolean): void => {
  animate = !!v;
};

/** Disposes every chart of the previous view. */
export function clearCharts(): void {
  for (const g of live) {
    g.ro.disconnect();
    g.chart.dispose();
  }
  live.clear();
}

function base(): ChartOption {
  const c = colors();
  return {
    useUTC: true,
    animation: animate,
    animationDuration: 350,
    textStyle: {
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font').trim(),
      color: c.text2,
      fontSize: 12,
    },
    tooltip: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: c.text, fontSize: 12 },
      extraCssText: 'box-shadow: 0 6px 24px rgba(10,20,40,.14); border-radius: 8px;',
    },
  };
}

const withBase = (option: ChartOption): ChartOption => {
  const b = base();
  return { ...b, ...option, tooltip: { ...b.tooltip, ...option.tooltip } };
};

/** Creates a chart in `node` (a div whose height is set by CSS or by `height`). */
export function chart(node: HTMLElement, option: ChartOption, height?: number): Chart {
  if (height) node.style.height = `${height}px`;
  const c = echarts.init(node, null, { renderer: 'svg', locale: getLocale().toUpperCase() });
  c.setOption(withBase(option));
  const ro = new ResizeObserver(() => c.resize());
  ro.observe(node);
  live.add({ chart: c, ro });
  return c;
}

/** Replaces the options of an existing chart without recreating it or animating. */
export function updateChart(c: Chart, option: ChartOption): void {
  c.setOption({ ...withBase(option), animation: false }, true);
}

/* ---------- common pieces ---------- */

export const gridBase = (extra: ChartOption = {}): ChartOption => ({
  left: 4,
  right: 12,
  top: 36,
  bottom: 4,
  containLabel: true,
  ...extra,
});

export function timeAxis(extra: ChartOption = {}): ChartOption {
  const c = colors();
  return {
    type: 'time',
    axisLine: { lineStyle: { color: c.grid } },
    axisTick: { show: false },
    axisLabel: { color: c.text3, hideOverlap: true },
    splitLine: { show: false },
    ...extra,
  };
}

export function categoryAxis(data: string[], extra: ChartOption = {}): ChartOption {
  const c = colors();
  return {
    type: 'category',
    data,
    axisLine: { lineStyle: { color: c.grid } },
    axisTick: { show: false },
    axisLabel: { color: c.text3, hideOverlap: true },
    ...extra,
  };
}

/** Value axis; `fmt` formats the labels (pass moneyCompact for money so it hides in private mode). */
export function valueAxis(fmt: (v: number) => string = String, extra: ChartOption = {}): ChartOption {
  const c = colors();
  return {
    type: 'value',
    axisLabel: { color: c.text3, formatter: fmt },
    splitLine: { lineStyle: { color: c.grid, type: [3, 4] } },
    ...extra,
  };
}

export const legend = (extra: ChartOption = {}): ChartOption => ({
  top: 0,
  left: 0,
  icon: 'roundRect',
  itemWidth: 12,
  itemHeight: 4,
  itemGap: 18,
  textStyle: { color: colors().text2 },
  ...extra,
});

interface TooltipParam {
  value: unknown;
  color: string;
  seriesName: string;
  axisValueLabel?: string;
}

/** Axis tooltip: a heading and one line per series with its colour. */
export function axisTooltip(fmt: (v: number) => string): ChartOption {
  return {
    trigger: 'axis',
    axisPointer: { type: 'line', lineStyle: { color: colors().grid } },
    formatter: (ps: TooltipParam[]) => {
      const rows = ps
        .map((p) => ({ p, v: Array.isArray(p.value) ? p.value[1] : p.value }))
        .filter(({ v }) => v !== null && v !== undefined)
        .map(
          ({ p, v }) =>
            `<div class="tt-row"><i style="background:${esc(p.color)}"></i>${esc(p.seriesName)}<b>${esc(fmt(Number(v)))}</b></div>`,
        );
      return `<div class="tt"><div class="tt-head">${esc(ps[0]?.axisValueLabel ?? '')}</div>${rows.join('')}</div>`;
    },
  };
}
