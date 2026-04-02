import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeMode } from '../models/currency.model';

const THEME_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<ThemeMode>(this.loadSavedTheme());

  constructor() {
    effect(() => {
      const current = this.theme();
      this.applyTheme(current);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(THEME_KEY, current);
      }
    });
  }

  toggleTheme(): void {
    this.theme.update(t => (t === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light));
  }

  private loadSavedTheme(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) return ThemeMode.Light;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === ThemeMode.Dark || saved === ThemeMode.Light) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? ThemeMode.Dark
      : ThemeMode.Light;
  }

  private applyTheme(theme: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.setAttribute('data-theme', theme);
  }
}
