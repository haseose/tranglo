import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { StorageService } from '../../core/services/storage.service';
import { ConversionResult, Currency, DEFAULT_CURRENCY, POPULAR_CURRENCIES } from '../../core/models/currency.model';
import { ExchangeRateResponse } from '../../core/models/exchange-rate.model';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

/** Fixed base used for all rate fetches — cross-rates derived via division. */
const RATES_BASE = DEFAULT_CURRENCY;

@Component({
  selector: 'app-conversion-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSelectModule, MatFormFieldModule],
  templateUrl: './conversion-form.html',
  styleUrl: './conversion-form.css',
})
export class ConversionFormComponent implements OnInit {
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly storageService = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly amount = signal<number>(1);
  readonly fromCurrency = signal<string>(DEFAULT_CURRENCY);
  readonly toCurrency = signal<string>('EUR');
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly rates = signal<Record<string, number>>({});

  /** Auto-calculates instantly — no API call needed on dropdown change. */
  readonly conversionResult = computed<ConversionResult | null>(() => {
    const r = this.rates();
    const amount = this.amount();
    const from = this.fromCurrency();
    const to = this.toCurrency();

    if (Object.keys(r).length === 0) return null;
    if (amount <= 0 || !r[from] || !r[to]) return null;

    // Cross-rate: how many `to` units per 1 `from` unit
    const rate = r[to] / r[from];
    return { amount, from, to, result: amount * rate, rate, timestamp: Date.now() };
  });

  readonly formattedResult = computed(() => {
    const res = this.conversionResult();
    if (!res) return null;

    const fmt = (n: number, dec = 4) =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: dec,
      }).format(n);

    const inverseRate = res.rate !== 0 ? 1 / res.rate : 0;

    return {
      fromDisplay: `${fmt(res.amount, 2)} ${res.from}`,
      toDisplay: `${fmt(res.result, 4)} ${res.to}`,
      rateDisplay: `1 ${res.from} = ${fmt(res.rate, 6)} ${res.to}`,
      inverseRateDisplay: `1 ${res.to} = ${fmt(inverseRate, 6)} ${res.from}`,
      dateDisplay: new Date(res.timestamp).toLocaleString(),
    };
  });

  readonly isFormValid = computed(() => this.amount() > 0 && this.fromCurrency() !== this.toCurrency());

  readonly currencies: Currency[] = POPULAR_CURRENCIES;

  ngOnInit(): void {
    this.storageService.getLatest(RATES_BASE).then(cached => {
      if (cached?.result === 'success') {
        this.rates.set(cached.conversion_rates);
      } else {
        this.fetchRates();
      }
    });
  }

  onAmountChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = parseFloat(raw);
    this.amount.set(isNaN(value) ? 0 : Math.max(0, value));
    if (!isNaN(value) && value > 0) this.error.set(null);
  }

  onFromCurrencyChange(value: string): void {
    this.fromCurrency.set(value);
  }

  onToCurrencyChange(value: string): void {
    this.toCurrency.set(value);
  }

  onSwap(): void {
    const prev = this.fromCurrency();
    this.fromCurrency.set(this.toCurrency());
    this.toCurrency.set(prev);
    // No re-fetch needed — result recomputes instantly from existing rates.
  }

  private fetchRates(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.exchangeRateService
      .fetchLatestRates(RATES_BASE)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ExchangeRateResponse) => {
          if (response.result === 'success') {
            this.rates.set(response.conversion_rates);
            this.storageService.saveLatest(response);
          } else {
            this.applyFallbackRates('Exchange rate provider returned an error.');
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.applyFallbackRates('Failed to fetch live rates. Showing cached data.');
          this.isLoading.set(false);
        },
      });
  }

  private applyFallbackRates(message: string): void {
    this.storageService.getLatest(RATES_BASE).then(cached => {
      if (cached) {
        this.rates.set(cached.conversion_rates);
        this.error.set(message + ' (Using cached rates.)');
      } else {
        this.rates.set({});
        this.error.set(message + ' No cached data available.');
      }
    });
  }
}

