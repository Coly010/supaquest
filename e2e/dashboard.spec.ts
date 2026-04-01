// Dashboard E2E tests — run as the seeded admin user (loaded from e2e/.auth/admin.json).
// The admin user has level 99 and maxed-out stats, set in supabase/seed.sql.

import { test, expect } from "@playwright/test"
import { logout } from "./helpers/auth"

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard")
})

test.describe("Dashboard content", () => {
  test("renders all four stat panels", async ({ page }) => {
    await expect(page.getByText("Resources")).toBeVisible()
    await expect(page.getByText("Attributes")).toBeVisible()
    await expect(page.getByText("Disciplines")).toBeVisible()
    await expect(page.getByText("Experience")).toBeVisible()
  })

  test("shows E2E admin display name and seniority level", async ({ page }) => {
    // GameNav shows "[E2E Admin · Lv 99]" and the dashboard heading shows the display name
    await expect(page.getByText(/E2E Admin/)).toBeVisible()
    await expect(page.getByText(/Lv 99/)).toBeVisible()
  })

  test("attributes panel shows seeded stat values of 99", async ({ page }) => {
    await expect(page.getByText("Logic")).toBeVisible()
    // The stat value "99" appears in the attributes panel
    const attributesPanel = page.locator("div").filter({ hasText: /^Attributes$/ }).first()
    // Each stat row has value 99
    const statValues = attributesPanel.getByText("99")
    await expect(statValues.first()).toBeVisible()
  })

  test("resources panel shows Focus, Uptime, and Credits", async ({ page }) => {
    await expect(page.getByText("Focus")).toBeVisible()
    await expect(page.getByText("Uptime")).toBeVisible()
    await expect(page.getByText("Credits")).toBeVisible()
  })

  test("disciplines panel shows all three skills", async ({ page }) => {
    await expect(page.getByText(/debugging/i)).toBeVisible()
    await expect(page.getByText(/data mining/i)).toBeVisible()
    await expect(page.getByText(/architecture/i)).toBeVisible()
  })
})

test.describe("Navigation", () => {
  test("nav bar shows SupaQuest branding", async ({ page }) => {
    await expect(page.getByText("SupaQuest")).toBeVisible()
  })

  test("nav bar shows all game section links", async ({ page }) => {
    await expect(page.getByRole("link", { name: "./dashboard" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./inventory" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./shops" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./tasks" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./environments" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./chat" })).toBeVisible()
  })

  test("admin user sees the ./admin link in nav", async ({ page }) => {
    await expect(page.getByRole("link", { name: "./admin" })).toBeVisible()
  })

  test("logout redirects to landing page and shows auth form", async ({ page }) => {
    await logout(page)
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("button", { name: "> ./login.sh" })).toBeVisible()
  })
})
