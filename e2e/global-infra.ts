// Playwright globalSetup — runs before webServer and all tests.
// Ensures Supabase is running and the DB is in a clean, seeded state.

import { execSync } from "child_process"

export default async function globalSetup() {
  console.log("[global-infra] Starting Supabase...")
  execSync("npx supabase start", { stdio: "inherit" })

  console.log("[global-infra] Resetting database...")
  execSync("npx supabase db reset", { stdio: "inherit" })

  console.log("[global-infra] Supabase ready.")
}
