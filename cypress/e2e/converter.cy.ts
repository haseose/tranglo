describe('Currency Converter', () => {
  beforeEach(() => {
    cy.interceptRates('USD');
    cy.visit('/converter');
    cy.get('#conv-amount').should('be.visible');
  });

  it('accepts a number in the amount input', () => {
    cy.get('#conv-amount').click().type('{selectall}100');
    cy.get('#conv-amount').should('have.value', '100');
  });

  it('shows the result card after entering an amount', () => {
    cy.get('#conv-amount').click().type('{selectall}50');
    cy.get('.result-card').should('be.visible');
  });

  it('changes result when From currency is changed', () => {
    cy.get('#conv-amount').click().type('{selectall}100');

    cy.get('.result-card .result-value--highlight')
      .invoke('text')
      .then((before) => {
        cy.get('mat-select').eq(0).click();
        cy.get('mat-option').contains('GBP').click();

        cy.get('.result-card .result-value--highlight')
          .invoke('text')
          .should('not.eq', before);
      });
  });

  it('changes result when To currency is changed', () => {
    cy.get('#conv-amount').click().type('{selectall}100');

    cy.get('.result-card .result-value--highlight')
      .invoke('text')
      .then((before) => {
        cy.get('mat-select').eq(1).click();
        cy.get('mat-option').contains('JPY').click();

        cy.get('.result-card .result-value--highlight')
          .invoke('text')
          .should('not.eq', before);
      });
  });

  it('keeps result visible after swapping currencies', () => {
    cy.get('#conv-amount').click().type('{selectall}100');
    cy.get('.result-card').should('be.visible');

    cy.get('.btn-swap').click();
    cy.get('.result-card').should('be.visible');
  });
});
