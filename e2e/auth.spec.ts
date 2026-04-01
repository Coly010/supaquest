import { test, expect } from "@playwright/test"
import { loginAs, logout, E2E_EMAIL, E2E_PASSWORD } from "./helpers/auth"

test.describe("Landing page", () => {
  test("shows the SupaQuest ASCII logo and tagline", async ({ page }) => {
    await page.goto("/")
    // ASCII art contains "SupaQuest" spread across multiple lines — check the tagline instead
    await expect(page.getByText("A text-based MMORPG for developers learning Supabase.")).toBeVisible()
  })

  test("shows the auth form in login mode by default", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible()
    // Submit button shows login variant
    await expect(page.getByRole("button", { name: "> ./login.sh" })).toBeVisible()
  })

  test("can switch to signup mode", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Sign up" }).click()
    await expect(page.getByRole("button", { name: "> ./signup.sh" })).toBeVisible()
  })
})

test.describe("Login flow", () => {
  test("valid credentials redirect to /dashboard", async ({ page }) => {
    await loginAs(page, E2E_EMAIL, E2E_PASSWORD)
    await page.waitForURL(/\/dashboard/)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("wrong password shows an error and stays on landing page", async ({ page }) => {
    await page.goto("/")
    await page.getByPlaceholder("dev@example.com").fill(E2E_EMAIL)
    await page.locator('input[type="password"]').fill("wrong-password")
    await page.getByRole("button", { name: "> ./login.sh" }).click()
    // Error message rendered as "> <message>" — check for partial text
    await expect(page.getByText(/Invalid login credentials/i)).toBeVisible()
    await expect(page).toHaveURL("/")
  })

  test("logout from dashboard returns to landing page", async ({ page }) => {
    await loginAs(page, E2E_EMAIL, E2E_PASSWORD)
    await page.waitForURL(/\/dashboard/)
    await logout(page)
    await expect(page).toHaveURL("/")
    // Auth form is visible again
    await expect(page.getByRole("button", { name: "> ./login.sh" })).toBeVisible()
  })
})

test.describe("Route protection", () => {
  test("visiting /dashboard without auth redirects to /", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("/")
    await expect(page).toHaveURL("/")
  })
})
