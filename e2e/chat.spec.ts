// Chat E2E tests — authenticated as the seeded E2E admin user.
// Tests the /chat page, sending messages via the send-message Edge Function,
// and message persistence across page reloads.

import { test, expect } from "@playwright/test"

test.describe("Chat page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat")
  })

  test("shows heading and message area", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Global Chat/i })).toBeVisible()
    // Either an empty state message or a message list container should be visible
    await expect(
      page.getByText(/No messages yet/).or(page.locator("textarea"))
    ).toBeVisible()
  })

  test("shows the send textarea and button", async ({ page }) => {
    await expect(page.locator("textarea")).toBeVisible()
    await expect(page.getByRole("button", { name: "send" })).toBeVisible()
  })

  test("send button is disabled when textarea is empty", async ({ page }) => {
    await expect(page.getByRole("button", { name: "send" })).toBeDisabled()
  })
})

test.describe("Sending messages", () => {
  test("typing and sending a message shows it in the list", async ({ page }) => {
    await page.goto("/chat")
    const msg = `E2E test message ${Date.now()}`
    await page.locator("textarea").fill(msg)
    await page.getByRole("button", { name: "send" }).click()

    // Message should appear (optimistic)
    await expect(page.getByText(msg)).toBeVisible({ timeout: 5000 })
    // Textarea should be cleared
    await expect(page.locator("textarea")).toHaveValue("")
  })

  test("message persists after page reload (confirmed write to DB)", async ({ page }) => {
    await page.goto("/chat")
    const msg = `Persist test ${Date.now()}`
    await page.locator("textarea").fill(msg)
    await page.getByRole("button", { name: "send" }).click()
    await expect(page.getByText(msg)).toBeVisible({ timeout: 5000 })

    // Reload and check message is still there (loaded from DB)
    await page.reload()
    await expect(page.getByText(msg)).toBeVisible({ timeout: 5000 })
  })

  test("pressing Enter submits the message", async ({ page }) => {
    await page.goto("/chat")
    const msg = `Enter key test ${Date.now()}`
    await page.locator("textarea").fill(msg)
    await page.locator("textarea").press("Enter")
    await expect(page.getByText(msg)).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Resource bar", () => {
  test("game layout shows Focus and Uptime resource bar", async ({ page }) => {
    await page.goto("/chat")
    await expect(page.getByText(/Focus:/)).toBeVisible()
    await expect(page.getByText(/Uptime:/)).toBeVisible()
    // Shows replenishment cadence
    await expect(page.getByText(/10m/)).toBeVisible()
  })
})
