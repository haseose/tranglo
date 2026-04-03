# Currency Exchange Rate Dashboard

A full-featured Angular 21 application for real-time currency exchange rates, historical trends, and currency conversion — with offline support and dynamic theming.

[![CI/CD](https://github.com/KieuTrinh-T/tranglo/actions/workflows/ci.yml/badge.svg)](https://github.com/KieuTrinh-T/tranglo/actions/workflows/ci.yml)

---

## Features

| Feature | Details |
|---|---|
| **Real-Time Rates** | Fetches from ExchangeRate-API v6, auto-refreshes every 30 seconds |
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
git clone https://github.com/KieuTrinh-T/tranglo.git
cd tranglo

# Install dependencies
npm install
```

### Configure API Key

Open `src/environments/environment.ts` and replace the placeholder with your key:

```ts
export const environment = {
  production: false,
  exchangeRateApiKey: 'YOUR_API_KEY_HERE',   // ← replace this
  exchangeRateApiBaseUrl: 'https://v6.exchangerate-api.com/v6',
};
```

> **Never commit your real API key.** The committed `environment.ts` intentionally uses an empty string as a placeholder.  
> For Vercel deployments, set `EXCHANGE_RATE_API_KEY` in your Vercel project's environment variables — it is injected at build time by `scripts/set-env.js`.

### Run Locally

```bash
ng serve
# → http://localhost:4200
```

### Build for Production

```bash
npm run build          # standard production build (uses environment.ts placeholder)
npm run build:vercel   # Vercel build: generates environment.prod.ts from EXCHANGE_RATE_API_KEY env var
```

---

## External API

This app uses **[ExchangeRate-API v6](https://www.exchangerate-api.com/docs/overview)** to retrieve live exchange rates.

### Endpoint

```
GET https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE_CODE}
```

| Parameter | Description |
|---|---|
| `API_KEY` | Your personal API key from [exchangerate-api.com](https://www.exchangerate-api.com/) |
| `BASE_CODE` | ISO 4217 currency code to use as the base (e.g. `USD`, `EUR`, `MYR`) |

### Example Response

```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_update_utc": "Fri, 14 Nov 2023 00:00:00 +0000",
  "conversion_rates": {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 149.5,
    "MYR": 4.71
  }
}
```

### Free Tier Limits

- 1,500 requests / month
- No historical data endpoint (this app stores snapshots locally in IndexedDB to build its own history)
- Rate updates once per day

---

## Project Structure

```
tranglo/
├── .github/
│   └── workflows/
│       └── ci.yml                  CI/CD pipeline (lint → test → build → deploy)
├── cypress/
│   └── e2e/                        End-to-end specs (Cypress)
│       ├── converter.cy.ts
│       ├── dashboard.cy.ts
│       ├── historical-trends.cy.ts
│       ├── search-filter.cy.ts
│       └── theme.cy.ts
├── scripts/
│   └── set-env.js                  Generates environment.prod.ts from env vars (Vercel builds)
├── src/
│   ├── app/
│   │   ├── app.ts                  Root component
│   │   ├── app.config.ts           Angular app configuration
│   │   ├── app.routes.ts           (via core/routing) Lazy-loaded routes
│   │   ├── converter/              (lazy) Currency conversion feature
│   │   │   ├── conversion-form/    Form component (amount + currency pair)
│   │   │   └── converter-page/     Page shell
│   │   ├── core/
│   │   │   ├── models/             TypeScript interfaces
│   │   │   │   ├── currency.model.ts
│   │   │   │   ├── exchange-rate.model.ts
│   │   │   │   └── historical-rate.model.ts
│   │   │   ├── routing/
│   │   │   │   └── app.routes.ts
│   │   │   └── services/
│   │   │       ├── exchange-rate.service.ts   HTTP calls to ExchangeRate-API v6
│   │   │       ├── network-status.service.ts  Online/offline detection
│   │   │       ├── storage.service.ts         IndexedDB (idb) + localStorage fallback
│   │   │       ├── theme.service.ts           Light/dark theme management
│   │   │       └── websocket.service.ts       RxJS interval polling (shareReplay)
│   │   ├── dashboard/              (lazy) Live rate table with search & sort
│   │   │   ├── dashboard-page/
│   │   │   ├── exchange-rate-table/
│   │   │   └── rate-search-filter/
│   │   ├── historical-trends/      (lazy) Chart.js line chart with aggregation toggle
│   │   │   ├── aggregation-toggle/
│   │   │   ├── currency-selector/
│   │   │   ├── trend-chart/
│   │   │   └── trends-page/
│   │   ├── layout/
│   │   │   └── main-layout/        App shell with router-outlet
│   │   └── shared/
│   │       ├── header/             Top navigation bar + theme toggle
│   │       ├── offline-banner/     Offline status indicator
│   │       └── pipes/
│   │           └── currency-format.pipe.ts
│   ├── environments/
│   │   ├── environment.ts          Development config (placeholder API key — committed)
│   │   └── environment.prod.ts     Production config (git-ignored; generated at build time)
│   └── styles.css                  Global styles
├── angular.json
├── cypress.config.ts
├── eslint.config.js
├── package.json
├── tsconfig.json
└── vercel.json                     Vercel build config
```

### Key Design Decisions

- **Angular 21 Signals** — all state uses `signal()` + `computed()`, no BehaviorSubjects in components
- **OnPush change detection** — all 12 components explicitly set `ChangeDetectionStrategy.OnPush`, meaning Angular only checks a component when its inputs change or a signal it reads emits a new value; this avoids unnecessary re-renders on every tick and is especially impactful when the rate table refreshes every 30 seconds
- **Angular Material** — UI components (`MatTable`, `MatSort`, `MatPaginator`, `MatSelect`, `MatFormField`, `MatSlideToggle`) are sourced from `@angular/material` rather than built from scratch; this provides accessible, well-tested, industry-standard components out of the box and significantly reduces the amount of custom component code to maintain
- **Standalone components** — no NgModules (Angular 21 default); each component declares its own `imports` array
- **Lazy loading** — all three feature areas (dashboard, historical trends, converter) load on demand via the router to keep the initial bundle small
- **WebSocket polling strategy** — `WebSocketService` wraps `RxJS interval()` to simulate a persistent real-time connection. For a use case like currency rates that only requires a single, lightweight API call at a fixed cadence, this approach is simpler to manage than a true WebSocket connection — there is no handshake overhead, no reconnection logic, and no server-side socket infrastructure needed. The 30-second interval is a deliberate sweet spot: currency rates change frequently and users expect near-live data, but refreshing faster than 30 seconds would push updates through every component in the tree too aggressively, causing noticeable UI churn and a laggy feel. 30 seconds gives every component enough time to complete its full change-detection cycle while still keeping the data fresh. The service also reacts to network state via an Angular `effect()` watching `NetworkStatusService.isOnline`: when the device goes offline the connection is marked as disconnected and any in-flight request is cancelled; when the network comes back the connection is immediately re-established and a fresh fetch is triggered — the interval timer stays alive throughout so the polling cadence does not drift on reconnect
- **Historical data** — accumulated locally from IndexedDB snapshots (the free API tier has no historical endpoint)
- **Theming** — light/dark mode is driven by a `data-theme` attribute on `<html>` using CSS custom properties; Angular Material's theme tokens are overridden via SCSS, and the toggle state is persisted to localStorage so the preference survives a page reload

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Serve in development mode (`http://localhost:4200`) |
| `npm run build` | Production build to `dist/` (placeholder API key) |
| `npm run build:vercel` | Vercel build: injects `EXCHANGE_RATE_API_KEY` then builds |
| `npm test` | Run unit tests with Vitest (watch mode) |
| `npm run test:ci` | Run unit tests once (CI mode, no watch) |
| `npm run lint` | Lint with ESLint + angular-eslint |
| `npm run e2e` | Open Cypress interactive runner |
| `npm run e2e:ci` | Run Cypress headlessly (CI mode) |

