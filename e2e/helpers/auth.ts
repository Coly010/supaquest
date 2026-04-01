import type { Page } from "@playwright/test"

// Credentials for the E2E test user created by global.setup.ts
export const E2E_EMAIL = "e2e-admin@supaquest.local"
export const E2E_PASSWORD = "e2e-password-test-123"

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/")
  await page.getByPlaceholder("dev@example.com").fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: "> ./login.sh" }).click()
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "logout" }).click()
  await page.waitForURL("/")
}
