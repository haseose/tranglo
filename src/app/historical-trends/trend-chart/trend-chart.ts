import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  effect,
  viewChild,
  ElementRef,
  PLATFORM_ID,
  inject,
  OnDestroy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { CurrencyTrend } from '../../core/models/historical-rate.model';

// Register all Chart.js components once at module level
Chart.register(...registerables);

@Component({
  selector: 'app-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trend-chart.html',
  styleUrl: './trend-chart.css',
})
export class TrendChartComponent implements OnDestroy {
  readonly trends = input<CurrencyTrend[]>([]);
  readonly baseCurrency = input<string>('USD');

  private readonly platformId = inject(PLATFORM_ID);
  private chart: Chart | null = null;

  /** Template ref — always in the DOM so we use non-required query */
  readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  readonly hasTrends = computed(() => this.trends().length > 0);

  readonly ariaLabel = computed(() => {
    const t = this.trends();
    if (!t.length) return 'Currency exchange rate trends chart. No data to display.';
    const codes = t.map(trend => trend.currencyCode).join(', ');
    const points = t[0]?.dataPoints.length ?? 0;
    return `Line chart: exchange rate trends for ${codes} — ${points} data points`;
  });

  constructor() {
    effect(() => {
      const trends = this.trends();
      const canvasRef = this.chartCanvas();
      const base = this.baseCurrency();

      if (!isPlatformBrowser(this.platformId) || !canvasRef) {
        return;
      }

      this.destroyChart();

      if (trends.length > 0) {
        this.buildChart(trends, canvasRef.nativeElement, base);
      }
    });
  }

  private buildChart(trends: CurrencyTrend[], canvas: HTMLCanvasElement, base: string): void {
    console.log('Building chart with trends:', trends);
    const labels = trends[0]?.dataPoints.map(dp => dp.label) ?? [];
    const manyPoints = labels.length > 60;
    const textPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-primary').trim() || '#1a202c';
    const textMuted = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-muted').trim() || '#718096';

    const datasets = trends.map(trend => ({
      label: `${trend.currencyCode} / ${base}`,
      data: trend.dataPoints.map(dp => dp.value),
      borderColor: trend.color,
      backgroundColor: trend.color + '1a',
      tension: 0.4,
      fill: false,
      pointRadius: manyPoints ? 0 : 3,
      pointHoverRadius: 6,
      borderWidth: 2,
    }));

    this.chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 13, weight: 600 },
              color: textPrimary,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            padding: 12,
            callbacks: {
              label: ctx =>
                ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 12,
              font: { size: 11 },
              color: textMuted,
            },
            border: { display: false },
          },
          y: {
            title: {
              display: true,
              text: `Rate (per ${base})`,
              color: textMuted,
              font: { size: 12 },
            },
            grid: { color: 'rgba(128,128,128,0.08)' },
            ticks: {
              callback: value => Number(value).toFixed(4),
              font: { size: 11 },
              color: textMuted,
            },
            border: { display: false },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }
}
