import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { AggregationPeriod } from '../../core/models/historical-rate.model';

interface ToggleOption {
  label: string;
  value: AggregationPeriod;
}

@Component({
  selector: 'app-aggregation-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './aggregation-toggle.css',
  template: `
    <div
      class="aggregation-toggle"
      role="group"
      aria-label="Select aggregation period"
    >
      @for (option of options; track option.value) {
        <button
          class="toggle-btn"
          [class.active]="selected() === option.value"
          [attr.aria-pressed]="selected() === option.value ? 'true' : 'false'"
          (click)="onSelect(option.value)"
          type="button"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class AggregationToggleComponent {
  readonly selected = input.required<AggregationPeriod>();
  readonly aggregationChange = output<AggregationPeriod>();

  readonly options: ToggleOption[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  onSelect(period: AggregationPeriod): void {
    this.aggregationChange.emit(period);
  }
}
