import { describe, it, expect, beforeEach } from 'vitest';
import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  let pipe: CurrencyFormatPipe;

  beforeEach(() => {
    pipe = new CurrencyFormatPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format values >= 1000 to 2 decimal places', () => {
    expect(pipe.transform(1234.5678)).toBe('1234.57');
  });

  it('should format values >= 1 and < 1000 to 4 decimal places', () => {
    expect(pipe.transform(1.23456789)).toBe('1.2346');
  });

  it('should format values < 1 to 6 decimal places', () => {
    expect(pipe.transform(0.00123456)).toBe('0.001235');
  });

  it('should return "—" for null-like values', () => {
    expect(pipe.transform(null as unknown as number)).toBe('—');
    expect(pipe.transform(undefined as unknown as number)).toBe('—');
    expect(pipe.transform(NaN)).toBe('—');
  });

  it('should handle 0 correctly (< 1)', () => {
    expect(pipe.transform(0)).toBe('0.000000');
  });

  it('should handle exactly 1', () => {
    expect(pipe.transform(1)).toBe('1.0000');
  });
});
