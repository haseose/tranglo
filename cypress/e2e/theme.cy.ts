describe('Theme Toggle', () => {
  beforeEach(() => {
    // Force dark theme as initial state
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('app-theme', 'dark');
      },
    });
    cy.interceptRates('USD');
  });

  it('starts in dark theme with the toggle checked (on)', () => {
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('mat-slide-toggle button[role="switch"]').should('have.attr', 'aria-checked', 'true');
  });

  it('first click switches to light theme and unchecks the toggle', () => {
    cy.get('mat-slide-toggle button[role="switch"]').as('toggle');
    cy.get('@toggle').should('have.attr', 'aria-checked', 'true');

    cy.get('mat-slide-toggle').click();

    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.get('@toggle').should('have.attr', 'aria-checked', 'false');
  });

  it('second click switches back to dark theme and re-checks the toggle', () => {
    cy.get('mat-slide-toggle').click();
    cy.get('html').should('have.attr', 'data-theme', 'light');

    cy.get('mat-slide-toggle').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('mat-slide-toggle button[role="switch"]').should('have.attr', 'aria-checked', 'true');
  });

  it('persists the theme after page reload', () => {
    cy.get('html').should('have.attr', 'data-theme', 'dark');

    cy.reload();

    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('mat-slide-toggle button[role="switch"]').should('have.attr', 'aria-checked', 'true');
  });
});
