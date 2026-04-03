import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { StorageService } from '../../core/services/storage.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { ExchangeRateResponse } from '../../core/models/exchange-rate.model';
import { POPULAR_CURRENCIES, DEFAULT_CURRENCY } from '../../core/models/currency.model';
import { ExchangeRateTableComponent } from '../exchange-rate-table/exchange-rate-table';
import { RateSearchFilterComponent } from '../rate-search-filter/rate-search-filter';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';


@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExchangeRateTableComponent, RateSearchFilterComponent, MatSelectModule, MatFormFieldModule],
})
export class DashboardPageComponent implements OnInit {
  private readonly wsService = inject(WebSocketService);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly storageService = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly popularCurrencies = POPULAR_CURRENCIES;

  readonly lastUpdated = signal<string>('');
  readonly baseCurrency = signal<string>(DEFAULT_CURRENCY);
  readonly searchQuery = signal<string>('');
  readonly filterCurrency = signal<string>('');

  readonly isConnected = this.networkStatus.isOnline;
  constructor() {
    this.wsService.rateUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: ExchangeRateResponse) => {
        this.lastUpdated.set(response.time_last_update_utc);
      });
  }

  ngOnInit(): void {
    if (!this.exchangeRateService.isBrowser()) {
      this.loadCachedMeta();
      return;
    }

    this.loadCachedMeta();
    this.wsService.startConnection(this.baseCurrency());
  }

  private loadCachedMeta(): void {
    this.storageService.getLatest(this.baseCurrency()).then(cached => {
      if (!cached) return;
      this.baseCurrency.set(cached.base_code);
      this.lastUpdated.set(cached.time_last_update_utc);
    });
  }

  onBaseCurrencyChange(value: string): void {
    this.baseCurrency.set(value);
    this.wsService.stopConnection();
    this.wsService.startConnection(value);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onFilterChange(currency: string): void {
    this.filterCurrency.set(currency);
  }
}

