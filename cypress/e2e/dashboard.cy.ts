describe('Dashboard', () => {
  beforeEach(() => {
    cy.interceptRates('USD');
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.indexedDB.deleteDatabase('exchange-rate-db');
      },
    });
    cy.wait('@getRates');
    cy.get('mat-row').should('have.length.greaterThan', 0);
  });

  it('loads with title and navigation', () => {
    cy.contains('Exchange Rates').should('be.visible');
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Trends').should('be.visible');
    cy.contains('Converter').should('be.visible');
  });

  it('renders the exchange rate table with currency rows', () => {
    cy.contains('mat-cell.mat-column-code', 'EUR').should('be.visible');
    cy.contains('mat-cell.mat-column-code', 'GBP').should('be.visible');
  });

  it('shows USD as the default base currency in the mat-select', () => {
    cy.get('mat-select').first().should('contain.text', 'USD');
  });

  it('displays the Live connection badge', () => {
    cy.get('.connection-badge').should('be.visible');
    cy.get('.connection-label').should('contain.text', 'Live');
  });

  it('changes base currency to EUR and updates the select', () => {
    cy.on('uncaught:exception', () => false);
    cy.interceptRates('EUR');

    cy.get('mat-select').first().click();
    cy.get('mat-option').contains('EUR').click();

    cy.get('mat-select').first().should('contain.text', 'EUR');
    cy.get('mat-row').should('have.length.greaterThan', 0);
  });
});

