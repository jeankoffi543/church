import { test, expect } from "@playwright/test";

test.describe("QueryMaster Front-End E2E Tests", () => {

  test.describe("Médiathèque (/mediatheque)", () => {
    test.beforeEach(async ({ page }) => {
      page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.type(), msg.text()));
      await page.goto("/mediatheque");
    });

    test("handles pagination and page updates", async ({ page }) => {
      // Find and click page 2 if pagination exists
      const pageTwoButton = page.locator('button[aria-label="Suivant"], button:has-text("2")').first();
      if (await pageTwoButton.isVisible()) {
        await pageTwoButton.click();
        await expect(page).toHaveURL(/page=2/);
      }
    });

    test("resets pagination to page 1 on filter or search changes", async ({ page }) => {
      // Set to page 2 first if possible
      const pageTwoButton = page.locator('button[aria-label="Suivant"], button:has-text("2")').first();
      if (await pageTwoButton.isVisible()) {
        await pageTwoButton.click();
        await expect(page).toHaveURL(/page=2/);
      }

      // Enter search term
      const searchInput = page.locator('input[placeholder*="Rechercher"]');
      await searchInput.fill("foi");
      await page.waitForTimeout(500);

      // Page param should be removed or set to 1
      await expect(page).not.toHaveURL(/page=2/);
    });

    test("performs text search, handles spaces, and displays no-results UI", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Rechercher"]');
      
      // Perform keyword search with extra spaces
      await searchInput.fill("   foi   ");
      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/search=.*foi/);

      // Check no-results fallback
      await searchInput.fill("nonexistentqueryterm12345");
      await page.waitForTimeout(500);

      // Verify empty state UI is visible
      const emptyState = page.locator('text=Aucun message trouvé');
      await expect(emptyState).toBeVisible();
    });

    test("combines multiple filter facets simultaneously", async ({ page }) => {
      // Open advanced filters sheet
      const filterButton = page.locator('button:has-text("Plus de Filtres")');
      if (await filterButton.isVisible()) {
        await filterButton.click();

        // Select an item from first visible checkbox list (e.g., first option under Orateurs)
        const firstCheckbox = page.locator('button[role="checkbox"]').first();
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          // Verify URL matches filter selection
          await expect(page).toHaveURL(/speaker/);
        }
      }
    });
  });

  test.describe("Groupes de Maison (/groupes-de-maison)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/groupes-de-maison");
    });

    test("filters groups by search query and badge filters", async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Quartier, responsable"]');
      await searchInput.fill("Bethel");
      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/search=Bethel/);

      // Test day badge filter
      const dayBadge = page.locator('button:has-text("Lundi"), button:has-text("Mardi")').first();
      if (await dayBadge.isVisible()) {
        await dayBadge.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(/day=/);
      }
    });
  });

  test.describe("Lives Archives (/lives-archives)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/lives-archives");
    });

    test("appends elements via Charger plus button", async ({ page }) => {
      const loadMoreButton = page.locator('button:has-text("Charger plus")');
      if (await loadMoreButton.isVisible()) {
        const initialCards = await page.locator('button:has-text("views"), button:has-text("vues")').count();
        await loadMoreButton.click();
        await page.waitForTimeout(500);
        
        const nextCards = await page.locator('button:has-text("views"), button:has-text("vues")').count();
        expect(nextCards).toBeGreaterThanOrEqual(initialCards);
      }
    });
  });

});
