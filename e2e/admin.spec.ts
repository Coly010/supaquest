// Admin panel E2E tests — authenticated as the seeded E2E admin user (is_admin = true).
// Covers the auth gate, list pages, item editing, and player management.

import { test, expect, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

// ---- Helpers ----

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ---- Auth gate ----

test.describe("Admin auth gate", () => {
  test("non-admin user is redirected away from /admin", async ({ browser }) => {
    const supabase = adminClient()

    // Create a temporary non-admin user
    const email = `e2e-nonadmin-${Date.now()}@supaquest.local`
    const password = "e2e-password-test-123"
    const { data: { user } } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (!user) throw new Error("Failed to create non-admin user")

    await supabase.from("players").upsert({
      id: user.id,
      username: `nonadmin_${Date.now()}`,
      display_name: "Non Admin",
      level: 1,
      xp: 0,
      xp_to_next: 100,
      is_admin: false,
    }, { onConflict: "id" })
    await supabase.from("player_stats").upsert({ player_id: user.id }, { onConflict: "player_id" })
    await supabase.from("player_skills").upsert([
      { player_id: user.id, skill_id: "debugging" },
      { player_id: user.id, skill_id: "data_mining" },
      { player_id: user.id, skill_id: "architecture" },
    ], { onConflict: "player_id,skill_id" })
    await supabase.from("player_resources").upsert([
      { player_id: user.id, resource_type: "focus", current: 100, maximum: 100 },
      { player_id: user.id, resource_type: "uptime", current: 100, maximum: 100 },
      { player_id: user.id, resource_type: "credits", current: 50, maximum: null },
    ], { onConflict: "player_id,resource_type" })

    // Sign in via the UI in a fresh context (no admin storage state)
    const context = await browser.newContext()
    const page: Page = await context.newPage()
    await page.goto("/")
    await page.getByPlaceholder("dev@example.com").fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole("button", { name: "> ./login.sh" }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Attempt to navigate to /admin — should redirect
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })

    await context.close()
    // Clean up test user
    await supabase.auth.admin.deleteUser(user.id)
  })
})

// ---- Admin overview ----

test.describe("Admin overview", () => {
  test("shows overview page with entity counts", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.getByRole("heading", { name: /Admin Overview/i })).toBeVisible()
    await expect(page.getByText("Items")).toBeVisible()
    await expect(page.getByText("Bugs")).toBeVisible()
    await expect(page.getByText("Tasks")).toBeVisible()
    await expect(page.getByText("Players")).toBeVisible()
  })

  test("admin subnav is visible with section links", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.getByText("[ADMIN]")).toBeVisible()
    await expect(page.getByRole("link", { name: "./items" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./bugs" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./tasks" })).toBeVisible()
    await expect(page.getByRole("link", { name: "./players" })).toBeVisible()
  })
})

// ---- Items ----

test.describe("Admin items", () => {
  test("shows items list with known item", async ({ page }) => {
    await page.goto("/admin/items")
    await expect(page.getByRole("heading", { name: /Items/i })).toBeVisible()
    await expect(page.getByText("basic_linter")).toBeVisible()
    await expect(page.getByText("Basic Linter")).toBeVisible()
  })

  test("edit link navigates to item edit page", async ({ page }) => {
    await page.goto("/admin/items")
    await page.getByRole("link", { name: "edit →" }).first().click()
    await expect(page).toHaveURL(/\/admin\/items\/.+/)
    await expect(page.getByRole("button", { name: /Save changes/i })).toBeVisible()
  })

  test("admin can edit an item description and save", async ({ page }) => {
    await page.goto("/admin/items/basic_linter")
    await expect(page.getByRole("heading", { name: /Basic Linter/i })).toBeVisible()

    const desc = page.getByRole("textbox").nth(1) // second textbox is description
    await desc.fill("Updated by E2E test")
    await page.getByRole("button", { name: /Save changes/i }).click()
    await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 })
  })
})

// ---- Bugs ----

test.describe("Admin bugs", () => {
  test("shows bugs list with known bug", async ({ page }) => {
    await page.goto("/admin/bugs")
    await expect(page.getByRole("heading", { name: /Bugs/i })).toBeVisible()
    // At least one bug should be listed
    await expect(page.getByRole("link", { name: "edit →" }).first()).toBeVisible()
  })

  test("edit link navigates to bug edit page", async ({ page }) => {
    await page.goto("/admin/bugs")
    await page.getByRole("link", { name: "edit →" }).first().click()
    await expect(page).toHaveURL(/\/admin\/bugs\/.+/)
    await expect(page.getByRole("button", { name: /Save changes/i })).toBeVisible()
  })
})

