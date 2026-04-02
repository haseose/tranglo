import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NetworkStatusService } from '../../core/services/network-status.service';

@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isOnline()) {
      <div class="offline-banner" role="status" aria-live="polite">
        <span class="offline-icon" aria-hidden="true">📡</span>
        <span>You are offline. Showing cached data — rates may not be current.</span>
      </div>
    }
  `,
  styleUrl: './offline-banner.css',
})
export class OfflineBannerComponent {
  private readonly networkStatus = inject(NetworkStatusService);
  readonly isOnline = this.networkStatus.isOnline;
}
