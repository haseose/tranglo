export interface ExchangeRateResponse {
  result: 'success' | 'error';
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

export interface ExchangeRate {
  code: string;
  rate: number;
  baseCurrency: string;
}

export interface ExchangeRateSnapshot {
  baseCurrency: string;
  rates: Record<string, number>;
  timestamp: number;
  dateKey: string; // YYYY-MM-DD
}

export interface PairRateResponse {
  result: 'success' | 'error';
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code?: string;
  target_code?: string;
  conversion_rate?: number;
  'error-type'?: string;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: 'code' | 'rate';
  direction: SortDirection;
}
