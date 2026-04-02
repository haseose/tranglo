import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyFormat' })
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number): string {
    if (value === null || value === undefined || isNaN(value)) return '—';
    if (value >= 1000) return value.toFixed(2);
    if (value >= 1) return value.toFixed(4);
    return value.toFixed(6);
  }
}
