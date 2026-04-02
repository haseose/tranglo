import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isOnline = signal(true);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isOnline.set(navigator.onLine);
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }
}
