import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should filter the game grid by category and publisher', async ({ page }) => {
    const categoryFilter = page.getByTestId('category-filter');
    const publisherFilter = page.getByTestId('publisher-filter');

    const cards = await page.locator('[data-testid="game-card"]').evaluateAll((elements) =>
      elements.map((card) => ({
        categoryId: (card as HTMLElement).dataset.categoryId ?? '',
        publisherId: (card as HTMLElement).dataset.publisherId ?? '',
      }))
    );

    const validPair = cards.find((card) => card.categoryId && card.publisherId);
    if (!validPair) {
      throw new Error('The homepage does not have any games with category and publisher metadata.');
    }

    const categoryIds = [...new Set(cards.map((card) => card.categoryId).filter(Boolean))];
    expect(categoryIds.length).toBeGreaterThanOrEqual(2);

    await categoryFilter.selectOption(categoryIds.slice(0, 2));
    const categoryMatches = await page.locator('[data-testid="game-card"]').evaluateAll((elements) =>
      elements
        .filter((card) => !(card as HTMLElement).hidden)
        .map((card) => (card as HTMLElement).dataset.categoryId ?? '')
    );
    expect(new Set(categoryMatches)).toEqual(new Set(categoryIds.slice(0, 2)));

    await publisherFilter.selectOption(validPair.publisherId);
    const filteredMatches = await page.locator('[data-testid="game-card"]').evaluateAll((elements) =>
      elements
        .filter((card) => !(card as HTMLElement).hidden)
        .map((card) => ({
          category: (card as HTMLElement).dataset.categoryId ?? '',
          publisher: (card as HTMLElement).dataset.publisherId ?? '',
        }))
    );

    expect(filteredMatches.length).toBeGreaterThan(0);
    filteredMatches.forEach((match) => {
      expect(categoryIds.slice(0, 2)).toContain(match.category);
      expect(match.publisher).toBe(validPair.publisherId);
    });

    await page.getByTestId('clear-filters-button').click();
    await expect(page.getByTestId('filtered-empty-state')).toBeHidden();
  });
});