// ---- Tasks ----

test.describe("Admin tasks", () => {
  test("shows tasks list", async ({ page }) => {
    await page.goto("/admin/tasks")
    await expect(page.getByRole("heading", { name: /Tasks/i })).toBeVisible()
    await expect(page.getByRole("link", { name: "edit →" }).first()).toBeVisible()
  })

  test("edit link navigates to task edit page", async ({ page }) => {
    await page.goto("/admin/tasks")
    await page.getByRole("link", { name: "edit →" }).first().click()
    await expect(page).toHaveURL(/\/admin\/tasks\/.+/)
    await expect(page.getByRole("button", { name: /Save changes/i })).toBeVisible()
  })
})

// ---- Players ----

test.describe("Admin players", () => {
  let testUserId: string

  test.beforeAll(async () => {
    const supabase = adminClient()
    const email = `e2e-target-${Date.now()}@supaquest.local`
    const { data: { user } } = await supabase.auth.admin.createUser({
      email,
      password: "e2e-password-test-123",
      email_confirm: true,
    })
    if (!user) throw new Error("Failed to create target player")
    testUserId = user.id

    await supabase.from("players").upsert({
      id: user.id,
      username: `e2e_target_${Date.now()}`,
      display_name: "E2E Target",
      level: 5,
      xp: 0,
      xp_to_next: 500,
      is_admin: false,
    }, { onConflict: "id" })
    await supabase.from("player_stats").upsert({ player_id: user.id }, { onConflict: "player_id" })
    await supabase.from("player_skills").upsert([
      { player_id: user.id, skill_id: "debugging" },
      { player_id: user.id, skill_id: "data_mining" },
      { player_id: user.id, skill_id: "architecture" },
    ], { onConflict: "player_id,skill_id" })
    await supabase.from("player_resources").upsert([
      { player_id: user.id, resource_type: "focus", current: 100, maximum: 100 },
      { player_id: user.id, resource_type: "uptime", current: 100, maximum: 100 },
      { player_id: user.id, resource_type: "credits", current: 500, maximum: null },
    ], { onConflict: "player_id,resource_type" })
  })

  test.afterAll(async () => {
    if (testUserId) {
      const supabase = adminClient()
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  test("shows players list with e2e_admin user", async ({ page }) => {
    await page.goto("/admin/players")
    await expect(page.getByRole("heading", { name: /Players/i })).toBeVisible()
    await expect(page.getByText("E2E Admin")).toBeVisible()
    await expect(page.getByText("ADMIN").first()).toBeVisible()
  })

  test("shows target player in list", async ({ page }) => {
    await page.goto("/admin/players")
    await expect(page.getByText("E2E Target")).toBeVisible()
  })

  test("admin can grant and revoke admin to target player", async ({ page }) => {
    await page.goto("/admin/players")

    // Find the E2E Target row and click grant admin
    const targetRow = page.locator("div").filter({ hasText: "E2E Target" }).first()
    await targetRow.getByRole("button", { name: "grant admin" }).click()
    await expect(targetRow.getByText("Admin granted.")).toBeVisible({ timeout: 5000 })
    await expect(targetRow.getByRole("button", { name: "revoke admin" })).toBeVisible()

    // Now revoke it
    await targetRow.getByRole("button", { name: "revoke admin" }).click()
    await expect(targetRow.getByText("Admin revoked.")).toBeVisible({ timeout: 5000 })
    await expect(targetRow.getByRole("button", { name: "grant admin" })).toBeVisible()
  })

  test("admin can adjust a player's credits", async ({ page }) => {
    await page.goto("/admin/players")

    const targetRow = page.locator("div").filter({ hasText: "E2E Target" }).first()
    // Select credits resource type and enter delta
    await targetRow.locator("select").selectOption("credits")
    await targetRow.locator('input[placeholder="±delta"]').fill("100")
    await targetRow.getByRole("button", { name: "adjust" }).click()
    await expect(targetRow.getByText("Resource adjusted.")).toBeVisible({ timeout: 5000 })
  })
})
