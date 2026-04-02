import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConversionFormComponent } from './conversion-form';
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
  conversion_rates: { USD: 1, EUR: 0.92, GBP: 0.79 },
};

const errorResponse: ExchangeRateResponse = { ...mockResponse, result: 'error', conversion_rates: {} };

describe('ConversionFormComponent', () => {
  let component: ConversionFormComponent;
  let fixture: ComponentFixture<ConversionFormComponent>;
  let exchangeRateSpy: Partial<ExchangeRateService>;
  let storageSpy: Partial<StorageService>;

  const build = async () => {
    fixture = TestBed.createComponent(ConversionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    exchangeRateSpy = {
      fetchLatestRates: vi.fn().mockReturnValue(of(mockResponse)),
    };

    storageSpy = {
      getLatest: vi.fn().mockResolvedValue(mockResponse),
      saveLatest: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ConversionFormComponent],
      providers: [
        { provide: ExchangeRateService, useValue: exchangeRateSpy },
        { provide: StorageService, useValue: storageSpy },
      ],
    }).compileComponents();

    await build();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── ngOnInit — cache hit ───────────────────────────────────────────────────
  it('ngOnInit: should load rates from cache when cache exists (no fetch)', async () => {
    expect(storageSpy.getLatest).toHaveBeenCalled();
    expect(exchangeRateSpy.fetchLatestRates).not.toHaveBeenCalled();
    expect(component.rates()).toEqual(mockResponse.conversion_rates);
  });

  // ─── fetchRates() via ngOnInit — no cache ──────────────────────────────────
  describe('fetchRates() — triggered when cache is null', () => {
    it('success response: sets rates and calls saveLatest, isLoading becomes false', async () => {
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(of(mockResponse));

      await build();

      expect(exchangeRateSpy.fetchLatestRates).toHaveBeenCalledWith('USD');
      expect(component.rates()).toEqual(mockResponse.conversion_rates);
      expect(storageSpy.saveLatest).toHaveBeenCalledWith(mockResponse);
      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('error-result response: sets error and falls back to cache', async () => {
      (storageSpy.getLatest as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)          // first call — no cache → triggers fetch
        .mockResolvedValueOnce(mockResponse); // second call — fallback lookup
      (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(of(errorResponse));

      await build();

      expect(component.isLoading()).toBe(false);
      expect(component.error()).toContain('Using cached rates.');
      expect(component.rates()).toEqual(mockResponse.conversion_rates);
    });

    it('error-result with no fallback cache: sets empty rates and no-cache error', async () => {
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(of(errorResponse));

      await build();

      expect(component.isLoading()).toBe(false);
      expect(component.error()).toContain('No cached data available.');
      expect(component.rates()).toEqual({});
    });

    it('network error: falls back to cache and sets error', async () => {
      (storageSpy.getLatest as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockResponse);
      (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await build();

      expect(component.isLoading()).toBe(false);
      expect(component.error()).toContain('Using cached rates.');
      expect(component.rates()).toEqual(mockResponse.conversion_rates);
    });

    it('network error with no fallback cache: sets empty rates', async () => {
      (storageSpy.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await build();

      expect(component.isLoading()).toBe(false);
      expect(component.error()).toContain('No cached data available.');
      expect(component.rates()).toEqual({});
    });
  });

  // ─── onAmountChange() ───────────────────────────────────────────────────────
  describe('onAmountChange()', () => {
    const inputEvent = (value: string) =>
      ({ target: { value } } as unknown as Event);

    it('valid positive number: updates amount signal', () => {
      component.onAmountChange(inputEvent('25.5'));
      expect(component.amount()).toBe(25.5);
    });

    it('valid positive number: clears the error signal', () => {
      component.error.set('some previous error');
      component.onAmountChange(inputEvent('10'));
      expect(component.error()).toBeNull();
    });

    it('NaN input: sets amount to 0', () => {
      component.onAmountChange(inputEvent('abc'));
      expect(component.amount()).toBe(0);
    });

    it('negative number: clamps amount to 0', () => {
      component.onAmountChange(inputEvent('-5'));
      expect(component.amount()).toBe(0);
    });

    it('zero: sets amount to 0', () => {
      component.onAmountChange(inputEvent('0'));
      expect(component.amount()).toBe(0);
    });
  });

  // ─── isFormValid (line 78) ──────────────────────────────────────────────────
  describe('isFormValid', () => {
    it('returns true when amount > 0 and from !== to', () => {
      component.amount.set(10);
      component.fromCurrency.set('USD');
      component.toCurrency.set('EUR');
      expect(component.isFormValid()).toBe(true);
    });

    it('returns false when amount is 0', () => {
      component.amount.set(0);
      component.fromCurrency.set('USD');
      component.toCurrency.set('EUR');
      expect(component.isFormValid()).toBe(false);
    });

    it('returns false when fromCurrency equals toCurrency', () => {
      component.amount.set(10);
      component.fromCurrency.set('USD');
      component.toCurrency.set('USD');
      expect(component.isFormValid()).toBe(false);
    });
  });

  // ─── Other methods ──────────────────────────────────────────────────────────
  it('onFromCurrencyChange() should update fromCurrency signal', () => {
    component.onFromCurrencyChange('GBP');
    expect(component.fromCurrency()).toBe('GBP');
  });

  it('onToCurrencyChange() should update toCurrency signal', () => {
    component.onToCurrencyChange('JPY');
    expect(component.toCurrency()).toBe('JPY');
  });

  it('onSwap() should exchange fromCurrency and toCurrency', () => {
    component.fromCurrency.set('USD');
    component.toCurrency.set('EUR');
    component.onSwap();
    expect(component.fromCurrency()).toBe('EUR');
    expect(component.toCurrency()).toBe('USD');
  });
});
