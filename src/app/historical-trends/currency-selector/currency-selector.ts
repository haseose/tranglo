import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { POPULAR_CURRENCIES, DEFAULT_CURRENCY } from '../../core/models/currency.model';


@Component({
  selector: 'app-currency-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './currency-selector.html',
  styleUrl: './currency-selector.css',
})
export class CurrencySelectorComponent {
  readonly selectedCurrencies = input<string[]>([]);
  readonly baseCurrency = input<string>(DEFAULT_CURRENCY);
  readonly maxSelections = input<number>(3);
  readonly selectionChange = output<string[]>();

  readonly availableCurrencies = computed(() =>
    POPULAR_CURRENCIES.filter(c => c.code !== this.baseCurrency()),
  );

  isSelected(code: string): boolean {
    return this.selectedCurrencies().includes(code);
  }

  isDisabled(code: string): boolean {
    return (
      !this.isSelected(code) && this.selectedCurrencies().length >= this.maxSelections()
    );
  }

  toggleCurrency(code: string): void {
    const current = this.selectedCurrencies();
    if (current.includes(code)) {
      this.selectionChange.emit(current.filter(c => c !== code));
    } else if (current.length < this.maxSelections()) {
      this.selectionChange.emit([...current, code]);
    }
  }
}