---

## Testing

### Unit Tests (Vitest)

```bash
npm test          # watch mode
npm run test:ci   # single run (used in CI)
```

Spec files are co-located with their source files:

```
src/app/
├── app.spec.ts
├── converter/
│   ├── conversion-form/conversion-form.spec.ts
│   └── converter-page/converter-page.spec.ts
├── core/services/
│   ├── exchange-rate.service.spec.ts
│   ├── network-status.service.spec.ts
│   ├── storage.service.spec.ts
│   ├── theme.service.spec.ts
│   └── websocket.service.spec.ts
├── dashboard/
│   ├── dashboard-page/dashboard-page.spec.ts
│   ├── exchange-rate-table/exchange-rate-table.spec.ts
│   └── rate-search-filter/rate-search-filter.spec.ts
└── shared/pipes/currency-format.pipe.spec.ts
```

### E2E Tests (Cypress)

**Requires the dev server to be running on `http://localhost:4200`.**

```bash
# Terminal 1 — start the dev server
npm start

# Terminal 2 — run Cypress
npm run e2e          # interactive runner
npm run e2e:ci       # headless (CI)
```

E2E specs:

| Spec | What it covers |
|---|---|
| `dashboard.cy.ts` | Rate table rendering, live badge, timestamps |
| `search-filter.cy.ts` | Search by code, clear search, column sort |
| `converter.cy.ts` | Amount input, conversion result, swap button |
| `theme.cy.ts` | Light/dark toggle, persistence after reload |
| `historical-trends.cy.ts` | Chart renders, aggregation toggle, currency selector |

