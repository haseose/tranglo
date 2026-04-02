import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

// Mock idb BEFORE any service imports so vitest hoists it correctly
vi.mock('idb', () => ({ openDB: vi.fn() }));

import { openDB } from 'idb';
import { StorageService } from './storage.service';
import { ExchangeRateResponse } from '../models/exchange-rate.model';

// ─── Shared fixture data ──────────────────────────────────────────────────────
const mockResponse: ExchangeRateResponse = {
  result: 'success',
  documentation: '',
  terms_of_use: '',
  time_last_update_unix: Math.floor(Date.now() / 1000) - 86400, // yesterday
  time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
  time_next_update_unix: Math.floor(Date.now() / 1000),
  time_next_update_utc: 'Sat, 15 Nov 2023 00:00:00 +0000',
  base_code: 'USD',
  conversion_rates: { USD: 1, EUR: 0.92, GBP: 0.79 },
};

function historyKey(base: string, unixSeconds: number): string {
  return `history_${base}_${new Date(unixSeconds * 1000).toISOString().split('T')[0]}`;
}

// ─── In-memory IDB mock factory ───────────────────────────────────────────────
interface MockRecord extends Record<string, unknown> {
  key?: string;
  base_code: string;
  time_last_update_unix: number;
}

function createMockDb(opts: { hasSnapshots?: boolean; hasLatest?: boolean; hasHistory?: boolean } = {}) {
  const latest: Record<string, MockRecord> = {};
  const history: Record<string, MockRecord> = {};

  const mockObjectStore = { createIndex: vi.fn() };

  const db = {
    objectStoreNames: {
      contains: vi.fn((name: string) => {
        if (name === 'snapshots') return !!opts.hasSnapshots;
        if (name === 'latest')   return !!opts.hasLatest;
        if (name === 'history')  return !!opts.hasHistory;
        return false;
      }),
    },
    createObjectStore: vi.fn().mockReturnValue(mockObjectStore),
    deleteObjectStore: vi.fn(),
    put: vi.fn().mockImplementation((store: string, value: MockRecord) => {
      if (store === 'latest')  latest[value['base_code'] as string] = value;
      if (store === 'history') history[value['key'] as string]      = value;
      return Promise.resolve();
    }),
    get: vi.fn().mockImplementation((store: string, key: string) =>
      Promise.resolve(store === 'latest' ? (latest[key] ?? undefined) : undefined)
    ),
    getAllFromIndex: vi.fn().mockImplementation((_store: string, _idx: string, base: string) =>
      Promise.resolve(Object.values(history).filter(r => r['base_code'] === base))
    ),
  };
  return db;
}

type MockDb = ReturnType<typeof createMockDb>;

/** Wire up openDB mock to return a working in-memory DB. */
function setupWorkingIdb(mockDb: MockDb, oldVersion = 0) {
  vi.mocked(openDB).mockImplementation((_name: string, _version?: number, options?: unknown) => {
    const { upgrade } = (options ?? {}) as { upgrade?: (db: MockDb, old: number) => void };
    upgrade?.(mockDb, oldVersion);
    return Promise.resolve(mockDb as unknown as ReturnType<typeof openDB>);
  });
}

/** Wire up openDB mock to reject (simulates IDB unavailable). */
function setupBrokenIdb() {
  vi.mocked(openDB).mockRejectedValue(new Error('IDB unavailable'));
}

/** Force an already-created service to use a rejected dbPromise. */
function breakIdbOnService(service: StorageService): void {
  const rejected = Promise.reject(new Error('IDB unavailable'));
  rejected.catch(() => { /* suppress */ });
  (service as unknown as { dbPromise: Promise<unknown> }).dbPromise = rejected;
}

