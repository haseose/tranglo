import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WebSocketService } from './websocket.service';
import { ExchangeRateService } from './exchange-rate.service';
import { StorageService } from './storage.service';
import { of, throwError } from 'rxjs';

const mockRateResponse = {
  result: 'success' as const,
  documentation: '',
  terms_of_use: '',
  time_last_update_unix: 1700000000,
  time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
  time_next_update_unix: 1700086400,
  time_next_update_utc: 'Sat, 15 Nov 2023 00:00:00 +0000',
  base_code: 'USD',
  conversion_rates: { USD: 1, EUR: 0.92 },
};

describe('WebSocketService', () => {
  let service: WebSocketService;
  let exchangeRateSpy: Partial<ExchangeRateService>;
  let storageSpy: Partial<StorageService>;

  beforeEach(() => {
    exchangeRateSpy = {
      fetchLatestRates: vi.fn().mockReturnValue(of(mockRateResponse)),
    };
    storageSpy = {
      saveLatest: vi.fn().mockResolvedValue(undefined),
      saveHistory: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ExchangeRateService, useValue: exchangeRateSpy },
        { provide: StorageService, useValue: storageSpy },
      ],
    });
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    service.stopConnection();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start disconnected', () => {
    expect(service.isConnected()).toBe(false);
  });

  it('startConnection() should set isConnected to true', () => {
    service.startConnection('USD');
    expect(service.isConnected()).toBe(true);
  });

  it('stopConnection() should set isConnected to false', () => {
    service.startConnection('USD');
    service.stopConnection();
    expect(service.isConnected()).toBe(false);
  });

  it('startConnection() should fetch rates immediately and emit rateUpdate$', () => {
    const emitted: unknown[] = [];
    service.rateUpdate$.subscribe(r => emitted.push(r));
    service.startConnection('USD');
    expect(exchangeRateSpy.fetchLatestRates).toHaveBeenCalledWith('USD');
    expect(emitted.length).toBeGreaterThan(0);
  });

  it('should not refetch if called with same base currency while connected', () => {
    service.startConnection('USD');
    const callCount = (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mock.calls.length;
    service.startConnection('USD');
    expect((exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  it('should restart connection when base currency changes', () => {
    service.startConnection('USD');
    service.startConnection('EUR');
    expect(exchangeRateSpy.fetchLatestRates).toHaveBeenCalledWith('EUR');
  });

  it('should save the full response to storage on successful fetch', () => {
    service.startConnection('USD');
    expect(storageSpy.saveLatest).toHaveBeenCalledWith(mockRateResponse);
    expect(storageSpy.saveHistory).toHaveBeenCalledWith(mockRateResponse);
  });

  it('should not throw when fetchLatestRates errors', () => {
    (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    expect(() => service.startConnection('USD')).not.toThrow();
  });
});
