import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { NetworkStatusService } from './network-status.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Dispatch a synthetic online/offline event on the window. */
function dispatchNetworkEvent(type: 'online' | 'offline'): void {
  window.dispatchEvent(new Event(type));
}

// ═════════════════════════════════════════════════════════════════════════════
describe('NetworkStatusService', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Browser platform
  // ──────────────────────────────────────────────────────────────────────────
  describe('browser platform', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('should be created', () => {
      TestBed.configureTestingModule({});
      expect(TestBed.inject(NetworkStatusService)).toBeTruthy();
    });

    it('should initialise isOnline to true when navigator.onLine is true', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      TestBed.configureTestingModule({});
      const service = TestBed.inject(NetworkStatusService);
      expect(service.isOnline()).toBe(true);
    });

    it('should initialise isOnline to false when navigator.onLine is false', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      TestBed.configureTestingModule({});
      const service = TestBed.inject(NetworkStatusService);
      expect(service.isOnline()).toBe(false);
    });

    it('should set isOnline to true when the "online" event fires', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      TestBed.configureTestingModule({});
      const service = TestBed.inject(NetworkStatusService);
      expect(service.isOnline()).toBe(false);

      dispatchNetworkEvent('online');
      expect(service.isOnline()).toBe(true);
    });

    it('should set isOnline to false when the "offline" event fires', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      TestBed.configureTestingModule({});
      const service = TestBed.inject(NetworkStatusService);
      expect(service.isOnline()).toBe(true);

      dispatchNetworkEvent('offline');
      expect(service.isOnline()).toBe(false);
    });

    it('should toggle correctly across multiple network-change events', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      TestBed.configureTestingModule({});
      const service = TestBed.inject(NetworkStatusService);

      dispatchNetworkEvent('offline');
      expect(service.isOnline()).toBe(false);

      dispatchNetworkEvent('online');
      expect(service.isOnline()).toBe(true);

      dispatchNetworkEvent('offline');
      expect(service.isOnline()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Server-side platform — constructor guard (line 10)
  // ──────────────────────────────────────────────────────────────────────────
  describe('server-side platform', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    afterEach(() => TestBed.resetTestingModule());

    it('should be created on the server', () => {
      expect(TestBed.inject(NetworkStatusService)).toBeTruthy();
    });

    it('should default isOnline to true on the server without reading navigator', () => {
      const service = TestBed.inject(NetworkStatusService);
      // On the server the constructor returns early; signal stays at its initial value of true
      expect(service.isOnline()).toBe(true);
    });

    it('should NOT change isOnline when "online" event fires on server', () => {
      const service = TestBed.inject(NetworkStatusService);
      // Manually set to false to detect any unintended listener
      service.isOnline.set(false);
      dispatchNetworkEvent('online');
      expect(service.isOnline()).toBe(false);
    });

    it('should NOT change isOnline when "offline" event fires on server', () => {
      const service = TestBed.inject(NetworkStatusService);
      expect(service.isOnline()).toBe(true);
      dispatchNetworkEvent('offline');
      expect(service.isOnline()).toBe(true);
    });
  });
});
