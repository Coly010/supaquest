// Shops E2E tests — authenticated as the seeded E2E admin user.
// Edge Functions are served by `supabase start` via the edge_runtime config.

import { test, expect } from "@playwright/test"

test.describe("Shops list page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/shops")
  })

  test("shows heading and all three shops", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Shops/i })).toBeVisible()
    await expect(page.getByText("Package Registry")).toBeVisible()
    await expect(page.getByText("Extension Marketplace")).toBeVisible()
    await expect(page.getByText("Cloud Console")).toBeVisible()
  })

  test("clicking a shop navigates to its detail page", async ({ page }) => {
    await page.getByText("Package Registry").click()
    await expect(page).toHaveURL(/\/shops\/package_registry/)
  })
})

test.describe("Shop detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/shops/package_registry")
  })

  test("shows shop name, description, and player credits", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Package Registry/i })).toBeVisible()
    // Player has 999999 credits
    await expect(page.getByText(/Credits: 999999/)).toBeVisible()
  })

  test("shows items for sale with buy buttons", async ({ page }) => {
    await expect(page.getByText("Basic Linter")).toBeVisible()
    await expect(page.getByText("Type Checker")).toBeVisible()
    // Prices shown as "X ¢"
    await expect(page.getByText(/60 ¢/)).toBeVisible()
  })

  test("buying an item shows success message and deducts credits", async ({ page }) => {
    // Stack Overflow Answer is stackable (12 credits) — can buy multiple times
    const soaRow = page.locator("div").filter({ hasText: /Stack Overflow Answer/ }).first()
    await soaRow.getByRole("button", { name: "buy" }).click()

    // Success banner appears
    await expect(page.getByText(/Purchased! Paid 12 Credits\./)).toBeVisible()
    // Credits decremented in UI
    await expect(page.getByText(/Credits: 999987/)).toBeVisible()
  })

  test("buying a non-stackable item marks it as owned", async ({ page }) => {
    const sshRow = page.locator("div").filter({ hasText: /SSH Keys/ }).first()
    await sshRow.getByRole("button", { name: "buy" }).click()
    await expect(page.getByText(/Purchased!/)).toBeVisible()

    // Button changes to "owned" for non-stackable item
    await expect(sshRow.getByRole("button", { name: "owned" })).toBeVisible()
  })
})