---

## CI/CD Pipeline

Pipeline defined in `.github/workflows/ci.yml`. Runs on every push to `master` / `develop` and on PRs targeting `master`.

```
lint → test → build → deploy (master push only, requires approval)
```

| Job | Trigger | Details |
|---|---|---|
| **lint** | every push / PR | Runs `ng lint` |
| **test** | after lint | Runs `ng test --watch=false` (Vitest) |
| **build** | after test | Copies placeholder `environment.prod.ts`, then `ng build` |
| **deploy** | master push + approval | `vercel pull → vercel build --prod → vercel deploy --prebuilt --prod` |

### Manual Approval Gate

The `deploy` job references the static GitHub Environment named **`production`**.  
Configure the protection rule once:

> **Repo → Settings → Environments → production → Required reviewers → add yourself → Save**

GitHub will pause the pipeline and show **"Reviewing deployments"** before deploying to Vercel.

### Required Secrets / Variables

Set these in **Repo → Settings → Environments → production**:

| Name | Where to set | Purpose |
|---|---|---|
| `VERCEL_TOKEN` | Environment **secret** | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Environment secret or variable | Vercel organisation ID |
| `VERCEL_PROJECT_ID` | Environment secret or variable | Vercel project ID |
| `EXCHANGE_RATE_API_KEY` | **Vercel** project env vars | Injected by `set-env.js` at Vercel build time — not needed in GitHub |

> `VERCEL_TOKEN` should be a **Secret** (masked in logs). `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` can be Variables.

---

## Offline Mode

When the browser loses connectivity:

1. An **orange "Offline" banner** appears at the top of every page.
2. The app reads the last cached rates from **IndexedDB** (`exchange-snapshots` store).
3. All features remain interactive — conversion, sorting, search — using the cached data.
4. Historical charts display whatever snapshots were saved before going offline.

Caching strategy:

| Store | Key | Contents |
|---|---|---|
| IndexedDB `snapshots` | `{base}_{YYYY-MM-DD}` | Full rate snapshot for that date |
| `localStorage` | fallback key | Used when IndexedDB is unavailable (SSR, private browsing) |

---

## License

MIT

