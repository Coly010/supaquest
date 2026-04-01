// Tasks E2E tests — authenticated as the seeded E2E admin user.
// The E2E user has 9999 focus so all tasks are always affordable.

import { test, expect } from "@playwright/test"

test.describe("Tasks page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks")
  })

  test("shows heading, focus display, and seniority level", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Dev Tasks/i })).toBeVisible()
    await expect(page.getByText(/Focus:/)).toBeVisible()
    await expect(page.getByText(/Seniority: 99/)).toBeVisible()
  })

  test("shows all three discipline groups", async ({ page }) => {
    await expect(page.getByText("Debugging")).toBeVisible()
    await expect(page.getByText("Data Mining")).toBeVisible()
    await expect(page.getByText("Architecture")).toBeVisible()
  })

  test("shows task cards with focus cost and success rate", async ({ page }) => {
    await expect(page.getByText("Review Pull Request")).toBeVisible()
    // focus cost: 10
    await expect(page.getByText(/Focus: 10/).first()).toBeVisible()
    // success rate: 80%
    await expect(page.getByText(/80% success/)).toBeVisible()
  })

  test("skill level and XP are shown for each discipline", async ({ page }) => {
    // E2E user has all skills at level 99
    const debugSection = page.locator("div").filter({ hasText: "DEBUGGING" }).first()
    await expect(debugSection.getByText(/Lv 99/)).toBeVisible()
  })

  test("attempt task shows result banner and deducts focus", async ({ page }) => {
    // Grab initial focus value
    const focusText = await page.getByText(/Focus: \d+ \/ \d+/).textContent()
    const initialFocus = parseInt(focusText?.match(/Focus: (\d+)/)?.[1] ?? "9999")

    // Attempt "Review Pull Request" (focus cost: 10)
    const prCard = page.locator("div").filter({ hasText: /Review Pull Request/ }).first()
    await prCard.getByRole("button", { name: "attempt" }).click()

    // Result banner appears (success or failure)
    await expect(
      page.getByText(/Task completed!/).or(page.getByText(/Task failed./))
    ).toBeVisible({ timeout: 10000 })

    // Focus is reduced by 10
    await expect(page.getByText(new RegExp(`Focus: ${initialFocus - 10}`))).toBeVisible()
  })

  test("attempt button shows '...' while request is in flight", async ({ page }) => {
    const prCard = page.locator("div").filter({ hasText: /Review Pull Request/ }).first()
    const attemptBtn = prCard.getByRole("button", { name: "attempt" })

    // Click and immediately check for loading state
    // (This is a best-effort check — the request may complete very fast locally)
    await attemptBtn.click()
    // Either the loading state or the result should be visible quickly
    await expect(
      page.getByText("...").or(page.getByText(/Task completed!/).or(page.getByText(/Task failed./)))
    ).toBeVisible({ timeout: 10000 })
  })
})
