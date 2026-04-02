import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeMode } from '../../core/models/currency.model';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatSlideToggleModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  readonly themeService = inject(ThemeService);
  protected readonly ThemeMode = ThemeMode;
  readonly isDark = computed(() => this.themeService.theme() === ThemeMode.Dark);
}
