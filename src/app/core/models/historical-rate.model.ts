export interface HistoricalRate {
  date: string; // YYYY-MM-DD
  rates: Record<string, number>;
  baseCurrency: string;
}

export type AggregationPeriod = 'daily' | 'weekly' | 'monthly';

export interface TrendDataPoint {
  label: string;
  value: number;
}

export interface CurrencyTrend {
  currencyCode: string;
  dataPoints: TrendDataPoint[];
  color: string;
}
