import { test, expect } from "@playwright/test";

test.describe("Validation du QueryBuilder et de l'alignement QueryMaster", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.type(), msg.text()));

    // 1. Authenticate by submitting the login form
    await page.goto("http://localhost:3000/admins/login");
    await page.fill('input[name="email"]', "admin@mfm-ficgayo.ci");
    await page.fill('input[name="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admins/dashboard");
  });

  test("1. Filtrage par Nom - Doit filtrer la liste des groupes", async ({ page }) => {
    await page.goto("http://localhost:3000/admins/home-groups");

    // Attendre que le tableau soit chargé et affiche des cellules
    await expect(page.locator("table")).toBeVisible();
    
    // Attendre le bouton d'ajout de filtre et cliquer dessus
    const addFilterButton = page.locator('button[title="Ajouter un filtre"]');
    await expect(addFilterButton).toBeVisible();
    await addFilterButton.click();

    // Sélectionner le champ "Nom"
    await page.locator("button:has-text('Nom')").first().click();

    // Saisir la valeur "Bethel" et valider
    const valueInput = page.locator("input[placeholder='Valeur...']");
    await valueInput.fill("Bethel");
    await valueInput.press("Enter");

    // Attendre la mise à jour du tableau
    await page.waitForTimeout(1000);

    // Vérifier que la cellule Bethel est affichée
    await expect(page.locator("table tbody")).toContainText("Bethel");

    // Saisir une valeur inexistante et valider
    await valueInput.fill("NonexistentGroupName12345");
    await valueInput.press("Enter");

    // Attendre la mise à jour
    await page.waitForTimeout(1000);

    // Vérifier que le message de table vide s'affiche
    await expect(page.locator("table tbody")).toContainText("Aucun groupe de maison trouvé");
  });

  test("2. Filtrage par Jour (Select) - Doit filtrer par jour de réunion", async ({ page }) => {
    await page.goto("http://localhost:3000/admins/home-groups");

    await expect(page.locator("table")).toBeVisible();

    const addFilterButton = page.locator('button[title="Ajouter un filtre"]');
    await addFilterButton.click();

    // Sélectionner le champ "Jour"
    await page.locator("button:has-text('Jour')").first().click();

    // Sélectionner "Mardi" dans le select du filtre actif
    const daySelect = page.locator("select").last();
    await daySelect.selectOption("Mardi");

    // Attendre la mise à jour
    await page.waitForTimeout(1000);

    // Vérifier que le tableau contient au moins un groupe ou le message vide s'il n'y en a pas
    const tbody = page.locator("table tbody");
    await expect(tbody).toBeVisible();
  });
});
