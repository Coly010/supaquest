// Global setup: creates a fresh E2E test user via the Supabase Admin API,
// seeds their player profile directly, then signs in via the UI and saves the session
// for use by authenticated tests.
// The DB is always reset by global-infra.ts before this runs, so no existing user check is needed.

import { test as setup } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import path from "path"
import fs from "fs"

const authFile = path.join(__dirname, ".auth/admin.json")

export const E2E_EMAIL = "e2e-admin@supaquest.local"
export const E2E_PASSWORD = "e2e-password-test-123"

setup("create E2E user and save session", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user }, error } = await adminClient.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
  })
  if (error || !user) throw new Error(`Failed to create E2E user: ${error?.message}`)
  const userId = user.id

  // Upsert player profile (safe to run on every setup)
  await adminClient.from("players").upsert({
    id: userId,
    username: "e2e_admin",
    display_name: "E2E Admin",
    level: 99,
    xp: 0,
    xp_to_next: 9999,
    is_admin: true,
  }, { onConflict: "id" })

  await adminClient.from("player_stats").upsert({
    player_id: userId,
    logic: 99, resilience: 99, throughput: 99, serendipity: 99, max_uptime: 9999,
  }, { onConflict: "player_id" })

  await adminClient.from("player_skills").upsert([
    { player_id: userId, skill_id: "debugging", level: 99, xp: 0, xp_to_next: 9999 },
    { player_id: userId, skill_id: "data_mining", level: 99, xp: 0, xp_to_next: 9999 },
    { player_id: userId, skill_id: "architecture", level: 99, xp: 0, xp_to_next: 9999 },
  ], { onConflict: "player_id,skill_id" })

  await adminClient.from("player_resources").upsert([
    { player_id: userId, resource_type: "focus", current: 9999, maximum: 9999 },
    { player_id: userId, resource_type: "uptime", current: 9999, maximum: 9999 },
    { player_id: userId, resource_type: "credits", current: 999999, maximum: null },
  ], { onConflict: "player_id,resource_type" })

  // Sign in via the UI to get real session cookies Playwright can reuse
  await page.goto("/")
  await page.getByPlaceholder("dev@example.com").fill(E2E_EMAIL)
  await page.locator('input[type="password"]').fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "> ./login.sh" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })

  await page.context().storageState({ path: authFile })
})
