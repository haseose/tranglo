# Currency Exchange Rate Dashboard

A full-featured Angular 21 application for real-time currency exchange rates, historical trends, and currency conversion — with offline support and dynamic theming.

[![CI/CD](https://github.com/your-org/currency-exchange-rate-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/currency-exchange-rate-dashboard/actions/workflows/ci.yml)

---

## Features

| Feature | Details |
|---|---|
| **Real-Time Rates** | Fetches from ExchangeRate-API v6, auto-refreshes every 60 seconds |
| **Historical Trends** | Line chart (Chart.js) for up to 3 currencies, daily / weekly / monthly toggle |
| **Currency Converter** | Input amount + two currencies → live conversion result |
| **Search & Filter** | Search by code or name, filter by specific currency |
| **Offline Mode** | IndexedDB cache via `idb`; shows "Offline" banner with cached data |
| **Dynamic Theming** | Light / Dark toggle; preference persists to localStorage |
| **SSR Support** | Angular SSR (`@angular/ssr`) with platform guards for all browser APIs |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10
- An **ExchangeRate-API v6** key — get one free at [exchangerate-api.com](https://www.exchangerate-api.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/currency-exchange-rate-dashboard.git
cd currency-exchange-rate-dashboard

# Install dependencies
npm install
```

### Configure API Key

Open `src/environments/environment.ts` and replace the placeholder:

```ts
export const environment = {
  production: false,
  exchangeRateApiKey: 'YOUR_API_KEY_HERE',   // ← replace this
  exchangeRateApiBaseUrl: 'https://v6.exchangerate-api.com/v6',
  pollingIntervalMs: 60000,
};
```

> **Never commit your API key.** Use GitHub Secrets (`EXCHANGE_RATE_API_KEY`) for CI/CD.

### Run Locally

```bash
npm start
# → http://localhost:4200
```

---

## Architecture

```
src/app/
├── core/
│   ├── models/           exchange-rate, historical-rate, currency interfaces
│   └── services/
│       ├── exchange-rate.service.ts   HTTP calls to ExchangeRate-API v6
│       ├── websocket.service.ts       RxJS interval real-time service (shareReplay)
│       ├── storage.service.ts         IndexedDB (idb) + localStorage fallback
│       └── theme.service.ts           Light/dark toggle
├── shared/
│   ├── components/header, offline-banner
│   └── pipes/currency-format.pipe.ts
├── layout/main-layout/               App shell with router-outlet
├── dashboard/                        (lazy) Sortable rate table + search/filter
├── historical-trends/                (lazy) Chart.js trends + aggregation toggle
└── converter/                        (lazy) Conversion calculator
```

### Key Design Decisions

- **Angular 21 Signals everywhere** — all state uses `signal()` + `computed()`, no BehaviorSubjects in components
- **OnPush** change detection on every component for performance
- **Standalone components** — no NgModules (Angular 21 default)
- **Lazy loading** — all three feature modules load on demand
- **Real-time via RxJS interval** — `WebSocketService` wraps interval-based polling, exposed as `shareReplay(1)` to prevent duplicate API calls
- **Historical data** — accumulated from saved snapshots in IndexedDB (ExchangeRate-API free tier has no historical endpoint)
- **SSR-safe** — `isPlatformBrowser()` guards for IndexedDB, localStorage, `navigator.onLine`, and all browser-only APIs
- **Theming** — CSS custom properties on `<html data-theme="...">` — zero JS paint flicker

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Serve in development mode (`http://localhost:4200`) |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run unit tests with Vitest (watch mode) |
| `npm run test:ci` | Run unit tests once (CI mode) |
| `npm run e2e` | Open Cypress interactive runner |
| `npm run e2e:ci` | Run Cypress headlessly (CI mode) |
| `npm run lint` | Lint with ESLint (if configured) |

---

## Testing

### Unit Tests (Vitest)

```bash
npm test          # watch mode
npm run test:ci   # single run
```

Tests are co-located under `__tests__/` folders:

```
src/app/core/services/__tests__/
  exchange-rate.service.spec.ts    (7 tests)
  theme.service.spec.ts            (8 tests)
  storage.service.spec.ts          (6 tests)
  websocket.service.spec.ts        (9 tests)
src/app/dashboard/components/exchange-rate-table/__tests__/
  exchange-rate-table.spec.ts      (11 tests)
src/app/shared/pipes/__tests__/
  currency-format.pipe.spec.ts     (7 tests)
```

### E2E Tests (Cypress)

**Requires the app to be running on `http://localhost:4200`.**

```bash
# Terminal 1: start dev server
npm start

# Terminal 2: open Cypress
npm run e2e
```

E2E specs cover:
- `dashboard.cy.ts` — rate table display, live badge, timestamps
- `search-filter.cy.ts` — search by code, clear search, column sort
- `converter.cy.ts` — amount input, conversion result, swap button
- `theme.cy.ts` — light/dark toggle, persistence after reload
- `historical-trends.cy.ts` — page renders, aggregation toggle, currency selection

---

## CI/CD Pipeline

The pipeline (`.github/workflows/ci.yml`) runs on every push to `main` / `develop` and on PRs to `main`:

```
lint → unit tests → build → E2E tests → deploy-staging (main only)
```

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `EXCHANGE_RATE_API_KEY` | ExchangeRate-API key injected at build time |
| *(optional)* `FIREBASE_TOKEN` / `VERCEL_TOKEN` / `NETLIFY_AUTH_TOKEN` | Staging deployment |

Update the `deploy-staging` job in `ci.yml` with your preferred hosting provider.

---

## Offline Mode

When the browser goes offline:
1. An **orange "Offline" banner** appears at the top of every page.
2. The app reads cached rates from **IndexedDB** (`exchange-snapshots` store).
3. All features remain interactive — conversion, sorting, search — using the last cached data.
4. Historical charts display whatever snapshots were accumulated before going offline.

Caching strategy:
- **Latest rates** → IndexedDB `snapshots` store, keyed by `{base}_{YYYY-MM-DD}`
- **Fallback** → `localStorage` for environments without IndexedDB

---

## API Reference

This app uses **ExchangeRate-API v6**:

```
GET https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE_CODE}
```

Example response:
```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_update_utc": "Fri, 14 Nov 2023 00:00:00 +0000",
  "conversion_rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 149.5
  }
}
```

---

## License

MIT

