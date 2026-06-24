import { test, expect } from "@playwright/test";

test.describe("Validation du QueryBuilder et de l'alignement QueryMaster", () => {
  test.beforeEach(async ({ page }) => {
    // On intercepte l'authentification ou on simule une session si nécessaire.
    // Ici, on se concentre sur l'interception des requêtes de l'API pour valider les query params.
    await page.route("**/api/v1/public/home-groups*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: 1,
              name: "Groupe Ficgayo",
              leader: "Pasteur Jean",
              address: "Yopougon Ficgayo",
              schedule: "Mensuel · 1er dimanche",
              latitude: 5.35,
              longitude: -4.02,
              zone_name: "Zone A",
              meeting_day: "DIMANCHE",
              meeting_time: "17:00",
              coordinates: null,
            },
          ],
          meta: {
            zones: ["Zone A"],
            days: ["DIMANCHE"],
          },
        }),
      });
    });
  });

  test("1. Opérateur 'equals' (eq) - Doit envoyer le suffixe __eq", async ({ page }) => {
    await page.goto("http://localhost:3000/admins/home_groups");

    // Attendre que le bouton d'ajout de filtre soit visible
    const addFilterButton = page.locator('button[title="Ajouter un filtre"]');
    await expect(addFilterButton).toBeVisible();
    await addFilterButton.click();

    // Sélectionner le champ "Nom" ou "Zone" (selon les champs disponibles)
    // On clique sur l'option correspondante dans le menu déroulant
    await page.locator("button:has-text('Nom'), button:has-text('Zone')").first().click();

    // Par défaut, l'opérateur pour un champ texte peut être "contains".
    // On change l'opérateur pour "Est égal à" (equals)
    const operatorSelect = page.locator("select").first();
    await operatorSelect.selectOption("equals");

    // On prépare l'interception de la prochaine requête réseau déclenchée par la saisie
    const nextRequestPromise = page.waitForRequest((request) => 
      request.url().includes("/public/home-groups") || request.url().includes("/home-groups")
    );

    // Saisir la valeur exacte
    const valueInput = page.locator("input[placeholder='Valeur...']");
    await valueInput.fill("Groupe Ficgayo");
    await valueInput.press("Enter");

    const request = await nextRequestPromise;
    const url = new URL(request.url());
    
    // On vérifie que le paramètre d'URL contient bien le suffixe __eq
    const hasEq = Array.from(url.searchParams.keys()).some(key => key.endsWith("__eq"));
    expect(hasEq).toBe(true);
    
    // Exemple précis : name__eq=Groupe Ficgayo
    const paramValue = url.searchParams.get("name__eq") || url.searchParams.get("title__eq");
    expect(paramValue).toBe("Groupe Ficgayo");
  });

  test("2. Opérateur 'contains' (lk) - Doit envoyer le suffixe __lk", async ({ page }) => {
    await page.goto("http://localhost:3000/admins/home_groups");

    const addFilterButton = page.locator('button[title="Ajouter un filtre"]');
    await addFilterButton.click();
    await page.locator("button:has-text('Nom'), button:has-text('Zone')").first().click();

    // Sélectionner l'opérateur "Contient" (contains)
    const operatorSelect = page.locator("select").first();
    await operatorSelect.selectOption("contains");

    const nextRequestPromise = page.waitForRequest((request) => 
      request.url().includes("/public/home-groups") || request.url().includes("/home-groups")
    );

    const valueInput = page.locator("input[placeholder='Valeur...']");
    await valueInput.fill("Ficgayo");
    await valueInput.press("Enter");

    const request = await nextRequestPromise;
    const url = new URL(request.url());

    const hasLk = Array.from(url.searchParams.keys()).some(key => key.endsWith("__lk"));
    expect(hasLk).toBe(true);

    const paramValue = url.searchParams.get("name__lk") || url.searchParams.get("title__lk");
    expect(paramValue).toBe("Ficgayo");
  });

  test("3. Opérateurs 'starts_with' (sw) et 'ends_with' (ew) - Doivent envoyer les suffixes correspondants", async ({ page }) => {
    await page.goto("http://localhost:3000/admins/home_groups");

    // Test de starts_with (sw)
    const addFilterButton = page.locator('button[title="Ajouter un filtre"]');
    await addFilterButton.click();
    await page.locator("button:has-text('Zone')").first().click();

    const operatorSelect = page.locator("select").first();
    await operatorSelect.selectOption("starts_with");

    let nextRequestPromise = page.waitForRequest((request) => 
      request.url().includes("/public/home-groups") || request.url().includes("/home-groups")
    );

    let valueInput = page.locator("input[placeholder='Valeur...']");
    await valueInput.fill("Zone");
    await valueInput.press("Enter");

    let request = await nextRequestPromise;
    let url = new URL(request.url());

    expect(Array.from(url.searchParams.keys()).some(key => key.endsWith("__sw"))).toBe(true);
    expect(url.searchParams.get("zone_name__sw") || url.searchParams.get("zone__sw")).toBe("Zone");

    // Test de ends_with (ew)
    await operatorSelect.selectOption("ends_with");

    nextRequestPromise = page.waitForRequest((request) => 
      request.url().includes("/public/home-groups") || request.url().includes("/home-groups")
    );

    await valueInput.fill("A");
    await valueInput.press("Enter");

    request = await nextRequestPromise;
    url = new URL(request.url());

    expect(Array.from(url.searchParams.keys()).some(key => key.endsWith("__ew"))).toBe(true);
    expect(url.searchParams.get("zone_name__ew") || url.searchParams.get("zone__ew")).toBe("A");
  });
});
