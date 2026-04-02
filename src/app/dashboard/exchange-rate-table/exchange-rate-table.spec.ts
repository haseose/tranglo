import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ExchangeRateTableComponent } from './exchange-rate-table';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { ExchangeRateResponse } from '../../core/models/exchange-rate.model';

const mockResponse: ExchangeRateResponse = {
  result: 'success',
  documentation: '',
  terms_of_use: '',
  time_last_update_unix: 1700000000,
  time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
  time_next_update_unix: 1700086400,
  time_next_update_utc: 'Sat, 15 Nov 2023 00:00:00 +0000',
  base_code: 'USD',
  conversion_rates: { EUR: 0.92, GBP: 0.79, JPY: 149.5, CAD: 1.36 },
};

describe('ExchangeRateTableComponent', () => {
  let component: ExchangeRateTableComponent;
  let fixture: ComponentFixture<ExchangeRateTableComponent>;
  let exchangeRateSpy: Partial<ExchangeRateService>;

  beforeEach(async () => {
    exchangeRateSpy = {
      fetchLatestRates: vi.fn().mockReturnValue(of(mockResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [ExchangeRateTableComponent],
      providers: [
        { provide: ExchangeRateService, useValue: exchangeRateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRateTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate dataSource with rates after a successful fetch', () => {
    expect(component.dataSource.data.length).toBe(4);
    expect(exchangeRateSpy.fetchLatestRates).toHaveBeenCalledWith('USD');
  });

  it('isLoading should be false after a successful fetch', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('error should be null after a successful fetch', () => {
    expect(component.error()).toBeNull();
  });

  it('should filter dataSource by search query (code match)', () => {
    fixture.componentRef.setInput('searchQuery', 'eur');
    fixture.detectChanges();
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].code).toBe('EUR');
  });

  it('should filter dataSource by filterCurrency', () => {
    fixture.componentRef.setInput('filterCurrency', 'GBP');
    fixture.detectChanges();
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].code).toBe('GBP');
  });

  it('getCurrencyName() should return name for known codes', () => {
    expect(component.getCurrencyName('EUR')).toBe('Euro');
    expect(component.getCurrencyName('GBP')).toBe('British Pound');
  });

  it('getCurrencyName() should return "—" for unknown codes', () => {
    expect(component.getCurrencyName('XYZ')).toBe('—');
  });

  it('should set error when fetchLatestRates fails', async () => {
    (exchangeRateSpy.fetchLatestRates as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    fixture = TestBed.createComponent(ExchangeRateTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error()).not.toBeNull();
    expect(component.isLoading()).toBe(false);
  });
});
