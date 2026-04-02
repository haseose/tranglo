import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  input,
  effect,
  viewChild,
  inject,
  DestroyRef,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, catchError, EMPTY } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { ExchangeRate } from '../../core/models/exchange-rate.model';
import { POPULAR_CURRENCIES, DEFAULT_CURRENCY } from '../../core/models/currency.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';

@Component({
  selector: 'app-exchange-rate-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyFormatPipe, MatTableModule, MatSortModule, MatPaginatorModule],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.css',
})
export class ExchangeRateTableComponent {
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly baseCurrency = input<string>(DEFAULT_CURRENCY);
  readonly searchQuery = input<string>('');
  readonly filterCurrency = input<string>('');

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly displayedColumns = ['code', 'name', 'rate', 'comparison'];
  readonly pageSizeOptions = [10, 25, 50];

  private readonly currencyNameMap = new Map<string, string>(
    POPULAR_CURRENCIES.map((c) => [c.code, c.name]),
  );

  readonly dataSource = new MatTableDataSource<ExchangeRate>([]);
  readonly matSort = viewChild.required(MatSort);
  readonly paginator = viewChild.required(MatPaginator);

  private readonly fetchTrigger$ = new Subject<string>();

  constructor() {
    effect(() => {
      this.dataSource.sort = this.matSort();
      this.dataSource.paginator = this.paginator();
    });

    effect(() => {
      this.fetchTrigger$.next(this.baseCurrency());
    });

    effect(() => {
      const query = this.searchQuery().toLowerCase().trim();
      const filter = this.filterCurrency();
      this.dataSource.filter = JSON.stringify({ query, filter });
    });

    this.dataSource.filterPredicate = (row: ExchangeRate, encoded: string) => {
      const { query, filter } = JSON.parse(encoded) as { query: string; filter: string };
      const name = (this.currencyNameMap.get(row.code) ?? '').toLowerCase();
      const code = row.code.toLowerCase();
      const matchesSearch = !query || code.includes(query) || name.includes(query);
      const matchesFilter = !filter || row.code === filter;
      return matchesSearch && matchesFilter;
    };

    this.fetchTrigger$
      .pipe(
        switchMap(base => {
          this.isLoading.set(true);
          this.error.set(null);
          return this.exchangeRateService.fetchLatestRates(base).pipe(
            catchError(() => {
              this.error.set('Failed to load exchange rates. Please try again.');
              this.isLoading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(response => {
        if (response.result === 'success') {
          this.dataSource.data = Object.entries(response.conversion_rates).map(
            ([code, rate]) => ({ code, rate, baseCurrency: response.base_code }),
          );
          this.dataSource.sort = this.matSort();
          this.dataSource.paginator = this.paginator();
        } else {
          this.error.set('Failed to load exchange rates.');
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      });
  }

  getCurrencyName(code: string): string {
    return this.currencyNameMap.get(code) ?? '—';
  }
}


