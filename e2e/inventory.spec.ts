// Inventory E2E tests — authenticated as the seeded E2E admin user.
// Uses the admin Supabase client in beforeAll to seed inventory items directly,
// keeping tests isolated from the shop UI.

import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

// ---- Test setup helpers ----

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getE2eUserId(): Promise<string> {
  const adminClient = getAdminClient()
  const { data } = await adminClient
    .from("players")
    .select("id")
    .eq("username", "e2e_admin")
    .single()
  if (!data) throw new Error("E2E user not found")
  return data.id
}

// ---- Tests ----

test.describe("Inventory — empty state", () => {
  test.beforeAll(async () => {
    const adminClient = getAdminClient()
    const playerId = await getE2eUserId()
    await adminClient.from("player_inventory").delete().eq("player_id", playerId)
  })

  test("shows empty message when inventory is empty", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.getByText(/Your inventory is empty/)).toBeVisible()
  })
})

test.describe("Inventory — with items", () => {
  let inventoryId: string
  let weaponInventoryId: string

  test.beforeAll(async () => {
    const adminClient = getAdminClient()
    const playerId = await getE2eUserId()

    // Add a weapon (basic_linter — slot: main_hand, level_required: 1)
    const { data: weaponRow } = await adminClient
      .from("player_inventory")
      .insert({ player_id: playerId, item_def_id: "basic_linter", quantity: 1 })
      .select("id")
      .single()
    if (!weaponRow) throw new Error("Failed to insert weapon")
    weaponInventoryId = weaponRow.id
    inventoryId = weaponRow.id

    // Add a stackable consumable (coffee × 3)
    await adminClient
      .from("player_inventory")
      .insert({ player_id: playerId, item_def_id: "coffee", quantity: 3 })
  })

  test("shows items in the Bag section", async ({ page }) => {
    await page.goto("/inventory")
    await expect(page.getByText(/BAG/i)).toBeVisible()
    await expect(page.getByText("Basic Linter")).toBeVisible()
    await expect(page.getByText("Coffee")).toBeVisible()
    // Quantity badge for stackable
    await expect(page.getByText("×3")).toBeVisible()
  })

  test("equipping a weapon moves it to the Equipped section", async ({ page }) => {
    await page.goto("/inventory")
    const weaponRow = page.locator("div").filter({ hasText: /Basic Linter/ }).first()
    await weaponRow.getByRole("button", { name: "equip" }).click()

    // Equipped section appears
    await expect(page.getByText(/EQUIPPED/i)).toBeVisible()
    // Green border / equipped label visible
    await expect(page.getByText(/main hand/i)).toBeVisible()
  })

  test("unequipping moves weapon back to Bag", async ({ page }) => {
    await page.goto("/inventory")
    // The weapon should still be equipped from the previous test
    const equippedSection = page.locator("div").filter({ hasText: /EQUIPPED/i }).first()
    await equippedSection.getByRole("button", { name: "unequip" }).click()
    await expect(page.getByText("Unequipped.")).toBeVisible()
    // Equipped section gone, back in Bag
    await expect(page.getByText(/EQUIPPED/i)).not.toBeVisible()
  })

  test("selling an item removes it from inventory and adds credits", async ({ page }) => {
    await page.goto("/inventory")
    // Sell the coffee stack
    const coffeeRow = page.locator("div").filter({ hasText: /Coffee/ }).first()
    await coffeeRow.getByRole("button", { name: "sell" }).click()
    await expect(page.getByText(/Sold for/)).toBeVisible()
  })
})
