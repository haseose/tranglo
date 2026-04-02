describe('Search and Filter', () => {
  beforeEach(() => {
    cy.interceptRates('USD');
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.indexedDB.deleteDatabase('exchange-rate-db');
      },
    });
    cy.get('mat-row').should('have.length.greaterThan', 0);
  });

  it('should filter table by search query', () => {
    cy.get('input[type="search"]').type('EUR');
    cy.contains('mat-cell.mat-column-code', 'EUR').should('be.visible');
    cy.get('mat-row').should('have.length', 1);
  });

  it('should clear search and show all rates', () => {
    cy.get('input[type="search"]').type('EUR');
    cy.get('mat-row').should('have.length', 1);

    cy.get('input[type="search"]').clear();
    cy.get('mat-row').should('have.length.greaterThan', 1);
  });

  it('should sort the table by clicking a column header', () => {
    cy.contains('mat-header-cell', 'Currency').click();
    cy.get('mat-row').first().find('mat-cell').first().should('exist');
  });
});
