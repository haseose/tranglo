import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/header/header';
import { OfflineBannerComponent } from '../../shared/offline-banner/offline-banner';

@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, OfflineBannerComponent],
  template: `
    <app-header />
    <app-offline-banner />
    <main class="main-content" id="main-content">
      <router-outlet />
    </main>
  `,
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent {}
