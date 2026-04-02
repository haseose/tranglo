import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, from, of, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExchangeRateResponse, PairRateResponse } from '../models/exchange-rate.model';
import { HistoricalRate } from '../models/historical-rate.model';
import { StorageService } from './storage.service';
import { NetworkStatusService } from './network-status.service';
import { DEFAULT_CURRENCY } from '../models/currency.model';

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(StorageService);
  private readonly networkStatus = inject(NetworkStatusService);

  private readonly _baseCurrency = signal(DEFAULT_CURRENCY);
  readonly baseCurrency = this._baseCurrency.asReadonly();

  setBaseCurrency(code: string): void {
    this._baseCurrency.set(code);
  }

  fetchLatestRates(base: string = DEFAULT_CURRENCY): Observable<ExchangeRateResponse> {
    if (!this.networkStatus.isOnline()) {
      return from(this.storage.getLatest(base)).pipe(
        map(cached => {
          if (cached) return cached;
          return {
            result: 'error' as const,
            documentation: '',
            terms_of_use: '',
            time_last_update_unix: 0,
            time_last_update_utc: '',
            time_next_update_unix: 0,
            time_next_update_utc: '',
            base_code: base,
            conversion_rates: {},
          };
        })
      );
    }
    const url = `${environment.exchangeRateApiBaseUrl}/${environment.exchangeRateApiKey}/latest/${base}`;
    return this.http.get<ExchangeRateResponse>(url);
  }

  fetchPairRate(base: string, target: string): Observable<PairRateResponse> {
    if (!this.networkStatus.isOnline()) {
      return from(this.storage.getLatest(base)).pipe(
        map(cached => {
          const rate = cached?.conversion_rates?.[target];
          if (rate !== undefined) {
            return {
              result: 'success' as const,
              base_code: base,
              target_code: target,
              conversion_rate: rate,
              time_last_update_unix: cached!.time_last_update_unix,
              time_last_update_utc: cached!.time_last_update_utc,
            };
          }
          return { result: 'error' as const, 'error-type': 'no-cache' };
        })
      );
    }
    const url = `${environment.exchangeRateApiBaseUrl}/${environment.exchangeRateApiKey}/pair/${base}/${target}`;
    return this.http.get<PairRateResponse>(url);
  }

  getHistoricalRates(baseCurrency: string, days = 30): Observable<HistoricalRate[]> {
    return from(this.storage.getHistory(baseCurrency, days)).pipe(
      map(responses =>
        responses.map(r => ({
          date: new Date(r.time_last_update_unix * 1000).toISOString().split('T')[0],
          rates: r.conversion_rates,
          baseCurrency: r.base_code,
        }))
      ),
      catchError(() => of([]))
    );
  }

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
