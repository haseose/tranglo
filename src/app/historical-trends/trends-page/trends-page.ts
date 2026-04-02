import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import {
  HistoricalRate,
  AggregationPeriod,
  CurrencyTrend,
  TrendDataPoint,
} from '../../core/models/historical-rate.model';
import { POPULAR_CURRENCIES } from '../../core/models/currency.model';
import { TrendChartComponent } from '../trend-chart/trend-chart';
import { CurrencySelectorComponent } from '../currency-selector/currency-selector';
import { AggregationToggleComponent } from '../aggregation-toggle/aggregation-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

const TREND_COLORS: readonly string[] = ['#3b82f6', '#22c55e', '#DC143C'];
const HISTORY_DAYS = 30;
const MONTH_NAMES: readonly string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function formatMonthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

@Component({
  selector: 'app-trends-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrendChartComponent, CurrencySelectorComponent, AggregationToggleComponent, MatSelectModule, MatFormFieldModule],
  templateUrl: './trends-page.html',
  styleUrl: './trends-page.css',
})
export class TrendsPageComponent {
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly allCurrencies = POPULAR_CURRENCIES;

  readonly selectedCurrencies= signal<string[]>([]);
  readonly aggregation = signal<AggregationPeriod>('daily');
  readonly historicalData = signal<HistoricalRate[]>([]);
  readonly isLoading = signal(false);
  readonly baseCurrency = signal(this.exchangeRateService.baseCurrency());
  readonly error = signal<string | null>(null);

  /** Cached current pair rates: currencyCode → rate relative to baseCurrency. */
  private readonly pairRateCache = new Map<string, number>();

  readonly trends = computed<CurrencyTrend[]>(() => {
    const data = this.historicalData();
    const currencies = this.selectedCurrencies();
    const period = this.aggregation();

    if (!data.length || !currencies.length) return [];

    return currencies.map((code, index) => ({
      currencyCode: code,
      dataPoints: this.aggregateData(data, code, period),
      color: TREND_COLORS[index % TREND_COLORS.length],
    }));
  });

  onCurrencySelectionChange(currencies: string[]): void {
    const prev = this.selectedCurrencies();
    const added = currencies.filter(c => !prev.includes(c));
    const removed = prev.filter(c => !currencies.includes(c));

    for (const code of removed) {
      this.pairRateCache.delete(code);
    }

    this.selectedCurrencies.set(currencies);
    this.error.set(null);

    if (added.length === 0) {
      this.rebuildHistoricalData();
      return;
    }

    this.isLoading.set(true);

    const fetches = added.map(code =>
      this.exchangeRateService.fetchPairRate(this.baseCurrency(), code).pipe(
        map(resp => ({ code, resp })),
        catchError(() => of({ code, resp: null })),
      )
    );

    forkJoin(fetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => {
        for (const { code, resp } of results) {
          if (resp && resp.result === 'success' && resp.conversion_rate !== undefined) {
            this.pairRateCache.set(code, resp.conversion_rate);
          } else if (resp && resp.result === 'error') {
            this.error.set(`Could not fetch rate for ${code}: ${resp['error-type'] ?? 'unknown error'}`);
          }
        }
        this.isLoading.set(false);
        this.rebuildHistoricalData();
      });
  }

  /** Template-facing alias used by the currency-selector (selectionChange) output. */
  onSelectionChange(currencies: string[]): void {
    this.onCurrencySelectionChange(currencies);
  }

  onAggregationChange(period: AggregationPeriod): void {
    this.aggregation.set(period);
  }

  onBaseCurrencyChange(value: string): void {
    const filteredCurrencies = this.selectedCurrencies().filter(c => c !== value);

    this.selectedCurrencies.set(filteredCurrencies);
    this.baseCurrency.set(value);
    this.pairRateCache.clear();
    this.historicalData.set([]);
    this.error.set(null);

    if (filteredCurrencies.length === 0) return;

    this.isLoading.set(true);

    const fetches = filteredCurrencies.map(curr =>
      this.exchangeRateService.fetchPairRate(value, curr).pipe(
        map(resp => ({ code: curr, resp })),
        catchError(() => of({ code: curr, resp: null })),
      )
    );

    forkJoin(fetches)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => {
        for (const { code: curr, resp } of results) {
          if (resp && resp.result === 'success' && resp.conversion_rate !== undefined) {
            this.pairRateCache.set(curr, resp.conversion_rate);
          }
        }
        this.isLoading.set(false);
        this.rebuildHistoricalData();
      });
  }

  private generateDailyPoints(currentRate: number, days: number): number[] {
    const points = new Array<number>(days);
    points[days - 1] = currentRate;
    for (let i = days - 2; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 0.01;
      points[i] = points[i + 1] * (1 + variance);
    }
    return points;
  }

  private rebuildHistoricalData(): void {
    const base = this.baseCurrency();

    if (this.pairRateCache.size === 0) {
      this.historicalData.set([]);
      return;
    }

    const today = new Date();
    const dateKeys: string[] = [];
    for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dateKeys.push(d.toISOString().split('T')[0]);
    }

    const ratesByDate = new Map<string, Record<string, number>>(
      dateKeys.map(key => [key, {}])
    );

    for (const [code, currentRate] of this.pairRateCache.entries()) {
      const points = this.generateDailyPoints(currentRate, HISTORY_DAYS);
      dateKeys.forEach((dateKey, idx) => {
        ratesByDate.get(dateKey)![code] = points[idx];
      });
    }

    this.historicalData.set(
      dateKeys.map(date => ({ date, rates: ratesByDate.get(date)!, baseCurrency: base }))
    );
  }

  private aggregateData(
    data: HistoricalRate[],
    currency: string,
    period: AggregationPeriod,
  ): TrendDataPoint[] {
    const filtered = data.filter(d => d.rates[currency] !== undefined);

    if (period === 'daily') {
      return filtered.map(d => ({ label: d.date, value: d.rates[currency] }));
    }

    const buckets = new Map<string, { sum: number; count: number }>();

    for (const entry of filtered) {
      const key =
        period === 'weekly'
          ? getISOWeekKey(new Date(entry.date + 'T00:00:00'))
          : entry.date.substring(0, 7);

      const prev = buckets.get(key) ?? { sum: 0, count: 0 };
      buckets.set(key, { sum: prev.sum + entry.rates[currency], count: prev.count + 1 });
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { sum, count }]) => ({
        label: period === 'monthly' ? formatMonthLabel(key) : key,
        value: sum / count,
      }));
  }
}

