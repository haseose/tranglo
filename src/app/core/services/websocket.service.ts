import { Injectable, inject, PLATFORM_ID, OnDestroy, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, interval, Subscription, takeUntil, shareReplay } from 'rxjs';
import { ExchangeRateService } from './exchange-rate.service';
import { StorageService } from './storage.service';
import { NetworkStatusService } from './network-status.service';
import { ExchangeRateResponse } from '../models/exchange-rate.model';
import { DEFAULT_CURRENCY } from '../models/currency.model';

const REFRESH_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly storage = inject(StorageService);
  private readonly networkStatus = inject(NetworkStatusService);

  private readonly destroy$ = new Subject<void>();
  private intervalSub: Subscription | null = null;
  private activeFetch: Subscription | null = null;
  private visibilityHandler: (() => void) | null = null;
  private currentBase: string | null = null;

  /** Single shared Subject — all subscribers receive the same emission */
  private readonly _rateUpdate$ = new Subject<ExchangeRateResponse>();
  readonly rateUpdate$ = this._rateUpdate$.asObservable().pipe(shareReplay(1));

  readonly isConnected = signal(false);

  constructor() {
    // React to network changes: pause connection when offline, resume when back online
    effect(() => {
      const online = this.networkStatus.isOnline();
      if (!this.currentBase) return;

      if (!online) {
        this.activeFetch?.unsubscribe();
        this.activeFetch = null;
        this.isConnected.set(false);
        console.log(`[WebSocketService] Disconnected — network offline (${this.currentBase} polling paused)`);
      } else {
        this.isConnected.set(true);
        console.log(`[WebSocketService] Reconnected — resuming ${this.currentBase} polling`);
        this.doFetch(this.currentBase);
      }
    });
  }

  startConnection(baseCurrency: string = DEFAULT_CURRENCY): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Avoid re-starting if same base currency is already active
    if (this.currentBase === baseCurrency && this.isConnected()) return;

    this.stopConnection();
    this.currentBase = baseCurrency;
    this.isConnected.set(true);
    console.log(`[WebSocketService] Connected — polling ${baseCurrency} every ${REFRESH_INTERVAL_MS / 1000}s`);

    // Initial fetch (only one HTTP call regardless of subscriber count)
    this.doFetch(baseCurrency);

    // Interval: fires every 30s, but only fetches when tab is visible and online
    this.intervalSub = interval(REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!document.hidden && this.networkStatus.isOnline()) {
          this.doFetch(baseCurrency);
        }
      });

    // Resume fetch immediately when tab becomes visible again
    this.visibilityHandler = () => {
      if (!document.hidden && this.networkStatus.isOnline()) this.doFetch(baseCurrency);
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
    if (this.currentBase) {
      console.log(`[WebSocketService] Disconnected — stopped polling ${this.currentBase}`);
    }
    this.currentBase = null;
    this.isConnected.set(false);
  }

  /** Single guarded fetch — cancels any in-flight request before starting */
  private doFetch(baseCurrency: string): void {
    if (!this.networkStatus.isOnline()) return;

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
