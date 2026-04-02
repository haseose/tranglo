// Custom Cypress commands
// Add any reusable commands here

Cypress.Commands.add('interceptRates', (base = 'USD') => {
  cy.intercept('GET', `**/latest/${base}`, {
    statusCode: 200,
    body: {
      result: 'success',
      base_code: base,
      time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
      time_next_update_unix: 9999999999,
      conversion_rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.5,
        CAD: 1.36,
        AUD: 1.54,
        CHF: 0.89,
        CNY: 7.24,
        MXN: 17.15,
        INR: 83.12,
      },
    },
  }).as('getRates');
});

Cypress.Commands.add('interceptPairRate', (base, target, rate) => {
  cy.intercept('GET', `**/v6/**/pair/${base}/${target}`, {
    statusCode: 200,
    body: {
      result: 'success',
      base_code: base,
      target_code: target,
      conversion_rate: rate,
      time_last_update_utc: 'Fri, 14 Nov 2023 00:00:00 +0000',
    },
  }).as(`getPair_${base}_${target}`);
});

declare global {
  namespace Cypress {
    interface Chainable {
      interceptRates(base?: string): void;
      interceptPairRate(base: string, target: string, rate: number): void;
    }
  }
}
