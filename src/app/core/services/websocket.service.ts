import { Injectable, inject, PLATFORM_ID, OnDestroy, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, interval, Subscription, takeUntil, shareReplay } from 'rxjs';
import { ExchangeRateService } from './exchange-rate.service';
import { StorageService } from './storage.service';
import { ExchangeRateResponse } from '../models/exchange-rate.model';
import { DEFAULT_CURRENCY } from '../models/currency.model';

const REFRESH_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly storage = inject(StorageService);

  private readonly destroy$ = new Subject<void>();
  private intervalSub: Subscription | null = null;
  private activeFetch: Subscription | null = null;
  private visibilityHandler: (() => void) | null = null;
  private currentBase: string | null = null;

  /** Single shared Subject — all subscribers receive the same emission */
  private readonly _rateUpdate$ = new Subject<ExchangeRateResponse>();
  readonly rateUpdate$ = this._rateUpdate$.asObservable().pipe(shareReplay(1));

  readonly isConnected = signal(false);

  startConnection(baseCurrency: string = DEFAULT_CURRENCY): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Avoid re-starting if same base currency is already active
    if (this.currentBase === baseCurrency && this.isConnected()) return;

    this.stopConnection();
    this.currentBase = baseCurrency;
    this.isConnected.set(true);

    // Initial fetch (only one HTTP call regardless of subscriber count)
    this.doFetch(baseCurrency);

    // Interval: fires every 30s, but only fetches when tab is visible
    this.intervalSub = interval(REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!document.hidden) {
          this.doFetch(baseCurrency);
        }
      });

    // Resume fetch immediately when tab becomes visible again
    this.visibilityHandler = () => {
      if (!document.hidden) this.doFetch(baseCurrency);
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  stopConnection(): void {
    this.intervalSub?.unsubscribe();
    this.intervalSub = null;
    this.activeFetch?.unsubscribe();
    this.activeFetch = null;
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.currentBase = null;
    this.isConnected.set(false);
  }

  /** Single guarded fetch — cancels any in-flight request before starting */
  private doFetch(baseCurrency: string): void {
    if (!navigator.onLine) return;

    // Cancel any in-flight request to avoid race conditions
    this.activeFetch?.unsubscribe();

    this.activeFetch = this.exchangeRateService
      .fetchLatestRates(baseCurrency)
      .subscribe({
        next: response => {
          if (response.result === 'success') {
            this._rateUpdate$.next(response);
            this.storage.saveLatest(response);
            this.storage.saveHistory(response);
          }
        },
        error: () => {
          // Silently fail — offline banner handles the UX feedback
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopConnection();
  }
}
