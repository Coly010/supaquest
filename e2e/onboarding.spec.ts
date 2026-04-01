// Onboarding E2E tests — cover the full signup → profile creation → dashboard journey.
//
// ⚠️  REQUIRES Edge Functions to be running:
//     supabase functions serve
//
// The "create-profile" Edge Function is called when the onboarding form is submitted.
// Tests in this file will fail if Edge Functions are not served locally.

import { test, expect, type Page } from "@playwright/test"

function uniqueEmail() {
  return `playwright+${Date.now()}@test.local`
}

test.describe("Signup flow", () => {
  test("signing up with a new email lands on /onboarding", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Sign up" }).click()
    await page.getByPlaceholder("dev@example.com").fill(uniqueEmail())
    await page.locator('input[type="password"]').fill("testpassword123")
    await page.getByRole("button", { name: "> ./signup.sh" }).click()
    await page.waitForURL("/onboarding")
    await expect(page).toHaveURL("/onboarding")
    await expect(page.getByText("Create your developer profile")).toBeVisible()
  })
})

test.describe("Onboarding form", () => {
  // Helper: sign up a fresh user and land on /onboarding
  async function signUpAndGoToOnboarding(page: Page) {
    await page.goto("/")
    await page.getByRole("button", { name: "Sign up" }).click()
    await page.getByPlaceholder("dev@example.com").fill(uniqueEmail())
    await page.locator('input[type="password"]').fill("testpassword123")
    await page.getByRole("button", { name: "> ./signup.sh" }).click()
    await page.waitForURL("/onboarding")
  }

  test("completing the form creates a profile and redirects to /dashboard", async ({ page }) => {
    await signUpAndGoToOnboarding(page)

    const username = `pw_${Date.now()}`
    await page.getByPlaceholder("e.g. dev_wizard").fill(username)
    await page.getByPlaceholder("e.g. The Debug Wizard").fill("Playwright Dev")
    await page.getByRole("button", { name: "> Initialize developer profile" }).click()

    await page.waitForURL("/dashboard")
    await expect(page).toHaveURL("/dashboard")
    // Dashboard shows the chosen display name
    await expect(page.getByText("Playwright Dev")).toBeVisible()
  })

  test("authenticated user without a profile visiting /dashboard is sent to /onboarding", async ({ page }) => {
    // Sign up but do NOT complete onboarding
    await page.goto("/")
    await page.getByRole("button", { name: "Sign up" }).click()
    await page.getByPlaceholder("dev@example.com").fill(uniqueEmail())
    await page.locator('input[type="password"]').fill("testpassword123")
    await page.getByRole("button", { name: "> ./signup.sh" }).click()
    await page.waitForURL("/onboarding")

    // Navigate directly to /dashboard without finishing onboarding
    await page.goto("/dashboard")
    await page.waitForURL("/onboarding")
    await expect(page).toHaveURL("/onboarding")
  })
})
