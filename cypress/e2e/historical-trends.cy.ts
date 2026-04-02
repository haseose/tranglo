describe('Historical Trends', () => {
  beforeEach(() => {
    cy.interceptRates('USD');
    cy.interceptPairRate('USD', 'EUR', 0.92);
    cy.interceptPairRate('USD', 'GBP', 0.79);
    cy.interceptPairRate('USD', 'JPY', 149.5);
    cy.visit('/trends');
  });

  it('loads with the Historical Trends heading', () => {
    cy.contains('h1', 'Historical Trends').should('be.visible');
  });

  it('selects EUR and renders the chart canvas', () => {
    cy.contains('.currency-pill', 'EUR').click();
    cy.wait('@getPair_USD_EUR');

    cy.get('app-trend-chart').should('exist');
    cy.get('canvas.chart-canvas').should('be.visible').and(($c) => {
      expect(($c[0] as HTMLCanvasElement).width).to.be.greaterThan(0);
    });
  });

  it('selects a second currency (GBP) and chart remains visible', () => {
    cy.contains('.currency-pill', 'EUR').click();
    cy.wait('@getPair_USD_EUR');

    cy.contains('.currency-pill', 'GBP').click();
    cy.wait('@getPair_USD_GBP');

    cy.get('.currency-pill.selected').should('have.length', 2);
    cy.get('canvas.chart-canvas').should('be.visible');
  });

  it('selects a third currency (JPY) and shows 3 active pills', () => {
    cy.contains('.currency-pill', 'EUR').click();
    cy.wait('@getPair_USD_EUR');

    cy.contains('.currency-pill', 'GBP').click();
    cy.wait('@getPair_USD_GBP');

    cy.contains('.currency-pill', 'JPY').click();
    cy.wait('@getPair_USD_JPY');

    cy.get('.currency-pill.selected').should('have.length', 3);
    cy.get('canvas.chart-canvas').should('be.visible');
  });

  it('disables unselected pills after 3 currencies are selected', () => {
    cy.contains('.currency-pill', 'EUR').click();
    cy.wait('@getPair_USD_EUR');

    cy.contains('.currency-pill', 'GBP').click();
    cy.wait('@getPair_USD_GBP');

    cy.contains('.currency-pill', 'JPY').click();
    cy.wait('@getPair_USD_JPY');

    // Any pill that is NOT selected should be disabled
    cy.get('.currency-pill:not(.selected)')
      .first()
      .should('be.disabled');
  });
});
