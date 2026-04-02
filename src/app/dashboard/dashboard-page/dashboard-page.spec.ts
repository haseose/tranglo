import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { DashboardPageComponent } from './dashboard-page';
import { WebSocketService } from '../../core/services/websocket.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { StorageService } from '../../core/services/storage.service';
import { ExchangeRateResponse } from '../../core/models/exchange-rate.model';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

const mockResponse: ExchangeRateResponse = {
  result: 'success',
  documentation: '',
  terms_of_use: '',
  time_last_update_unix: 1700000000,
  time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
  time_next_update_unix: 1700086400,
  time_next_update_utc: 'Sat, 15 Nov 2023 00:00:00 +0000',
  base_code: 'USD',
  conversion_rates: { USD: 1, EUR: 0.92 },
};

describe('DashboardPageComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;
  let wsSpy: Partial<WebSocketService>;
  let storageSpy: Partial<StorageService>;
  let exchangeRateSpy: Partial<ExchangeRateService>;
  let rateUpdate$: Subject<ExchangeRateResponse>;

  const buildComponent = async () => {
    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    rateUpdate$ = new Subject<ExchangeRateResponse>();

    wsSpy = {
      rateUpdate$: rateUpdate$.asObservable(),
      startConnection: vi.fn(),
      stopConnection: vi.fn(),
      isConnected: (() => false) as unknown as WebSocketService['isConnected'],
    };

    storageSpy = {
      getLatest: vi.fn().mockResolvedValue(null),
      saveLatest: vi.fn().mockResolvedValue(undefined),
      saveHistory: vi.fn().mockResolvedValue(undefined),
    };

    exchangeRateSpy = {
      isBrowser: vi.fn().mockReturnValue(true),
      fetchLatestRates: vi.fn().mockReturnValue(of(mockResponse)),
      baseCurrency: (() => 'USD') as unknown as ExchangeRateService['baseCurrency'],
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        { provide: WebSocketService, useValue: wsSpy },
        { provide: StorageService, useValue: storageSpy },
        { provide: ExchangeRateService, useValue: exchangeRateSpy },
        {
          provide: NetworkStatusService,
          useValue: { isOnline: (() => true) as unknown as NetworkStatusService['isOnline'] },
        },
      ],
    }).compileComponents();

    await buildComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call wsService.startConnection with default base currency on init', () => {
    expect(wsSpy.startConnection).toHaveBeenCalledWith('USD');
  });

  // Line 48 — lastUpdated updated from rateUpdate$ stream
  it('should update lastUpdated when rateUpdate$ emits (line 48)', () => {
    rateUpdate$.next(mockResponse);
    expect(component.lastUpdated()).toBe('Fri, 14 Nov 2023 00:00:00 +0000');
  });

  // Line 66 — loadCachedMeta sets baseCurrency + lastUpdated when cache exists
  it('should update baseCurrency and lastUpdated from cache when cached data exists (line 66)', async () => {
    (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    await buildComponent();

    expect(component.baseCurrency()).toBe('USD');
    expect(component.lastUpdated()).toBe('Fri, 14 Nov 2023 00:00:00 +0000');
  });

  it('should not update signals when cache is empty', async () => {
    (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await buildComponent();

    expect(component.lastUpdated()).toBe('');
  });

  // Line 82 — onFilterChange sets filterCurrency
  it('onFilterChange() should set filterCurrency signal', () => {
    component.onFilterChange('EUR');
    expect(component.filterCurrency()).toBe('EUR');
  });

  it('onSearchChange() should set searchQuery signal', () => {
    component.onSearchChange('GBP');
    expect(component.searchQuery()).toBe('GBP');
  });

  it('onBaseCurrencyChange() should update baseCurrency, stop and restart ws connection', () => {
    component.onBaseCurrencyChange('EUR');

    expect(component.baseCurrency()).toBe('EUR');
    expect(wsSpy.stopConnection).toHaveBeenCalled();
    expect(wsSpy.startConnection).toHaveBeenCalledWith('EUR');
  });

  it('isConnected should reflect NetworkStatusService.isOnline', () => {
    expect(component.isConnected()).toBe(true);
  });
});
