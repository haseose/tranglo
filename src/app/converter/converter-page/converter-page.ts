import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ConversionFormComponent } from '../conversion-form/conversion-form';

@Component({
  selector: 'app-converter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConversionFormComponent],
  templateUrl: './converter-page.html',
  styleUrl: './converter-page.css',
})
export class ConverterPageComponent {}
