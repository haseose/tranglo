import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { POPULAR_CURRENCIES } from '../../core/models/currency.model';

@Component({
  selector: 'app-rate-search-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSelectModule, MatFormFieldModule],
  templateUrl: './rate-search-filter.html',
  styleUrl: './rate-search-filter.css',
})
export class RateSearchFilterComponent {
  readonly searchChange = output<string>();
  readonly filterChange = output<string>();

  readonly searchQuery = signal('');
  readonly filterCurrency = signal('');

  readonly currencies = POPULAR_CURRENCIES;

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchChange.emit(value);
  }

  onFilterChange(value: string): void {
    this.filterCurrency.set(value);
    this.filterChange.emit(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.filterCurrency.set('');
    this.searchChange.emit('');
    this.filterChange.emit('');
  }
}
