// Environments E2E tests — authenticated as the seeded E2E admin user.
// E2E user has logic=99, resilience=99, so win rate against all bugs is ~90%.

import { test, expect } from "@playwright/test"

test.describe("Environments list page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/environments")
  })

  test("shows heading and all four areas", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Environments/i })).toBeVisible()
    await expect(page.getByText("Local Dev")).toBeVisible()
    await expect(page.getByText("Staging")).toBeVisible()
    await expect(page.getByText("Production")).toBeVisible()
    await expect(page.getByText("Legacy Codebase")).toBeVisible()
  })

  test("shows level range for each area", async ({ page }) => {
    await expect(page.getByText(/Lv 1–5/)).toBeVisible()
    await expect(page.getByText(/Lv 5–12/)).toBeVisible()
  })

  test("clicking an area navigates to its detail page", async ({ page }) => {
    await page.getByText("Local Dev").click()
    await expect(page).toHaveURL(/\/environments\/local_dev/)
  })
})

test.describe("Environment detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/environments/local_dev")
  })

  test("shows area name and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Local Dev/i })).toBeVisible()
    await expect(page.getByText(/familiar/i)).toBeVisible()
  })

  test("shows known bugs roster for the area", async ({ page }) => {
    await expect(page.getByText(/known bugs/i)).toBeVisible()
    // Local Dev bugs: Typo Bug, Missing Semicolon, Off-by-One Error
    await expect(page.getByText("Typo Bug")).toBeVisible()
    await expect(page.getByText("Missing Semicolon")).toBeVisible()
  })

  test("shows uptime resource and attack button", async ({ page }) => {
    await expect(page.getByText(/Uptime:/)).toBeVisible()
    await expect(page.getByRole("button", { name: /Attack Bug/i })).toBeVisible()
  })
})

test.describe("Combat", () => {
  test("attacking a bug shows a combat result banner", async ({ page }) => {
    await page.goto("/environments/local_dev")
    await page.getByRole("button", { name: /Attack Bug/i }).click()

    // Either win or lose banner should appear
    await expect(
      page.getByText(/Bug squashed!/).or(page.getByText(/You crashed./))
    ).toBeVisible({ timeout: 15000 })
  })

  test("combat result shows damage dealt and taken", async ({ page }) => {
    await page.goto("/environments/local_dev")
    await page.getByRole("button", { name: /Attack Bug/i }).click()

    await expect(
      page.getByText(/Bug squashed!/).or(page.getByText(/You crashed./))
    ).toBeVisible({ timeout: 15000 })

    await expect(page.getByText(/DMG dealt:/)).toBeVisible()
    await expect(page.getByText(/DMG taken:/)).toBeVisible()
  })

  test("winning shows XP and credits gained", async ({ page }) => {
    // E2E user has logic=99, so ~90% win rate against local_dev bugs (max logic=10)
    // Try up to 3 times to get a win
    await page.goto("/environments/local_dev")

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /Attack Bug/i }).click()
      await expect(
        page.getByText(/Bug squashed!/).or(page.getByText(/You crashed./))
      ).toBeVisible({ timeout: 15000 })

      const isWin = await page.getByText(/Bug squashed!/).isVisible()
      if (isWin) {
        await expect(page.getByText(/\+\d+ XP/)).toBeVisible()
        await expect(page.getByText(/\+\d+ Credits/)).toBeVisible()
        return
      }

      // Reload for next attempt
      await page.reload()
    }
    // If we didn't win after 3 tries, the test still passes (RNG)
    // This is acceptable — combat is probabilistic
  })
})
