import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ExchangeRateResponse } from '../models/exchange-rate.model';

type HistoryRecord = ExchangeRateResponse & { key: string; dateKey: string };

interface ExchangeDB extends DBSchema {
  /** One record per base currency — the most recent full API response. */
  latest: {
    key: string; // base_code
    value: ExchangeRateResponse;
  };
  /** One record per base currency per day — accumulates over time. */
  history: {
    key: string; // `${base_code}_${dateKey}`
    value: HistoryRecord;
    indexes: { 'by-base': string };
  };
}

const DB_NAME = 'exchange-rate-db';
const DB_VERSION = 2;

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private dbPromise: Promise<IDBPDatabase<ExchangeDB>> | null = null;

  private getDb(): Promise<IDBPDatabase<ExchangeDB>> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('IndexedDB not available on server'));
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB<ExchangeDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          // Drop legacy store from v1
          if (oldVersion < 2 && db.objectStoreNames.contains('snapshots' as never)) {
            db.deleteObjectStore('snapshots' as never);
          }
          if (!db.objectStoreNames.contains('latest')) {
            db.createObjectStore('latest', { keyPath: 'base_code' });
          }
          if (!db.objectStoreNames.contains('history')) {
            const store = db.createObjectStore('history', { keyPath: 'key' });
            store.createIndex('by-base', 'base_code');
          }
        },
      });
    }
    return this.dbPromise;
  }

  async saveLatest(response: ExchangeRateResponse): Promise<void> {
    try {
      const db = await this.getDb();
      await db.put('latest', response);
    } catch {
      localStorage.setItem(`latest_${response.base_code}`, JSON.stringify(response));
    }
  }

  async getLatest(baseCurrency: string): Promise<ExchangeRateResponse | null> {
    try {
      const db = await this.getDb();
      return (await db.get('latest', baseCurrency)) ?? null;
    } catch {
      try {
        const raw = localStorage.getItem(`latest_${baseCurrency}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  }

  async saveHistory(response: ExchangeRateResponse): Promise<void> {
    try {
      const db = await this.getDb();
      const dateKey = new Date(response.time_last_update_unix * 1000).toISOString().split('T')[0];
      const key = `${response.base_code}_${dateKey}`;
      await db.put('history', { ...response, key, dateKey });
    } catch {
      const dateKey = new Date(response.time_last_update_unix * 1000).toISOString().split('T')[0];
      localStorage.setItem(`history_${response.base_code}_${dateKey}`, JSON.stringify(response));
    }
  }

  async getHistory(baseCurrency: string, days: number): Promise<ExchangeRateResponse[]> {
    try {
      const db = await this.getDb();
      const all = await db.getAllFromIndex('history', 'by-base', baseCurrency);
      const cutoff = Date.now() / 1000 - days * 86400;
      return all
        .filter(r => r.time_last_update_unix >= cutoff)
        .sort((a, b) => a.time_last_update_unix - b.time_last_update_unix);
    } catch {
      return this.getHistoryFromLocalStorage(baseCurrency, days);
    }
  }

  private getHistoryFromLocalStorage(baseCurrency: string, days: number): ExchangeRateResponse[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const cutoff = Date.now() / 1000 - days * 86400;
    const results: ExchangeRateResponse[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`history_${baseCurrency}_`)) {
        try {
          const record: ExchangeRateResponse = JSON.parse(localStorage.getItem(key) ?? '');
          if (record.time_last_update_unix >= cutoff) results.push(record);
        } catch {
          // skip malformed entries
        }
      }
    }
    return results.sort((a, b) => a.time_last_update_unix - b.time_last_update_unix);
  }
}