// ═════════════════════════════════════════════════════════════════════════════
describe('StorageService', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1.  Browser platform — IDB available (mocked via vi.mock('idb'))
  //     Covers: getDb() lines 34-51, saveHistory() lines 78-82,
  //             getHistory() lines 91-96
  // ──────────────────────────────────────────────────────────────────────────
  describe('browser platform — IDB available', () => {
    let service: StorageService;
    let mockDb: MockDb;

    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      mockDb = createMockDb();
      setupWorkingIdb(mockDb);

      TestBed.configureTestingModule({});
      service = TestBed.inject(StorageService);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    // ── getDb() — initialization (lines 34-51) ────────────────────────────
    describe('getDb()', () => {
      it('calls openDB on the first getDb() invocation', async () => {
        await service.saveLatest(mockResponse); // triggers getDb()
        expect(openDB).toHaveBeenCalledTimes(1);
        expect(openDB).toHaveBeenCalledWith('exchange-rate-db', 2, expect.objectContaining({ upgrade: expect.any(Function) }));
      });

      it('reuses the cached dbPromise — openDB called only once for multiple operations', async () => {
        await service.saveLatest(mockResponse);
        await service.getLatest('USD');
        await service.saveHistory(mockResponse);
        expect(openDB).toHaveBeenCalledTimes(1);
      });

      it('upgrade (oldVersion=0): creates both "latest" and "history" stores', async () => {
        await service.saveLatest(mockResponse);
        expect(mockDb.createObjectStore).toHaveBeenCalledWith('latest',  expect.objectContaining({ keyPath: 'base_code' }));
        expect(mockDb.createObjectStore).toHaveBeenCalledWith('history', expect.objectContaining({ keyPath: 'key' }));
        expect(mockDb.objectStoreNames.contains('snapshots')).toBe(false);
        expect(mockDb.deleteObjectStore).not.toHaveBeenCalled();
      });

      it('upgrade (oldVersion=1, has snapshots): deletes legacy "snapshots" store', async () => {
        vi.clearAllMocks();
        const legacyDb = createMockDb({ hasSnapshots: true });
        setupWorkingIdb(legacyDb, 1); // oldVersion = 1 < 2, DB contains 'snapshots'

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        const svc = TestBed.inject(StorageService);

        await svc.saveLatest(mockResponse);
        expect(legacyDb.deleteObjectStore).toHaveBeenCalledWith('snapshots');
      });

      it('upgrade: skips createObjectStore when stores already exist', async () => {
        vi.clearAllMocks();
        const existingDb = createMockDb({ hasLatest: true, hasHistory: true });
        setupWorkingIdb(existingDb, 2); // fresh upgrade but stores already present

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        const svc = TestBed.inject(StorageService);

        await svc.saveLatest(mockResponse);
        expect(existingDb.createObjectStore).not.toHaveBeenCalled();
      });
    });

    // ── saveLatest() / getLatest() — IDB paths ────────────────────────────
    describe('saveLatest() / getLatest()', () => {
      it('should persist and retrieve via IDB', async () => {
        await service.saveLatest(mockResponse);
        expect(mockDb.put).toHaveBeenCalledWith('latest', mockResponse);

        const result = await service.getLatest('USD');
        expect(mockDb.get).toHaveBeenCalledWith('latest', 'USD');
        expect(result?.base_code).toBe('USD');
      });

      it('getLatest() returns null when IDB has no entry', async () => {
        expect(await service.getLatest('JPY')).toBeNull();
      });

      it('saveLatest() overwrites an existing IDB entry', async () => {
        await service.saveLatest(mockResponse);
        const updated = { ...mockResponse, conversion_rates: { EUR: 0.99 } };
        await service.saveLatest(updated);
        expect(await service.getLatest('USD')).toMatchObject({ conversion_rates: { EUR: 0.99 } });
      });
    });

    // ── saveHistory() — IDB path (lines 78-82) ────────────────────────────
    describe('saveHistory()', () => {
      it('should write to IDB with a computed key and dateKey', async () => {
        await service.saveHistory(mockResponse);
        expect(mockDb.put).toHaveBeenCalledWith(
          'history',
          expect.objectContaining({
            base_code: 'USD',
            key: expect.stringMatching(/^USD_\d{4}-\d{2}-\d{2}$/),
            dateKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        );
      });
    });

    // ── getHistory() — IDB path (lines 91-96) ────────────────────────────
    describe('getHistory()', () => {
      it('should retrieve and filter entries from IDB by date range', async () => {
        await service.saveHistory(mockResponse); // yesterday — within 30 days
        const result = await service.getHistory('USD', 30);
        expect(mockDb.getAllFromIndex).toHaveBeenCalledWith('history', 'by-base', 'USD');
        expect(result).toHaveLength(1);
        expect(result[0].base_code).toBe('USD');
      });

      it('should exclude IDB entries older than the requested day range', async () => {
        const old = { ...mockResponse, time_last_update_unix: Math.floor(Date.now() / 1000) - 60 * 86400 };
        await service.saveHistory(old);
        expect(await service.getHistory('USD', 30)).toEqual([]);
      });

      it('should return entries sorted ascending by timestamp', async () => {
        const older = { ...mockResponse, time_last_update_unix: Math.floor(Date.now() / 1000) - 10 * 86400 };
        const newer = { ...mockResponse, time_last_update_unix: Math.floor(Date.now() / 1000) - 3 * 86400 };
        await service.saveHistory(newer);
        await service.saveHistory(older);
        const result = await service.getHistory('USD', 30);
        expect(result).toHaveLength(2);
        expect(result[0].time_last_update_unix).toBeLessThan(result[1].time_last_update_unix);
      });

      it('should return empty array when IDB has no history', async () => {
        expect(await service.getHistory('USD', 30)).toEqual([]);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2.  Browser platform — IDB unavailable (fallback to localStorage)
  //     Covers: saveHistory() catch (lines 83-86), getHistory() catch (98-99),
  //             getHistoryFromLocalStorage() (lines 102-118)
  // ──────────────────────────────────────────────────────────────────────────
  describe('browser platform — IDB unavailable (localStorage fallback)', () => {
    let service: StorageService;

    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      setupBrokenIdb();

      TestBed.configureTestingModule({});
      service = TestBed.inject(StorageService);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('saveLatest() falls back to localStorage when IDB fails', async () => {
      await service.saveLatest(mockResponse);
      expect(localStorage.getItem('latest_USD')).not.toBeNull();
    });

    it('getLatest() reads from localStorage when IDB fails', async () => {
      localStorage.setItem('latest_USD', JSON.stringify(mockResponse));
      expect((await service.getLatest('USD'))?.base_code).toBe('USD');
    });

    it('getLatest() returns null when localStorage entry is missing', async () => {
      expect(await service.getLatest('USD')).toBeNull();
    });

    it('getLatest() returns null when localStorage entry has malformed JSON', async () => {
      localStorage.setItem('latest_USD', 'NOT_VALID_JSON');
      expect(await service.getLatest('USD')).toBeNull();
    });

    it('saveHistory() falls back to localStorage when IDB fails', async () => {
      await service.saveHistory(mockResponse);
      const key = historyKey('USD', mockResponse.time_last_update_unix);
      expect(JSON.parse(localStorage.getItem(key)!).base_code).toBe('USD');
    });

    it('getHistory() reads matching entries from localStorage', async () => {
      const key = historyKey('USD', mockResponse.time_last_update_unix);
      localStorage.setItem(key, JSON.stringify(mockResponse));
      const result = await service.getHistory('USD', 30);
      expect(result).toHaveLength(1);
      expect(result[0].base_code).toBe('USD');
    });

    it('getHistory() excludes localStorage entries older than day range', async () => {
      const oldUnix = Math.floor(Date.now() / 1000) - 60 * 86400;
      localStorage.setItem(historyKey('USD', oldUnix), JSON.stringify({ ...mockResponse, time_last_update_unix: oldUnix }));
      expect(await service.getHistory('USD', 30)).toEqual([]);
    });

    it('getHistory() returns localStorage entries sorted ascending', async () => {
      const u1 = Math.floor(Date.now() / 1000) - 10 * 86400;
      const u2 = Math.floor(Date.now() / 1000) - 3 * 86400;
      localStorage.setItem(historyKey('USD', u2), JSON.stringify({ ...mockResponse, time_last_update_unix: u2 }));
      localStorage.setItem(historyKey('USD', u1), JSON.stringify({ ...mockResponse, time_last_update_unix: u1 }));
      const result = await service.getHistory('USD', 30);
      expect(result).toHaveLength(2);
      expect(result[0].time_last_update_unix).toBeLessThan(result[1].time_last_update_unix);
    });

    it('getHistory() skips malformed JSON entries in localStorage', async () => {
      localStorage.setItem(historyKey('USD', mockResponse.time_last_update_unix), 'NOT_VALID_JSON');
      expect(await service.getHistory('USD', 30)).toEqual([]);
    });

    it('getHistory() ignores localStorage keys for a different currency', async () => {
      const key = historyKey('EUR', mockResponse.time_last_update_unix);
      localStorage.setItem(key, JSON.stringify({ ...mockResponse, base_code: 'EUR' }));
      expect(await service.getHistory('USD', 30)).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3.  Server-side platform — getDb() rejects (lines 31-33)
  //     Covers: all methods' catch branches using localStorage,
  //             getHistoryFromLocalStorage() early [] return (line 103)
  // ──────────────────────────────────────────────────────────────────────────
  describe('server-side platform — getDb() rejects', () => {
    let service: StorageService;

    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      service = TestBed.inject(StorageService);
    });

    afterEach(() => TestBed.resetTestingModule());

    it('getDb() rejects with "IndexedDB not available on server"', async () => {
      await expect(
        (service as unknown as { getDb(): Promise<unknown> }).getDb()
      ).rejects.toThrow('IndexedDB not available on server');
    });

    it('saveLatest() falls back to localStorage on server', async () => {
      await service.saveLatest(mockResponse);
      expect(JSON.parse(localStorage.getItem('latest_USD')!).base_code).toBe('USD');
    });

    it('getLatest() reads from localStorage on server', async () => {
      localStorage.setItem('latest_USD', JSON.stringify(mockResponse));
      expect((await service.getLatest('USD'))?.base_code).toBe('USD');
    });

    it('getLatest() returns null when localStorage is empty on server', async () => {
      expect(await service.getLatest('USD')).toBeNull();
    });

    it('getLatest() returns null for malformed JSON on server', async () => {
      localStorage.setItem('latest_USD', 'INVALID');
      expect(await service.getLatest('USD')).toBeNull();
    });

    it('saveHistory() falls back to localStorage on server', async () => {
      await service.saveHistory(mockResponse);
      expect(localStorage.getItem(historyKey('USD', mockResponse.time_last_update_unix))).not.toBeNull();
    });

    it('getHistory() returns [] on server (non-browser guard in getHistoryFromLocalStorage)', async () => {
      localStorage.setItem(historyKey('USD', mockResponse.time_last_update_unix), JSON.stringify(mockResponse));
      expect(await service.getHistory('USD', 30)).toEqual([]);
    });
  });
});