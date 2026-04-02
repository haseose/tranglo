import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExchangeRateService } from './exchange-rate.service';
import { StorageService } from './storage.service';
import { NetworkStatusService } from './network-status.service';
import { ExchangeRateResponse, PairRateResponse } from '../models/exchange-rate.model';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let httpMock: HttpTestingController;
  let storageSpy: Partial<StorageService>;
  let networkStatusSpy: Partial<NetworkStatusService>;
  let isOnlineFn: ReturnType<typeof vi.fn>;

  const mockResponse: ExchangeRateResponse = {
    result: 'success',
    documentation: '',
    terms_of_use: '',
    time_last_update_unix: 1700000000,
    time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
    time_next_update_unix: 1700086400,
    time_next_update_utc: 'Sat, 15 Nov 2023 00:00:00 +0000',
    base_code: 'USD',
    conversion_rates: { USD: 1, EUR: 0.92, GBP: 0.79 },
  };

  beforeEach(() => {
    isOnlineFn = vi.fn().mockReturnValue(true);

    storageSpy = {
      getLatest: vi.fn().mockResolvedValue(null),
      getHistory: vi.fn().mockResolvedValue([]),
    };

    networkStatusSpy = {
      isOnline: isOnlineFn as unknown as NetworkStatusService['isOnline'],
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storageSpy },
        { provide: NetworkStatusService, useValue: networkStatusSpy },
      ],
    });

    service = TestBed.inject(ExchangeRateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with USD as base currency', () => {
    expect(service.baseCurrency()).toBe('USD');
  });

  it('should update base currency via setBaseCurrency()', () => {
    service.setBaseCurrency('EUR');
    expect(service.baseCurrency()).toBe('EUR');
  });

  describe('fetchLatestRates()', () => {
    it('should call the correct API endpoint when online', () => {
      service.fetchLatestRates('USD').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/latest/USD'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return the API response when online', () => {
      let result: ExchangeRateResponse | undefined;
      service.fetchLatestRates('USD').subscribe(r => (result = r));
      httpMock.expectOne(r => r.url.includes('/latest/USD')).flush(mockResponse);
      expect(result?.base_code).toBe('USD');
      expect(result?.conversion_rates['EUR']).toBe(0.92);
    });

    it('should return cached data from storage when offline', async () => {
      isOnlineFn.mockReturnValue(false);
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      let result: ExchangeRateResponse | undefined;
      await new Promise<void>(resolve => {
        service.fetchLatestRates('USD').subscribe(r => { result = r; resolve(); });
      });

      httpMock.expectNone(() => true);
      expect(storageSpy.getLatest).toHaveBeenCalledWith('USD');
      expect(result?.base_code).toBe('USD');
      expect(result?.conversion_rates['EUR']).toBe(0.92);
    });

    it('should return an error-result response when offline and no cache exists', async () => {
      isOnlineFn.mockReturnValue(false);
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      let result: ExchangeRateResponse | undefined;
      await new Promise<void>(resolve => {
        service.fetchLatestRates('USD').subscribe(r => { result = r; resolve(); });
      });

      httpMock.expectNone(() => true);
      expect(result?.result).toBe('error');
      expect(result?.base_code).toBe('USD');
    });
  });

  describe('fetchPairRate()', () => {
    const mockPairResponse: PairRateResponse = {
      result: 'success',
      base_code: 'USD',
      target_code: 'EUR',
      conversion_rate: 0.92,
      time_last_update_unix: 1700000000,
      time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
    };

    it('should call the correct API endpoint when online', () => {
      service.fetchPairRate('USD', 'EUR').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/pair/USD/EUR'));
      expect(req.request.method).toBe('GET');
      req.flush(mockPairResponse);
    });

    it('should return the pair rate from cache when offline and rate exists', async () => {
      isOnlineFn.mockReturnValue(false);
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      let result: PairRateResponse | undefined;
      await new Promise<void>(resolve => {
        service.fetchPairRate('USD', 'EUR').subscribe(r => { result = r; resolve(); });
      });

      httpMock.expectNone(() => true);
      expect(result?.result).toBe('success');
      expect(result?.conversion_rate).toBe(0.92);
    });

    it('should return an error response when offline and no cache exists', async () => {
      isOnlineFn.mockReturnValue(false);
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      let result: PairRateResponse | undefined;
      await new Promise<void>(resolve => {
        service.fetchPairRate('USD', 'EUR').subscribe(r => { result = r; resolve(); });
      });

      httpMock.expectNone(() => true);
      expect(result?.result).toBe('error');
    });
  });

  describe('getHistoricalRates()', () => {
    it('should return empty array when no history is stored', async () => {
      let result: unknown[] | undefined;
      await new Promise<void>(resolve => {
        service.getHistoricalRates('USD', 30).subscribe(r => { result = r; resolve(); });
      });
      expect(storageSpy.getHistory).toHaveBeenCalledWith('USD', 30);
      expect(result).toEqual([]);
    });

    it('should map stored responses to HistoricalRate objects', async () => {
      (storageSpy.getHistory as ReturnType<typeof vi.fn>).mockResolvedValue([mockResponse]);

      let result: { date: string; rates: Record<string, number>; baseCurrency: string }[] | undefined;
      await new Promise<void>(resolve => {
        service.getHistoricalRates('USD', 30).subscribe(r => { result = r; resolve(); });
      });

      expect(result).toHaveLength(1);
      expect(result![0].baseCurrency).toBe('USD');
      expect(result![0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result![0].rates['EUR']).toBe(0.92);
    });

    it('should return empty array when storage throws', async () => {
      (storageSpy.getHistory as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('IDB error'));

      let result: unknown[] | undefined;
      await new Promise<void>(resolve => {
        service.getHistoricalRates('USD', 30).subscribe(r => { result = r; resolve(); });
      });
      expect(result).toEqual([]);
    });
  });

  it('isBrowser() should return true in JSDOM test environment', () => {
    expect(service.isBrowser()).toBe(true);
  });
});
