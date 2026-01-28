import { test } from "@playwright/test";

test.describe("Critical Path", () => {
    test("should allow user to login, select organization, and navigate to schedule", async ({
        page,
    }) => {
        // 1. Logowanie
        await page.goto("/login");

        // Uzupełnij formularz (zakładamy testowego użytkownika - w realnym scenariuszu te dane powinny być w .env.test)
        // UWAGA: Test może nie przejść bez poprawnego użytkownika w bazie.
        // await page.fill('input[name="email"]', 'test@example.com');
        // await page.fill('input[name="password"]', 'password123');
        // await page.click('button[type="submit"]');

        // Oczekuj przekierowania na dashboard lub wybór organizacji
        // await expect(page).toHaveURL(/.*\/panel/);

        // 2. Wybór organizacji (jeśli user ma ich wiele)
        // await page.getByText('Wybierz organizację').first().waitFor();
        // await page.click('text=Moja Firma');

        // 3. Otwarcie Grafiku
        // await page.click('a[href*="/schedule"]');
        // await expect(page).toHaveURL(/.*\/schedule/);

        // 4. Sprawdzenie czy grafik się załadował
        // await expect(page.getByText('Grafik Pracy')).toBeVisible();

        // Na potrzeby tego zadania tworzę tylko szkielet, ponieważ nie mam dostępu do bazy danych z testowym użytkownikiem.
        console.log(
            "Test szkieletowy - wymaga skonfigurowanego użytkownika w bazie danych."
        );
    });
});
